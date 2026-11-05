'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { communesProches, geocoder, ventesDvf } from '@/lib/estimation/dvf';
import { distanceKm } from '@/lib/estimation/geo';
import { tendance } from '@/lib/estimation/calcul';
import type { CriteresMarche, ResultatMarche, StatsMarche, VenteMarche } from './types';

const MAX_VENTES = 2500;
const nombre = z.number().min(0).nullable();

const CriteresSchema = z.object({
  lieu: z.string().trim().min(2).max(200),
  rayonKm: z.number().min(0.3).max(15),
  type: z.enum(['maison', 'appartement', 'tous']),
  surfaceMin: nombre,
  surfaceMax: nombre,
  piecesMin: nombre,
  piecesMax: nombre,
  terrainMin: nombre,
  terrainMax: nombre,
  annees: z.number().int().min(1).max(5)
});

const mediane = (xs: number[]) => {
  if (xs.length === 0) return null;
  const t = [...xs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m]! : (t[m - 1]! + t[m]!) / 2;
};
const quantile = (xs: number[], q: number) => {
  if (xs.length === 0) return null;
  const t = [...xs].sort((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor(q * t.length))]!;
};

function stats(ventes: VenteMarche[]): StatsMarche {
  const fiables = ventes.filter((v) => !v.atypique);
  const m2 = fiables.map((v) => v.prixM2);
  const r = (n: number | null) => (n === null ? null : Math.round(n));
  return {
    nb: ventes.length,
    medianeM2: r(mediane(m2)),
    q1M2: r(quantile(m2, 0.25)),
    q3M2: r(quantile(m2, 0.75)),
    prixMedian: r(mediane(fiables.map((v) => v.prix))),
    surfaceMediane: r(mediane(fiables.map((v) => v.surface)))
  };
}

export async function rechercherMarche(input: CriteresMarche): Promise<{ ok: true; data: ResultatMarche } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const parsed = CriteresSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Vérifiez les critères : un lieu et un rayon entre 0,3 et 15 km.' };
  const c = parsed.data;

  const centre = await geocoder(c.lieu);
  if (!centre) return { ok: false, error: `Adresse ou commune introuvable : « ${c.lieu} ».` };

  // Marge de 3 km : une commune dont le centre est un peu au-delà du rayon peut avoir des ventes dedans.
  const communes = (await communesProches(centre, c.rayonKm + 3)).slice(0, 25);
  const brutes = await ventesDvf(
    communes.map((x) => x.code),
    c.annees
  );

  const limiteDate = new Date();
  limiteDate.setFullYear(limiteDate.getFullYear() - c.annees);
  const dans = (v: number, min: number | null, max: number | null) => (min === null || v >= min) && (max === null || v <= max);

  const ventes: VenteMarche[] = brutes
    .filter((v) => (c.type === 'tous' ? true : v.type === c.type))
    .filter((v) => new Date(v.date) >= limiteDate)
    .filter((v) => dans(v.surface, c.surfaceMin, c.surfaceMax))
    .filter((v) => (c.piecesMin === null && c.piecesMax === null) || (v.pieces !== null && dans(v.pieces, c.piecesMin, c.piecesMax)))
    .filter((v) => dans(v.terrain, c.terrainMin, c.terrainMax))
    .map((v) => {
      const d = v.lat !== null && v.lon !== null ? distanceKm(centre, { lat: v.lat, lon: v.lon }) : null;
      const prixM2 = v.prix / v.surface;
      return { ...v, distanceKm: d === null ? null : Math.round(d * 100) / 100, prixM2: Math.round(prixM2), atypique: prixM2 < 300 || prixM2 > 9000 };
    })
    // Sans coordonnées, on ne garde la vente que si elle est dans la commune recherchée.
    .filter((v) => (v.distanceKm === null ? v.commune === centre.commune : v.distanceKm <= c.rayonKm))
    .sort((a, b) => b.date.localeCompare(a.date));

  const parSemestreMap = new Map<string, number[]>();
  const parCommuneMap = new Map<string, number[]>();
  for (const v of ventes) {
    if (v.atypique) continue;
    const d = new Date(v.date);
    const periode = `${d.getFullYear()}-S${d.getMonth() < 6 ? 1 : 2}`;
    parSemestreMap.set(periode, [...(parSemestreMap.get(periode) ?? []), v.prixM2]);
    parCommuneMap.set(v.commune, [...(parCommuneMap.get(v.commune) ?? []), v.prixM2]);
  }

  const data: ResultatMarche = {
    centre: { lat: centre.lat, lon: centre.lon, commune: centre.commune, precision: centre.precision, libelle: c.lieu },
    criteres: c,
    ventes: ventes.slice(0, MAX_VENTES),
    tronque: ventes.length > MAX_VENTES,
    stats: stats(ventes),
    tendanceAnnuelle: tendance(ventes.filter((v) => !v.atypique)),
    parSemestre: [...parSemestreMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periode, xs]) => ({ periode: periode.replace('-', ' '), nb: xs.length, medianeM2: Math.round(mediane(xs)!) })),
    parCommune: [...parCommuneMap.entries()]
      .map(([commune, xs]) => ({ commune, nb: xs.length, medianeM2: Math.round(mediane(xs)!) }))
      .sort((a, b) => b.nb - a.nb)
  };
  return { ok: true, data };
}
