import 'server-only';
import { z } from 'zod';
import { demanderTexte, extraireJson } from './client';
import { TONS_LINKEDIN, type IdeePost, type TonLinkedin } from './linkedin-tons';

// Idées et rédaction de posts LinkedIn pour Julien Ossedat, conseiller Laforêt Roanne.
// Rien d'inventé : les chiffres et faits viennent uniquement de ce qu'on fournit au modèle.

export { TONS_LINKEDIN, type IdeePost, type TonLinkedin };

const IdeesSchema = z.object({
  idees: z.array(
    z.object({
      titre: z.string(),
      angle: z.string(),
      categorie: z.string()
    })
  )
});

const PostSchema = z.object({ texte: z.string() });

const CONTEXTE = `Tu aides Julien Ossedat, conseiller immobilier salarié de l'agence Laforêt de Roanne (Loire), à animer son profil LinkedIn personnel.
Son public : propriétaires du Roannais qui pensent à vendre, acquéreurs, partenaires (notaires, courtiers, artisans), réseau local.
Règles constantes
- N'invente jamais un chiffre, une vente, un client, un témoignage ou une statistique. N'utilise que les faits fournis ; sinon reste général ou pose une question.
- Ne cite jamais le nom d'un client, un numéro de rue ou une information privée (motif de vente, prix envisagé, situation personnelle).
- Pas de formulation discriminante (ne cible pas « jeunes couples », « familles », « retraités »).
- Pas de promesse de résultat ni de conseil financier personnalisé.
- Français, vouvoiement, phrases courtes.`;

export async function proposerIdees(faits: string, theme?: string) {
  const system = `${CONTEXTE}

Propose 6 idées de posts variées : coulisses du métier, conseil pratique (vendre, acheter, estimer, diagnostics, assainissement…), marché local (uniquement à partir des faits fournis), bien à mettre en avant (sans adresse exacte), valeurs et façon de travailler, question ouverte au réseau.
Pour chaque idée : titre (8 mots au plus), angle (une ou deux phrases : ce que dit le post et pourquoi il intéresse), categorie (un mot ou deux).
Réponds uniquement avec un objet JSON valide, sans texte autour :
${JSON.stringify(z.toJSONSchema(IdeesSchema))}`;
  const contenu = `Faits disponibles dans Ovalia (activité récente) :
${faits || 'Aucun fait particulier.'}
${theme ? `\nThème souhaité par Julien : ${theme}` : ''}`;
  const { texte } = await demanderTexte(system, contenu);
  const parsed = IdeesSchema.safeParse(extraireJson(texte));
  if (!parsed.success) throw new Error('Réponse IA illisible.');
  return parsed.data.idees.slice(0, 8) satisfies IdeePost[];
}

export async function redigerPost(sujet: string, ton: TonLinkedin, faits: string) {
  const system = `${CONTEXTE}

Rédige un post LinkedIn prêt à publier.
- Ton : ${TONS_LINKEDIN[ton]}.
- 700 à 1 300 caractères. Première ligne accrocheuse (elle s'affiche seule avant « voir plus »). Paragraphes courts séparés par une ligne vide.
- Termine par une question ou une invitation simple à échanger. 3 hashtags au plus, en fin de post (#Roanne, #immobilier…).
- Pas de lien dans le texte. Deux emojis au plus, ou aucun.
- Ne mentionne pas de prix sauf s'il figure dans les faits fournis.
Réponds uniquement avec un objet JSON valide, sans texte autour :
${JSON.stringify(z.toJSONSchema(PostSchema))}`;
  const contenu = `Sujet du post : ${sujet}

Faits disponibles (n'utilise que ceux utiles au sujet) :
${faits || 'Aucun.'}`;
  const { texte } = await demanderTexte(system, contenu);
  const parsed = PostSchema.safeParse(extraireJson(texte));
  if (!parsed.success) throw new Error('Réponse IA illisible.');
  return parsed.data.texte.trim();
}
