'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { analyserImport, appliquerImport } from './import';
import { recalculerRapprochements } from './rapprochements';
import type { AnalyseImport } from './types';

async function session() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const TAILLE_MAX = 1024 * 1024;

/** Étape 1 : lit le fichier et prépare l'aperçu (aucune écriture). */
export async function analyserTableau(
  formData: FormData
): Promise<{ ok: true; analyse: AnalyseImport } | { ok: false; error: string }> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const fichier = formData.get('fichier');
  if (!(fichier instanceof File))
    return { ok: false, error: 'Choisissez le fichier Excel du tableau de pilotage.' };
  if (fichier.size > TAILLE_MAX)
    return { ok: false, error: 'Fichier trop volumineux (1 Mo maximum).' };
  return analyserImport(supabase, await fichier.arrayBuffer());
}

const Commune = z.object({ code: z.string(), nom: z.string(), lat: z.number(), lon: z.number() });
const Projet = z.object({
  types_bien: z.array(z.enum(['maison', 'appartement', 'immeuble', 'terrain', 'garage', 'local'])),
  budget_min: z.number().nullable(),
  budget_max: z.number().nullable(),
  chambres_min: z.number().int().nullable(),
  surface_min: z.number().nullable(),
  communes: z.array(Commune).max(60),
  zone: z
    .object({ ville: z.string(), lat: z.number(), lon: z.number(), rayon_km: z.number() })
    .nullable(),
  criteres: z.record(z.string(), z.union([z.boolean(), z.number(), z.null()])),
  localisation_texte: z.string().max(1000).nullable(),
  informations: z.string().max(2000).nullable(),
  date_contact: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  import_brut: z.record(z.string(), z.string().nullable()),
  import_hash: z.string().max(64)
});
const Analyse = z.object({
  items: z
    .array(
      z.object({
        cle: z.string().max(200),
        nom: z.string().min(1).max(200),
        telephone: z.string().max(20).nullable(),
        statut: z.enum(['nouveau', 'modifie', 'inchange']),
        contactId: z.uuid().nullable(),
        projetId: z.uuid().nullable(),
        changements: z.array(z.string()),
        projet: Projet.nullable()
      })
    )
    .max(2000),
  absents: z.array(z.object({ contactId: z.uuid(), nom: z.string() })).max(2000),
  doublons: z.array(z.string())
});

/** Étape 2 : applique l'import validé, puis recalcule les rapprochements. */
export async function appliquerTableau(
  input: unknown
): Promise<{ ok: true; resume: string } | { ok: false; error: string }> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const parsed = Analyse.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'Aperçu invalide : relancez l’analyse du fichier.' };
  const res = await appliquerImport(supabase, parsed.data as AnalyseImport);
  if (!res.ok) return res;
  const n = await recalculerRapprochements(supabase);
  revalidatePath('/dashboard/prospects');
  revalidatePath('/dashboard/rapprochements');
  revalidatePath('/dashboard/biens');
  return { ok: true, resume: `${res.resume} ${n} rapprochement(s) calculé(s).` };
}

/** Recalcule tous les rapprochements (bouton de la page Rapprochements). */
export async function recalculerTout(): Promise<
  { ok: true; n: number } | { ok: false; error: string }
> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const n = await recalculerRapprochements(supabase);
  revalidatePath('/dashboard/rapprochements');
  return { ok: true, n };
}

const Statut = z.enum(['nouveau', 'envoye', 'ecarte', 'visite']);

/** Change le statut d'un rapprochement (contacté, écarté, visite…). */
export async function changerStatutRapprochement(
  id: string,
  statut: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const s = Statut.safeParse(statut);
  if (!s.success || !z.uuid().safeParse(id).success)
    return { ok: false, error: 'Statut invalide.' };
  const { data, error } = await supabase
    .from('rapprochements')
    .update({
      statut: s.data,
      ...(s.data === 'envoye' ? { envoye_at: new Date().toISOString() } : {})
    })
    .eq('id', id)
    .select('bien_id')
    .single();
  if (error || !data) return { ok: false, error: 'Le statut n’a pas pu être changé.' };
  revalidatePath(`/dashboard/biens/${data.bien_id}`);
  revalidatePath('/dashboard/rapprochements');
  return { ok: true };
}
