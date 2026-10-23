import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { TopoLines } from '@/components/brand/logo';
import { kpis, mails, matches, syncQueue } from '../data';
import { Panel, ScoreRing } from './panel';
import { Sparkline } from './sparkline';
import { TaskList } from './task-list';
import { cn } from '@/lib/utils';

const levelDot = { crit: 'bg-crit', warn: 'bg-warn', ok: 'bg-ok' } as const;

function greetingDate() {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris'
  }).format(new Date());
}

export function TodayView({ firstName }: { firstName: string }) {
  return (
    <div className='relative flex flex-1 flex-col overflow-hidden px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <TopoLines className='absolute inset-x-0 top-0 h-72 w-full opacity-[0.13]' />

      <header className='relative mb-6 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-sauge text-[11px] font-semibold tracking-[0.16em] uppercase'>{greetingDate()}</p>
          <h1 className='font-display mt-1.5 text-3xl leading-tight font-extrabold md:text-4xl'>
            Bonjour {firstName}, voici votre journée
          </h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            Explorer <span className='text-cuivre'>•</span> Apprendre <span className='text-cuivre'>•</span> Agir
            <span className='border-cuivre/40 text-cuivre ml-3 rounded-[5px] border px-1.5 py-px text-[10.5px] tracking-[0.1em] uppercase'>
              Données d’exemple
            </span>
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' className='h-9'>
            <Icons.add /> Client
          </Button>
          <Button className='h-9 font-semibold'>
            <Icons.add /> Nouveau bien
          </Button>
        </div>
      </header>

      <section aria-label='Indicateurs' className='relative mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4'>
        {kpis.map((k) => (
          <div key={k.label} className='bg-secondary/60 flex min-w-0 flex-col gap-1 rounded-2xl border px-4 py-3.5'>
            <span className='text-muted-foreground text-xs'>{k.label}</span>
            <span className='font-display text-3xl leading-none font-extrabold tabular-nums'>{k.value}</span>
            <span className='text-muted-foreground truncate text-xs'>{k.hint}</span>
            <Sparkline points={k.trend} />
          </div>
        ))}
      </section>

      <div className='relative grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'>
        <div className='flex min-w-0 flex-col gap-5'>
          <Panel title='Feuille de route du jour' icon={Icons.checks}>
            <TaskList />
          </Panel>

          <Panel title='Nouveaux rapprochements' icon={Icons.rapprochement} ia>
            <div className='flex flex-col gap-3'>
              {matches.map((m) => (
                <article key={m.id} className='bg-background/40 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 rounded-xl border p-3.5'>
                  <div className='min-w-0'>
                    <p className='font-semibold'>{m.title}</p>
                    <p className='text-muted-foreground text-[12.5px]'>{m.subtitle}</p>
                  </div>
                  <ScoreRing value={m.score} />
                  <div className='col-span-2 flex flex-wrap gap-1.5'>
                    {m.with.map((w) => (
                      <span key={w.name} className='bg-background/60 rounded-full border px-2.5 py-0.5 text-xs'>
                        {w.name}
                        <span className='text-cuivre ml-1.5 font-mono text-[11px]'>{w.score} %</span>
                      </span>
                    ))}
                  </div>
                  {m.why && <p className='text-muted-foreground col-span-2 text-[12.5px]'>{m.why}</p>}
                  <div className='col-span-2 flex flex-wrap gap-2'>
                    <Button size='sm' className='font-semibold'>
                      {m.action}
                    </Button>
                    <Button size='sm' variant='outline'>
                      Voir le brouillon
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <div className='flex min-w-0 flex-col gap-5'>
          <Panel title='Boîte mail triée' icon={Icons.mail} ia meta={`${mails.length} à traiter`}>
            <ul className='divide-border divide-y'>
              {mails.map((e) => (
                <li key={e.id} className='grid grid-cols-[8px_minmax(0,1fr)_auto] items-start gap-3 py-2.5'>
                  <span className={cn('mt-1.5 size-2 rounded-full', levelDot[e.level])} aria-hidden='true' />
                  <div className='min-w-0'>
                    <p className='font-semibold'>{e.from}</p>
                    <p className='text-muted-foreground text-[12.5px]'>{e.summary}</p>
                  </div>
                  <span className='text-muted-foreground font-mono text-[11.5px]'>{e.at}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title='Estimation en cours' icon={Icons.estimation} meta='Chemin des Vignes'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <p className='font-semibold'>Maison 4 p. · 96 m² · 1978</p>
              <p className='font-display text-2xl font-extrabold tabular-nums'>
                412 000 €<span className='text-muted-foreground ml-1.5 font-sans text-xs font-medium'>valeur probable</span>
              </p>
            </div>
            <div className='bg-background/60 relative mt-4 mb-1.5 h-2 rounded-full' role='img' aria-label='Fourchette de 385 000 à 440 000 euros'>
              <div className='from-sauge to-cuivre absolute inset-y-0 right-[30%] left-[28%] rounded-full bg-linear-to-r' />
              <div className='bg-foreground absolute -top-1.5 left-[52%] h-5 w-[3px] rounded-sm' />
            </div>
            <div className='text-muted-foreground flex justify-between font-mono text-[11px]'>
              <span>360 k€</span>
              <span>385 k€</span>
              <span>440 k€</span>
              <span>470 k€</span>
            </div>
            <dl className='mt-3 grid gap-2 text-[12.5px] sm:grid-cols-3'>
              {[
                ['Prix médian DVF', '4 290 €/m²'],
                ['Ventes comparables', '12 sur 24 mois'],
                ['Travaux estimés', '− 18 500 €']
              ].map(([k, v]) => (
                <div key={k} className='bg-background/40 rounded-lg px-2.5 py-2'>
                  <dt className='text-muted-foreground'>{k}</dt>
                  <dd className='font-mono text-[13px]'>{v}</dd>
                </div>
              ))}
            </dl>
            <div className='mt-4 flex flex-wrap gap-2'>
              <Button size='sm' className='font-semibold'>
                Générer l’avis de valeur
              </Button>
              <Button size='sm' variant='outline'>
                Pré-remplir Laforêt Business
              </Button>
            </div>
          </Panel>

          <Panel
            title='Synchronisation Laforêt'
            icon={Icons.sync}
            meta={<span className='bg-warn/15 text-warn rounded-full px-2 py-0.5 font-semibold'>API en attente</span>}
          >
            <ul className='flex flex-col gap-2 text-sm'>
              {syncQueue.map((s) => (
                <li key={s.id} className='flex items-center gap-2.5'>
                  {s.kind === 'bien' ? (
                    <Icons.bien className='text-sauge size-4' aria-label='Bien' />
                  ) : (
                    <Icons.user className='text-sauge size-4' aria-label='Client' />
                  )}
                  <span className='min-w-0 flex-1 truncate'>{s.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      s.status === 'pending' ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'
                    )}
                  >
                    {s.status === 'pending' ? 'À synchroniser' : 'Exporté'}
                  </span>
                </li>
              ))}
            </ul>
            <p className='text-muted-foreground mt-3 border-t border-dashed pt-2.5 text-xs'>
              En attendant l’API, chaque saisie est conservée ici et part dans Laforêt dès que la connexion est branchée.
            </p>
          </Panel>

          <Panel title='LinkedIn de la semaine' icon={Icons.linkedin} ia>
            <div className='bg-background/40 rounded-xl border p-3.5 text-[13px]'>
              <p className='mb-3'>
                Une maison, c’est comme un match : on ne la gagne pas seul. Cette semaine, la famille Roche a signé après trois
                visites et une négociation menée ensemble…
              </p>
              <div className='flex flex-wrap gap-2'>
                <Button size='sm' className='font-semibold'>
                  Programmer
                </Button>
                <Button size='sm' variant='outline'>
                  Autre angle
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
