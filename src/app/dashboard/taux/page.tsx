import type { Metadata } from 'next';
import { TauxForm } from '@/features/credit/components/taux-form';
import { lireParametresCredit } from '@/features/credit/data';
import { ancienneteJours } from '@/lib/credit';

export const metadata: Metadata = { title: 'Taux de crédit' };

export default async function TauxPage() {
  const parametres = await lireParametresCredit();
  const age = ancienneteJours(parametres.taux_du);
  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='mb-5'>
        <p className='text-sauge text-[11px] font-semibold tracking-[0.16em] uppercase'>Réglages</p>
        <h1 className='font-display mt-1 text-3xl font-extrabold'>Taux de crédit</h1>
        <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
          Ces taux alimentent les simulations de financement (18 et 20 ans) affichées dans chaque fiche bien.
          {age !== null && age > 45 && (
            <span className='text-warn'> La grille date de {age} jours : pensez à la mettre à jour.</span>
          )}
        </p>
      </header>
      <TauxForm initial={parametres} />
    </div>
  );
}
