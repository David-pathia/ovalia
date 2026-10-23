'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { surfacePiece, type BienValues, type FieldDef, type FieldGroup, type Manquant, type PieceInput } from '../fields';

// Champs et relevé des pièces partagés entre la fiche bien et la saisie rapide.

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function toNumber(value: string, int: boolean): number | null {
  const n = Number(value.replace(',', '.').replace(/\s/g, ''));
  if (value.trim() === '' || Number.isNaN(n)) return null;
  return int ? Math.round(n) : n;
}

function FieldInput({ field, value, onChange, invalid }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; invalid?: boolean }) {
  const id = `f-${field.key}`;
  const aria = invalid ? { 'aria-invalid': true as const } : {};
  switch (field.kind) {
    case 'select':
      return (
        <NativeSelect id={id} {...aria} className='w-full' value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)}>
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
            {...aria}
            inputMode={field.kind === 'int' ? 'numeric' : 'decimal'}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(e) => onChange(toNumber(e.target.value, field.kind === 'int'))}
            className={cn(field.unit && 'pr-16', 'tabular-nums')}
          />
          {field.unit && (
            <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs'>{field.unit}</span>
          )}
        </div>
      );
    case 'date':
      return <Input id={id} {...aria} type='date' value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
    case 'list':
      return (
        <Input
          id={id}
          {...aria}
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
      return <Textarea id={id} {...aria} rows={3} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
    default:
      return <Input id={id} {...aria} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
  }
}

export function Section({ id, title, children, aside, className }: { id?: string; title: string; children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('bg-card min-w-0 scroll-mt-20 rounded-2xl border p-4 sm:p-5', className)}>
      <header className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='font-display text-[17px] font-semibold'>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function GroupFields({
  group,
  values,
  ficheNa,
  manquants,
  onChange,
  onToggleNa,
  hints
}: {
  group: FieldGroup;
  values: BienValues;
  ficheNa: string[];
  manquants: Set<string>;
  onChange: (key: string, value: unknown) => void;
  onToggleNa: (key: string) => void;
  hints?: Record<string, string | null>;
}) {
  return (
    <Section id={group.id} title={group.title} className={cn(group.fiche && 'border-sauge/30')}>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {group.fields.map((field) => {
          const na = ficheNa.includes(field.key);
          const manque = manquants.has(field.key);
          const large = field.wide || field.kind === 'textarea' || (group.fiche && field.kind === 'text');
          return (
            <div key={field.key} className={cn('min-w-0 space-y-1.5', large && 'col-span-2', (field.wide || field.kind === 'textarea') && 'sm:col-span-4')}>
              <div className='flex items-center justify-between gap-2'>
                <Label htmlFor={`f-${field.key}`} className={cn('text-xs', manque ? 'text-crit' : 'text-muted-foreground')}>
                  {field.label}
                  {field.fiche && <span aria-hidden='true'>*</span>}
                </Label>
                {field.fiche && !field.naInterdit && (
                  <button
                    type='button'
                    onClick={() => onToggleNa(field.key)}
                    aria-pressed={na}
                    className={cn(
                      'shrink-0 rounded-full border px-1.5 text-[10px] leading-4 transition-colors',
                      na ? 'border-sauge bg-sauge/20 text-sauge' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title='Information inconnue ou sans objet pour ce bien'
                  >
                    Inconnu / S.O.
                  </button>
                )}
              </div>
              {na ? (
                <p className='text-muted-foreground flex h-8 items-center rounded-lg border border-dashed px-2.5 text-xs italic'>
                  Inconnu ou sans objet
                </p>
              ) : (
                <FieldInput field={field} value={values[field.key]} onChange={(v) => onChange(field.key, v)} invalid={manque} />
              )}
              {hints?.[field.key] && <p className='text-muted-foreground text-[11px] italic'>{hints[field.key]}</p>}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function ReleveTable({
  pieces,
  surfaceHabitable,
  onChange,
  invalid
}: {
  pieces: PieceInput[];
  surfaceHabitable: number | null;
  onChange: (pieces: PieceInput[]) => void;
  invalid?: boolean;
}) {
  const total = pieces.reduce((s, p) => s + (surfacePiece(p) ?? 0), 0);
  const ecart = surfaceHabitable && total ? (total - surfaceHabitable) / surfaceHabitable : null;
  const set = (i: number, patch: Partial<PieceInput>) =>
    onChange(
      pieces.map((p, j) => {
        if (j !== i) return p;
        const next = { ...p, ...patch };
        return { ...next, surface: surfacePiece(next) };
      })
    );
  const num = (v: number | null) => (v === null || v === undefined ? '' : String(v));

  return (
    <Section
      id='pieces'
      title='Relevé des pièces *'
      className={cn('border-sauge/30', invalid && 'border-crit/50')}
      aside={
        <span className='text-muted-foreground text-xs tabular-nums'>
          Total relevé : <span className='text-foreground font-mono'>{fmt.format(total)} m²</span>
          {ecart !== null && Math.abs(ecart) > 0.1 && (
            <span className='text-warn'> · écart de {Math.round(ecart * 100)} % avec la surface déclarée</span>
          )}
        </span>
      }
    >
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[560px] text-sm'>
          <thead>
            <tr className='text-muted-foreground text-left text-xs'>
              <th className='pb-2 font-medium'>Pièce</th>
              <th className='w-24 pb-2 font-medium'>Longueur (m)</th>
              <th className='w-24 pb-2 font-medium'>Largeur (m)</th>
              <th className='w-24 pb-2 text-right font-medium'>Surface</th>
              <th className='w-24 pb-2 font-medium'>Niveau</th>
              <th className='w-10 pb-2' />
            </tr>
          </thead>
          <tbody>
            {pieces.map((p, i) => {
              const sansDims = !(p.longueur && p.largeur);
              return (
                <tr key={i}>
                  <td className='py-1 pr-2'>
                    <Input aria-label={`Nom, pièce ${i + 1}`} value={p.nom} onChange={(e) => set(i, { nom: e.target.value })} />
                  </td>
                  <td className='py-1 pr-2'>
                    <Input
                      aria-label={`Longueur, ${p.nom || `pièce ${i + 1}`}`}
                      aria-invalid={invalid && !p.longueur ? true : undefined}
                      inputMode='decimal'
                      className='tabular-nums'
                      value={num(p.longueur)}
                      onChange={(e) => set(i, { longueur: toNumber(e.target.value, false) })}
                    />
                  </td>
                  <td className='py-1 pr-2'>
                    <Input
                      aria-label={`Largeur, ${p.nom || `pièce ${i + 1}`}`}
                      aria-invalid={invalid && !p.largeur ? true : undefined}
                      inputMode='decimal'
                      className='tabular-nums'
                      value={num(p.largeur)}
                      onChange={(e) => set(i, { largeur: toNumber(e.target.value, false) })}
                    />
                  </td>
                  <td className={cn('py-1 pr-2 text-right font-mono text-xs', sansDims && 'text-muted-foreground')}>
                    {p.surface ? `${fmt.format(p.surface)} m²` : '—'}
                  </td>
                  <td className='py-1 pr-2'>
                    <Input aria-label={`Niveau, pièce ${i + 1}`} value={p.niveau ?? ''} onChange={(e) => set(i, { niveau: e.target.value || null })} />
                  </td>
                  <td className='py-1'>
                    <Button variant='ghost' size='icon-sm' aria-label={`Supprimer ${p.nom || `la pièce ${i + 1}`}`} onClick={() => onChange(pieces.filter((_, j) => j !== i))}>
                      <Icons.trash />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button
        variant='outline'
        size='sm'
        className='mt-3'
        onClick={() => onChange([...pieces, { nom: '', longueur: null, largeur: null, surface: null, niveau: null }])}
      >
        <Icons.add /> Ajouter une pièce
      </Button>
      <p className='text-muted-foreground mt-2 text-xs'>
        La surface se calcule à partir de la longueur et de la largeur. Pour une pièce irrégulière, saisissez des dimensions équivalentes.
      </p>
    </Section>
  );
}

export function ManquantsPanel({ manquants }: { manquants: Manquant[] }) {
  if (manquants.length === 0) {
    return (
      <p className='text-ok flex items-center gap-1.5 text-xs'>
        <Icons.circleCheck className='size-4' aria-hidden='true' /> Fiche d’estimation complète
      </p>
    );
  }
  const parGroupe = manquants.reduce<Record<string, Manquant[]>>((acc, m) => ({ ...acc, [m.groupe]: [...(acc[m.groupe] ?? []), m] }), {});
  return (
    <div className='border-crit/40 bg-crit/10 rounded-xl border p-3'>
      <p className='text-crit text-sm font-semibold'>
        Enregistrement bloqué : {manquants.length} information{manquants.length > 1 ? 's' : ''} manquante{manquants.length > 1 ? 's' : ''}
      </p>
      <p className='text-muted-foreground mt-0.5 text-xs'>Renseignez-les ou cochez « Inconnu / S.O. ».</p>
      <ul className='mt-2 max-h-56 space-y-1.5 overflow-y-auto text-xs'>
        {Object.entries(parGroupe).map(([groupe, items]) => (
          <li key={groupe}>
            <span className='text-muted-foreground'>{groupe}</span>
            <ul className='mt-0.5 list-disc pl-4'>
              {items.map((m, i) => (
                <li key={`${m.key}-${i}`}>
                  <a
                    href={`#${m.key === 'pieces' ? 'pieces' : `f-${m.key}`}`}
                    className='hover:underline'
                    onClick={(e) => {
                      const el = document.getElementById(m.key === 'pieces' ? 'pieces' : `f-${m.key}`);
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.focus({ preventScroll: true });
                      }
                    }}
                  >
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
