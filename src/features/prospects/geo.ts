import 'server-only';

// Résolution des noms de communes (code INSEE et centre) via geo.api.gouv.fr, Loire et départements voisins en priorité.

export type CommuneGeo = { code: string; nom: string; lat: number; lon: number };

const DEPARTEMENTS = ['42', '71', '69', '03', '63', '43'];
const cache = new Map<string, CommuneGeo | null>();

export async function resoudreCommune(nom: string): Promise<CommuneGeo | null> {
  const cle = nom.trim().toLowerCase();
  if (!cle) return null;
  if (cache.has(cle)) return cache.get(cle)!;
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nom)}&fields=code,nom,centre,codeDepartement&boost=population&limit=10`,
      { next: { revalidate: 60 * 60 * 24 * 30 } }
    );
    const liste = res.ok
      ? ((await res.json()) as {
          code: string;
          nom: string;
          codeDepartement: string;
          centre?: { coordinates: [number, number] };
          _score?: number;
        }[])
      : [];
    const choix =
      DEPARTEMENTS.map((d) => liste.find((c) => c.codeDepartement === d && c.centre)).find(
        Boolean
      ) ?? null;
    const r = choix
      ? {
          code: choix.code,
          nom: choix.nom,
          lon: choix.centre!.coordinates[0],
          lat: choix.centre!.coordinates[1]
        }
      : null;
    cache.set(cle, r);
    return r;
  } catch {
    return null;
  }
}

export async function resoudreCommunes(noms: string[]): Promise<CommuneGeo[]> {
  const res = await Promise.all(
    [...new Set(noms.map((n) => n.trim()).filter(Boolean))].map(resoudreCommune)
  );
  return [
    ...new Map(res.filter((c): c is CommuneGeo => c !== null).map((c) => [c.code, c])).values()
  ];
}
