import type { Vente } from '@/lib/estimation/geo';

export type CriteresMarche = {
  lieu: string;
  rayonKm: number;
  type: 'maison' | 'appartement' | 'tous';
  surfaceMin: number | null;
  surfaceMax: number | null;
  piecesMin: number | null;
  piecesMax: number | null;
  terrainMin: number | null;
  terrainMax: number | null;
  annees: number;
};

export type VenteMarche = Vente & { distanceKm: number | null; prixM2: number; atypique: boolean };

export type StatsMarche = {
  nb: number;
  medianeM2: number | null;
  q1M2: number | null;
  q3M2: number | null;
  prixMedian: number | null;
  surfaceMediane: number | null;
};

export type ResultatMarche = {
  centre: { lat: number; lon: number; commune: string; precision: 'adresse' | 'commune'; libelle: string };
  criteres: CriteresMarche;
  ventes: VenteMarche[];
  tronque: boolean;
  stats: StatsMarche;
  tendanceAnnuelle: number | null;
  parSemestre: { periode: string; nb: number; medianeM2: number }[];
  parCommune: { commune: string; nb: number; medianeM2: number }[];
};
