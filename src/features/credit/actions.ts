'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const taux = z.number().min(0).max(20).nullable();
const Schema = z.object({
  taux_15: taux,
  taux_20: taux,
  taux_25: taux,
  usure_10_20: taux,
  usure_20_plus: taux,
  source: z.string().trim().max(200).nullable(),
  taux_du: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  apport_pct: z.number().min(0).max(100),
  assurance_pct: z.number().min(0).max(5),
  notaire_pct: z.number().min(0).max(20)
});

export async function enregistrerParametresCredit(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Vérifiez les valeurs : les taux doivent être entre 0 et 20 %.' };

  const { error } = await supabase.from('parametres_credit').upsert({ owner_id: user.id, ...parsed.data });
  if (error) {
    console.error('parametres_credit.upsert', error);
    return { ok: false, error: 'Les taux n’ont pas pu être enregistrés.' };
  }
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
