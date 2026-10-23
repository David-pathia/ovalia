import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { PARAMETRES_DEFAUT, type ParametresCredit } from '@/lib/credit';

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function lireParametresCredit(): Promise<ParametresCredit> {
  const supabase = await createClient();
  const { data } = await supabase.from('parametres_credit').select('*').maybeSingle();
  if (!data) return PARAMETRES_DEFAUT;
  return {
    taux_15: num(data.taux_15),
    taux_20: num(data.taux_20),
    taux_25: num(data.taux_25),
    usure_10_20: num(data.usure_10_20),
    usure_20_plus: num(data.usure_20_plus),
    source: data.source,
    taux_du: data.taux_du,
    apport_pct: Number(data.apport_pct),
    assurance_pct: Number(data.assurance_pct),
    notaire_pct: Number(data.notaire_pct)
  };
}
