'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { Panel } from '@/features/today/components/panel';
import { cn } from '@/lib/utils';
import { trierBoite } from '../tri';
import {
  CATEGORIES,
  LIBELLES_CATEGORIES,
  type Brouillon,
  type Categorie,
  type MailTrie,
  type ResultatTri
} from '../tri-types';

// Bouton « Trier ma boîte » et affichage du tri. Le dernier tri reste dans ce navigateur
// (localStorage) pour le retrouver en revenant sur la page ; rien n'est enregistré dans Ovalia.

const CLE = 'ovalia.tri-boite';

const PASTILLE: Record<Categorie, string> = {
  urgent: 'bg-crit',
  echeance: 'bg-warn',
  reponse: 'bg-cuivre',
  rapprochement: 'bg-sauge',
  relance: 'bg-ok',
  info: 'bg-muted-foreground/40'
};

const estVendredi = () =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' }).format(
    new Date()
  ) === 'vendredi';

const heure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });

function lireSauvegarde(): ResultatTri | null {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as ResultatTri) : null;
  } catch {
    return null;
  }
}

function sauvegarder(r: ResultatTri | null) {
  try {
    if (r) localStorage.setItem(CLE, JSON.stringify(r));
    else localStorage.removeItem(CLE);
  } catch {
    /* navigation privée : tant pis, le tri reste affiché jusqu'au rechargement */
  }
}

function BrouillonMail({ brouillon }: { brouillon: Brouillon }) {
  const mailto = `mailto:${encodeURIComponent(brouillon.a)}?subject=${encodeURIComponent(
    brouillon.objet
  )}&body=${encodeURIComponent(brouillon.texte)}`;
  return (
    <details className='group/b mt-2'>
      <summary className='text-cuivre inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold'>
        <Icons.mail className='size-3.5' /> Brouillon prêt
        <span className='text-muted-foreground font-normal group-open/b:hidden'>· afficher</span>
      </summary>
      <div className='bg-background/60 mt-2 rounded-xl border p-3 text-sm'>
        <p className='text-muted-foreground text-xs'>
          À : {brouillon.a || 'à compléter'} · Objet : {brouillon.objet}
        </p>
        <p className='mt-2 whitespace-pre-line'>{brouillon.texte}</p>
        <div className='mt-3 flex flex-wrap gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(brouillon.texte);
                toast.success('Texte copié.');
              } catch {
                toast.error('Copie impossible : sélectionnez le texte à la main.');
              }
            }}
          >
            <Icons.copy /> Copier le texte
          </Button>
          <Button size='sm' variant='outline' nativeButton={false} render={<a href={mailto} />}>
            <Icons.send /> Ouvrir dans ma messagerie
          </Button>
        </div>
      </div>
    </details>
  );
}

function LigneMail({ m }: { m: MailTrie }) {
  return (
    <li className='py-3'>
      <div className='flex items-baseline justify-between gap-3'>
        <p className='min-w-0 truncate text-sm'>
          <span className='font-semibold' title={m.adresse ?? undefined}>
            {m.de}
          </span>
          <span className='text-muted-foreground'> — {m.sujet || '(sans objet)'}</span>
        </p>
        <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>{heure(m.date)}</span>
      </div>
      <p className='mt-0.5 text-sm'>{m.action}</p>
      {m.echeance && (
        <p className='text-warn mt-0.5 flex items-center gap-1 text-xs font-medium'>
          <Icons.calendar className='size-3.5' />
          {m.echeance.date
            ? new Date(`${m.echeance.date}T12:00:00`).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })
            : 'Date à confirmer'}{' '}
          · {m.echeance.libelle}
        </p>
      )}
      {m.raison && m.categorie !== 'info' && (
        <p className='text-muted-foreground mt-0.5 text-xs'>{m.raison}</p>
      )}
      {!!m.autresSujets?.length && (
        <p className='text-muted-foreground mt-0.5 text-xs'>Aussi : {m.autresSujets.join(' · ')}</p>
      )}
      {m.brouillon && <BrouillonMail brouillon={m.brouillon} />}
    </li>
  );
}

function Resultat({ r }: { r: ResultatTri }) {
  const parCategorie = (c: Categorie) => r.mails.filter((m) => m.categorie === c);
  return (
    <div className='flex flex-col gap-5'>
      <section className='bg-secondary/60 rounded-2xl border p-4 sm:p-5'>
        <p className='text-sauge text-[11px] font-semibold tracking-[0.16em] uppercase'>
          {r.bilan ? 'Tri et bilan de la semaine' : 'Tri du jour'} · {r.nbMails} mails ·{' '}
          {heure(r.trieLe)}
        </p>
        <p className='font-display mt-1.5 text-lg leading-snug font-semibold'>{r.resume}</p>
        {r.priorites.length > 0 && (
          <>
            <p className='mt-4 text-sm font-semibold'>Mes 3 priorités du jour</p>
            <ol className='mt-1.5 flex flex-col gap-1.5'>
              {r.priorites.map((p, i) => (
                <li key={i} className='flex gap-2.5 text-sm'>
                  <span className='bg-cuivre text-primary-foreground grid size-5 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold'>
                    {i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'>
        <div className='flex min-w-0 flex-col gap-5'>
          {CATEGORIES.filter((c) => c !== 'info').map((c) => {
            const liste = parCategorie(c);
            if (!liste.length) return null;
            return (
              <Panel
                key={c}
                title={LIBELLES_CATEGORIES[c].titre}
                icon={
                  c === 'urgent'
                    ? Icons.alertCircle
                    : c === 'echeance'
                      ? Icons.calendar
                      : Icons.mail
                }
                meta={
                  <span className='flex items-center gap-1.5'>
                    <span className={cn('size-2 rounded-full', PASTILLE[c])} />
                    {liste.length} · {LIBELLES_CATEGORIES[c].aide}
                  </span>
                }
              >
                <ul className='divide-y'>
                  {liste.map((m) => (
                    <LigneMail key={m.uid} m={m} />
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>

        <div className='flex min-w-0 flex-col gap-5'>
          {r.relances.length > 0 && (
            <Panel title='Anticipation et relances' icon={Icons.clock} ia>
              <ul className='divide-y'>
                {r.relances.map((x, i) => (
                  <li key={i} className='py-3'>
                    <p className='flex items-baseline justify-between gap-3 text-sm font-semibold'>
                      {x.dossier}
                      <span className='text-ok shrink-0 text-xs font-medium'>{x.quand}</span>
                    </p>
                    <p className='text-muted-foreground text-xs'>{x.ouEnEst}</p>
                    {x.manque && (
                      <p className='text-muted-foreground text-xs'>Manque : {x.manque}</p>
                    )}
                    <p className='mt-0.5 text-sm'>{x.action}</p>
                    {x.brouillon && <BrouillonMail brouillon={x.brouillon} />}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {r.rapprochements.length > 0 && (
            <Panel title='Demandes ↔ biens qui arrivent' icon={Icons.rapprochement} ia>
              <ul className='divide-y'>
                {r.rapprochements.map((x, i) => (
                  <li key={i} className='py-3'>
                    <p className='text-sm font-semibold'>
                      {x.client} <span className='text-muted-foreground font-normal'>↔</span>{' '}
                      {x.bien}
                    </p>
                    <div className='mt-1 flex flex-wrap gap-1.5'>
                      {x.colle.map((t) => (
                        <span
                          key={t}
                          className='bg-ok/15 text-ok rounded-full px-2 py-0.5 text-[11px]'
                        >
                          {t}
                        </span>
                      ))}
                      {x.manque.map((t) => (
                        <span
                          key={t}
                          className='bg-warn/15 text-warn rounded-full px-2 py-0.5 text-[11px]'
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className='mt-1 text-sm'>{x.action}</p>
                    {x.brouillon && <BrouillonMail brouillon={x.brouillon} />}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {parCategorie('info').length > 0 && (
            <Panel
              title='À lire / information'
              icon={Icons.mail}
              meta={`${parCategorie('info').length} mail(s)`}
            >
              <ul className='divide-y'>
                {parCategorie('info').map((m) => (
                  <li key={m.uid} className='py-2 text-sm'>
                    <span className='font-medium'>{m.de}</span>
                    <span className='text-muted-foreground'> — {m.action}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {r.bilanSemaine && (
        <Panel title='Bilan de la semaine' icon={Icons.checks} ia>
          <div className='grid gap-5 md:grid-cols-2'>
            <div>
              <p className='text-sm font-semibold'>Ce qui a avancé</p>
              <ul className='text-muted-foreground mt-1 list-disc pl-5 text-sm'>
                {r.bilanSemaine.avance.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
              <p className='mt-4 text-sm font-semibold'>En suspens</p>
              <ul className='text-muted-foreground mt-1 list-disc pl-5 text-sm'>
                {r.bilanSemaine.suspens.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
              {r.bilanSemaine.echeances.length > 0 && (
                <>
                  <p className='mt-4 text-sm font-semibold'>Échéances de la semaine prochaine</p>
                  <ul className='mt-1 text-sm'>
                    {r.bilanSemaine.echeances.map((x, i) => (
                      <li key={i}>
                        <span className='text-warn font-medium'>{x.jour}</span> · {x.quoi}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div>
              <p className='text-sm font-semibold'>Plan de la semaine prochaine</p>
              <div className='mt-1 flex flex-col gap-2'>
                {r.bilanSemaine.plan.map((j, i) => (
                  <div key={i}>
                    <p className='text-cuivre text-xs font-semibold tracking-wide uppercase'>
                      {j.jour}
                    </p>
                    <ul className='list-disc pl-5 text-sm'>
                      {j.actions.map((a, k) => (
                        <li key={k}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className='bg-secondary/60 mt-4 rounded-xl border p-3 text-sm'>
                <span className='font-semibold'>Conseil de la semaine : </span>
                {r.bilanSemaine.conseil}
              </p>
            </div>
          </div>
        </Panel>
      )}

      <p className='text-muted-foreground text-xs'>
        Tri proposé par l’IA à partir de vos mails et de vos dossiers Ovalia : relisez chaque
        brouillon avant de l’envoyer. Rien n’est envoyé ni enregistré par Ovalia.
      </p>
    </div>
  );
}

export function TriBoite() {
  const [resultat, setResultat] = useState<ResultatTri | null>(null);
  const [bilan, setBilan] = useState(false);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    setResultat(lireSauvegarde());
    setBilan(estVendredi());
  }, []);

  function trier() {
    demarrer(async () => {
      const res = await trierBoite({ bilan });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResultat(res.resultat);
      sauvegarder(res.resultat);
    });
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4'>
        <div className='min-w-0'>
          <p className='font-display flex items-center gap-2 text-[17px] font-semibold'>
            <Icons.sparkles className='text-sauge size-[18px]' /> Trier ma boîte
          </p>
          <p className='text-muted-foreground text-xs'>
            {enCours
              ? 'Lecture de vos mails et de vos dossiers… comptez une à deux minutes.'
              : 'Urgent, échéances, réponses prêtes, rapprochements et relances, à partir des mails des 10 derniers jours.'}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <Label className='text-sm font-normal'>
            <Switch checked={bilan} onCheckedChange={setBilan} disabled={enCours} /> Bilan de la
            semaine
          </Label>
          <Button className='h-9 font-semibold' onClick={trier} disabled={enCours}>
            {enCours ? (
              <>
                <Icons.spinner className='animate-spin' /> Tri en cours…
              </>
            ) : (
              <>
                <Icons.sparkles /> {resultat ? 'Relancer le tri' : 'Trier ma boîte'}
              </>
            )}
          </Button>
        </div>
      </div>
      {resultat && !enCours && <Resultat r={resultat} />}
    </div>
  );
}
