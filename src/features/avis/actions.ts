'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { genererAnnonce, type AnnonceIA } from '@/lib/ai/annonce';
import { genererSynthese, type SyntheseBien } from '@/lib/ai/synthese';
import { MAX_COMPARABLES_AVIS, MAX_ETAPES, PAGES_AVIS } from './types';

export type AvisActionResult = { ok: true; avisId: string } | { ok: false; error: string };

const texte = (max: number) => z.string().max(max);

const AvisSchema = z.object({
  version: z.literal(1),
  estimationId: z.uuid(),
  dateAvis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  destinataire: z.object({
    civilite: texte(20),
    nom: texte(120),
    prenom: texte(120)
  }),
  conseiller: z.object({
    nom: texte(120),
    titre: texte(80),
    telephone: texte(40),
    email: texte(120),
    accroche: texte(300)
  }),
  agence: z.object({
    nom: texte(120),
    adresse: texte(200),
    codePostal: texte(10),
    ville: texte(80),
    telephone: texte(40),
    email: texte(120),
    site: texte(200),
    horaires: texte(200),
    mentions: texte(1200),
    portails: texte(40),
    reseauxSociaux: texte(200),
    arbres: texte(400),
    avisClients: texte(300)
  }),
  prix: z
    .object({
      basse: z.number().int().positive(),
      haute: z.number().int().positive(),
      conseille: z.number().int().positive(),
      tauxHonoraires: z.number().min(0).max(0.3)
    })
    .refine((p) => p.basse <= p.haute, {
      message: 'La valeur basse doit être inférieure à la valeur haute.'
    }),
  textes: z.object({
    introduction: texte(3000),
    bien: texte(4000),
    conclusion: texte(3000)
  }),
  comparables: z.array(z.string().max(80)).max(MAX_COMPARABLES_AVIS),
  photos: z.object({
    couverture: z.uuid().nullable(),
    bien: z.array(z.uuid()).max(4)
  }),
  pages: z.object(
    Object.fromEntries(PAGES_AVIS.map(([k]) => [k, z.boolean()])) as Record<
      (typeof PAGES_AVIS)[number][0],
      z.ZodBoolean
    >
  ),
  annonce: z.object({
    ton: z.enum(['sobre', 'chaleureux', 'prestige']),
    titre: texte(120),
    texte: texte(5000),
    pointsForts: z.array(texte(120)).max(6),
    honoraires: z.enum(['vendeur', 'acquereur']),
    depensesEnergie: texte(200)
  }),
  analyse: z.object({
    pointsForts: z.array(texte(200)).max(8),
    vigilance: z.array(texte(200)).max(8),
    cibles: z.array(z.object({ profil: texte(60), raison: texte(200) })).max(6)
  }),
  etapes: z
    .array(z.object({ titre: texte(80), delai: texte(40), texte: texte(400) }))
    .max(MAX_ETAPES)
});

async function session() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Enregistre les réglages de l'avis (un enregistrement par bien, mis à jour à chaque fois). */
export async function enregistrerAvis(bienId: string, input: unknown): Promise<AvisActionResult> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const parsed = AvisSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return {
      ok: false,
      error: `${i?.message ?? 'Valeur invalide'}${i?.path.length ? ` (${i.path.join(' › ')})` : ''}`
    };
  }
  const details = parsed.data;

  const { data: existant } = await supabase
    .from('bien_analyses')
    .select('id')
    .eq('bien_id', bienId)
    .eq('type', 'avis_valeur')
    .order('created_at', { ascending: false })
    .limit(1);

  const ligne = {
    synthese: details.textes.bien,
    valeur_basse: details.prix.basse,
    valeur_haute: details.prix.haute,
    details
  };
  // valeur_probable reste nulle : seules les estimations la renseignent.
  const { data, error } = existant?.[0]
    ? await supabase
        .from('bien_analyses')
        .update(ligne)
        .eq('id', existant[0].id)
        .select('id')
        .single()
    : await supabase
        .from('bien_analyses')
        .insert({
          ...ligne,
          bien_id: bienId,
          type: 'avis_valeur',
          modele: 'avis'
        })
        .select('id')
        .single();
  if (error || !data) {
    console.error('avis.enregistrer', error);
    return { ok: false, error: 'L’avis n’a pas pu être enregistré.' };
  }
  revalidatePath(`/dashboard/biens/${bienId}/avis`);
  return { ok: true, avisId: data.id as string };
}

export async function ajouterPhoto(
  bienId: string,
  storagePath: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!storagePath.startsWith(`${user.id}/${bienId}/`))
    return { ok: false, error: 'Emplacement de photo invalide.' };
  const { count } = await supabase
    .from('bien_images')
    .select('id', { count: 'exact', head: true })
    .eq('bien_id', bienId);
  const { data, error } = await supabase
    .from('bien_images')
    .insert({ bien_id: bienId, storage_path: storagePath, ordre: count ?? 0 })
    .select('id')
    .single();
  if (error || !data) {
    console.error('bien_images.insert', error);
    return { ok: false, error: 'La photo n’a pas pu être enregistrée.' };
  }
  revalidatePath(`/dashboard/biens/${bienId}/avis`);
  return { ok: true, id: data.id as string };
}

export async function supprimerPhoto(
  photoId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const { data } = await supabase
    .from('bien_images')
    .select('storage_path, bien_id')
    .eq('id', photoId)
    .single();
  if (!data) return { ok: false, error: 'Photo introuvable.' };
  await supabase.storage.from('biens').remove([data.storage_path]);
  const { error } = await supabase.from('bien_images').delete().eq('id', photoId);
  if (error) return { ok: false, error: 'La photo n’a pas pu être supprimée.' };
  revalidatePath(`/dashboard/biens/${data.bien_id}/avis`);
  return { ok: true };
}

const TonSchema = z.enum(['sobre', 'chaleureux', 'prestige']);

/** Rédige (ou réécrit dans un autre ton) le projet d'annonce à partir de la fiche du bien. */
export async function redigerAnnonce(
  bienId: string,
  ton: unknown
): Promise<{ ok: true; annonce: AnnonceIA } | { ok: false; error: string }> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const t = TonSchema.safeParse(ton);
  if (!t.success) return { ok: false, error: 'Ton inconnu.' };
  const [{ data: bien }, { data: pieces }] = await Promise.all([
    supabase.from('biens').select('*').eq('id', bienId).maybeSingle(),
    supabase.from('bien_pieces').select('nom, surface, niveau').eq('bien_id', bienId).order('ordre')
  ]);
  if (!bien) return { ok: false, error: 'Bien introuvable.' };
  return genererAnnonce(
    bien,
    (pieces ?? []).map((p) => ({
      nom: p.nom as string,
      surface: p.surface === null ? null : Number(p.surface),
      niveau: p.niveau as string | null
    })),
    t.data
  );
}

/** Rédige les points forts, points de vigilance et la cible acquéreur à partir de la fiche du bien. */
export async function redigerSynthese(
  bienId: string
): Promise<{ ok: true; synthese: SyntheseBien } | { ok: false; error: string }> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const [{ data: bien }, { data: pieces }] = await Promise.all([
    supabase.from('biens').select('*').eq('id', bienId).maybeSingle(),
    supabase.from('bien_pieces').select('nom, surface').eq('bien_id', bienId).order('ordre')
  ]);
  if (!bien) return { ok: false, error: 'Bien introuvable.' };
  return genererSynthese(
    bien,
    (pieces ?? []).map((p) => ({
      nom: p.nom as string,
      surface: p.surface === null ? null : Number(p.surface)
    }))
  );
}
