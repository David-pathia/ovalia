'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

type Resultat<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function session() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const MIGRATION = 'Exécutez d’abord la migration « avis clients » dans Supabase (SQL Editor).';

const Invitation = z.object({
  prenom: z.string().trim().max(60).optional(),
  telephone: z.string().trim().max(20).optional(),
  bienId: z.uuid().nullable().optional(),
  canal: z.enum(['whatsapp', 'sms', 'lien'])
});

/** Crée un lien d'avis personnel (une réponse par lien), à envoyer après une visite. */
export async function creerInvitation(input: unknown): Promise<Resultat<{ jeton: string }>> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const p = Invitation.safeParse(input);
  if (!p.success) return { ok: false, error: 'Informations invalides.' };
  const jeton = randomBytes(18).toString('base64url');
  const { error } = await supabase.from('avis_clients').insert({
    jeton,
    prenom: p.data.prenom || null,
    telephone: p.data.telephone || null,
    bien_id: p.data.bienId ?? null,
    canal: p.data.canal
  });
  if (error) {
    console.error('avis.invitation', error);
    return {
      ok: false,
      error: error.code === '42P01' ? MIGRATION : 'Le lien n’a pas pu être créé.'
    };
  }
  revalidatePath('/dashboard/avis-clients');
  return { ok: true, jeton };
}

/** Publie ou écarte un témoignage (seulement s'il a été autorisé par le client). */
export async function modererAvis(
  id: string,
  decision: 'publie' | 'refuse' | 'a_valider'
): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!z.uuid().safeParse(id).success || !['publie', 'refuse', 'a_valider'].includes(decision))
    return { ok: false, error: 'Décision invalide.' };
  const { error } = await supabase
    .from('avis_clients')
    .update({ publication: decision })
    .eq('id', id)
    .eq('publication_autorisee', true);
  if (error) return { ok: false, error: 'La décision n’a pas pu être enregistrée.' };
  revalidatePath('/dashboard/avis-clients');
  return { ok: true };
}

/** Supprime une invitation restée sans réponse. */
export async function supprimerInvitation(id: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Invitation invalide.' };
  const { error } = await supabase
    .from('avis_clients')
    .delete()
    .eq('id', id)
    .is('repondu_le', null);
  if (error) return { ok: false, error: 'L’invitation n’a pas pu être supprimée.' };
  revalidatePath('/dashboard/avis-clients');
  return { ok: true };
}
