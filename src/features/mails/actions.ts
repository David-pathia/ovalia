'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Déconnecte la boîte Microsoft : les jetons sont supprimés d'Ovalia. */
export async function deconnecterMicrosoft() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Session expirée.' };
  const { error } = await supabase.from('comptes_microsoft').delete().eq('owner_id', user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/dashboard/mails');
  return { ok: true as const };
}
