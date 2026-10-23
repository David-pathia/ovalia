// Simulation de prêt immobilier amortissable à mensualités constantes (calcul pur, utilisable côté client).

export type ParametresCredit = {
  taux_15: number | null;
  taux_20: number | null;
  taux_25: number | null;
  usure_10_20: number | null;
  usure_20_plus: number | null;
  source: string | null;
  taux_du: string | null;
  apport_pct: number;
  assurance_pct: number;
  notaire_pct: number;
};

export const PARAMETRES_DEFAUT: ParametresCredit = {
  taux_15: null,
  taux_20: null,
  taux_25: null,
  usure_10_20: null,
  usure_20_plus: null,
  source: null,
  taux_du: null,
  apport_pct: 10,
  assurance_pct: 0.3,
  notaire_pct: 7.5
};

export const ENDETTEMENT_MAX = 0.35; // règle HCSF, assurance comprise

/** Taux nominal pour une durée, par interpolation linéaire dans la grille 15 / 20 / 25 ans. */
export function tauxPourDuree(p: ParametresCredit, annees: number): number | null {
  const grille: [number, number | null][] = [
    [15, p.taux_15],
    [20, p.taux_20],
    [25, p.taux_25]
  ];
  const points = grille.filter((x): x is [number, number] => x[1] !== null);
  if (points.length === 0) return null;
  const exact = points.find(([d]) => d === annees);
  if (exact) return exact[1];
  const avant = [...points].reverse().find(([d]) => d < annees);
  const apres = points.find(([d]) => d > annees);
  if (avant && apres) return avant[1] + ((apres[1] - avant[1]) * (annees - avant[0])) / (apres[0] - avant[0]);
  return (avant ?? apres)![1];
}

export function usurePourDuree(p: ParametresCredit, annees: number) {
  return annees >= 20 ? p.usure_20_plus : p.usure_10_20;
}

export type Simulation = {
  annees: number;
  taux: number;
  capital: number;
  mensualiteHorsAssurance: number;
  assuranceMensuelle: number;
  mensualite: number;
  coutInterets: number;
  coutAssurance: number;
  coutTotal: number;
  revenusNecessaires: number;
  taegApproche: number;
  usure: number | null;
  depasseUsure: boolean;
};

export function simuler(capital: number, tauxAnnuelPct: number, annees: number, assurancePct: number, usure: number | null): Simulation {
  const n = annees * 12;
  const r = tauxAnnuelPct / 100 / 12;
  const mensualiteHorsAssurance = r === 0 ? capital / n : (capital * r) / (1 - (1 + r) ** -n);
  const assuranceMensuelle = (capital * assurancePct) / 100 / 12;
  const mensualite = mensualiteHorsAssurance + assuranceMensuelle;
  const coutInterets = mensualiteHorsAssurance * n - capital;
  const coutAssurance = assuranceMensuelle * n;
  // Approximation : le TAEG réel inclut aussi les frais de dossier et de garantie.
  const taegApproche = tauxAnnuelPct + assurancePct;
  return {
    annees,
    taux: tauxAnnuelPct,
    capital,
    mensualiteHorsAssurance,
    assuranceMensuelle,
    mensualite,
    coutInterets,
    coutAssurance,
    coutTotal: coutInterets + coutAssurance,
    revenusNecessaires: mensualite / ENDETTEMENT_MAX,
    taegApproche,
    usure,
    depasseUsure: usure !== null && taegApproche > usure
  };
}

/** Jours écoulés depuis la date de la grille (null si jamais renseignée). */
export function ancienneteJours(date: string | null) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}
