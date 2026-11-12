import type { Metadata } from 'next';
import { QuestionnaireAvis } from '@/features/avis-clients/components/questionnaire';
import { EnTetePage } from '@/features/site/components/elements';

export const metadata: Metadata = { title: 'Votre avis compte' };

export default function AvisGeneral() {
  return (
    <>
      <EnTetePage
        surtitre='Votre avis compte'
        titre='Comment s’est passée votre visite ?'
        intro='Cinq questions rapides, une minute à peine : vos réponses m’aident à progresser et à mieux accompagner chaque projet.'
      />
      <div className='mx-auto max-w-2xl px-4 pb-16 sm:px-6'>
        <QuestionnaireAvis jeton={null} prenom={null} />
      </div>
    </>
  );
}
