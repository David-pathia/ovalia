import type { Metadata } from 'next';
import { EnTetePage, Texte } from '@/features/site/components/elements';
import { AGENCE_DEFAUT } from '@/features/avis/types';

export const metadata: Metadata = { title: 'Mentions légales et confidentialité' };

export default function MentionsLegales() {
  return (
    <>
      <EnTetePage
        surtitre='Informations légales'
        titre='Mentions légales et confidentialité'
        intro='Informations sur l’éditeur du site, son hébergement et le traitement de vos données.'
      />
      <Texte>
        <h2 className='font-display text-marine pt-4 text-2xl font-bold'>Éditeur</h2>
        <p>
          Site de Julien Ossedat, négociateur immobilier au sein de l’agence Laforêt Roanne, 38 rue
          Émile Noirot, 42300 Roanne, téléphone 04 77 23 09 09, roanne@laforet.com.
        </p>
        <p>{AGENCE_DEFAUT.mentions}</p>
        <h2 className='font-display text-marine text-2xl font-bold'>Hébergement</h2>
        <p>Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.</p>
        <h2 className='font-display text-marine text-2xl font-bold'>Vos données</h2>
        <p>
          Ce site ne dépose aucun cookie publicitaire ni traceur de mesure d’audience. Les échanges
          par téléphone ou WhatsApp que vous choisissez d’engager sont utilisés uniquement pour
          répondre à votre demande et suivre votre projet immobilier.
        </p>
        <p>
          Vous pouvez demander l’accès, la rectification ou la suppression des informations vous
          concernant en écrivant à roanne@laforet.com. Vous pouvez également saisir la CNIL
          (www.cnil.fr).
        </p>
      </Texte>
      <div className='h-14' />
    </>
  );
}
