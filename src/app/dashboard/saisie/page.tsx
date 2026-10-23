import type { Metadata } from 'next';
import { SaisieForm } from '@/features/saisie/components/saisie-form';

export const metadata: Metadata = { title: 'Saisie rapide' };
// L'analyse IA peut prendre plusieurs dizaines de secondes.
export const maxDuration = 120;

export default function SaisiePage() {
  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='mb-5'>
        <p className='text-sauge text-[11px] font-semibold tracking-[0.16em] uppercase'>Nouveau bien</p>
        <h1 className='font-display mt-1 text-3xl font-extrabold'>Saisie rapide</h1>
        <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
          Collez la note prise pendant l’estimation : l’IA prépare la fiche Laforêt, vous vérifiez, puis vous
          enregistrez.
        </p>
      </header>
      <SaisieForm />
    </div>
  );
}
