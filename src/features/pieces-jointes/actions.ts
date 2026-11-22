'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rangerPieces } from './dossier';
import { PiecesSchema } from './types';

type Resultat = { ok: true } | { ok: false; error: string };

function rafraichir(bienId: string) {
  revalidatePath(`/dashboard/biens/${bienId}`);
  revalidatePath(`/dashboard/biens/${bienId}/avis`);
}

/** Pièces déposées depuis la fiche d'un bien : les photos rejoignent les photos du bien. */
export async function rattacherPieces(bienId: string, pieces: unknown): Promise<Resultat> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const p = PiecesSchema.safeParse(pieces);
  if (!z.uuid().safeParse(bienId).success || !p.success)
    return { ok: false, error: 'Pièces invalides.' };
  const { data: bien } = await supabase.from('biens').select('id').eq('id', bienId).maybeSingle();
  if (!bien) return { ok: false, error: 'Bien introuvable.' };
  const r = await rangerPieces(supabase, user.id, bienId, p.data);
  rafraichir(bienId);
  return r.echecs
    ? { ok: false, error: `${r.echecs} pièce(s) n’ont pas pu être rangées dans le dossier.` }
    : { ok: true };
}

/** Supprime un document PDF du dossier d'un bien. */
export async function supprimerDocument(bienId: string, chemin: string): Promise<Resultat> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!chemin.startsWith(`${user.id}/${bienId}/documents/`) || chemin.includes('..'))
    return { ok: false, error: 'Document introuvable.' };
  const { error } = await supabase.storage.from('biens').remove([chemin]);
  if (error) return { ok: false, error: 'Le document n’a pas pu être supprimé.' };
  rafraichir(bienId);
  return { ok: true };
}
