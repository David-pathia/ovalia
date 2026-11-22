'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { anthropicConfigured, demanderContenu, demanderTexte, extraireJson } from '@/lib/ai/client';
import { CONSIGNE_PIECES, blocsPieces } from '@/features/pieces-jointes/lecture';
import { PiecesSchema } from '@/features/pieces-jointes/types';
import { BIEN_FIELDS, BienBrouillonSchema } from '@/features/biens/fields';
import { PieceBrouillonSchema } from '@/features/saisie/schema';
import { SYSTEM_PROMPT } from '@/features/saisie/prompt';

// Lecture d'une dictée complémentaire sur la fiche d'un bien : l'IA range chaque information
// dans le bon champ. Rien n'est enregistré ici : le conseiller valide les propositions à l'écran.

const LectureSchema = z.object({
  bien: BienBrouillonSchema,
  pieces: z.array(PieceBrouillonSchema).describe('Uniquement les pièces citées dans la dictée'),
  remarques: z
    .array(z.string())
    .describe('Informations de la dictée qui ne correspondent à aucun champ, ou ambiguës')
});
export type LectureDictee = z.infer<typeof LectureSchema>;

const TEXTES = BIEN_FIELDS.filter((f) => f.kind === 'textarea')
  .map((f) => f.key)
  .join(', ');

const CONSIGNE = `${SYSTEM_PROMPT}

Cas particulier : DICTÉE COMPLÉMENTAIRE
La fiche du bien existe déjà ; le conseiller dicte des informations en plus (transcription automatique de sa voix :
quelques mots peuvent être mal reconnus, interprète-les avec bon sens dans le contexte immobilier).
- Remplis uniquement les champs dont la dictée parle. Tous les autres restent null (ou [] pour les listes).
- Si la dictée corrige une valeur déjà présente dans la fiche, donne la nouvelle valeur.
- Champs texte libres (${TEXTES}) : donne seulement le texte NOUVEAU à ajouter, l'application l'ajoute à la suite de l'existant.
- N'inscris jamais de nom, de téléphone ou d'e-mail de personne dans les champs du bien.
- Ce qui ne rentre dans aucun champ va dans « remarques », en une phrase courte chacun.

Réponds uniquement avec un objet JSON valide, sans texte autour ni bloc de code, conforme à ce schéma JSON :
${JSON.stringify(z.toJSONSchema(LectureSchema))}`;

export async function lireDictee(
  dictee: string,
  ficheActuelle: Record<string, unknown>,
  piecesJointes: unknown = []
): Promise<{ ok: true; data: LectureDictee } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!anthropicConfigured()) return { ok: false, error: 'La clé IA n’est pas configurée.' };
  const jointes = PiecesSchema.safeParse(piecesJointes);
  if (!jointes.success) return { ok: false, error: 'Pièces jointes invalides.' };
  const texte = dictee.trim();
  if (texte.length < 3 && !jointes.data.length) return { ok: false, error: 'La dictée est vide.' };
  if (texte.length > 8000) return { ok: false, error: 'La dictée est trop longue.' };

  // Contexte : valeurs déjà saisies (champs du bien uniquement, ni vendeur ni notes internes).
  const connu = Object.fromEntries(
    BIEN_FIELDS.filter((f) => f.key !== 'notes')
      .map((f) => [f.key, ficheActuelle[f.key]])
      .filter(
        ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)
      )
  );

  try {
    const system = `${CONSIGNE}\n\nAnnée en cours : ${new Date().getFullYear()}.`;
    const demande = `Fiche actuelle (JSON) :\n${JSON.stringify(connu)}\n\nDictée du conseiller :\n${texte || '(pas de dictée : lire les pièces jointes)'}`;
    // Pièces jointes (photos, PDF) lues avec la dictée : mêmes propositions champ par champ.
    const { blocs } = jointes.data.length
      ? await blocsPieces(supabase, user.id, jointes.data)
      : { blocs: [] };
    const { stopReason, texte: reponse } = blocs.length
      ? await demanderContenu(`${system}\n\n${CONSIGNE_PIECES}`, [
          ...blocs,
          { type: 'text', text: demande }
        ])
      : await demanderTexte(system, demande);
    if (stopReason === 'refusal')
      return { ok: false, error: 'L’IA n’a pas pu lire cette dictée. Reformulez-la.' };
    const parsed = LectureSchema.safeParse(extraireJson(reponse));
    if (!parsed.success) {
      console.error('dictee.lecture', parsed.error.issues.slice(0, 5));
      return { ok: false, error: 'La lecture de la dictée a échoué. Réessayez.' };
    }
    return { ok: true, data: parsed.data };
  } catch (e) {
    console.error('dictee.lecture', e);
    return { ok: false, error: 'Le service IA ne répond pas. Réessayez dans un instant.' };
  }
}
