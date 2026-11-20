'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { anthropicConfigured } from '@/lib/ai/client';
import { proposerIdees, redigerPost, TONS_LINKEDIN, type IdeePost } from '@/lib/ai/linkedin';
import { ErreurTypefully, compteLinkedin, creerPost, supprimerPost } from '@/lib/typefully';

type Resultat<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STATUTS: Record<string, string> = {
  estimation: 'estimation en cours',
  avant_premiere: 'en avant-première',
  mandat_en_cours: 'en vente (mandat en cours)',
  sous_offre: 'sous offre'
};

/** Faits récents tirés d'Ovalia pour nourrir l'IA : jamais de nom, d'adresse ni de note interne. */
async function faitsRecents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('biens')
    .select('type, ville, statut, surface, pieces, chambres, prix_affiche, updated_at')
    .in('statut', ['avant_premiere', 'mandat_en_cours', 'sous_offre', 'estimation'])
    .order('updated_at', { ascending: false })
    .limit(12);
  return (data ?? [])
    .map((b) =>
      [
        `- ${b.type ?? 'bien'}`,
        b.ville ? `à ${b.ville}` : null,
        b.surface ? `${b.surface} m²` : null,
        b.pieces ? `${b.pieces} pièces` : null,
        b.chambres ? `${b.chambres} chambres` : null,
        STATUTS[b.statut] ?? b.statut,
        b.prix_affiche && b.statut !== 'estimation'
          ? `prix affiché ${b.prix_affiche.toLocaleString('fr-FR')} €`
          : null
      ]
        .filter(Boolean)
        .join(', ')
    )
    .join('\n');
}

async function connecte() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return Boolean(user);
}

function message(e: unknown, defaut: string) {
  if (e instanceof ErreurTypefully) return e.message;
  console.error('linkedin', e);
  return defaut;
}

export async function genererIdees(theme: string): Promise<Resultat<{ idees: IdeePost[] }>> {
  if (!(await connecte())) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!anthropicConfigured()) return { ok: false, error: 'La clé IA n’est pas configurée.' };
  try {
    const idees = await proposerIdees(
      await faitsRecents(),
      theme.trim().slice(0, 300) || undefined
    );
    return { ok: true, idees };
  } catch (e) {
    return { ok: false, error: message(e, 'L’IA n’a pas pu proposer d’idées. Réessayez.') };
  }
}

const Redaction = z.object({
  sujet: z.string().trim().min(3, 'Indiquez le sujet du post.').max(1500),
  ton: z.enum(Object.keys(TONS_LINKEDIN) as [keyof typeof TONS_LINKEDIN])
});

export async function rediger(sujet: string, ton: string): Promise<Resultat<{ texte: string }>> {
  if (!(await connecte())) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!anthropicConfigured()) return { ok: false, error: 'La clé IA n’est pas configurée.' };
  const parsed = Redaction.safeParse({ sujet, ton });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' };
  try {
    const texte = await redigerPost(parsed.data.sujet, parsed.data.ton, await faitsRecents());
    return { ok: true, texte };
  } catch (e) {
    return { ok: false, error: message(e, 'L’IA n’a pas pu rédiger le post. Réessayez.') };
  }
}

const Envoi = z.object({
  texte: z
    .string()
    .trim()
    .min(1, 'Le post est vide.')
    .max(3000, 'LinkedIn limite un post à 3 000 caractères.'),
  quand: z.union([z.enum(['brouillon', 'prochain']), z.iso.datetime({ offset: true })]),
  premierCommentaire: z.string().trim().max(1250).optional()
});

/** Envoie le post dans Typefully : brouillon, prochain créneau ou date choisie. */
export async function envoyerVersTypefully(
  texte: string,
  quand: string,
  premierCommentaire?: string
): Promise<Resultat> {
  if (!(await connecte())) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const parsed = Envoi.safeParse({
    texte,
    quand,
    premierCommentaire: premierCommentaire || undefined
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' };
  if (
    parsed.data.quand.includes('T') &&
    new Date(parsed.data.quand).getTime() < Date.now() + 60_000
  )
    return { ok: false, error: 'Choisissez une date et une heure à venir.' };
  try {
    const { socialSetId } = await compteLinkedin();
    await creerPost(
      socialSetId,
      parsed.data.texte,
      parsed.data.quand,
      parsed.data.premierCommentaire
    );
  } catch (e) {
    return { ok: false, error: message(e, 'L’envoi vers Typefully a échoué.') };
  }
  revalidatePath('/dashboard/linkedin');
  return { ok: true };
}

export async function supprimer(id: number): Promise<Resultat> {
  if (!(await connecte())) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Post introuvable.' };
  try {
    const { socialSetId } = await compteLinkedin();
    await supprimerPost(socialSetId, id);
  } catch (e) {
    return { ok: false, error: message(e, 'La suppression a échoué.') };
  }
  revalidatePath('/dashboard/linkedin');
  return { ok: true };
}
