'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { changerStatutRapprochement } from '@/features/prospects/actions';
import { cocherTache, prochainContact, reporterTache, supprimerTache } from '../actions';
import { dateLisible } from '../dates';
import {
  MOMENTS,
  NATURES,
  type ActionJour,
  type Moment,
  type Nature,
  type Personne
} from '../types';

const PUCE: Record<Nature, string> = {
  appel: 'bg-ok/15 text-ok border-ok/30',
  visite: 'bg-sauge/15 text-sauge border-sauge/30',
  estimation: 'bg-cuivre/15 text-cuivre border-cuivre/35',
  mandat: 'bg-foreground/10 text-foreground border-border',
  acquereur: 'bg-sauge/15 text-sauge border-sauge/30',
  avis: 'bg-warn/15 text-warn border-warn/30',
  communication: 'bg-sauge/15 text-sauge border-sauge/30',
  autre: 'bg-muted text-muted-foreground border-border'
};

const TITRE_MOMENT: Record<Moment, string> = {
  retard: 'text-crit',
  jour: 'text-foreground',
  semaine: 'text-foreground',
  plus_tard: 'text-muted-foreground'
};

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`;

/** Exécute une action serveur, signale l'erreur, puis recharge la journée. */
function useGeste() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const lancer = (f: () => Promise<{ ok: true } | { ok: false; error: string }>, ok?: string) =>
    demarrer(async () => {
      const r = await f();
      if (!r.ok) toast.error(r.error);
      else {
        if (ok) toast.success(ok);
        router.refresh();
      }
    });
  return { enCours, lancer };
}

function Telephone({ numero, compact }: { numero: string; compact?: boolean }) {
  return (
    <a
      href={tel(numero)}
      className='text-sauge inline-flex items-center gap-1 font-mono text-xs whitespace-nowrap hover:underline'
    >
      <Icons.phone className='size-3.5' aria-hidden='true' />
      {compact ? <span className='sr-only'>{numero}</span> : numero}
    </a>
  );
}

function Personnes({
  personnes,
  rapprochement
}: {
  personnes: Personne[];
  rapprochement: boolean;
}) {
  const { enCours, lancer } = useGeste();
  const [traites, setTraites] = useState<Set<string>>(new Set());
  const statut = (id: string, s: 'envoye' | 'ecarte') => {
    setTraites((t) => new Set(t).add(id));
    lancer(() => changerStatutRapprochement(id, s), s === 'envoye' ? 'Noté : contacté' : undefined);
  };
  return (
    <ul className='mt-2 flex flex-col gap-1.5'>
      {personnes
        .filter((p) => !traites.has(p.id))
        .map((p) => (
          <li
            key={p.id}
            className='bg-background/50 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-2.5 py-1.5'
          >
            <span className='min-w-0 flex-1 text-[13px] font-medium'>
              {p.nom}
              {p.score != null && (
                <span className='text-cuivre ml-1.5 font-mono text-[11px]'>{p.score} %</span>
              )}
              {p.info && (
                <span className='text-muted-foreground block truncate text-xs font-normal'>
                  {p.info}
                </span>
              )}
            </span>
            {p.telephone && <Telephone numero={p.telephone} />}
            {rapprochement && (
              <span className='flex gap-1'>
                <Button
                  size='xs'
                  variant='outline'
                  disabled={enCours}
                  onClick={() => statut(p.id, 'envoye')}
                >
                  <Icons.check /> Contacté
                </Button>
                <Button
                  size='xs'
                  variant='ghost'
                  disabled={enCours}
                  onClick={() => statut(p.id, 'ecarte')}
                >
                  Écarter
                </Button>
              </span>
            )}
          </li>
        ))}
    </ul>
  );
}

function Ligne({ a }: { a: ActionJour }) {
  const { enCours, lancer } = useGeste();
  const g = a.geste;
  const faite = g?.type === 'tache' && g.faite;

  return (
    <li className='grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-3'>
      <div className='pt-0.5'>
        {g?.type === 'tache' ? (
          <input
            type='checkbox'
            id={`a-${a.id}`}
            checked={faite}
            disabled={enCours}
            onChange={() => lancer(() => cocherTache(g.tacheId, !g.faite))}
            className='accent-sauge size-4 cursor-pointer'
            aria-label={faite ? 'Marquer comme à faire' : 'Marquer comme faite'}
          />
        ) : (
          <Icons.arrowRight className='text-muted-foreground/70 size-4' aria-hidden='true' />
        )}
      </div>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-start justify-between gap-x-3 gap-y-1'>
          <div className='min-w-0'>
            <p className={cn('font-medium', faite && 'line-through opacity-55')}>
              {a.heure && (
                <span className='text-muted-foreground mr-2 font-mono text-xs'>{a.heure}</span>
              )}
              {a.titre}
            </p>
            {a.detail && (
              <p className={cn('text-muted-foreground text-[12.5px]', faite && 'opacity-55')}>
                {a.detail}
              </p>
            )}
          </div>
          <span className='flex items-center gap-2'>
            {a.date && a.moment !== 'jour' && (
              <span
                className={cn(
                  'font-mono text-[11px] whitespace-nowrap',
                  a.moment === 'retard' ? 'text-crit' : 'text-muted-foreground'
                )}
              >
                {dateLisible(a.date)}
              </span>
            )}
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                PUCE[a.nature]
              )}
            >
              {NATURES[a.nature]}
            </span>
          </span>
        </div>

        {(g?.type === 'rapprochements' || g?.type === 'personnes') && (
          <Personnes personnes={g.personnes} rapprochement={g.type === 'rapprochements'} />
        )}

        {!faite && (a.href || a.telephone || g?.type === 'relance' || g?.type === 'tache') && (
          <div className='mt-2 flex flex-wrap items-center gap-1.5'>
            {a.telephone && <Telephone numero={a.telephone} />}
            {a.href && (
              <Button
                size='xs'
                variant='outline'
                nativeButton={false}
                render={<Link href={a.href} />}
              >
                {a.lien ?? 'Ouvrir'}
              </Button>
            )}
            {g?.type === 'relance' && (
              <>
                <span className='text-muted-foreground ml-1 text-xs'>
                  Rappelé, prochain contact :
                </span>
                {[7, 15, 30].map((j) => (
                  <Button
                    key={j}
                    size='xs'
                    variant='ghost'
                    disabled={enCours}
                    onClick={() =>
                      lancer(() => prochainContact(g.bienId, j), `Prochain contact dans ${j} jours`)
                    }
                  >
                    + {j} j
                  </Button>
                ))}
              </>
            )}
            {g?.type === 'tache' && (
              <>
                {a.moment === 'retard' || a.moment === 'jour' ? (
                  <Button
                    size='xs'
                    variant='ghost'
                    disabled={enCours}
                    onClick={() => lancer(() => reporterTache(g.tacheId), 'Reportée à demain')}
                  >
                    <Icons.clock /> Demain
                  </Button>
                ) : null}
                <Button
                  size='xs'
                  variant='ghost'
                  disabled={enCours}
                  className='text-muted-foreground'
                  onClick={() => lancer(() => supprimerTache(g.tacheId))}
                  aria-label='Supprimer la tâche'
                >
                  <Icons.trash />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function FeuilleDeRoute({ actions }: { actions: ActionJour[] }) {
  const [plusTard, setPlusTard] = useState(false);

  if (!actions.length)
    return (
      <p className='text-muted-foreground py-6 text-center text-sm'>
        Rien d’urgent aujourd’hui. Ajoutez une tâche, ou renseignez le « Prochain contact » et la
        fin de mandat sur vos fiches pour que vos relances apparaissent ici.
      </p>
    );

  return (
    <div className='flex flex-col gap-4'>
      {MOMENTS.map((m) => {
        const liste = actions.filter((a) => a.moment === m.cle);
        if (!liste.length) return null;
        const replie = m.cle === 'plus_tard' && !plusTard;
        return (
          <section key={m.cle} aria-label={m.titre}>
            <h3
              className={cn(
                'flex items-baseline gap-2 border-b pb-1.5 text-[13px] font-semibold',
                TITRE_MOMENT[m.cle]
              )}
            >
              {m.titre}
              <span className='text-muted-foreground font-mono text-[11px] font-normal'>
                {liste.length}
              </span>
              <span className='text-muted-foreground ml-auto text-[11px] font-normal'>
                {m.aide}
              </span>
            </h3>
            {replie ? (
              <Button
                size='sm'
                variant='ghost'
                className='text-muted-foreground mt-1'
                onClick={() => setPlusTard(true)}
              >
                <Icons.chevronDown /> Afficher ({liste.length})
              </Button>
            ) : (
              <ul className='divide-border divide-y'>
                {liste.map((a) => (
                  <Ligne key={a.id} a={a} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
