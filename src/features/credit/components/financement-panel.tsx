'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  ENDETTEMENT_MAX,
  ancienneteJours,
  simuler,
  tauxPourDuree,
  usurePourDuree,
  type ParametresCredit
} from '@/lib/credit';

const DUREES = [18, 20] as const;
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

function NumberField({
  id,
  label,
  unit,
  value,
  onChange
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [texte, setTexte] = useState(String(value).replace('.', ','));
  return (
    <div className='min-w-0 space-y-1.5'>
      <Label htmlFor={id} className='text-muted-foreground text-xs'>
        {label}
      </Label>
      <div className='relative'>
        <Input
          id={id}
          inputMode='decimal'
          className='pr-10 tabular-nums'
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value);
            const n = Number(e.target.value.replace(',', '.').replace(/\s/g, ''));
            if (!Number.isNaN(n)) onChange(n);
          }}
        />
        <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs'>
          {unit}
        </span>
      </div>
    </div>
  );
}

export function FinancementPanel({
  parametres,
  prixInitial,
  prixSource,
  anneeConstruction
}: {
  parametres: ParametresCredit;
  prixInitial: number | null;
  prixSource: string;
  anneeConstruction: number | null;
}) {
  const [prix, setPrix] = useState(prixInitial ?? 0);
  const [notairePct, setNotairePct] = useState(parametres.notaire_pct);
  const [travaux, setTravaux] = useState(0);
  const [apportPct, setApportPct] = useState(parametres.apport_pct);
  const [assurancePct, setAssurancePct] = useState(parametres.assurance_pct);

  const notaire = Math.round((prix * notairePct) / 100);
  const coutTotal = prix + notaire + travaux;
  const apport = Math.round((coutTotal * apportPct) / 100);
  const capital = Math.max(0, coutTotal - apport);
  const age = ancienneteJours(parametres.taux_du);
  const grilleVide = parametres.taux_15 === null && parametres.taux_20 === null && parametres.taux_25 === null;

  const simulations = DUREES.map((annees) => {
    const taux = tauxPourDuree(parametres, annees);
    return taux === null ? null : simuler(capital, taux, annees, assurancePct, usurePourDuree(parametres, annees));
  });

  return (
    <section className='bg-card min-w-0 rounded-2xl border p-4 sm:p-5'>
      <header className='mb-4 flex flex-wrap items-start justify-between gap-2'>
        <div>
          <h2 className='font-display flex items-center gap-2 text-[17px] font-semibold'>
            <Icons.creditCard className='text-sauge size-[18px]' aria-hidden='true' /> Financement
          </h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            Achat + travaux sur 18 et 20 ans · prix de départ : {prixSource}
          </p>
        </div>
        <Link href='/dashboard/taux' className='text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline'>
          Modifier les taux
        </Link>
      </header>

      {grilleVide ? (
        <div className='bg-cuivre/10 border-cuivre/40 rounded-xl border p-4 text-sm'>
          Renseignez d’abord la grille de taux dans{' '}
          <Link href='/dashboard/taux' className='text-cuivre underline underline-offset-4'>
            Réglages › Taux de crédit
          </Link>
          .
        </div>
      ) : (
        <>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
            <NumberField id='fin-prix' label='Prix (FAI)' unit='€' value={prix} onChange={setPrix} />
            <NumberField id='fin-notaire' label='Notaire' unit='%' value={notairePct} onChange={setNotairePct} />
            <NumberField id='fin-travaux' label='Travaux' unit='€' value={travaux} onChange={setTravaux} />
            <NumberField id='fin-apport' label='Apport' unit='%' value={apportPct} onChange={setApportPct} />
            <NumberField id='fin-assurance' label='Assurance' unit='%/an' value={assurancePct} onChange={setAssurancePct} />
          </div>

          <dl className='text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs'>
            <div>
              <dt className='inline'>Frais de notaire : </dt>
              <dd className='text-foreground inline font-mono'>{eur.format(notaire)}</dd>
            </div>
            <div>
              <dt className='inline'>Coût total : </dt>
              <dd className='text-foreground inline font-mono'>{eur.format(coutTotal)}</dd>
            </div>
            <div>
              <dt className='inline'>Apport : </dt>
              <dd className='text-foreground inline font-mono'>{eur.format(apport)}</dd>
            </div>
            <div>
              <dt className='inline'>Montant emprunté : </dt>
              <dd className='text-foreground inline font-mono'>{eur.format(capital)}</dd>
            </div>
          </dl>

          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {simulations.map((s, i) =>
              s ? (
                <div key={DUREES[i]} className='bg-background/40 rounded-xl border p-4'>
                  <div className='flex items-baseline justify-between gap-2'>
                    <p className='font-semibold'>{s.annees} ans</p>
                    <p className='text-muted-foreground font-mono text-xs'>taux {pct(s.taux)}</p>
                  </div>
                  <p className='font-display text-cuivre mt-2 text-3xl leading-none font-extrabold tabular-nums'>
                    {eur.format(s.mensualite)}
                    <span className='text-muted-foreground ml-1 font-sans text-sm font-medium'>/mois</span>
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>dont assurance {eur.format(s.assuranceMensuelle)}</p>
                  <dl className='mt-3 grid grid-cols-2 gap-y-1 text-xs'>
                    <dt className='text-muted-foreground'>Coût du crédit</dt>
                    <dd className='text-right font-mono'>{eur.format(s.coutTotal)}</dd>
                    <dt className='text-muted-foreground'>Revenus nets nécessaires</dt>
                    <dd className='text-right font-mono'>{eur.format(s.revenusNecessaires)}/mois</dd>
                    <dt className='text-muted-foreground'>TAEG approché</dt>
                    <dd className={cn('text-right font-mono', s.depasseUsure && 'text-crit')}>
                      {pct(s.taegApproche)}
                      {s.usure !== null && ` (usure ${pct(s.usure)})`}
                    </dd>
                  </dl>
                  {s.depasseUsure && (
                    <p className='text-crit mt-2 text-xs'>Au-dessus du taux d’usure : ce prêt ne pourrait pas être accordé en l’état.</p>
                  )}
                </div>
              ) : (
                <div key={DUREES[i]} className='text-muted-foreground rounded-xl border border-dashed p-4 text-sm'>
                  {DUREES[i]} ans : taux manquant dans la grille.
                </div>
              )
            )}
          </div>

          {(travaux > 0 || (anneeConstruction !== null && anneeConstruction < 1990)) && (
            <p className='text-muted-foreground mt-3 text-xs'>
              Travaux de rénovation énergétique : un éco-PTZ (prêt à taux zéro) peut financer une partie des travaux, et un
              PTZ peut être mobilisable dans l’ancien avec travaux selon la commune et les revenus. Éligibilité et plafonds à
              vérifier auprès de la banque.
            </p>
          )}

          <p className='text-muted-foreground mt-3 border-t border-dashed pt-2.5 text-[11px]'>
            Simulation indicative, ne constitue pas une offre de prêt. Taux {parametres.source ? `: ${parametres.source}` : 'saisis dans les réglages'}
            {parametres.taux_du ? `, en date du ${new Date(parametres.taux_du).toLocaleDateString('fr-FR')}` : ''}.
            Taux d’endettement maximal {Math.round(ENDETTEMENT_MAX * 100)} % assurance comprise (règle HCSF). TAEG approché = taux
            nominal + assurance, hors frais de dossier et de garantie.
            {age !== null && age > 45 && <span className='text-warn'> Grille de taux datant de {age} jours.</span>}
          </p>
        </>
      )}
    </section>
  );
}
