'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { calculerValeurs, type Ajustement } from '@/lib/estimation/calcul';
import type { EstimationDetails } from '@/lib/estimation/estimer';
import { modifierAjustements, relancerEstimation } from '../actions';

export type EstimationView = {
  id: string;
  createdAt: string;
  argumentaire: string | null;
  details: EstimationDetails;
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const dateFr = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

const confianceStyle = {
  élevée: 'bg-ok/15 text-ok',
  moyenne: 'bg-warn/15 text-warn',
  faible: 'bg-crit/15 text-crit'
} as const;

function Relancer({ bienId, label, disabledReason }: { bienId: string; label: string; disabledReason?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className='space-y-1.5'>
      <Button
        variant={label.startsWith('Lancer') ? 'default' : 'outline'}
        size='sm'
        disabled={pending || Boolean(disabledReason)}
        onClick={() =>
          start(async () => {
            const res = await relancerEstimation(bienId);
            if (res.ok) {
              toast.success('Estimation mise à jour');
              router.refresh();
            } else toast.error(res.error);
          })
        }
      >
        {pending ? (
          <>
            <Icons.spinner className='animate-spin' /> Calcul en cours (≈ 30 s)…
          </>
        ) : (
          <>
            <Icons.sync /> {label}
          </>
        )}
      </Button>
      {disabledReason && <p className='text-muted-foreground text-xs'>{disabledReason}</p>}
    </div>
  );
}

export function EstimationPanel({
  bienId,
  estimation,
  disabledReason
}: {
  bienId: string;
  estimation: EstimationView | null;
  disabledReason: string | null;
}) {
  const router = useRouter();
  const [ajustements, setAjustements] = useState<Ajustement[]>(estimation?.details.ajustements ?? []);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

  if (!estimation) {
    return (
      <section className='bg-card rounded-2xl border p-4 sm:p-5'>
        <h2 className='font-display flex items-center gap-2 text-[17px] font-semibold'>
          <Icons.estimation className='text-sauge size-[18px]' aria-hidden='true' /> Estimation DVF
        </h2>
        <p className='text-muted-foreground mt-2 mb-4 max-w-2xl text-sm'>
          Pas encore d’estimation. Elle se calcule automatiquement à partir des ventes notariées du secteur dès que la
          ville est renseignée ; vous pouvez aussi la lancer ici.
        </p>
        <Relancer bienId={bienId} label='Lancer l’estimation' disabledReason={disabledReason} />
      </section>
    );
  }

  const d = estimation.details;
  const r = dirty ? calculerValeurs(d.surface, d.marche, ajustements) : d.resultat;
  const span = r.valeurHaute - r.valeurBasse || 1;
  const pos = ((r.valeurProbable - r.valeurBasse) / span) * 100;

  const setAj = (i: number, patch: Partial<Ajustement>) => {
    setAjustements((as) => as.map((a, j) => (j === i ? { ...a, ...patch } : a)));
    setDirty(true);
  };
  const enregistrer = () =>
    startSave(async () => {
      const res = await modifierAjustements(estimation.id, ajustements.filter((a) => a.libelle.trim()));
      if (res.ok) {
        setDirty(false);
        toast.success('Ajustements enregistrés');
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <section className='bg-card min-w-0 rounded-2xl border p-4 sm:p-5'>
      <header className='mb-4 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='font-display flex items-center gap-2 text-[17px] font-semibold'>
            <Icons.estimation className='text-sauge size-[18px]' aria-hidden='true' /> Estimation DVF
            <span className={cn('rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold', confianceStyle[d.marche.confiance])}>
              Confiance {d.marche.confiance}
            </span>
          </h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {d.nbComparables} ventes comparables · {d.marche.criteres} · calculée le{' '}
            {new Date(estimation.createdAt).toLocaleDateString('fr-FR')}
            {d.localisation.precision === 'commune' && ' · position approximative (centre de la commune)'}
          </p>
        </div>
        <Relancer bienId={bienId} label='Relancer' />
      </header>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
        <div className='bg-background/40 rounded-xl border p-4'>
          <p className='text-muted-foreground text-xs'>Prix de présentation conseillé (honoraires inclus)</p>
          <p className='font-display text-cuivre mt-1 text-4xl leading-none font-extrabold tabular-nums'>
            {eur.format(r.prixConseille)}
          </p>
          <dl className='mt-3 grid grid-cols-2 gap-2 text-sm'>
            <div>
              <dt className='text-muted-foreground text-xs'>Net vendeur</dt>
              <dd className='font-mono'>{eur.format(r.netVendeur)}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground text-xs'>Honoraires {(d.tauxHonoraires * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %</dt>
              <dd className='font-mono'>{eur.format(r.honoraires)}</dd>
            </div>
          </dl>
          {dirty && <p className='text-cuivre mt-2 text-xs'>Aperçu avec vos ajustements, pas encore enregistré.</p>}
        </div>

        <div className='rounded-xl border p-4'>
          <div className='flex items-baseline justify-between gap-2'>
            <p className='text-muted-foreground text-xs'>Valeur de marché</p>
            <p className='font-mono text-sm'>{num.format(r.prixM2)} €/m²</p>
          </div>
          <div className='relative mt-5 mb-1.5 h-2 rounded-full' role='img' aria-label={`Fourchette de ${eur.format(r.valeurBasse)} à ${eur.format(r.valeurHaute)}`}>
            <div className='from-sauge to-cuivre absolute inset-0 rounded-full bg-linear-to-r' />
            <div className='bg-foreground absolute -top-1.5 h-5 w-[3px] -translate-x-1/2 rounded-sm' style={{ left: `${pos}%` }} />
          </div>
          <div className='flex justify-between font-mono text-[11.5px]'>
            <span>{eur.format(r.valeurBasse)}</span>
            <span className='font-semibold'>{eur.format(r.valeurProbable)}</span>
            <span>{eur.format(r.valeurHaute)}</span>
          </div>
          <dl className='text-muted-foreground mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs'>
            <dt>Prix médian du secteur</dt>
            <dd className='text-foreground text-right font-mono'>{num.format(d.marche.prixM2)} €/m²</dd>
            <dt>Valeur avant ajustements</dt>
            <dd className='text-foreground text-right font-mono'>{eur.format(r.valeurBase)}</dd>
            <dt>Ajustements</dt>
            <dd className={cn('text-right font-mono', r.totalAjustements < 0 ? 'text-warn' : 'text-ok')}>
              {r.totalAjustements > 0 ? '+' : ''}
              {r.totalAjustements} %
            </dd>
            {d.marche.tendanceAnnuelle !== null && (
              <>
                <dt>Tendance du secteur</dt>
                <dd className='text-foreground text-right font-mono'>
                  {d.marche.tendanceAnnuelle >= 0 ? '+' : ''}
                  {(d.marche.tendanceAnnuelle * 100).toFixed(1)} %/an
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className='mt-5'>
        <h3 className='mb-2 text-xs font-semibold tracking-[0.12em] uppercase'>Ajustements qualitatifs</h3>
        {d.iaErreur && <p className='text-warn mb-2 text-xs'>{d.iaErreur}</p>}
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[520px] text-sm'>
            <thead>
              <tr className='text-muted-foreground text-left text-xs'>
                <th className='pb-2 font-medium'>Motif</th>
                <th className='w-24 pb-2 font-medium'>%</th>
                <th className='pb-2 font-medium'>Justification</th>
                <th className='w-10 pb-2' />
              </tr>
            </thead>
            <tbody>
              {ajustements.map((a, i) => (
                <tr key={i} className='align-top'>
                  <td className='py-1 pr-2'>
                    <Input aria-label={`Motif ${i + 1}`} value={a.libelle} onChange={(e) => setAj(i, { libelle: e.target.value })} />
                  </td>
                  <td className='py-1 pr-2'>
                    <Input
                      aria-label={`Pourcentage ${i + 1}`}
                      inputMode='decimal'
                      className='tabular-nums'
                      value={String(a.pourcentage)}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(',', '.'));
                        if (e.target.value === '-' || e.target.value === '') setAj(i, { pourcentage: 0 });
                        else if (!Number.isNaN(n)) setAj(i, { pourcentage: Math.max(-30, Math.min(30, n)) });
                      }}
                    />
                  </td>
                  <td className='text-muted-foreground py-1 pr-2 text-xs'>
                    <Input
                      aria-label={`Justification ${i + 1}`}
                      value={a.justification}
                      onChange={(e) => setAj(i, { justification: e.target.value })}
                    />
                  </td>
                  <td className='py-1'>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      aria-label={`Supprimer l’ajustement ${i + 1}`}
                      onClick={() => {
                        setAjustements((as) => as.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                    >
                      <Icons.trash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className='mt-2 flex flex-wrap gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setAjustements((as) => [...as, { libelle: '', pourcentage: 0, justification: '' }]);
              setDirty(true);
            }}
          >
            <Icons.add /> Ajouter un ajustement
          </Button>
          {dirty && (
            <Button size='sm' className='font-semibold' disabled={saving} onClick={enregistrer}>
              {saving ? 'Enregistrement…' : 'Enregistrer les ajustements'}
            </Button>
          )}
        </div>
      </div>

      {(estimation.argumentaire || d.strategie) && (
        <div className='mt-5 grid gap-4 lg:grid-cols-2'>
          {estimation.argumentaire && (
            <div>
              <h3 className='mb-1.5 text-xs font-semibold tracking-[0.12em] uppercase'>Argumentaire (avis de valeur)</h3>
              <p className='text-sm whitespace-pre-line'>{estimation.argumentaire}</p>
            </div>
          )}
          {d.strategie && (
            <div>
              <h3 className='text-cuivre mb-1.5 text-xs font-semibold tracking-[0.12em] uppercase'>Stratégie conseiller</h3>
              <p className='text-sm whitespace-pre-line'>{d.strategie}</p>
            </div>
          )}
        </div>
      )}

      <details className='mt-5'>
        <summary className='cursor-pointer text-xs font-semibold tracking-[0.12em] uppercase'>
          Ventes comparables ({d.comparables.length} plus proches sur {d.nbComparables})
        </summary>
        <div className='mt-3 overflow-x-auto'>
          <table className='w-full min-w-[720px] text-sm'>
            <thead>
              <tr className='text-muted-foreground text-left text-xs'>
                <th className='pb-2 font-medium'>Vente</th>
                <th className='pb-2 font-medium'>Adresse</th>
                <th className='pb-2 text-right font-medium'>Surface</th>
                <th className='pb-2 text-right font-medium'>Pièces</th>
                <th className='pb-2 text-right font-medium'>Terrain</th>
                <th className='pb-2 text-right font-medium'>Prix</th>
                <th className='pb-2 text-right font-medium'>€/m²</th>
                <th className='pb-2 text-right font-medium'>Distance</th>
              </tr>
            </thead>
            <tbody className='divide-border divide-y'>
              {d.comparables.map((c, i) => (
                <tr key={i} className='tabular-nums'>
                  <td className='py-1.5 pr-2 whitespace-nowrap'>{dateFr.format(new Date(c.date))}</td>
                  <td className='py-1.5 pr-2'>
                    {c.adresse ? `${c.adresse.toLowerCase()}, ` : ''}
                    {c.commune}
                  </td>
                  <td className='py-1.5 pr-2 text-right'>{num.format(c.surface)} m²</td>
                  <td className='py-1.5 pr-2 text-right'>{c.pieces ?? '—'}</td>
                  <td className='py-1.5 pr-2 text-right'>{c.terrain ? `${num.format(c.terrain)} m²` : '—'}</td>
                  <td className='py-1.5 pr-2 text-right'>{eur.format(c.prix)}</td>
                  <td className='py-1.5 pr-2 text-right'>{num.format(c.prixM2)}</td>
                  <td className='py-1.5 text-right'>{c.distanceKm === null ? '—' : `${c.distanceKm} km`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className='text-muted-foreground mt-2 text-xs'>
            Source : DVF (ventes notariées, data.gouv.fr). Prix au m² remis à la date du jour selon la tendance du secteur
            avant calcul de la médiane.
          </p>
        </div>
      </details>
    </section>
  );
}
