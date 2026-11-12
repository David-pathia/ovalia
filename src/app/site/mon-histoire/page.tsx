import type { Metadata } from 'next';
import {
  BoutonsContact,
  Citation,
  EnTetePage,
  Section,
  Texte,
  Titre
} from '@/features/site/components/elements';

export const metadata: Metadata = { title: 'Mon histoire' };

export default function MonHistoire() {
  return (
    <>
      <EnTetePage
        surtitre='Mon histoire'
        titre='Vingt ans de relation client, une vie dans le Roannais'
        intro='Avant l’immobilier, j’ai passé vingt ans chez Darty, dont dix à la direction du magasin de Mably. Ce parcours est au cœur de ma façon d’accompagner vos projets.'
      />
      <Texte>
        <h2 className='font-display text-marine pt-4 text-2xl font-bold'>
          20 ans chez Darty, 10 ans à la direction de Mably
        </h2>
        <p>
          L’accueil, la relation client, le management, la prise de décision, l’animation d’une
          équipe, l’écoute, la résolution de situations complexes et l’exigence de satisfaction : ce
          sont les compétences que j’ai construites, jour après jour, pendant ces vingt années.
        </p>
        <p>
          Passer de Darty à Laforêt n’a pas été une rupture, mais une continuité de valeurs. La
          confiance, le service, le conseil et l’accompagnement restent centraux : c’est le métier
          qui a changé, pas ma façon de travailler.
        </p>
        <Citation>Le métier a changé. Ma philosophie est restée la même.</Citation>
        <h2 className='font-display text-marine text-2xl font-bold'>
          Le Roannais, mon territoire de vie
        </h2>
        <p>
          Arrivé à Roanne à 15 ans, j’en ai aujourd’hui 47 : je vis dans le Roannais depuis plus de
          trente ans. J’y ai grandi, travaillé, noué des relations et participé à la vie locale.
        </p>
        <p>
          Je suis particulièrement attaché à Saint-Just-en-Chevalet et à son canton : ses villages,
          ses associations, ses commerçants, ses habitants. Connaître un territoire, ce n’est pas
          seulement connaître ses annonces immobilières, c’est connaître les gens qui le font vivre.
        </p>
        <Citation>
          Le Roannais n’est pas seulement mon secteur d’activité : c’est mon territoire de vie.
        </Citation>
      </Texte>
      <Section fond='pale' className='mt-14'>
        <Titre>Parlons de votre projet</Titre>
        <div className='mt-6'>
          <BoutonsContact />
        </div>
      </Section>
    </>
  );
}
