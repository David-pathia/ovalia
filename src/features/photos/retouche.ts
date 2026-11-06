// Retouche fidèle, faite dans le navigateur : balance des blancs, niveaux, ombres, contraste et couleurs.
// Aucun élément n'est ajouté ni retiré : seuls la lumière et les couleurs de chaque pixel sont corrigées.

const borne = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

async function versCanvas(source: Blob, maxPx: number) {
  const image = await createImageBitmap(source);
  const echelle = Math.min(1, maxPx / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

const versJpeg = (canvas: HTMLCanvasElement, qualite = 0.9) =>
  new Promise<Blob>((ok, ko) =>
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error('conversion'))), 'image/jpeg', qualite)
  );

/** Réduit la photo (2 000 px max) et la convertit en JPEG : le PDF n'accepte que JPEG et PNG. */
export async function preparerPhoto(fichier: Blob): Promise<Blob> {
  const { canvas } = await versCanvas(fichier, 2000);
  return versJpeg(canvas, 0.88);
}

export async function retoucheFidele(source: Blob): Promise<Blob> {
  const { canvas, ctx } = await versCanvas(source, 2000);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  const n = px.length / 4;

  // 1. Balance des blancs (« monde gris » atténuée de moitié) : enlève le voile bleuté ou jaunâtre d'un temps couvert.
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (let i = 0; i < px.length; i += 4) {
    sr += px[i]!;
    sg += px[i + 1]!;
    sb += px[i + 2]!;
  }
  const gris = (sr + sg + sb) / (3 * n);
  const gain = (m: number) => 1 + (Math.min(1.15, Math.max(0.88, gris / (m / n))) - 1) * 0.5;
  const [gr, gg, gb] = [gain(sr), gain(sg), gain(sb)];

  // 2. Niveaux : étirement limité entre les centiles 0,5 % et 99,5 % de la luminance.
  const hist: number[] = Array.from({ length: 256 }, () => 0);
  let somme = 0;
  for (let i = 0; i < px.length; i += 4) {
    const l = Math.round(
      borne(0.299 * px[i]! * gr + 0.587 * px[i + 1]! * gg + 0.114 * px[i + 2]! * gb)
    );
    hist[l]!++;
    somme += l;
  }
  const centile = (q: number) => {
    let cumul = 0;
    for (let v = 0; v < 256; v++) if ((cumul += hist[v]!) >= n * q) return v;
    return 255;
  };
  const bas = Math.min(centile(0.005), 35);
  const haut = Math.max(centile(0.995), 220);
  const etire = 255 / Math.max(1, haut - bas);
  // 3. Ombres : courbe gamma plus marquée si la photo est sombre (ciel gris, sous-exposition).
  const moyenne = somme / n;
  const gamma = moyenne < 120 ? 0.8 : moyenne < 150 ? 0.87 : 0.93;
  const courbe = Array.from({ length: 256 }, (_, v) => 255 * Math.pow(v / 255, gamma));

  for (let i = 0; i < px.length; i += 4) {
    let r = courbe[Math.round(borne((px[i]! * gr - bas) * etire))]!;
    let g = courbe[Math.round(borne((px[i + 1]! * gg - bas) * etire))]!;
    let b = courbe[Math.round(borne((px[i + 2]! * gb - bas) * etire))]!;
    // 4. Contraste doux.
    r = 128 + (r - 128) * 1.08;
    g = 128 + (g - 128) * 1.08;
    b = 128 + (b - 128) * 1.08;
    // 5. Vibrance : ravive surtout les couleurs ternes ; verts (pelouse, feuillage) un peu plus.
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const vert = g > r * 1.03 && g > b * 1.03;
    const k = 1 + (vert ? 0.45 : 0.25) * (1 - sat);
    r = l + (r - l) * k;
    g = l + (g - l) * k * (vert ? 1.04 : 1);
    b = l + (b - l) * k;
    px[i] = borne(r);
    px[i + 1] = borne(g);
    px[i + 2] = borne(b);
  }
  ctx.putImageData(img, 0, 0);
  return versJpeg(canvas);
}
