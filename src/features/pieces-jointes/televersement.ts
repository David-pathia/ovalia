// Dépôt des pièces jointes depuis le navigateur, directement dans le stockage Supabase :
// les actions serveur sont limitées à 1 Mo, les photos et PDF passent donc à côté.

import { createClient } from '@/lib/supabase/client';
import { preparerPhoto } from '@/features/photos/retouche';
import { PDF_MAX, nomStockage, type PieceJointe } from './types';

export async function utilisateurId() {
  const {
    data: { user }
  } = await createClient().auth.getUser();
  if (!user) throw new Error('Session expirée : reconnectez-vous.');
  return user.id;
}

const estPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const estImage = (f: File) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name);

/**
 * Dépose les fichiers dans `<owner_id>/<dossier>/` (photos) et `<owner_id>/<dossier>/documents/` (PDF).
 * Renvoie ce qui a été déposé et, pour chaque refus, une explication.
 */
export async function deposerPieces(
  fichiers: File[],
  dossier: string
): Promise<{ pieces: PieceJointe[]; refus: string[] }> {
  const uid = await utilisateurId();
  const stockage = createClient().storage.from('biens');
  const pieces: PieceJointe[] = [];
  const refus: string[] = [];

  for (const f of fichiers) {
    try {
      if (estPdf(f)) {
        if (f.size > PDF_MAX) {
          refus.push(`${f.name} : plus de 10 Mo, trop lourd pour être lu.`);
          continue;
        }
        const chemin = `${uid}/${dossier}/documents/${crypto.randomUUID().slice(0, 8)}-${nomStockage(f.name)}.pdf`;
        const { error } = await stockage.upload(chemin, f, { contentType: 'application/pdf' });
        if (error) throw error;
        pieces.push({ chemin, nom: f.name, type: 'pdf', taille: f.size });
      } else if (estImage(f)) {
        const jpeg = await preparerPhoto(f); // 2 000 px, JPEG : lisible par l'IA et par le PDF de l'avis
        const chemin = `${uid}/${dossier}/${crypto.randomUUID()}.jpg`;
        const { error } = await stockage.upload(chemin, jpeg, { contentType: 'image/jpeg' });
        if (error) throw error;
        pieces.push({ chemin, nom: f.name, type: 'image', taille: jpeg.size });
      } else {
        refus.push(
          `${f.name} : format non lu (photos et PDF uniquement ; exportez un Word en PDF).`
        );
      }
    } catch (e) {
      console.error('pieces.depot', f.name, e);
      refus.push(
        `${f.name} : envoi impossible${estImage(f) ? ' (format photo non reconnu)' : ''}.`
      );
    }
  }
  return { pieces, refus };
}

/** Retire une pièce du stockage (brouillon de saisie). */
export async function retirerPiece(chemin: string) {
  await createClient().storage.from('biens').remove([chemin]);
}

/** Aperçu signé (1 h) d'une photo déposée. */
export async function apercu(chemin: string) {
  const { data } = await createClient().storage.from('biens').createSignedUrl(chemin, 3600);
  return data?.signedUrl ?? null;
}
