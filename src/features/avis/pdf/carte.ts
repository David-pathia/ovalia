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
  section: string;
  numero: string;
  contenance: number | null;
  commune: string;
  contour: Point[];
};

/** Parcelle cadastrale qui contient le point (API Carto IGN, sans clé). */
export async function parcelleAuPoint(lat: number, lon: number): Promise<Parcelle | null> {
  const geom = encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [lon, lat] }));
  try {
    const res = await fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${geom}`, {
      next: { revalidate: 60 * 60 * 24 * 30 }
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      features?: {
        geometry: { type: string; coordinates: number[][][][] | number[][][] };
        properties: { section: string; numero: string; contenance?: number; nom_com?: string };
      }[];
    };
    const f = json.features?.[0];
    if (!f) return null;
    // Premier anneau extérieur du (Multi)Polygon.
    const anneau =
      (f.geometry.type === 'MultiPolygon'
        ? (f.geometry.coordinates as number[][][][])[0]![0]
        : (f.geometry.coordinates as number[][][])[0]) ?? [];
    return {
      section: f.properties.section,
      numero: f.properties.numero,
      contenance: f.properties.contenance ?? null,
      commune: f.properties.nom_com ?? '',
      contour: anneau.map(([x, y]) => ({ lon: x!, lat: y! }))
    };
  } catch {
    return null;
  }
}
