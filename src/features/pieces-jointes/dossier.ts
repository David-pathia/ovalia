import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { nomDepuisChemin, type PieceJointe } from './types';

/**
 * Range les pièces d'un brouillon de saisie dans le dossier du bien qui vient d'être créé,
 * puis enregistre les photos dans `bien_images` (elles servent ensuite à l'avis de valeur).
 * Une pièce déjà dans le dossier du bien n'est pas déplacée.
 */
export async function rangerPieces(
  supabase: SupabaseClient,
  userId: string,
  bienId: string,
  pieces: PieceJointe[]
): Promise<{ rangees: number; echecs: number }> {
  const dossier = `${userId}/${bienId}/`;
  const stockage = supabase.storage.from('biens');
  let echecs = 0;
  const photos: string[] = [];

  for (const p of pieces) {
    if (!p.chemin.startsWith(`${userId}/`)) continue;
    let chemin = p.chemin;
    if (!chemin.startsWith(dossier)) {
      const fichier = chemin.split('/').pop()!;
      const cible = `${dossier}${p.type === 'pdf' ? 'documents/' : ''}${fichier}`;
      const { error } = await stockage.move(chemin, cible);
      if (error) {
        console.error('pieces.rangement', chemin, error);
        echecs++;
        continue;
      }
      chemin = cible;
    }
    if (p.type === 'image') photos.push(chemin);
  }

  if (photos.length) {
    const { error } = await supabase
      .from('bien_images')
      .insert(photos.map((storage_path) => ({ bien_id: bienId, storage_path })));
    if (error) {
      console.error('pieces.photos', error);
      echecs += photos.length;
    }
  }
  return { rangees: pieces.length - echecs, echecs };
}

export type DocumentBien = {
  chemin: string;
  nom: string;
  url: string | null;
  taille: number | null;
};

/** Documents PDF du dossier d'un bien, avec un lien de consultation valable une heure. */
export async function documentsDuBien(
  supabase: SupabaseClient,
  userId: string,
  bienId: string
): Promise<DocumentBien[]> {
  const dossier = `${userId}/${bienId}/documents`;
  const { data } = await supabase.storage
    .from('biens')
    .list(dossier, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  const fichiers = (data ?? []).filter((f) => f.id && f.name.endsWith('.pdf'));
  if (!fichiers.length) return [];
  const chemins = fichiers.map((f) => `${dossier}/${f.name}`);
  const { data: signes } = await supabase.storage.from('biens').createSignedUrls(chemins, 3600);
  return fichiers.map((f, i) => ({
    chemin: chemins[i]!,
    nom: nomDepuisChemin(f.name),
    url: signes?.[i]?.signedUrl ?? null,
    taille: (f.metadata as { size?: number } | null)?.size ?? null
  }));
}
