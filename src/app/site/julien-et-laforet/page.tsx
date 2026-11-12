import type { Metadata } from 'next';
import { Icons } from '@/components/icons';
import {
  BoutonsContact,
  Citation,
  EnTetePage,
  Section,
  Titre
} from '@/features/site/components/elements';
import { AGENCE_SITE, COMPLEMENTARITE } from '@/features/site/contenu';

export const metadata: Metadata = { title: 'Julien & Laforêt Roanne' };

export default function JulienEtLaforet() {
  return (
    <>
      <EnTetePage
        surtitre='Julien & Laforêt Roanne'
        titre='La proximité d’un homme, la force d’un réseau'
        intro='Je suis négociateur immobilier au sein de l’agence Laforêt Roanne, et non un professionnel indépendant. Ma connaissance du territoire et la force de l’agence se renforcent mutuellement, à votre service.'
      />
      <Section>
        <div className='grid gap-6 md:grid-cols-2'>
          {(
            [
              ['Ce que j’apporte', COMPLEMENTARITE.julien],
              ['Ce qu’apporte Laforêt Roanne', COMPLEMENTARITE.laforet]
            ] as const
          ).map(([t, liste], i) => (
            <div
              key={t}
              className={i ? 'bg-marine rounded-2xl p-7 text-white' : 'bg-pale rounded-2xl p-7'}
            >
              <h2
                className={
                  i
                    ? 'font-display text-2xl font-bold'
                    : 'font-display text-marine text-2xl font-bold'
                }
              >
                {t}
              </h2>
              <ul className='mt-5 space-y-2.5'>
                {liste.map((x) => (
                  <li key={x} className='flex gap-2'>
                    <Icons.check
                      className={
                        i ? 'text-ciel mt-0.5 size-5 shrink-0' : 'text-bleu mt-0.5 size-5 shrink-0'
                      }
                    />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className='border-ciel mt-10 rounded-2xl border-2 p-7'>
          <Titre className='text-2xl sm:text-3xl'>Le bénéfice pour vous</Titre>
          <p className='text-foreground/85 mt-3 text-lg'>
            Un interlocuteur connu et impliqué dans le Roannais, qui vous suit personnellement,
            soutenu par une agence physique, une équipe et les outils d’un réseau national pour
            diffuser votre bien, organiser les visites et vous rendre compte de chaque étape.
          </p>
        </div>
        <Citation>La proximité d’un homme, la force d’un réseau.</Citation>
      </Section>
      <Section fond='pale'>
        <div className='grid gap-8 md:grid-cols-[1fr_auto] md:items-center'>
          <div>
            <Titre>Une agence au cœur de Roanne</Titre>
            <p className='text-foreground/85 mt-3 text-lg'>
              {AGENCE_SITE.nom}, {AGENCE_SITE.adresse}, {AGENCE_SITE.ville}. {AGENCE_SITE.horaires}.
            </p>
          </div>
          <a
            href={AGENCE_SITE.telephoneLien}
            className='bg-bleu inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white'
          >
            <Icons.phone className='size-5' /> {AGENCE_SITE.telephone}
          </a>
        </div>
        <div className='mt-8'>
          <BoutonsContact />
        </div>
      </Section>
    </>
  );
}
