'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ParametresCredit } from '@/lib/credit';
import { enregistrerParametresCredit } from '../actions';

type Champ = { key: keyof ParametresCredit; label: string; unit?: string; kind?: 'text' | 'date' };

const GROUPES: { titre: string; aide: string; champs: Champ[] }[] = [
  {
    titre: 'Taux nominaux moyens par durée',
    aide: 'Hors assurance. Reprenez l’Observatoire Crédit Logement/CSA ou la grille de votre courtier partenaire. Les autres durées (18 ans…) sont interpolées.',
    champs: [
      { key: 'taux_15', label: '15 ans', unit: '%' },
      { key: 'taux_20', label: '20 ans', unit: '%' },
      { key: 'taux_25', label: '25 ans', unit: '%' }
    ]
  },
  {
    titre: 'Taux d’usure (Banque de France)',
    aide: 'Plafond légal du TAEG, publié chaque trimestre sur banque-france.fr. La simulation signale un dépassement.',
    champs: [
      { key: 'usure_10_20', label: '10 à moins de 20 ans', unit: '%' },
      { key: 'usure_20_plus', label: '20 ans et plus', unit: '%' }
    ]
  },
  {
    titre: 'Source',
    aide: 'Affichée sous chaque simulation.',
    champs: [
      { key: 'source', label: 'Source des taux', kind: 'text' },
      { key: 'taux_du', label: 'Taux en date du', kind: 'date' }
    ]
  },
  {
    titre: 'Hypothèses par défaut',
    aide: 'Modifiables ensuite dans chaque fiche bien.',
    champs: [
      { key: 'apport_pct', label: 'Apport', unit: '% du coût total' },
      { key: 'assurance_pct', label: 'Assurance emprunteur', unit: '%/an du capital' },
      { key: 'notaire_pct', label: 'Frais de notaire (ancien)', unit: '% du prix' }
    ]
  }
];

export function TauxForm({ initial }: { initial: ParametresCredit }) {
  const [p, setP] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ParametresCredit, raw: string, kind?: Champ['kind']) => {
    if (kind) return setP((x) => ({ ...x, [key]: raw || null }));
    const n = Number(raw.replace(',', '.'));
    setP((x) => ({ ...x, [key]: raw.trim() === '' || Number.isNaN(n) ? null : n }));
  };

  return (
    <form
      className='flex max-w-3xl flex-col gap-5'
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await enregistrerParametresCredit({
            ...p,
            apport_pct: p.apport_pct ?? 10,
            assurance_pct: p.assurance_pct ?? 0.3,
            notaire_pct: p.notaire_pct ?? 7.5
          });
          if (res.ok) toast.success('Taux enregistrés');
          else setError(res.error);
        });
      }}
    >
      {GROUPES.map((g) => (
        <section key={g.titre} className='bg-card rounded-2xl border p-4 sm:p-5'>
          <h2 className='font-display text-[17px] font-semibold'>{g.titre}</h2>
          <p className='text-muted-foreground mt-1 mb-4 text-xs'>{g.aide}</p>
          <div className='grid gap-3 sm:grid-cols-3'>
            {g.champs.map((c) => (
              <div key={c.key} className={c.kind === 'text' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                <Label htmlFor={`t-${c.key}`} className='text-muted-foreground text-xs'>
                  {c.label}
                </Label>
                <div className='relative'>
                  <Input
                    id={`t-${c.key}`}
                    type={c.kind === 'date' ? 'date' : 'text'}
                    inputMode={c.kind ? undefined : 'decimal'}
                    value={p[c.key] === null || p[c.key] === undefined ? '' : String(p[c.key]).replace('.', ',')}
                    onChange={(e) => set(c.key, e.target.value, c.kind)}
                    className={c.unit ? 'pr-28 tabular-nums' : undefined}
                  />
                  {c.unit && (
                    <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs'>
                      {c.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {error && (
        <p role='alert' className='text-crit text-sm'>
          {error}
        </p>
      )}
      <div>
        <Button type='submit' disabled={pending} className='h-10 px-5 font-semibold'>
          {pending ? 'Enregistrement…' : 'Enregistrer les taux'}
        </Button>
      </div>
    </form>
  );
}
