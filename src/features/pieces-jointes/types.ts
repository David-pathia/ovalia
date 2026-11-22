import { z } from 'zod';

// Pièces jointes d'un dossier d'estimation : photos (converties en JPEG) et documents PDF
// (DPE, taxe foncière, plans, diagnostics, titre de propriété…). Stockées dans le bucket privé « biens » :
//   <owner_id>/<bien_id>/<uuid>.jpg                  photos (aussi enregistrées dans bien_images)
//   <owner_id>/<bien_id>/documents/<uuid8>-<nom>.pdf documents
// Avant l'enregistrement d'un nouveau bien : <owner_id>/brouillons/<uuid>/…, déplacées ensuite.

export const PieceJointeSchema = z.object({
  chemin: z.string().min(1).max(400),
  nom: z.string().max(300),
  type: z.enum(['image', 'pdf']),
  taille: z.number().nonnegative()
});
export type PieceJointe = z.infer<typeof PieceJointeSchema>;
export const PiecesSchema = z.array(PieceJointeSchema).max(30);

export const PIECES_MAX = 10;
export const PDF_MAX = 10 * 1024 * 1024; // Claude lit jusqu'à 32 Mo par demande (base64 compris)
export const TOTAL_MAX = 20 * 1024 * 1024;
export const ACCEPT = 'image/*,.heic,.heif,application/pdf';

/** Nom de fichier sûr pour le stockage (lettres, chiffres, tirets). */
export function nomStockage(nom: string) {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return base || 'document';
}

/** Nom lisible tiré du chemin : « 1a2b3c4d-taxe-fonciere-2025.pdf » → « taxe fonciere 2025 ». */
export function nomDepuisChemin(chemin: string) {
  const fichier = chemin.split('/').pop() ?? chemin;
  return fichier
    .replace(/^[0-9a-f]{8}-/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/-/g, ' ');
}

export const tailleLisible = (o: number) =>
  o < 1024 * 1024
    ? `${Math.max(1, Math.round(o / 1024))} Ko`
    : `${(o / 1024 / 1024).toFixed(1)} Mo`;
