import Image from 'next/image';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import portrait from '@/features/avis/assets/conseiller.jpg';
import {
  BoutonsContact,
  Citation,
  Section,
  Surtitre,
  Titre
} from '@/features/site/components/elements';
import { COMPLEMENTARITE, ENGAGEMENTS_JULIEN, JULIEN, REPERES } from '@/features/site/contenu';

export default function AccueilSite() {
  return (
    <>
      <section className='from-pale bg-gradient-to-b to-white'>
        <div className='mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_1fr]'>
          <div>
            <Surtitre>{JULIEN.fonction}</Surtitre>
            <h1 className='font-display text-marine text-4xl leading-tight font-bold sm:text-5xl'>
              « {JULIEN.devise} »
            </h1>
            <p className='text-foreground/80 mt-5 max-w-xl text-lg leading-relaxed'>
              Vendre ou acheter un bien, c’est souvent une histoire personnelle : un premier achat,
              un déménagement, une transmission, un nouveau départ. Avant de parler de prix, je
              prends le temps de vous comprendre.
            </p>
            <p className='text-bleu mt-3 font-semibold'>{JULIEN.signature}</p>
            <div className='mt-8'>
              <BoutonsContact />
            </div>
          </div>
          <div className='relative mx-auto w-full max-w-md'>
            <div
              className='bg-ciel/25 absolute -inset-3 -z-0 rotate-2 rounded-[2rem]'
              aria-hidden='true'
            />
            <Image
              src={portrait}
              alt='Julien Ossedat, négociateur immobilier chez Laforêt Roanne'
              priority
              className='relative rounded-[1.75rem] shadow-xl'
              sizes='(min-width: 1024px) 28rem, 90vw'
            />
          </div>
        </div>
      </section>

      <section className='border-border border-y'>
        <div className='mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4'>
          {REPERES.map((r) => (
            <div key={r.libelle}>
              <p className='font-display text-bleu text-3xl font-bold'>{r.valeur}</p>
              <p className='text-muted-foreground text-sm'>{r.libelle}</p>
            </div>
          ))}
        </div>
      </section>

      <Section>
        <Surtitre>Julien & Laforêt Roanne</Surtitre>
        <Titre>Deux forces complémentaires</Titre>
        <p className='text-foreground/80 mt-4 max-w-3xl text-lg'>
          Je suis négociateur immobilier au sein de l’agence Laforêt Roanne. Vous avez un
          interlocuteur connu et impliqué localement, soutenu par une structure professionnelle et
          un réseau national.
        </p>
        <div className='mt-10 grid gap-6 md:grid-cols-2'>
          {(
            [
              ['Ce que j’apporte', COMPLEMENTARITE.julien],
              ['Ce qu’apporte Laforêt', COMPLEMENTARITE.laforet]
            ] as const
          ).map(([t, liste]) => (
            <div key={t} className='bg-pale rounded-2xl p-6'>
              <h3 className='font-display text-marine text-xl font-bold'>{t}</h3>
              <ul className='mt-4 space-y-2'>
                {liste.map((x) => (
                  <li key={x} className='flex gap-2'>
                    <Icons.check className='text-bleu mt-0.5 size-5 shrink-0' />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link
          href='/site/julien-et-laforet'
          className='text-bleu mt-6 inline-flex items-center gap-1 font-semibold hover:underline'
        >
          En savoir plus <Icons.arrowRight className='size-4' />
        </Link>
      </Section>

      <Section fond='pale'>
        <Surtitre>Ma méthode</Surtitre>
        <Titre>Cinq engagements concrets</Titre>
        <ol className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          {ENGAGEMENTS_JULIEN.map((e, i) => (
            <li key={e.titre} className='rounded-2xl bg-white p-5 shadow-sm'>
              <span className='bg-bleu flex size-9 items-center justify-center rounded-full font-bold text-white'>
                {i + 1}
              </span>
              <h3 className='font-display text-marine mt-4 font-bold'>{e.titre}</h3>
              <p className='text-muted-foreground mt-2 text-sm'>{e.texte}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className='grid gap-10 lg:grid-cols-2'>
          <div>
            <Surtitre>Mon parcours</Surtitre>
            <Titre>Le métier a changé, ma philosophie est restée la même</Titre>
            <p className='text-foreground/80 mt-4 text-lg'>
              Vingt ans chez Darty, dont dix à la direction du magasin de Mably : l’accueil,
              l’écoute, le management et l’exigence de satisfaction restent au cœur de ma façon de
              travailler.
            </p>
            <Link
              href='/site/mon-histoire'
              className='text-bleu mt-4 inline-flex items-center gap-1 font-semibold hover:underline'
            >
              Mon histoire <Icons.arrowRight className='size-4' />
            </Link>
          </div>
          <div>
            <Surtitre>Mes valeurs</Surtitre>
            <Titre>Le rugby, la transmission, le collectif</Titre>
            <p className='text-foreground/80 mt-4 text-lg'>
              Éducateur à l’ASR XV de Roanne, je transmets aux enfants le goût du sport, le respect
              et l’esprit d’équipe. Un projet immobilier réussi demande la même écoute et la même
              coordination.
            </p>
            <Link
              href='/site/valeurs'
              className='text-bleu mt-4 inline-flex items-center gap-1 font-semibold hover:underline'
            >
              Mes valeurs <Icons.arrowRight className='size-4' />
            </Link>
          </div>
        </div>
      </Section>

      <Section fond='marine'>
        <Citation clair>
          Le Roannais n’est pas seulement mon secteur d’activité : c’est mon territoire de vie.
        </Citation>
        <p className='max-w-2xl text-white/85'>
          Roanne, Saint-Just-en-Chevalet et son canton, les villages alentour : parlons de votre
          projet, autour d’un café à l’agence, par téléphone ou sur WhatsApp.
        </p>
        <div className='mt-8'>
          <BoutonsContact clair />
        </div>
      </Section>
    </>
  );
}
