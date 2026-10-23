import { distanceKm, type Point, type Vente } from './geo';

// Calcul déterministe à partir des ventes DVF : comparables, indexation dans le temps,
// prix au m² médian pondéré, fourchette, puis ajustements qualitatifs et honoraires.

export const TAUX_HONORAIRES = 0.125; // part des honoraires dans le prix affiché (Laforêt Roanne)

export type BienEstime = {
  type: string;
  surface: number;
  pieces: number | null;
  terrain: number | null;
};

export type Comparable = Vente & {
  distanceKm: number | null;
  prixM2: number;
  prixM2Indexe: number;
  poids: number;
};

export type Ajustement = { libelle: string; pourcentage: number; justification: string };

export type Marche = {
  prixM2: number; // médiane pondérée, indexée à aujourd'hui
  prixM2Bas: number; // 1er quartile pondéré
  prixM2Haut: number; // 3e quartile pondéré
  nbVentesZone: number;
  rayonKm: number;
  tendanceAnnuelle: number | null; // évolution moyenne du prix au m² par an dans la zone
  confiance: 'élevée' | 'moyenne' | 'faible';
  criteres: string;
};

export type Resultat = {
  valeurBase: number;
  totalAjustements: number;
  valeurBasse: number;
  valeurProbable: number;
  valeurHaute: number;
  prixM2: number;
  prixConseille: number; // prix affiché, honoraires inclus
  honoraires: number;
  netVendeur: number;
};

const AUJOURDHUI = () => Date.now();
const moisDepuis = (date: string) => (AUJOURDHUI() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

function quantilePondere(valeurs: { v: number; w: number }[], q: number) {
  const tri = [...valeurs].sort((a, b) => a.v - b.v);
  const total = tri.reduce((s, x) => s + x.w, 0);
  let cumul = 0;
  for (const x of tri) {
    cumul += x.w;
    if (cumul >= q * total) return x.v;
  }
  return tri[tri.length - 1]?.v ?? 0;
}

const mediane = (xs: number[]) => {
  const t = [...xs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m]! : (t[m - 1]! + t[m]!) / 2;
};

/** Évolution annuelle du prix au m² dans la zone (régression sur les médianes par semestre), bornée à ±10 %/an. */
function tendance(ventes: Vente[]): number | null {
  const parSemestre = new Map<number, number[]>();
  for (const v of ventes) {
    const d = new Date(v.date);
    const s = d.getFullYear() * 2 + (d.getMonth() >= 6 ? 1 : 0);
    parSemestre.set(s, [...(parSemestre.get(s) ?? []), v.prix / v.surface]);
  }
  const points = [...parSemestre.entries()].filter(([, xs]) => xs.length >= 5).map(([s, xs]) => ({ x: s / 2, y: Math.log(mediane(xs)) }));
  if (points.length < 4) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const my = points.reduce((s, p) => s + p.y, 0) / points.length;
  const pente =
    points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return Math.max(-0.1, Math.min(0.1, Math.exp(pente) - 1));
}

export function selectionnerComparables(
  bien: BienEstime,
  ventes: Vente[],
  origine: Point,
  precisionAdresse: boolean
): { comparables: Comparable[]; marche: Marche } | null {
  const type = bien.type === 'maison' ? 'maison' : bien.type === 'appartement' ? 'appartement' : null;
  if (!type || !(bien.surface > 0)) return null;

  const zone = ventes.filter((v) => {
    const m2 = v.prix / v.surface;
    return v.type === type && m2 > 300 && m2 < 9000 && moisDepuis(v.date) <= 66;
  });
  const evolution = tendance(zone);

  // On élargit progressivement les critères jusqu'à avoir assez de ventes comparables.
  const paliers = [
    { surface: 0.25, pieces: 1, terrain: 2.5, rayon: 4 },
    { surface: 0.35, pieces: 1, terrain: 4, rayon: 7 },
    { surface: 0.5, pieces: 2, terrain: Infinity, rayon: 12 }
  ];

  for (const [i, p] of paliers.entries()) {
    const candidats = zone
      .map((v) => {
        const d = v.lat !== null && v.lon !== null ? distanceKm(origine, { lat: v.lat, lon: v.lon }) : null;
        return { v, d };
      })
      .filter(({ v, d }) => {
        if (Math.abs(v.surface - bien.surface) / bien.surface > p.surface) return false;
        if (bien.pieces && v.pieces && Math.abs(v.pieces - bien.pieces) > p.pieces) return false;
        if (type === 'maison' && bien.terrain && bien.terrain > 0 && Number.isFinite(p.terrain)) {
          if (v.terrain > 0 && (v.terrain > bien.terrain * p.terrain || v.terrain < bien.terrain / p.terrain)) return false;
        }
        return d === null || d <= p.rayon;
      });

    if (candidats.length < 8 && i < paliers.length - 1) continue;
    if (candidats.length < 3) return null;

    const comparables: Comparable[] = candidats.map(({ v, d }) => {
      const mois = moisDepuis(v.date);
      const prixM2 = v.prix / v.surface;
      const prixM2Indexe = evolution === null ? prixM2 : prixM2 * (1 + evolution) ** (mois / 12);
      const wTemps = Math.max(0.25, 1 - mois / 72);
      const wSurface = 1 - Math.min(0.6, Math.abs(v.surface - bien.surface) / bien.surface);
      const wDistance = d === null ? 0.6 : precisionAdresse ? 1 / (1 + d / 1.5) : 1 / (1 + d / 4);
      return { ...v, distanceKm: d, prixM2, prixM2Indexe, poids: wTemps * wSurface * wDistance };
    });

    // Retire les extrêmes (au-delà de 1,5 écart interquartile) pour éviter qu'une vente atypique tire la moyenne.
    const brut = comparables.map((c) => ({ v: c.prixM2Indexe, w: c.poids }));
    const q1 = quantilePondere(brut, 0.25);
    const q3 = quantilePondere(brut, 0.75);
    const iqr = q3 - q1;
    const retenus = comparables
      .filter((c) => c.prixM2Indexe >= q1 - 1.5 * iqr && c.prixM2Indexe <= q3 + 1.5 * iqr)
      .sort((a, b) => b.poids - a.poids);

    const pts = retenus.map((c) => ({ v: c.prixM2Indexe, w: c.poids }));
    const prixM2 = quantilePondere(pts, 0.5);
    const prixM2Bas = quantilePondere(pts, 0.25);
    const prixM2Haut = quantilePondere(pts, 0.75);
    const dispersion = (prixM2Haut - prixM2Bas) / prixM2;
    const recentes = retenus.filter((c) => moisDepuis(c.date) <= 24).length;
    const confiance: Marche['confiance'] =
      retenus.length >= 12 && dispersion < 0.35 && recentes >= 4 ? 'élevée' : retenus.length >= 6 && dispersion < 0.55 ? 'moyenne' : 'faible';

    return {
      comparables: retenus,
      marche: {
        prixM2,
        prixM2Bas,
        prixM2Haut,
        nbVentesZone: zone.length,
        rayonKm: p.rayon,
        tendanceAnnuelle: evolution,
        confiance,
        criteres: `${type === 'maison' ? 'Maisons' : 'Appartements'} de ${Math.round(bien.surface * (1 - p.surface))} à ${Math.round(bien.surface * (1 + p.surface))} m²${bien.pieces ? `, ${bien.pieces - p.pieces} à ${bien.pieces + p.pieces} pièces` : ''}, à moins de ${p.rayon} km, vendues depuis 5 ans`
      }
    };
  }
  return null;
}

const arrondi = (n: number, pas: number) => Math.round(n / pas) * pas;

export function calculerValeurs(surface: number, marche: Marche, ajustements: Ajustement[]): Resultat {
  const total = Math.max(-0.3, Math.min(0.3, ajustements.reduce((s, a) => s + a.pourcentage, 0) / 100));
  const coef = 1 + total;
  const valeurBase = surface * marche.prixM2;
  const valeurProbable = arrondi(valeurBase * coef, 500);
  // La fourchette suit la dispersion du marché, limitée à ±12 % autour de la valeur probable.
  const bas = Math.max(surface * marche.prixM2Bas * coef, valeurProbable * 0.88);
  const haut = Math.min(surface * marche.prixM2Haut * coef, valeurProbable * 1.12);
  const prixConseille = arrondi(valeurProbable, 1000);
  const honoraires = arrondi(prixConseille * TAUX_HONORAIRES, 100);
  return {
    valeurBase: arrondi(valeurBase, 500),
    totalAjustements: Math.round(total * 1000) / 10,
    valeurBasse: arrondi(Math.min(bas, valeurProbable), 500),
    valeurProbable,
    valeurHaute: arrondi(Math.max(haut, valeurProbable), 500),
    prixM2: Math.round(valeurProbable / surface),
    prixConseille,
    honoraires,
    netVendeur: prixConseille - honoraires
  };
}
