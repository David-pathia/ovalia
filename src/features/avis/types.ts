import type { ComparableResume } from '@/lib/estimation/estimer';

// Avis de valeur : réglages saisis par le conseiller, enregistrés dans `bien_analyses` (type « avis_valeur »).
// Les chiffres (marché, comparables, ajustements) sont relus dans l'estimation au moment de générer le PDF.

export type Agence = {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  site: string;
  horaires: string;
  mentions: string;
};

export type Conseiller = { nom: string; titre: string; telephone: string; email: string };

export const PAGES_AVIS = [
  ['secteur', 'Votre secteur et son marché'],
  ['bien', 'Votre bien (fiche d’estimation et relevé)'],
  ['comparables', 'Ventes comparables'],
  ['positionnement', 'Positionnement sur le marché'],
  ['ajustements', 'Ajustements de valeur'],
  ['valeurVerte', 'Valeur verte (DPE)'],
  ['financement', 'Financement acquéreur (18 et 20 ans)'],
  ['methode', 'Méthode et sources']
] as const;

export type PageAvis = (typeof PAGES_AVIS)[number][0];

export type AvisDetails = {
  version: 1;
  estimationId: string;
  dateAvis: string; // AAAA-MM-JJ
  destinataire: { civilite: string; nom: string; prenom: string };
  conseiller: Conseiller;
  agence: Agence;
  prix: { basse: number; haute: number; conseille: number; tauxHonoraires: number };
  textes: { introduction: string; bien: string; conclusion: string };
  comparables: string[]; // clés des comparables retenus (cleComparable), 10 au plus
  photos: { couverture: string | null; bien: string[] }; // identifiants bien_images
  pages: Record<PageAvis, boolean>;
};

export const AGENCE_DEFAUT: Agence = {
  nom: 'Laforêt Roanne',
  adresse: '38 rue Émile Noirot',
  codePostal: '42300',
  ville: 'Roanne',
  telephone: '04 77 23 09 09',
  email: 'roanne@laforet.com',
  site: 'www.laforet.com/roanne',
  horaires: 'Du lundi au vendredi, 9 h - 12 h et 14 h - 18 h',
  mentions:
    'L’Agence Gambetta, SAS au capital de 10 000 €, siège social 38 rue Émile Noirot 42300 Roanne. SIREN 949 374 227, TVA FR60949374227. Agent immobilier et administrateur de biens, carte professionnelle (T) CPI 42012023000000003. Garanties financières transaction et gestion : Allianz, 1 cours Michelet, 92076 Paris La Défense. Chaque agence est une entité juridiquement et financièrement indépendante.'
};

export const MAX_COMPARABLES_AVIS = 10;

export function cleComparable(c: Pick<ComparableResume, 'date' | 'prix' | 'surface'> & { id?: string }) {
  return c.id ?? `${c.date}|${c.prix}|${c.surface}`;
}

export const arrondiPrix = (n: number, pas = 5000) => Math.round(n / pas) * pas;
