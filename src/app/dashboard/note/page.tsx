import type { Metadata } from 'next';
import { NoteVocale } from '@/features/note/components/note-vocale';

export const metadata: Metadata = { title: 'Note vocale' };

// Page d'ouverture de l'icône Ovalia sur l'écran d'accueil du téléphone : un seul gros bouton.
export default function NotePage() {
  return (
    <div className='flex flex-1 flex-col items-center px-4 pt-6 pb-10 md:pt-10'>
      <div className='w-full max-w-xl'>
        <h1 className='font-display mb-1 text-center text-3xl font-extrabold'>Note vocale</h1>
        <p className='text-muted-foreground mb-8 text-center text-sm'>
          Un appui pour parler, un appui pour terminer. Vous validez, et tout part dans «
          Aujourd’hui ».
        </p>
        <NoteVocale grand />
      </div>
    </div>
  );
}
