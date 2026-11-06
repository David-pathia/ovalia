// Statistiques sourcées du dossier d'estimation (vérifiées le 6 novembre 2026). Ne rien ajouter sans source publique et datée.

export const NEGOCIATION: { texte: string; source: string } | null = {
  texte:
    'Selon le réseau Laforêt, la marge de négociation moyenne atteint 5,1 % en régions et 9 acquisitions sur 10 font l’objet d’une négociation : c’est un ordre de grandeur, qui varie selon le secteur et le type de bien.',
  source: 'Laforêt, Billet de tendances du 3e trimestre 2026 (laforet.com, espace presse).'
};

type ValeurVerte = {
  titre: string;
  lignes: { classe: string; pct: number }[];
  source: string;
  note?: string;
};

const SOURCE_NOTAIRES =
  'Notaires de France, « La valeur verte des logements en France – transactions 2024 », décembre 2025. Écart de prix par rapport à la classe D, à caractéristiques comparables, Auvergne-Rhône-Alpes.';

/** Écart de prix selon la classe DPE (Notaires de France), maisons ou appartements d'Auvergne-Rhône-Alpes. */
export function valeurVerte(type: unknown): ValeurVerte {
  return type === 'appartement'
    ? {
        titre: 'Le DPE et le prix : appartements anciens en Auvergne-Rhône-Alpes',
        lignes: [
          { classe: 'A-B', pct: 11 },
          { classe: 'C', pct: 5 },
          { classe: 'D', pct: 0 },
          { classe: 'E', pct: -6 },
          { classe: 'F', pct: -9 },
          { classe: 'G', pct: -15 }
        ],
        source: SOURCE_NOTAIRES
      }
    : {
        titre: 'Le DPE et le prix : maisons anciennes en Auvergne-Rhône-Alpes',
        lignes: [
          { classe: 'A-B', pct: 12 },
          { classe: 'C', pct: 6 },
          { classe: 'D', pct: 0 },
          { classe: 'E', pct: -7 },
          { classe: 'F', pct: -17 },
          { classe: 'G', pct: -24 }
        ],
        source: SOURCE_NOTAIRES
      };
}

export const DPE_ANNONCES = {
  texte:
    'Au 1er janvier 2025, les logements classés F ou G restaient en moyenne 84 jours en vente, contre 79 jours pour les classes A à E, avec une marge de négociation de 5,9 % contre 3 % pour la classe D.',
  source: 'SeLoger et Meilleurs Agents, communiqué « Impact DPE », mai 2025.'
};

/** Coûts indicatifs liés à l'assainissement, tarifs locaux en priorité (Roannaise de l'Eau gère le SPANC et l'assainissement du Roannais). */
export const COUTS_ASSAINISSEMENT: {
  groupes: { titre: string; lignes: { libelle: string; fourchette: string }[] }[];
  mention: string;
} | null = {
  groupes: [
    {
      titre: 'Interventions ponctuelles (Roannais, 2026)',
      lignes: [
        { libelle: 'Contrôle SPANC en vue de la vente', fourchette: '170 € HT' },
        { libelle: 'Contrôle du branchement (collectif)', fourchette: '170 € HT' },
        { libelle: 'Vidange de la fosse (jusqu’à 5 m³)', fourchette: '170 € HT' }
      ]
    },
    {
      titre: 'Travaux partiels',
      lignes: [
        { libelle: 'Étude de sol et de filière', fourchette: '800 à 2 000 €' },
        { libelle: 'Fosse toutes eaux (fourniture)', fourchette: '420 à 1 500 €' },
        { libelle: 'Reprise partielle', fourchette: 'selon devis' }
      ]
    },
    {
      titre: 'Réhabilitation complète (non collectif)',
      lignes: [
        { libelle: 'Épandage, filtre à sable…', fourchette: '6 600 à 11 300 € TTC' },
        { libelle: 'Micro-station ou filtre compact', fourchette: '6 000 à 12 000 €' }
      ]
    },
    {
      titre: 'Aides possibles (2026)',
      lignes: [
        { libelle: 'Roannaise de l’Eau (non collectif)', fourchette: '40 %, 4 000 € max.' },
        { libelle: 'Agence de l’eau (branchement)', fourchette: '50 %, 4 675 € max.' },
        { libelle: 'Éco-prêt à taux zéro', fourchette: 'jusqu’à 10 000 €' }
      ]
    }
  ],
  mention:
    'Montants indicatifs, sous réserve de devis et des conditions d’attribution des aides. Sources : Roannaise de l’Eau, catalogue des tarifs 2026 et formulaires de subvention 2026 ; ministère de la Transition écologique, « Assainissement non collectif » (référence nationale 2013) ; renovbox.fr, prix constatés 2026 (étude, fourniture, micro-station) ; service-public.gouv.fr (éco-PTZ).'
};
