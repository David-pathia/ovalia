'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { retoucherPhotoIA } from '@/lib/ai/image';

type Resultat<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function session() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const MIGRATION = 'Exécutez d’abord la migration « photo principale » dans Supabase (SQL Editor).';

function rafraichir(bienId: string) {
  revalidatePath(`/dashboard/biens/${bienId}`);
  revalidatePath(`/dashboard/biens/${bienId}/avis`);
  revalidatePath('/dashboard/biens');
}

/** Enregistre une photo déjà déposée dans le stockage (photo originale ou version retouchée). */
export async function enregistrerPhotoBien(
  bienId: string,
  storagePath: string,
  options: { retouche?: 'fidele' | null; originaleId?: string | null } = {}
): Promise<Resultat<{ id: string }>> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!storagePath.startsWith(`${user.id}/${bienId}/`))
    return { ok: false, error: 'Emplacement de photo invalide.' };
  const { data, error } = await supabase
    .from('bien_images')
    .insert({
      bien_id: bienId,
      storage_path: storagePath,
      retouche: options.retouche ?? null,
      originale_id: options.originaleId ?? null
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('photos.enregistrer', error);
    return {
      ok: false,
      error: error?.code === '42703' ? MIGRATION : 'La photo n’a pas pu être enregistrée.'
    };
  }
  rafraichir(bienId);
  return { ok: true, id: data.id as string };
}

/** Désigne la photo principale du bien : couverture du dossier et photo de tête de l'annonce. */
export async function definirPhotoPrincipale(bienId: string, photoId: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const { error: e1 } = await supabase
    .from('bien_images')
    .update({ principale: false })
    .eq('bien_id', bienId)
    .eq('principale', true);
  if (e1)
    return {
      ok: false,
      error: e1.code === '42703' ? MIGRATION : 'La photo principale n’a pas pu être changée.'
    };
  const { error: e2 } = await supabase
    .from('bien_images')
    .update({ principale: true })
    .eq('id', photoId)
    .eq('bien_id', bienId);
  if (e2) return { ok: false, error: 'La photo principale n’a pas pu être changée.' };
  rafraichir(bienId);
  return { ok: true };
}

/** Retouche « pro immobilier » par IA à partir de la photo originale ; la version obtenue est ajoutée, jamais substituée. */
export async function retoucherPhotoAvecIA(
  bienId: string,
  photoId: string
): Promise<Resultat<{ id: string; url: string | null }>> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const { data: photo } = await supabase
    .from('bien_images')
    .select('id, storage_path, originale_id')
    .eq('id', photoId)
    .eq('bien_id', bienId)
    .maybeSingle();
  if (!photo) return { ok: false, error: 'Photo introuvable.' };
  // On part toujours de l'originale pour ne pas cumuler les retouches.
  const origineId = (photo.originale_id as string | null) ?? (photo.id as string);
  const { data: origine } = await supabase
    .from('bien_images')
    .select('storage_path')
    .eq('id', origineId)
    .maybeSingle();
  const { data: fichier } = await supabase.storage
    .from('biens')
    .download((origine?.storage_path as string) ?? (photo.storage_path as string));
  if (!fichier) return { ok: false, error: 'La photo originale n’a pas pu être lue.' };

  const res = await retoucherPhotoIA(
    Buffer.from(await fichier.arrayBuffer()),
    fichier.type || 'image/jpeg'
  );
  if (!res.ok) return res;

  const chemin = `${user.id}/${bienId}/${randomUUID()}.${res.type === 'image/png' ? 'png' : 'jpg'}`;
  const { error: upError } = await supabase.storage
    .from('biens')
    .upload(chemin, res.data, { contentType: res.type });
  if (upError) return { ok: false, error: 'La photo retouchée n’a pas pu être enregistrée.' };
  const { data, error } = await supabase
    .from('bien_images')
    .insert({ bien_id: bienId, storage_path: chemin, retouche: 'ia', originale_id: origineId })
    .select('id')
    .single();
  if (error || !data)
    return {
      ok: false,
      error: error?.code === '42703' ? MIGRATION : 'La photo retouchée n’a pas pu être enregistrée.'
    };
  const { data: signee } = await supabase.storage.from('biens').createSignedUrl(chemin, 3600);
  rafraichir(bienId);
  return { ok: true, id: data.id as string, url: signee?.signedUrl ?? null };
}
