import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { TopoLines } from '@/components/brand/logo';
import { NouveauClient } from '@/features/prospects/components/nouveau-client';
import type { Journee } from '../types';
import { AjoutTache } from './ajout-tache';
import { DernierTri } from './dernier-tri';
import { FeuilleDeRoute } from './feuille-de-route';
import { Panel } from './panel';

function dateDuJour() {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris'
  }).format(new Date());
}

export function TodayView({ firstName, journee }: { firstName: string; journee: Journee }) {
  const { actions, indicateurs, synchroEnAttente, manques } = journee;
  const enRetard = actions.filter((a) => a.moment === 'retard').length;

  return (
    <div className='relative flex flex-1 flex-col overflow-hidden px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <TopoLines className='absolute inset-x-0 top-0 h-72 w-full opacity-[0.13]' />

      <header className='relative mb-6 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-sauge text-[11px] font-semibold tracking-[0.16em] uppercase'>
            {dateDuJour()}
          </p>
          <h1 className='font-display mt-1.5 text-3xl leading-tight font-extrabold md:text-4xl'>
            Bonjour {firstName}, voici votre journée
          </h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            Explorer <span className='text-cuivre'>•</span> Apprendre{' '}
            <span className='text-cuivre'>•</span> Agir
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <NouveauClient />
          <Button
            className='h-9 font-semibold'
            nativeButton={false}
            render={<Link href='/dashboard/saisie' />}
          >
            <Icons.add /> Nouveau bien
          </Button>
        </div>
      </header>

      <section
        aria-label='Indicateurs'
        className='relative mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4'
      >
        {indicateurs.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className='bg-secondary/60 hover:bg-secondary flex min-w-0 flex-col gap-1 rounded-2xl border px-4 py-3.5 transition-colors'
          >
            <span className='text-muted-foreground text-xs'>{k.label}</span>
            <span className='font-display text-3xl leading-none font-extrabold tabular-nums'>
              {k.valeur}
            </span>
            <span className='text-muted-foreground truncate text-xs'>{k.aide}</span>
          </Link>
        ))}
      </section>

      <div className='relative grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'>
        <Panel
          title='Feuille de route'
          icon={Icons.checks}
          meta={
            enRetard ? (
              <span className='bg-crit/15 text-crit rounded-full px-2 py-0.5 font-semibold'>
                {enRetard} en retard
              </span>
            ) : undefined
          }
          className='scroll-mt-4'
        >
          <div id='feuille-de-route' />
          <AjoutTache />
          <FeuilleDeRoute actions={actions} />
          {manques.length > 0 && (
            <p className='text-muted-foreground mt-4 border-t border-dashed pt-2.5 text-xs'>
              Non pris en compte : {manques.join(', ')} (migration Supabase à exécuter).
            </p>
          )}
        </Panel>

        <div className='flex min-w-0 flex-col gap-5'>
          <Panel title='Boîte mail' icon={Icons.mail} ia>
            <DernierTri />
          </Panel>

          <Panel title='D’où viennent ces actions' icon={Icons.info}>
            <ul className='text-muted-foreground flex flex-col gap-1.5 text-[12.5px]'>
              <li>
                <span className='text-foreground font-medium'>Relances vendeurs</span> : champ «
                Prochain contact » de la fiche bien.
              </li>
              <li>
                <span className='text-foreground font-medium'>Mandats</span> : date de fin, 30 jours
                avant et après.
              </li>
              <li>
                <span className='text-foreground font-medium'>Acquéreurs</span> : rapprochements à
                70 % et plus non traités, prospects sans contact depuis 45 jours.
              </li>
              <li>
                <span className='text-foreground font-medium'>Estimations</span> : avis de valeur à
                préparer, puis relance 10 jours après s’il n’y a pas de mandat.
              </li>
              <li>
                <span className='text-foreground font-medium'>Avis clients</span> : témoignages à
                valider, avis à demander pour les biens sous offre.
              </li>
            </ul>
          </Panel>

          {synchroEnAttente > 0 && (
            <Panel
              title='Synchronisation Laforêt'
              icon={Icons.sync}
              meta={
                <span className='bg-warn/15 text-warn rounded-full px-2 py-0.5 font-semibold'>
                  API en attente
                </span>
              }
            >
              <p className='text-[13px]'>
                <span className='font-mono font-semibold'>{synchroEnAttente}</span> modification
                {synchroEnAttente > 1 ? 's' : ''} en file pour Laforêt Business.
              </p>
              <p className='text-muted-foreground mt-1 text-xs'>
                Elles partiront dès que la connexion Laforêt sera branchée.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
