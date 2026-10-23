import 'server-only';

// Accès aux données publiques : Base Adresse Nationale, découpage communal (geo.api.gouv.fr)
// et DVF géolocalisées (files.data.gouv.fr/geo-dvf), une fichier CSV par commune et par année.

import { distanceKm, type Point } from './geo';

export type { Point };
export type Localisation = Point & { codeInsee: string; commune: string; precision: 'adresse' | 'commune' };

export type { Vente } from './geo';
import type { Vente } from './geo';

const UNE_SEMAINE = 60 * 60 * 24 * 7;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: UNE_SEMAINE } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}


export async function localiser(bien: {
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
}): Promise<Localisation | null> {
  const lieu = [bien.code_postal, bien.ville].filter(Boolean).join(' ');
  if (!lieu) return null;

  if (bien.adresse) {
    const q = encodeURIComponent(`${bien.adresse} ${lieu}`);
    const r = await getJson<{
      features: { geometry: { coordinates: [number, number] }; properties: { citycode: string; city: string; score: number; type: string } }[];
    }>(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1`);
    const f = r?.features?.[0];
    if (f && f.properties.score > 0.5 && f.properties.type !== 'municipality') {
      return {
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        codeInsee: f.properties.citycode,
        commune: f.properties.city,
        precision: 'adresse'
      };
    }
  }

  const params = new URLSearchParams({ fields: 'code,nom,centre', boost: 'population', limit: '1' });
  if (bien.ville) params.set('nom', bien.ville);
  if (bien.code_postal) params.set('codePostal', bien.code_postal);
  const communes = await getJson<{ code: string; nom: string; centre: { coordinates: [number, number] } }[]>(
    `https://geo.api.gouv.fr/communes?${params}`
  );
  const c = communes?.[0];
  if (!c) return null;
  return { lon: c.centre.coordinates[0], lat: c.centre.coordinates[1], codeInsee: c.code, commune: c.nom, precision: 'commune' };
}

/** Communes du département dont le centre est à moins de `rayonKm` du point, la plus proche en premier. */
export async function communesProches(loc: Localisation, rayonKm: number) {
  const dep = loc.codeInsee.startsWith('97') ? loc.codeInsee.slice(0, 3) : loc.codeInsee.slice(0, 2);
  const communes = await getJson<{ code: string; nom: string; centre?: { coordinates: [number, number] } }[]>(
    `https://geo.api.gouv.fr/departements/${dep}/communes?fields=code,nom,centre`
  );
  return (communes ?? [])
    .filter((c) => c.centre)
    .map((c) => ({
      code: c.code,
      nom: c.nom,
      distance: distanceKm(loc, { lon: c.centre!.coordinates[0], lat: c.centre!.coordinates[1] })
    }))
    .filter((c) => c.code === loc.codeInsee || c.distance <= rayonKm)
    .sort((a, b) => a.distance - b.distance);
}

function parseCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  let champ = '';
  let ligne: string[] = [];
  let guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === ',') {
      ligne.push(champ);
      champ = '';
    } else if (c === '\n') {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = '';
    } else if (c !== '\r') champ += c;
  }
  if (champ || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes;
}

/**
 * Ventes d'une commune pour une année, regroupées par mutation.
 * On ne garde que les ventes d'un seul logement (maison ou appartement), éventuellement avec dépendances :
 * le prix d'une vente groupée ne peut pas être attribué à un bien précis.
 */
async function ventesCommuneAnnee(codeInsee: string, annee: number): Promise<Vente[]> {
  const dep = codeInsee.startsWith('97') ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
  let texte: string;
  try {
    const res = await fetch(`https://files.data.gouv.fr/geo-dvf/latest/csv/${annee}/communes/${dep}/${codeInsee}.csv`, {
      next: { revalidate: UNE_SEMAINE }
    });
    if (!res.ok) return [];
    texte = await res.text();
  } catch {
    return [];
  }

  const [entete, ...lignes] = parseCsv(texte);
  if (!entete) return [];
  const col = Object.fromEntries(entete.map((nom, i) => [nom, i]));
  const v = (l: string[], nom: string) => l[col[nom]] ?? '';

  type Agg = {
    date: string;
    prix: number;
    nature: string;
    logements: Map<string, { type: string; surface: number; pieces: number | null; lat: number | null; lon: number | null; adresse: string }>;
    dependances: Set<string>;
    terrains: Map<string, number>;
    commune: string;
  };
  const mutations = new Map<string, Agg>();

  for (const l of lignes) {
    if (l.length < entete.length - 1) continue;
    const id = v(l, 'id_mutation');
    let m = mutations.get(id);
    if (!m) {
      m = {
        date: v(l, 'date_mutation'),
        prix: Number(v(l, 'valeur_fonciere')),
        nature: v(l, 'nature_mutation'),
        logements: new Map(),
        dependances: new Set(),
        terrains: new Map(),
        commune: v(l, 'nom_commune')
      };
      mutations.set(id, m);
    }
    const type = v(l, 'type_local');
    const parcelle = v(l, 'id_parcelle');
    const cleLocal = `${parcelle}|${v(l, 'lot1_numero')}|${type}|${v(l, 'surface_reelle_bati')}`;
    if (type === 'Maison' || type === 'Appartement') {
      m.logements.set(cleLocal, {
        type,
        surface: Number(v(l, 'surface_reelle_bati')) || 0,
        pieces: v(l, 'nombre_pieces_principales') ? Number(v(l, 'nombre_pieces_principales')) : null,
        lat: v(l, 'latitude') ? Number(v(l, 'latitude')) : null,
        lon: v(l, 'longitude') ? Number(v(l, 'longitude')) : null,
        adresse: [v(l, 'adresse_numero'), v(l, 'adresse_nom_voie')].filter(Boolean).join(' ')
      });
    } else if (type === 'Dépendance') {
      m.dependances.add(cleLocal);
    } else if (type) {
      m.logements.set(cleLocal, { type: 'autre', surface: 0, pieces: null, lat: null, lon: null, adresse: '' });
    }
    const terrain = Number(v(l, 'surface_terrain'));
    if (terrain > 0) m.terrains.set(`${parcelle}|${v(l, 'code_nature_culture')}`, terrain);
  }

  const ventes: Vente[] = [];
  for (const [id, m] of mutations) {
    if (m.nature !== 'Vente' || !(m.prix > 0) || m.logements.size !== 1) continue;
    const log = [...m.logements.values()][0]!;
    if (log.type !== 'Maison' && log.type !== 'Appartement') continue;
    if (!(log.surface >= 9)) continue;
    ventes.push({
      id,
      date: m.date,
      prix: m.prix,
      type: log.type === 'Maison' ? 'maison' : 'appartement',
      surface: log.surface,
      pieces: log.pieces,
      terrain: [...m.terrains.values()].reduce((s, t) => s + t, 0),
      dependances: m.dependances.size,
      adresse: log.adresse,
      commune: m.commune,
      lat: log.lat,
      lon: log.lon
    });
  }
  return ventes;
}

/** Ventes des `annees` dernières années pour une liste de communes. */
export async function ventesDvf(codes: string[], annees = 5): Promise<Vente[]> {
  const derniere = new Date().getFullYear();
  const taches = codes.flatMap((code) =>
    Array.from({ length: annees + 1 }, (_, i) => ventesCommuneAnnee(code, derniere - i))
  );
  return (await Promise.all(taches)).flat();
}
