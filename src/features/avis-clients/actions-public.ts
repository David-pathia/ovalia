'use server';

import { createClient } from '@/lib/supabase/server';

// Envoi public d'un avis (page /site/avis) : passe par la fonction SQL sécurisée `repondre_avis`,
// qui n'autorise qu'une écriture contrôlée, sans lecture de la base.

export type ResultatAvis = { ok: true } | { ok: false; error: string };

export async function envoyerAvis(input: {
  jeton: string | null;
  notes: number[];
  commentaire: string;
  publication: boolean;
  nom: string;
  piege?: string;
}): Promise<ResultatAvis> {
  // Champ invisible rempli : envoi automatique (robot), ignoré sans le signaler.
  if (input.piege) return { ok: true };
  if (input.notes.length !== 5 || input.notes.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) {
    return { ok: false, error: 'Merci de répondre aux 5 questions.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('repondre_avis', {
    p_jeton: input.jeton,
    p_notes: input.notes,
    p_commentaire: input.commentaire.slice(0, 2000),
    p_publication: input.publication,
    p_nom: input.nom.slice(0, 80)
  });
  if (error) {
    console.error('avis.public', error);
    return { ok: false, error: 'Votre avis n’a pas pu être enregistré. Merci de réessayer.' };
  }
  if (data === 'deja')
    return { ok: false, error: 'Vous avez déjà répondu à ce questionnaire. Merci !' };
  if (data === 'introuvable') return { ok: false, error: 'Ce lien n’est plus valide.' };
  if (data !== 'ok') return { ok: false, error: 'Le questionnaire n’est pas encore ouvert.' };
  return { ok: true };
}
