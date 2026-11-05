import 'server-only';

// Carte statique pour le PDF : image du plan IGN (WMS Géoplateforme, sans clé) en projection Web Mercator,
// et position des repères en pourcentage de l'image.

export type Repere = { lat: number; lon: number; libelle?: string; principal?: boolean };
export type CarteStatique = {
  image: { data: Buffer; format: 'png' };
  ratio: number; // hauteur / largeur
  reperes: (Repere & { x: number; y: number })[];
};

const R = 6378137;
const merc = (lat: number, lon: number) => ({
  x: (R * lon * Math.PI) / 180,
  y: R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
});

export async function carteStatique(
  reperes: Repere[],
  { largeur = 1400, hauteur = 800, etendueMinM = 1200, margeM = 250 }: { largeur?: number; hauteur?: number; etendueMinM?: number; margeM?: number } = {}
): Promise<CarteStatique | null> {
  if (reperes.length === 0) return null;
  const pts = reperes.map((r) => merc(r.lat, r.lon));
  let minX = Math.min(...pts.map((p) => p.x)) - margeM;
  let maxX = Math.max(...pts.map((p) => p.x)) + margeM;
  let minY = Math.min(...pts.map((p) => p.y)) - margeM;
  let maxY = Math.max(...pts.map((p) => p.y)) + margeM;

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
    'https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLES=' +
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
      }))
    };
  } catch {
    return null;
  }
}
