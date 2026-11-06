import 'server-only';
import { z } from 'zod';
import { anthropicConfigured, demanderTexte, extraireJson } from './client';
import type { TonAnnonce } from './annonce-tons';

// Projet d'annonce immobilière rédigé par Claude à partir de la fiche du bien.
// Le prix et les mentions légales ne viennent jamais du modèle : ils sont ajoutés par l'application.

export type { TonAnnonce } from './annonce-tons';

const AnnonceIASchema = z.object({
  titre: z.string(),
  texte: z.string(),
  pointsForts: z.array(z.string())
});
export type AnnonceIA = z.infer<typeof AnnonceIASchema>;

const TONS: Record<TonAnnonce, string> = {
  sobre: 'Sobre : factuel et précis, phrases courtes, aucune emphase.',
  chaleureux:
    'Chaleureux : l’acquéreur se projette dans sa future vie (« vous profiterez… », les repas en terrasse, la lumière du séjour), avec des mots simples et concrets, sans en faire trop.',
  prestige:
    'Prestige : élégant et posé, met en valeur volumes, matériaux et prestations, sans superlatifs creux.'
};

const system = (
  ton: TonAnnonce
) => `Tu rédiges les annonces immobilières d'une agence Laforêt (Roanne, Loire).
On te donne la fiche d'un bien relevée lors de la visite. Tu écris un projet d'annonce prêt à publier sur laforet.com et les portails.

Ton : ${TONS[ton]}

Règles
- Titre : 70 caractères au plus. Type de bien + atout principal + commune. Pas de majuscules en continu, pas d'emoji, pas de point d'exclamation.
- Texte : 900 à 1 400 caractères, 3 ou 4 paragraphes séparés par une ligne vide : accroche ; intérieur (pièces dans l'ordre de la visite, avec leurs surfaces quand elles sont connues) ; extérieurs et annexes ; situation et invitation à visiter.
- Points forts : 4 ou 5, de 6 mots au plus chacun.
- N'utilise que les informations fournies. N'invente rien : ni vue, ni calme, ni proximité des écoles ou commerces, ni matériaux, si la fiche ne le dit pas.
- Ne mentionne jamais : le prix, les honoraires, le motif ou le délai de vente, le prix envisagé par les propriétaires, un nom de personne, le numéro de rue.
- Reste honnête : si des travaux sont à prévoir, ne dis pas « rénové » ; formule-le positivement (« à personnaliser selon vos goûts »).
- Pas de superlatif sans justification (« exceptionnel », « rare », « coup de cœur assuré »).
- Aucune formulation discriminante : ne cible pas un type d'acquéreur (« idéal jeune couple », « pour une famille », « pour retraités »).
- Écris en français, au vouvoiement.

Réponds uniquement avec un objet JSON valide, sans texte autour :
${JSON.stringify(z.toJSONSchema(AnnonceIASchema))}`;

// Champs de la fiche utiles à une annonce (les champs confidentiels — motif, prix envisagé, notes internes — sont exclus).
const CHAMPS = [
  'type',
  'surface',
  'pieces',
  'chambres',
  'surface_terrain',
  'annee_construction',
  'annee_renovations',
  'nb_niveaux',
  'etage',
  'nb_etages',
  'ascenseur',
  'type_construction',
  'isolation_combles',
  'isolation_murs',
  'fenetres',
  'toiture',
  'chauffage_systeme',
  'chauffage_energie',
  'eau_chaude',
  'ventilation',
  'assainissement',
  'dpe_classe',
  'ges_classe',
  'derniers_travaux',
  'travaux_a_prevoir',
  'garage',
  'sous_sol_dependances',
  'annexes',
  'orientation',
  'exterieurs',
  'etat_general',
  'observations',
  'ville'
] as const;

export async function genererAnnonce(
  bien: Record<string, unknown>,
  pieces: { nom: string; surface: number | null; niveau?: string | null }[],
  ton: TonAnnonce = 'chaleureux'
): Promise<{ ok: true; annonce: AnnonceIA } | { ok: false; error: string }> {
  if (!anthropicConfigured())
    return {
      ok: false,
      error: 'Clé IA absente : rédigez l’annonce à la main.'
    };
  const fiche = Object.fromEntries(
    CHAMPS.map((k) => [k, bien[k]]).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  const contenu = JSON.stringify(
    {
      bien: fiche,
      pieces: pieces.map((p) => ({
        nom: p.nom,
        surface_m2: p.surface === null ? null : Math.round(Number(p.surface) * 10) / 10,
        niveau: p.niveau ?? null
      }))
    },
    null,
    1
  );
  try {
    const { stopReason, texte } = await demanderTexte(system(ton), contenu);
    if (stopReason === 'refusal')
      return { ok: false, error: 'L’IA a refusé de rédiger l’annonce.' };
    const parsed = AnnonceIASchema.safeParse(extraireJson(texte));
    if (!parsed.success)
      return {
        ok: false,
        error: 'Réponse IA illisible : relancez la rédaction.'
      };
    const a = parsed.data;
    return {
      ok: true,
      annonce: {
        titre: a.titre.trim().slice(0, 90),
        texte: a.texte.trim(),
        pointsForts: a.pointsForts
          .map((p) => p.trim())
          .filter(Boolean)
          .slice(0, 5)
      }
    };
  } catch (error) {
    console.error('annonce.ia', error);
    return {
      ok: false,
      error: 'Le service IA n’a pas répondu : relancez la rédaction.'
    };
  }
}
