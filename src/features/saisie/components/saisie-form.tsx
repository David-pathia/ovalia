'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import { TYPES_BIEN } from '@/lib/biens/options';
import { cn } from '@/lib/utils';
import { analyserNote, enregistrerBien } from '../actions';
import type { Extraction } from '../schema';

type Bien = Extraction['bien'];
type Vendeur = NonNullable<Extraction['vendeur']>;

const EXEMPLE = `300 de terrain
67 m²
Chauffage gaz 20 ans
Double vitrage, VMC salle de bain, tout à l'égout
Construction 1967
Séjour 18 m², cuisine 8 m², 3 chambres (10, 11, 13 m²), sdb 3,8 m², wc
Garage + buanderie
Vendeur : M. Dupont, 06 00 00 00 00`;

function toNumber(value: string): number | null {
  const n = Number(value.replace(',', '.').replace(/\s/g, ''));
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

function Field({
  id,
  label,
  flagged,
  className,
  children
}: {
  id: string;
  label: string;
  flagged?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id} className={cn('text-xs', flagged ? 'text-cuivre' : 'text-muted-foreground')}>
        {label}
        {flagged && <Icons.warning className='size-3.5' aria-label='À vérifier' />}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='bg-card min-w-0 rounded-2xl border p-4 sm:p-5'>
      <h2 className='font-display mb-4 text-[17px] font-semibold'>{title}</h2>
      {children}
    </section>
  );
}

export function SaisieForm() {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [data, setData] = useState<Extraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysing, startAnalyse] = useTransition();
  const [saving, startSave] = useTransition();

  const flagged = new Set(data?.analyse.a_verifier.map((q) => q.champ.toLowerCase()) ?? []);
  const isFlagged = (champ: string) => [...flagged].some((f) => f.includes(champ));

  const setBien = <K extends keyof Bien>(key: K, value: Bien[K]) =>
    setData((d) => (d ? { ...d, bien: { ...d.bien, [key]: value } } : d));
  const setVendeur = <K extends keyof Vendeur>(key: K, value: Vendeur[K]) =>
    setData((d) =>
      d
        ? {
            ...d,
            vendeur: {
              civilite: null,
              nom: '',
              prenom: null,
              email: null,
              portable: null,
              telephone_fixe: null,
              ...d.vendeur,
              [key]: value
            }
          }
        : d
    );

  const analyse = () => {
    setError(null);
    startAnalyse(async () => {
      const res = await analyserNote(note);
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
  };

  const enregistrer = () => {
    if (!data) return;
    setError(null);
    startSave(async () => {
      const res = await enregistrerBien(data, note);
      if (res.ok) {
        toast.success('Bien enregistré et ajouté à la file Laforêt');
        router.push('/dashboard/biens');
      } else setError(res.error);
    });
  };

  if (!data) {
    return (
      <div className='mx-auto w-full max-w-3xl space-y-4'>
        <Section title='1. Collez ou dictez la note'>
          <Label htmlFor='note' className='sr-only'>
            Note d’estimation
          </Label>
          <Textarea
            id='note'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={EXEMPLE}
            rows={14}
            className='min-h-72 font-mono text-[13px]'
          />
          <p className='text-muted-foreground mt-2 text-xs'>
            Sur téléphone, utilisez le micro du clavier pour dicter. Abréviations et fautes sont acceptées.
          </p>
          {error && (
            <p role='alert' className='text-crit mt-3 text-sm'>
              {error}
            </p>
          )}
          <div className='mt-4 flex justify-end'>
            <Button onClick={analyse} disabled={analysing || note.trim().length < 10} className='h-10 px-4 font-semibold'>
              {analysing ? (
                <>
                  <Icons.spinner className='animate-spin' /> Analyse en cours…
                </>
              ) : (
                <>
                  <Icons.sparkles /> Analyser la note
                </>
              )}
            </Button>
          </div>
        </Section>
      </div>
    );
  }

  const { bien, pieces, vendeur, analyse: lecture } = data;
  const totalPieces = pieces.reduce((s, p) => s + (p.surface ?? 0), 0);

  return (
    <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
      <div className='flex min-w-0 flex-col gap-5'>
        <Section title='Le bien'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <Field id='type' label='Type *' flagged={!bien.type || isFlagged('type')}>
              <NativeSelect
                id='type'
                className='w-full'
                value={bien.type ?? ''}
                onChange={(e) => setBien('type', (e.target.value || null) as Bien['type'])}
              >
                <NativeSelectOption value=''>À choisir</NativeSelectOption>
                {TYPES_BIEN.map(([v, l]) => (
                  <NativeSelectOption key={v} value={v}>
                    {l}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field id='transaction' label='Transaction'>
              <NativeSelect
                id='transaction'
                className='w-full'
                value={bien.transaction}
                onChange={(e) => setBien('transaction', e.target.value as Bien['transaction'])}
              >
                <NativeSelectOption value='vente'>Vente</NativeSelectOption>
                <NativeSelectOption value='location'>Location</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field id='surface' label='Surface (m²)' flagged={isFlagged('surface')}>
              <Input id='surface' inputMode='decimal' value={bien.surface ?? ''} onChange={(e) => setBien('surface', toNumber(e.target.value))} />
            </Field>
            <Field id='terrain' label='Terrain (m²)'>
              <Input id='terrain' inputMode='decimal' value={bien.surface_terrain ?? ''} onChange={(e) => setBien('surface_terrain', toNumber(e.target.value))} />
            </Field>
            <Field id='pieces-nb' label='Pièces'>
              <Input id='pieces-nb' inputMode='numeric' value={bien.pieces ?? ''} onChange={(e) => setBien('pieces', toNumber(e.target.value))} />
            </Field>
            <Field id='chambres' label='Chambres'>
              <Input id='chambres' inputMode='numeric' value={bien.chambres ?? ''} onChange={(e) => setBien('chambres', toNumber(e.target.value))} />
            </Field>
            <Field id='annee' label='Construction'>
              <Input id='annee' inputMode='numeric' value={bien.annee_construction ?? ''} onChange={(e) => setBien('annee_construction', toNumber(e.target.value))} />
            </Field>
            <Field id='dpe' label='DPE' flagged={!bien.dpe_classe}>
              <NativeSelect
                id='dpe'
                className='w-full'
                value={bien.dpe_classe ?? ''}
                onChange={(e) => setBien('dpe_classe', (e.target.value || null) as Bien['dpe_classe'])}
              >
                <NativeSelectOption value=''>—</NativeSelectOption>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => (
                  <NativeSelectOption key={c} value={c}>
                    {c}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field id='adresse' label='Adresse' className='col-span-2' flagged={isFlagged('adresse')}>
              <Input id='adresse' value={bien.adresse ?? ''} onChange={(e) => setBien('adresse', e.target.value || null)} />
            </Field>
            <Field id='cp' label='Code postal' flagged={!bien.code_postal}>
              <Input id='cp' inputMode='numeric' value={bien.code_postal ?? ''} onChange={(e) => setBien('code_postal', e.target.value || null)} />
            </Field>
            <Field id='ville' label='Ville' flagged={!bien.ville}>
              <Input id='ville' value={bien.ville ?? ''} onChange={(e) => setBien('ville', e.target.value || null)} />
            </Field>
            <Field id='prix' label='Prix souhaité (€)'>
              <Input id='prix' inputMode='numeric' value={bien.prix_bien ?? ''} onChange={(e) => setBien('prix_bien', toNumber(e.target.value))} />
            </Field>
            <Field id='taxe' label='Taxe foncière (€/an)' flagged={isFlagged('taxe')}>
              <Input id='taxe' inputMode='numeric' value={bien.taxe_fonciere ?? ''} onChange={(e) => setBien('taxe_fonciere', toNumber(e.target.value))} />
            </Field>
            <Field id='loyer' label='Loyer potentiel (€/mois)'>
              <Input id='loyer' inputMode='numeric' value={bien.loyer_potentiel ?? ''} onChange={(e) => setBien('loyer_potentiel', toNumber(e.target.value))} />
            </Field>
            <Field id='chauffage' label='Chauffage'>
              <Input id='chauffage' value={bien.chauffage ?? ''} onChange={(e) => setBien('chauffage', e.target.value || null)} />
            </Field>
            <Field id='exterieurs' label='Extérieurs et annexes (séparés par des virgules)' className='col-span-2 sm:col-span-4'>
              <Input
                id='exterieurs'
                value={bien.exterieurs.join(', ')}
                onChange={(e) => setBien('exterieurs', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
            <Field id='equipements' label='Équipements (séparés par des virgules)' className='col-span-2 sm:col-span-4'>
              <Input
                id='equipements'
                value={bien.equipements.join(', ')}
                onChange={(e) => setBien('equipements', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
          </div>
        </Section>

        <Section title={`Pièces · ${pieces.length} · ${totalPieces.toLocaleString('fr-FR')} m²`}>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[420px] text-sm'>
              <thead>
                <tr className='text-muted-foreground text-left text-xs'>
                  <th className='pb-2 font-medium'>Nom</th>
                  <th className='w-28 pb-2 font-medium'>Surface (m²)</th>
                  <th className='w-32 pb-2 font-medium'>Niveau</th>
                  <th className='w-10 pb-2' />
                </tr>
              </thead>
              <tbody>
                {pieces.map((p, i) => (
                  <tr key={i}>
                    <td className='py-1 pr-2'>
                      <Input
                        aria-label={`Nom de la pièce ${i + 1}`}
                        value={p.nom}
                        onChange={(e) =>
                          setData((d) => d && { ...d, pieces: d.pieces.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)) })
                        }
                      />
                    </td>
                    <td className='py-1 pr-2'>
                      <Input
                        aria-label={`Surface de la pièce ${i + 1}`}
                        inputMode='decimal'
                        value={p.surface ?? ''}
                        onChange={(e) =>
                          setData((d) => d && { ...d, pieces: d.pieces.map((x, j) => (j === i ? { ...x, surface: toNumber(e.target.value) } : x)) })
                        }
                      />
                    </td>
                    <td className='py-1 pr-2'>
                      <Input
                        aria-label={`Niveau de la pièce ${i + 1}`}
                        value={p.niveau ?? ''}
                        onChange={(e) =>
                          setData((d) => d && { ...d, pieces: d.pieces.map((x, j) => (j === i ? { ...x, niveau: e.target.value || null } : x)) })
                        }
                      />
                    </td>
                    <td className='py-1'>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Supprimer la pièce ${i + 1}`}
                        onClick={() => setData((d) => d && { ...d, pieces: d.pieces.filter((_, j) => j !== i) })}
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
            onClick={() => setData((d) => d && { ...d, pieces: [...d.pieces, { nom: '', surface: null, niveau: null }] })}
          >
            <Icons.add /> Ajouter une pièce
          </Button>
        </Section>

        <Section title='Vendeur'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            <Field id='v-civ' label='Civilité'>
              <Input id='v-civ' value={vendeur?.civilite ?? ''} onChange={(e) => setVendeur('civilite', e.target.value || null)} />
            </Field>
            <Field id='v-nom' label='Nom' flagged={isFlagged('nom')}>
              <Input id='v-nom' value={vendeur?.nom ?? ''} onChange={(e) => setVendeur('nom', e.target.value)} />
            </Field>
            <Field id='v-prenom' label='Prénom'>
              <Input id='v-prenom' value={vendeur?.prenom ?? ''} onChange={(e) => setVendeur('prenom', e.target.value || null)} />
            </Field>
            <Field id='v-mail' label='E-mail' flagged={isFlagged('mail')} className='col-span-2 sm:col-span-1'>
              <Input id='v-mail' type='email' value={vendeur?.email ?? ''} onChange={(e) => setVendeur('email', e.target.value || null)} />
            </Field>
            <Field id='v-port' label='Portable'>
              <Input id='v-port' inputMode='tel' value={vendeur?.portable ?? ''} onChange={(e) => setVendeur('portable', e.target.value || null)} />
            </Field>
            <Field id='v-fixe' label='Fixe'>
              <Input id='v-fixe' inputMode='tel' value={vendeur?.telephone_fixe ?? ''} onChange={(e) => setVendeur('telephone_fixe', e.target.value || null)} />
            </Field>
          </div>
          <p className='text-muted-foreground mt-3 text-xs'>Laissez le nom vide pour ne pas créer de contact.</p>
        </Section>
      </div>

      <div className='flex min-w-0 flex-col gap-5 xl:sticky xl:top-20'>
        {lecture.a_verifier.length > 0 && (
          <section className='border-cuivre/40 bg-cuivre/10 rounded-2xl border p-4 sm:p-5'>
            <h2 className='font-display text-cuivre mb-3 flex items-center gap-2 text-[17px] font-semibold'>
              <Icons.warning className='size-[18px]' aria-hidden='true' /> À vérifier ({lecture.a_verifier.length})
            </h2>
            <ul className='space-y-2 text-sm'>
              {lecture.a_verifier.map((q, i) => (
                <li key={i}>
                  <span className='text-muted-foreground font-mono text-[11px] uppercase'>{q.champ}</span>
                  <p>{q.question}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Section title='Lecture IA'>
          <p className='text-sm'>{lecture.synthese}</p>
          <div className='mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1'>
            <div>
              <h3 className='text-ok mb-1.5 text-xs font-semibold tracking-[0.12em] uppercase'>Points forts</h3>
              <ul className='list-disc space-y-1 pl-4 text-sm'>
                {lecture.points_forts.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className='text-warn mb-1.5 text-xs font-semibold tracking-[0.12em] uppercase'>Points de vigilance</h3>
              <ul className='list-disc space-y-1 pl-4 text-sm'>
                {lecture.points_faibles.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <div className='bg-card space-y-3 rounded-2xl border p-4 sm:p-5'>
          {error && (
            <p role='alert' className='text-crit text-sm'>
              {error}
            </p>
          )}
          <Button onClick={enregistrer} disabled={saving || !bien.type} className='h-10 w-full font-semibold'>
            {saving ? 'Enregistrement…' : 'Enregistrer le bien'}
          </Button>
          <Button variant='ghost' className='w-full' onClick={() => setData(null)} disabled={saving}>
            Revenir à la note
          </Button>
          <p className='text-muted-foreground text-xs'>
            Le bien est créé au statut « Estimation » et ajouté à la file de synchronisation Laforêt.
          </p>
        </div>
      </div>
    </div>
  );
}
