import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { chargerRapprochements } from '@/features/prospects/data';
import {
  RapprochementsParBien,
  type RapprochementVue
} from '@/features/prospects/components/rapprochements-liste';
import { BoutonRecalculer } from '@/features/prospects/components/bouton-recalculer';

export const metadata: Metadata = { title: 'Rapprochements' };
export const maxDuration = 120;

export default async function RapprochementsPage() {
  const supabase = await createClient();
  const tous = await chargerRapprochements(supabase);
  const parBien = new Map<string, RapprochementVue[]>();
  for (const r of tous) if (r.bien) parBien.set(r.bien.id, [...(parBien.get(r.bien.id) ?? []), r]);
  const groupes = [...parBien.values()].sort((a, b) => b.length - a.length);

  return (
    <div className='flex flex-1 flex-col gap-5 px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='font-display text-3xl font-extrabold'>Rapprochements</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {tous.length} correspondance(s) bien ↔ acquéreur, budget comparé frais d’agence inclus
            (tolérance de 10 %). ·{' '}
            <Link href='/dashboard/prospects' className='underline underline-offset-4'>
              prospects
            </Link>
          </p>
        </div>
        <BoutonRecalculer />
      </header>
      {groupes.length === 0 ? (
        <p className='text-muted-foreground text-sm'>
          Aucun rapprochement : importez le tableau de pilotage depuis la page Prospects.
        </p>
      ) : (
        <RapprochementsParBien
          groupes={groupes.map((g) => ({ bien: g[0]!.bien!, rapprochements: g }))}
        />
      )}
    </div>
  );
}
