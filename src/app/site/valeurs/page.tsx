import type { Metadata } from 'next';
import {
  BoutonsContact,
  EnTetePage,
  Section,
  Surtitre,
  Titre
} from '@/features/site/components/elements';
import { FORMATIONS, VALEURS_RUGBY } from '@/features/site/contenu';

export const metadata: Metadata = { title: 'Mes valeurs et engagements' };

export default function Valeurs() {
  return (
    <>
      <EnTetePage
        surtitre='Mes valeurs et engagements'
        titre='Transmettre, écouter, avancer ensemble'
        intro='Mon engagement auprès des enfants au rugby et mes formations à la relation humaine nourrissent directement ma façon de vous accompagner.'
      />
      <Section>
        <Surtitre>Le rugby et l’ASR XV de Roanne</Surtitre>
        <Titre>Éducateur auprès des enfants</Titre>
        <p className='text-foreground/80 mt-4 max-w-3xl text-lg'>
          À l’ASR XV de Roanne, mon rôle n’est pas seulement d’apprendre le rugby : c’est donner aux
          enfants le goût de la pratique sportive, le plaisir de jouer et de progresser, et les
          valeurs du vivre-ensemble.
        </p>
        <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {VALEURS_RUGBY.map((v) => (
            <div key={v.titre} className='bg-pale rounded-2xl p-5'>
              <h3 className='font-display text-marine text-lg font-bold'>{v.titre}</h3>
              <p className='text-muted-foreground mt-2 text-sm'>{v.texte}</p>
            </div>
          ))}
        </div>
        <p className='text-bleu mt-8 max-w-3xl text-lg font-medium'>
          Le lien avec l’immobilier : un projet réussi demande de l’écoute, de la confiance, de la
          coordination et un vrai esprit d’équipe.
        </p>
      </Section>
      <Section fond='pale'>
        <Surtitre>Mes formations</Surtitre>
        <Titre>Management, DISC et accords toltèques</Titre>
        <p className='text-foreground/80 mt-4 max-w-3xl text-lg'>
          Ces formations ne sont pas des titres à afficher : elles m’aident à adapter mes
          explications, à comprendre vos attentes, à éviter les malentendus et à gérer les
          désaccords avec respect.
        </p>
        <div className='mt-8 grid gap-4 md:grid-cols-3'>
          {FORMATIONS.map((f) => (
            <div key={f.titre} className='rounded-2xl bg-white p-6 shadow-sm'>
              <h3 className='font-display text-marine text-lg font-bold'>{f.titre}</h3>
              <p className='text-foreground/80 mt-2'>{f.texte}</p>
            </div>
          ))}
        </div>
        <p className='text-marine mt-8 text-lg font-semibold'>
          Pour vous : une communication claire, adaptée et bienveillante.
        </p>
      </Section>
      <Section>
        <Titre>Et si nous en parlions ?</Titre>
        <div className='mt-6'>
          <BoutonsContact />
        </div>
      </Section>
    </>
  );
}
