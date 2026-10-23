'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { MODEL, anthropicConfigured, demanderTexte, extraireJson } from '@/lib/ai/client';
import { estimerBien } from '@/lib/estimation/estimer';
import { BienUpdateSchema, PieceInputSchema, champsManquants, surfacePiece } from '@/features/biens/fields';
import { AnalyseSchema, ExtractionSchema, VendeurSchema, type Extraction } from './schema';
import { SYSTEM_PROMPT } from './prompt';

export type AnalyseResult = { ok: true; data: Extraction } | { ok: false; error: string };
export type SaveResult = { ok: true; bienId: string } | { ok: false; error: string };

// Le schéma est donné dans la consigne et la réponse validée ici avec Zod.
const FORMAT_REPONSE = `Réponds uniquement avec un objet JSON valide, sans texte autour ni bloc de code, conforme à ce schéma JSON :
${JSON.stringify(z.toJSONSchema(ExtractionSchema))}`;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function analyserNote(note: string): Promise<AnalyseResult> {
  const { user } = await requireUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const texte = note.trim();
  if (texte.length < 10) return { ok: false, error: 'La note est trop courte pour être analysée.' };
  if (texte.length > 20000) return { ok: false, error: 'La note dépasse 20 000 caractères.' };
  if (!anthropicConfigured()) {
    return { ok: false, error: 'La clé ANTHROPIC_API_KEY n’est pas configurée sur le serveur.' };
  }

  try {
    const { stopReason, texte: reponse } = await demanderTexte(
      `${SYSTEM_PROMPT}\n\nAnnée en cours : ${new Date().getFullYear()}.\n\n${FORMAT_REPONSE}`,
      `Note du conseiller :\n\n${texte}`
    );
    if (stopReason === 'refusal') {
      return { ok: false, error: 'L’IA a refusé d’analyser cette note. Reformulez-la puis réessayez.' };
    }
    if (stopReason === 'max_tokens') return { ok: false, error: 'La réponse de l’IA est incomplète. Réessayez.' };
    const parsed = ExtractionSchema.safeParse(extraireJson(reponse));
    if (!parsed.success) {
      console.error('Réponse IA non conforme', parsed.error.issues.slice(0, 5), reponse.slice(0, 500));
      return { ok: false, error: 'La réponse de l’IA n’a pas le bon format. Réessayez.' };
    }
    return { ok: true, data: parsed.data };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      const k = process.env.ANTHROPIC_API_KEY?.trim() ?? '';
      // Même aperçu que la console Anthropic (16 premiers et 4 derniers caractères), jamais la clé entière.
      return {
        ok: false,
        error: `La clé Anthropic est refusée. Clé lue sur le serveur : ${k.slice(0, 16)}…${k.slice(-4)} (${k.length} caractères). Comparez avec la liste des clés de la console Anthropic.`
      };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Trop de demandes en même temps. Réessayez dans une minute.' };
    }
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic', error.status, error.message);
      return { ok: false, error: `Le service IA a répondu une erreur (${error.status}) : ${error.message}` };
    }
    throw error;
  }
}

const SaveSchema = z.object({
  bien: BienUpdateSchema,
  pieces: z.array(PieceInputSchema),
  vendeur: VendeurSchema.nullable(),
  analyse: AnalyseSchema
});

export async function enregistrerBien(input: unknown, note: string): Promise<SaveResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) {
    const champ = parsed.error.issues[0]?.path.join(' › ');
    return { ok: false, error: `Valeur invalide${champ ? ` : ${champ}` : ''}. Vérifiez la fiche.` };
  }
  const { bien, pieces, vendeur, analyse } = parsed.data;
  const { fiche_na: ficheNa, ...valeurs } = bien;
  if (!valeurs.type) return { ok: false, error: 'Choisissez le type de bien avant d’enregistrer.' };
  const manquants = champsManquants(valeurs, ficheNa, pieces);
  if (manquants.length > 0) {
    return { ok: false, error: `Fiche d’estimation incomplète : ${manquants.length} information(s) manquante(s).` };
  }

  const { data: created, error: bienError } = await supabase
    .from('biens')
    .insert({
      ...valeurs,
      fiche_na: ficheNa,
      statut: 'estimation',
      ville: typeof valeurs.ville === 'string' ? valeurs.ville.toUpperCase() : null,
      suivi_par: valeurs.suivi_par ?? (user.user_metadata?.full_name as string | undefined) ?? user.email ?? null,
      laforet_extra: { source: 'saisie_rapide' }
    })
    .select('id')
    .single();

  if (bienError || !created) {
    console.error('biens.insert', bienError);
    return { ok: false, error: 'Le bien n’a pas pu être enregistré.' };
  }
  const bienId = created.id as string;

  // Pas de transaction côté client Supabase : en cas d'échec, on supprime le bien (cascade sur le reste).
  const rollback = async (message: string, detail: unknown) => {
    console.error(message, detail);
    await supabase.from('biens').delete().eq('id', bienId);
    return { ok: false as const, error: 'L’enregistrement a échoué, rien n’a été conservé. Réessayez.' };
  };

  const releve = pieces.filter((p) => p.nom.trim());
  if (releve.length > 0) {
    const { error } = await supabase
      .from('bien_pieces')
      .insert(releve.map((p, i) => ({ ...p, surface: surfacePiece(p), bien_id: bienId, ordre: i })));
    if (error) return rollback('bien_pieces.insert', error);
  }

  if (vendeur?.nom.trim()) {
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        civilite: vendeur.civilite,
        nom: vendeur.nom.trim().toUpperCase(),
        prenom: vendeur.prenom,
        email: vendeur.email?.trim().toLowerCase() || null,
        portable: vendeur.portable,
        telephone_fixe: vendeur.telephone_fixe,
        categories: ['vendeur']
      })
      .select('id')
      .single();
    if (error || !contact) return rollback('contacts.insert', error);

    const { error: linkError } = await supabase
      .from('bien_contacts')
      .insert({ bien_id: bienId, contact_id: contact.id, role: 'vendeur' });
    if (linkError) return rollback('bien_contacts.insert', linkError);
  }

  const { error: analyseError } = await supabase.from('bien_analyses').insert({
    bien_id: bienId,
    type: 'autre',
    note_source: note,
    points_forts: analyse.points_forts,
    points_faibles: analyse.points_faibles,
    synthese: analyse.synthese,
    details: { a_verifier: analyse.a_verifier },
    modele: MODEL
  });
  if (analyseError) return rollback('bien_analyses.insert', analyseError);

  // Estimation DVF en arrière-plan : la fiche l'affiche dès qu'elle est prête.
  if (valeurs.ville || valeurs.code_postal) {
    after(async () => {
      const res = await estimerBien(supabase, bienId);
      if (!res.ok) console.warn('estimation automatique', bienId, res.error);
    });
  }

  revalidatePath('/dashboard/biens');
  return { ok: true, bienId };
}
