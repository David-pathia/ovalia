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
