import type { Metadata } from 'next';
import { BoutonsContact, EnTetePage, Section, Titre } from '@/features/site/components/elements';
import { ENGAGEMENTS_JULIEN } from '@/features/site/contenu';

export const metadata: Metadata = { title: 'Ma méthode' };

const CONCRETEMENT = [
  'Un premier échange pour comprendre votre projet, sans parler tout de suite de prix.',
  'Une estimation argumentée, appuyée sur les ventes réelles de votre secteur.',
  'Un compte rendu après chaque visite et un point régulier sur la commercialisation.',
  'L’équipe Laforêt Roanne et les intervenants utiles mobilisés quand il le faut : diagnostiqueurs, notaires, financement.',
  'Votre avis sollicité, pour progresser à chaque projet.'
];

export default function Methode() {
  return (
    <>
      <EnTetePage
        surtitre='Ma méthode'
        titre='Un accompagnement personnalisé, transparent et humain'
        intro='Plutôt qu’une liste de qualités, je préfère prendre cinq engagements concrets, de la première rencontre aux prochaines étapes de votre projet.'
      />
      <Section>
        <ol className='space-y-4'>
          {ENGAGEMENTS_JULIEN.map((e, i) => (
            <li key={e.titre} className='bg-pale flex gap-5 rounded-2xl p-6'>
              <span className='bg-bleu flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white'>
                {i + 1}
              </span>
              <div>
                <h2 className='font-display text-marine text-xl font-bold'>{e.titre}</h2>
                <p className='text-foreground/80 mt-1 text-lg'>{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section fond='pale'>
        <Titre>Concrètement</Titre>
        <ul className='mt-6 space-y-3 text-lg'>
          {CONCRETEMENT.map((c) => (
            <li key={c} className='flex gap-3'>
              <span className='bg-ciel mt-2.5 size-2 shrink-0 rounded-full' />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <div className='mt-10'>
          <BoutonsContact />
        </div>
      </Section>
    </>
  );
}
