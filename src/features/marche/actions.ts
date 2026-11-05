'use server';

import { createClient } from '@/lib/supabase/server';
import { analyseMarche } from './core';
import type { CriteresMarche, ResultatMarche } from './types';

export async function rechercherMarche(input: CriteresMarche): Promise<{ ok: true; data: ResultatMarche } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  return analyseMarche(input);
}
