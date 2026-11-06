import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { chargerRapprochements } from '@/features/prospects/data';
import {
  RapprochementsListe,
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
        groupes.map((g) => (
          <section key={g[0]!.bien!.id} className='bg-card rounded-2xl border p-4 sm:p-5'>
            <h2 className='font-display mb-3 text-[17px] font-semibold'>
              <Link href={`/dashboard/biens/${g[0]!.bien!.id}`} className='hover:underline'>
                {g[0]!.bien!.titre}
                {g[0]!.bien!.ville ? ` · ${g[0]!.bien!.ville}` : ''}
              </Link>
              <span className='text-muted-foreground ml-2 text-sm font-normal'>
                {g.length} acquéreur(s) potentiel(s)
              </span>
            </h2>
            <RapprochementsListe
              rapprochements={g.map((r) => ({ ...r, bien: undefined }))}
              vide=''
            />
          </section>
        ))
      )}
    </div>
  );
}
