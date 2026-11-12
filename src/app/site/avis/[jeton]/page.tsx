import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { QuestionnaireAvis } from '@/features/avis-clients/components/questionnaire';
import { EnTetePage } from '@/features/site/components/elements';

export const metadata: Metadata = { title: 'Votre avis compte' };

export default async function AvisPersonnel({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc('avis_invitation', { p_jeton: jeton });
  const invitation = (data as { prenom: string | null; repondu: boolean }[] | null)?.[0] ?? null;

  return (
    <>
      <EnTetePage
        surtitre='Votre avis compte'
        titre={
          invitation?.prenom
            ? `${invitation.prenom}, comment s’est passée votre visite ?`
            : 'Comment s’est passée votre visite ?'
        }
        intro='Cinq questions rapides, une minute à peine : vos réponses m’aident à progresser et à mieux accompagner chaque projet.'
      />
      <div className='mx-auto max-w-2xl px-4 pb-16 sm:px-6'>
        {!invitation ? (
          <p className='bg-pale rounded-2xl p-6'>
            Ce lien n’est plus valide. Merci de contacter Julien Ossedat au 06 48 94 54 77.
          </p>
        ) : invitation.repondu ? (
          <p className='bg-pale rounded-2xl p-6'>
            Vous avez déjà répondu à ce questionnaire : merci pour votre retour !
          </p>
        ) : (
          <QuestionnaireAvis jeton={jeton} prenom={invitation.prenom} />
        )}
      </div>
    </>
  );
}
