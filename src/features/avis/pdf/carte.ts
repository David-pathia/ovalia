import 'server-only';

// Carte statique pour le PDF : image du plan IGN (WMS Géoplateforme, sans clé) en projection Web Mercator,
// et position des repères en pourcentage de l'image.

export type Repere = { lat: number; lon: number; libelle?: string; principal?: boolean };
export type Point = { lat: number; lon: number };
export type CarteStatique = {
  image: { data: Buffer; format: 'png' };
  ratio: number; // hauteur / largeur
  reperes: (Repere & { x: number; y: number })[];
  /** Contours (parcelle…) en pourcentage de l'image. */
  polygones: { x: number; y: number }[][];
};

export const COUCHE_PLAN = 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2';
export const COUCHE_ORTHO_CADASTRE =
  'ORTHOIMAGERY.ORTHOPHOTOS,CADASTRALPARCELS.PARCELLAIRE_EXPRESS';
export const COUCHE_PLAN_CADASTRE =
  'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2,CADASTRALPARCELS.PARCELLAIRE_EXPRESS';

const R = 6378137;
const merc = (lat: number, lon: number) => ({
  x: (R * lon * Math.PI) / 180,
  y: R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
});

export async function carteStatique(
  reperes: Repere[],
  {
    largeur = 1400,
    hauteur = 800,
    etendueMinM = 1200,
    margeM = 250,
    couches = COUCHE_PLAN,
    polygones = []
  }: {
    largeur?: number;
    hauteur?: number;
    etendueMinM?: number;
    margeM?: number;
    couches?: string;
    polygones?: Point[][];
  } = {}
): Promise<CarteStatique | null> {
  if (reperes.length === 0) return null;
  const pts = reperes.map((r) => merc(r.lat, r.lon));
  const poly = polygones.map((p) => p.map((q) => merc(q.lat, q.lon)));
  const tous = [...pts, ...poly.flat()];
  let minX = Math.min(...tous.map((p) => p.x)) - margeM;
  let maxX = Math.max(...tous.map((p) => p.x)) + margeM;
  let minY = Math.min(...tous.map((p) => p.y)) - margeM;
  let maxY = Math.max(...tous.map((p) => p.y)) + margeM;

  // Étendue minimale, puis mêmes proportions que l'image pour ne pas déformer le plan.
  const ratio = hauteur / largeur;
  let w = Math.max(maxX - minX, etendueMinM);
  let h = Math.max(maxY - minY, etendueMinM * ratio);
  if (h / w > ratio) w = h / ratio;
  else h = w * ratio;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  minX = cx - w / 2;
  maxX = cx + w / 2;
  minY = cy - h / 2;
  maxY = cy + h / 2;

  const url =
    `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${couches}&STYLES=${couches
      .split(',')
      .map(() => '')
      .join(',')}` +
    `&CRS=EPSG:3857&BBOX=${minX},${minY},${maxX},${maxY}&WIDTH=${largeur}&HEIGHT=${hauteur}&FORMAT=image/png`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return {
      image: { data, format: 'png' },
      ratio,
      reperes: reperes.map((r, i) => ({
        ...r,
        x: ((pts[i]!.x - minX) / w) * 100,
        y: ((maxY - pts[i]!.y) / h) * 100
      })),
      polygones: poly.map((p) =>
        p.map((q) => ({ x: ((q.x - minX) / w) * 100, y: ((maxY - q.y) / h) * 100 }))
      )
    };
  } catch {
    return null;
  }
}

export type Parcelle = {
  idu: string;
  section: string;
  numero: string;
  contenance: number | null;
  commune: string;
  contour: Point[];
  /** Comment la parcelle a été trouvée : rattachée à l'adresse (BAN), sous le point d'adresse, ou la plus proche. */
  methode: 'adresse' | 'point' | 'proche';
};

type FeatureParcelle = {
  geometry: { type: string; coordinates: number[][][][] | number[][][] };
  properties: {
    idu: string;
    section: string;
    numero: string;
    contenance?: number;
    nom_com?: string;
  };
};

const API_CARTO = 'https://apicarto.ign.fr/api/cadastre/parcelle';
const UN_MOIS = 60 * 60 * 24 * 30;

async function parcelles(query: string): Promise<FeatureParcelle[]> {
  try {
    const res = await fetch(`${API_CARTO}?${query}`, { next: { revalidate: UN_MOIS } });
    if (!res.ok) return [];
    return ((await res.json()) as { features?: FeatureParcelle[] }).features ?? [];
  } catch {
    return [];
  }
}

function versParcelle(f: FeatureParcelle, methode: Parcelle['methode']): Parcelle {
  // Premier anneau extérieur du (Multi)Polygon.
  const anneau =
    (f.geometry.type === 'MultiPolygon'
      ? (f.geometry.coordinates as number[][][][])[0]![0]
      : (f.geometry.coordinates as number[][][])[0]) ?? [];
  return {
    idu: f.properties.idu,
    section: f.properties.section,
    numero: f.properties.numero,
    contenance: f.properties.contenance ?? null,
    commune: f.properties.nom_com ?? '',
    contour: anneau.map(([x, y]) => ({ lon: x!, lat: y! })),
    methode
  };
}

const geom = (g: object) => `geom=${encodeURIComponent(JSON.stringify(g))}`;

/** Parcelle cadastrale qui contient le point, ou à défaut la plus proche dans un rayon d'une vingtaine de mètres. */
export async function parcelleAuPoint(lat: number, lon: number): Promise<Parcelle | null> {
  const sous = await parcelles(geom({ type: 'Point', coordinates: [lon, lat] }));
  if (sous[0]) return versParcelle(sous[0], 'point');
  // Point d'adresse sur la voie publique : on cherche les parcelles voisines et on garde la plus proche.
  const dLat = 0.00018;
  const dLon = 0.00026;
  const autour = await parcelles(
    geom({
      type: 'Polygon',
      coordinates: [
        [
          [lon - dLon, lat - dLat],
          [lon + dLon, lat - dLat],
          [lon + dLon, lat + dLat],
          [lon - dLon, lat + dLat],
          [lon - dLon, lat - dLat]
        ]
      ]
    })
  );
  const proche = autour
    .map((f) => versParcelle(f, 'proche'))
    .map((p) => ({
      p,
      d: Math.min(...p.contour.map((q) => (q.lat - lat) ** 2 + ((q.lon - lon) * 0.7) ** 2))
    }))
    .sort((a, b) => a.d - b.d)[0];
  return proche?.p ?? null;
}

/**
 * Parcelle du bien à partir de son adresse exacte : géocodage Base Adresse Nationale, parcelle rattachée à l'adresse
 * quand la BAN la connaît, sinon parcelle sous le point d'adresse (ou la plus proche).
 */
export async function parcelleDuBien(
  adresse: string,
  repli: Point | null
): Promise<{ parcelle: Parcelle | null; point: Point | null }> {
  let point = repli;
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`,
      { next: { revalidate: UN_MOIS } }
    );
    const f = res.ok
      ? (
          (await res.json()) as {
            features?: {
              geometry: { coordinates: [number, number] };
              properties: { id: string; type: string; score: number };
            }[];
          }
        ).features?.[0]
      : undefined;
    if (f && f.properties.type === 'housenumber' && f.properties.score >= 0.6) {
      point = { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
      const lien = await fetch(
        `https://plateforme.adresse.data.gouv.fr/lookup/${encodeURIComponent(f.properties.id)}`,
        { next: { revalidate: UN_MOIS } }
      );
      const idu = lien.ok
        ? ((await lien.json()) as { parcelles?: string[] }).parcelles?.[0]
        : undefined;
      if (idu && idu.length >= 14) {
        // La section s'écrit sur deux caractères (« 0A » pour une section à une lettre) : on essaie les deux formes.
        for (const section of [
          ...new Set([idu.slice(8, 10), idu.slice(8, 10).replace(/^0/, '')])
        ]) {
          const params = new URLSearchParams({
            code_insee: idu.slice(0, 5),
            section,
            numero: idu.slice(10)
          });
          if (idu.slice(5, 8) !== '000') params.set('com_abs', idu.slice(5, 8));
          const trouvee = (await parcelles(params.toString())).find(
            (x) => x.properties.idu === idu
          );
          if (trouvee) return { parcelle: versParcelle(trouvee, 'adresse'), point };
        }
      }
    }
  } catch {
    // On retombe sur le point connu.
  }
  return { parcelle: point ? await parcelleAuPoint(point.lat, point.lon) : null, point };
}
