'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { marquerPointVerifie, mettreAJourBien, supprimerBien } from '../actions';
import {
  BIEN_GROUPS,
  type AVerifier,
  type BienValues,
  type FieldDef,
  type PieceInput,
  type VendeurInput
} from '../fields';

export type Analyse = {
  id: string;
  synthese: string | null;
  points_forts: string[];
  points_faibles: string[];
  a_verifier: AVerifier[];
  laforet_extra: { chauffage?: string | null; equipements?: string[]; loyer_potentiel?: number | null };
};

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function toNumber(value: string, int: boolean): number | null {
  const n = Number(value.replace(',', '.').replace(/\s/g, ''));
  if (value.trim() === '' || Number.isNaN(n)) return null;
  return int ? Math.round(n) : n;
}

function FieldInput({
  field,
  value,
  onChange
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `f-${field.key}`;
  switch (field.kind) {
    case 'select':
      return (
        <NativeSelect id={id} className='w-full' value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          {!field.required && <NativeSelectOption value=''>—</NativeSelectOption>}
          {field.options.map(([v, l]) => (
            <NativeSelectOption key={v} value={v}>
              {l}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
    case 'tri':
      return (
        <NativeSelect
          id={id}
          className='w-full'
          value={value === true ? 'oui' : value === false ? 'non' : ''}
          onChange={(e) => onChange(e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null)}
        >
          <NativeSelectOption value=''>Non renseigné</NativeSelectOption>
          <NativeSelectOption value='oui'>Oui</NativeSelectOption>
          <NativeSelectOption value='non'>Non</NativeSelectOption>
        </NativeSelect>
      );
    case 'bool':
      return (
        <div className='flex h-8 items-center'>
          <Switch id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
        </div>
      );
    case 'int':
    case 'num':
      return (
        <div className='relative'>
          <Input
            id={id}
            inputMode={field.kind === 'int' ? 'numeric' : 'decimal'}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(e) => onChange(toNumber(e.target.value, field.kind === 'int'))}
            className={cn(field.unit && 'pr-16', 'tabular-nums')}
          />
          {field.unit && (
            <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs'>
              {field.unit}
            </span>
          )}
        </div>
      );
    case 'date':
      return <Input id={id} type='date' value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
    case 'list':
      return (
        <Input
          id={id}
          value={((value as string[]) ?? []).join(', ')}
          placeholder='Séparés par des virgules'
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      );
    case 'textarea':
      return <Textarea id={id} rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
    default:
      return <Input id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
  }
}

function Section({ id, title, children, aside }: { id?: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section id={id} className='bg-card min-w-0 scroll-mt-20 rounded-2xl border p-4 sm:p-5'>
      <header className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='font-display text-[17px] font-semibold'>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function BienForm({
  bienId,
  initial,
  initialPieces,
  initialVendeur,
  vendeurId,
  analyse
}: {
  bienId: string;
  initial: BienValues;
  initialPieces: PieceInput[];
  initialVendeur: VendeurInput | null;
  vendeurId: string | null;
  analyse: Analyse | null;
}) {
  const router = useRouter();
  const [bien, setBien] = useState<BienValues>(initial);
  const [pieces, setPieces] = useState<PieceInput[]>(initialPieces);
  const [vendeur, setVendeur] = useState<VendeurInput>(
    initialVendeur ?? { civilite: null, nom: '', prenom: null, email: null, portable: null, telephone_fixe: null }
  );
  const [points, setPoints] = useState<AVerifier[]>(analyse?.a_verifier ?? []);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  const set = (key: string, value: unknown) => {
    setBien((b) => ({ ...b, [key]: value }));
    setDirty(true);
  };
  const setPiece = (i: number, patch: Partial<PieceInput>) => {
    setPieces((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
    setDirty(true);
  };
  const setV = (key: keyof VendeurInput, value: string) => {
    setVendeur((v) => ({ ...v, [key]: key === 'nom' ? value : value || null }));
    setDirty(true);
  };

  const prix = bien.prix_bien as number | null;
  const pct = (v: unknown) => (prix && typeof v === 'number' ? `soit ${fmt.format((v * 100) / prix)} %` : null);
  const totalPieces = pieces.reduce((s, p) => s + (p.surface ?? 0), 0);
  const restants = points.filter((p) => !p.traite).length;

  const enregistrer = () => {
    setError(null);
    startSave(async () => {
      const res = await mettreAJourBien(bienId, {
        bien,
        pieces: pieces.filter((p) => p.nom.trim()),
        vendeur: vendeur.nom.trim() ? vendeur : null,
        vendeurId
      });
      if (res.ok) {
        setDirty(false);
        toast.success('Fiche enregistrée et ajoutée à la file Laforêt');
        router.refresh();
      } else setError(res.error);
    });
  };

  const basculerPoint = (i: number) => {
    if (!analyse) return;
    const traite = !points[i]?.traite;
    setPoints((ps) => ps.map((p, j) => (j === i ? { ...p, traite } : p)));
    void marquerPointVerifie(analyse.id, i, traite).then((res) => {
      if (!res.ok) {
        toast.error(res.error);
        setPoints((ps) => ps.map((p, j) => (j === i ? { ...p, traite: !traite } : p)));
      }
    });
  };

  return (
    <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'>
      <div className='flex min-w-0 flex-col gap-5'>
        {BIEN_GROUPS.map((group) => (
          <Section key={group.id} id={group.id} title={group.title}>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              {group.fields.map((field) => {
                const hint =
                  field.key === 'hono_vendeur' || field.key === 'hono_acquereur' ? pct(bien[field.key]) : null;
                return (
                  <div key={field.key} className={cn('min-w-0 space-y-1.5', (field.wide || field.kind === 'textarea') && 'col-span-2 sm:col-span-4')}>
                    <Label htmlFor={`f-${field.key}`} className='text-muted-foreground text-xs'>
                      {field.label}
                    </Label>
                    <FieldInput field={field} value={bien[field.key]} onChange={(v) => set(field.key, v)} />
                    {hint && <p className='text-muted-foreground text-[11px] italic'>{hint}</p>}
                  </div>
                );
              })}
            </div>
          </Section>
        ))}

        <Section
          id='pieces'
          title='Pièces'
          aside={
            <span className='text-muted-foreground text-xs tabular-nums'>
              {pieces.length} pièces · {fmt.format(totalPieces)} m²
            </span>
          }
        >
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[440px] text-sm'>
              <thead>
                <tr className='text-muted-foreground text-left text-xs'>
                  <th className='w-24 pb-2 font-medium'>Niveau</th>
                  <th className='pb-2 font-medium'>Nom</th>
                  <th className='w-28 pb-2 font-medium'>Surface (m²)</th>
                  <th className='w-10 pb-2' />
                </tr>
              </thead>
              <tbody>
                {pieces.map((p, i) => (
                  <tr key={i}>
                    <td className='py-1 pr-2'>
                      <Input aria-label={`Niveau, pièce ${i + 1}`} value={p.niveau ?? ''} onChange={(e) => setPiece(i, { niveau: e.target.value || null })} />
                    </td>
                    <td className='py-1 pr-2'>
                      <Input aria-label={`Nom, pièce ${i + 1}`} value={p.nom} onChange={(e) => setPiece(i, { nom: e.target.value })} />
                    </td>
                    <td className='py-1 pr-2'>
                      <Input
                        aria-label={`Surface, pièce ${i + 1}`}
                        inputMode='decimal'
                        className='tabular-nums'
                        value={p.surface ?? ''}
                        onChange={(e) => setPiece(i, { surface: toNumber(e.target.value, false) })}
                      />
                    </td>
                    <td className='py-1'>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Supprimer la pièce ${i + 1}`}
                        onClick={() => {
                          setPieces((ps) => ps.filter((_, j) => j !== i));
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
          <Button
            variant='outline'
            size='sm'
            className='mt-3'
            onClick={() => {
              setPieces((ps) => [...ps, { nom: '', surface: null, niveau: null }]);
              setDirty(true);
            }}
          >
            <Icons.add /> Ajouter une pièce
          </Button>
        </Section>

        <Section id='vendeur' title='Vendeur'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {(
              [
                ['civilite', 'Civilité'],
                ['nom', 'Nom'],
                ['prenom', 'Prénom'],
                ['email', 'E-mail'],
                ['portable', 'Portable'],
                ['telephone_fixe', 'Fixe']
              ] as const
            ).map(([key, label]) => (
              <div key={key} className='min-w-0 space-y-1.5'>
                <Label htmlFor={`v-${key}`} className='text-muted-foreground text-xs'>
                  {label}
                </Label>
                <Input
                  id={`v-${key}`}
                  type={key === 'email' ? 'email' : 'text'}
                  inputMode={key === 'portable' || key === 'telephone_fixe' ? 'tel' : undefined}
                  value={vendeur[key] ?? ''}
                  onChange={(e) => setV(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </Section>
      </div>

      <aside className='flex min-w-0 flex-col gap-5 xl:sticky xl:top-20'>
        <div className='bg-card space-y-3 rounded-2xl border p-4 sm:p-5'>
          <p className='text-muted-foreground text-xs' aria-live='polite'>
            {dirty ? 'Modifications non enregistrées' : 'Fiche à jour'}
          </p>
          {error && (
            <p role='alert' className='text-crit text-sm'>
              {error}
            </p>
          )}
          <Button onClick={enregistrer} disabled={saving || !dirty} className='h-10 w-full font-semibold'>
            {saving ? 'Enregistrement…' : 'Enregistrer la fiche'}
          </Button>
          <p className='text-muted-foreground text-xs'>Chaque enregistrement part dans la file de synchronisation Laforêt.</p>
        </div>

        {analyse && points.length > 0 && (
          <section className='border-cuivre/40 bg-cuivre/10 rounded-2xl border p-4 sm:p-5'>
            <h2 className='font-display text-cuivre mb-3 flex items-center gap-2 text-[17px] font-semibold'>
              <Icons.warning className='size-[18px]' aria-hidden='true' /> À vérifier · {restants} / {points.length}
            </h2>
            <ul className='space-y-2.5 text-sm'>
              {points.map((q, i) => (
                <li key={i} className='flex gap-2.5'>
                  <input
                    type='checkbox'
                    id={`av-${i}`}
                    checked={Boolean(q.traite)}
                    onChange={() => basculerPoint(i)}
                    className='accent-sauge mt-1 size-4 shrink-0 cursor-pointer'
                  />
                  <label htmlFor={`av-${i}`} className={cn('cursor-pointer', q.traite && 'line-through opacity-55')}>
                    <span className='text-muted-foreground block font-mono text-[11px] uppercase'>{q.champ}</span>
                    {q.question}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {analyse && (
          <Section title='Lecture IA'>
            {analyse.synthese && <p className='text-sm'>{analyse.synthese}</p>}
            {(analyse.laforet_extra.chauffage || analyse.laforet_extra.equipements?.length) && (
              <dl className='mt-3 space-y-1 text-sm'>
                {analyse.laforet_extra.chauffage && (
                  <div>
                    <dt className='text-muted-foreground inline'>Chauffage : </dt>
                    <dd className='inline'>{analyse.laforet_extra.chauffage}</dd>
                  </div>
                )}
                {analyse.laforet_extra.equipements?.length ? (
                  <div>
                    <dt className='text-muted-foreground inline'>Équipements : </dt>
                    <dd className='inline'>{analyse.laforet_extra.equipements.join(', ')}</dd>
                  </div>
                ) : null}
                {analyse.laforet_extra.loyer_potentiel ? (
                  <div>
                    <dt className='text-muted-foreground inline'>Loyer potentiel : </dt>
                    <dd className='inline tabular-nums'>{fmt.format(analyse.laforet_extra.loyer_potentiel)} €/mois</dd>
                  </div>
                ) : null}
              </dl>
            )}
            <div className='mt-4 space-y-4'>
              <div>
                <h3 className='text-ok mb-1.5 text-xs font-semibold tracking-[0.12em] uppercase'>Points forts</h3>
                <ul className='list-disc space-y-1 pl-4 text-sm'>
                  {analyse.points_forts.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className='text-warn mb-1.5 text-xs font-semibold tracking-[0.12em] uppercase'>Points de vigilance</h3>
                <ul className='list-disc space-y-1 pl-4 text-sm'>
                  {analyse.points_faibles.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
        )}

        <div className='rounded-2xl border border-dashed p-4'>
          {confirmDelete ? (
            <div className='space-y-3'>
              <p className='text-sm'>Supprimer définitivement ce bien, ses pièces et son analyse ? Le vendeur reste dans les contacts.</p>
              <div className='flex gap-2'>
                <Button
                  variant='destructive'
                  disabled={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      const res = await supprimerBien(bienId);
                      if (res && !res.ok) setError(res.error);
                    })
                  }
                >
                  {deleting ? 'Suppression…' : 'Oui, supprimer'}
                </Button>
                <Button variant='ghost' onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button variant='ghost' className='text-muted-foreground w-full' onClick={() => setConfirmDelete(true)}>
              <Icons.trash /> Supprimer ce bien
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
