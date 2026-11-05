'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { estimerAvecSelection } from '@/features/biens/actions';
import { rechercherMarche } from '../actions';
import type { CriteresMarche, ResultatMarche, VenteMarche } from '../types';

const MarcheMap = dynamic(() => import('./marche-map').then((m) => m.MarcheMap), {
  ssr: false,
  loading: () => <div className='bg-muted/40 h-[420px] w-full animate-pulse rounded-xl border' />
});

export type BienCible = {
  id: string;
  titre: string;
  surface: number | null;
  selectionInitiale: string[];
  selectionManuelle: boolean;
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const dateFr = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const PAR_PAGE = 50;
const RAYONS = [0.5, 1, 2, 3, 5, 8, 12];

type Tri = 'date' | 'distanceKm' | 'surface' | 'pieces' | 'terrain' | 'prix' | 'prixM2';

function toNum(v: string) {
  const n = Number(v.replace(',', '.').replace(/\s/g, ''));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
}

function exporterCsv(ventes: VenteMarche[], lieu: string) {
  const entete = ['Date', 'Type', 'Adresse', 'Commune', 'Surface (m²)', 'Pièces', 'Terrain (m²)', 'Dépendances', 'Prix (€)', 'Prix au m² (€)', 'Distance (km)'];
  const lignes = ventes.map((v) =>
    [v.date, v.type, v.adresse, v.commune, v.surface, v.pieces ?? '', v.terrain, v.dependances, v.prix, v.prixM2, v.distanceKm ?? '']
      .map((x) => `"${String(x).replace(/"/g, '""')}"`)
      .join(';')
  );
  const blob = new Blob(['﻿' + [entete.join(';'), ...lignes].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ventes-dvf-${lieu.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className='bg-card flex min-w-0 flex-col gap-1 rounded-2xl border px-4 py-3'>
      <span className='text-muted-foreground text-xs'>{label}</span>
      <span className='font-display text-2xl leading-tight font-extrabold tabular-nums'>{value}</span>
      {hint && <span className='text-muted-foreground truncate text-xs'>{hint}</span>}
    </div>
  );
}

function NumField({ id, label, value, onChange, unit }: { id: string; label: string; value: number | null; onChange: (n: number | null) => void; unit?: string }) {
  return (
    <div className='min-w-0 space-y-1.5'>
      <Label htmlFor={id} className='text-muted-foreground text-xs'>
        {label}
      </Label>
      <div className='relative'>
        <Input id={id} inputMode='decimal' className={cn('tabular-nums', unit && 'pr-9')} value={value ?? ''} onChange={(e) => onChange(toNum(e.target.value))} />
        {unit && <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs'>{unit}</span>}
      </div>
    </div>
  );
}

export function MarcheExplorer({ criteresInitiaux, bien }: { criteresInitiaux: CriteresMarche; bien: BienCible | null }) {
  const router = useRouter();
  const [criteres, setCriteres] = useState(criteresInitiaux);
  const [resultat, setResultat] = useState<ResultatMarche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cherche, startCherche] = useTransition();
  const [estime, startEstime] = useTransition();
  const [tri, setTri] = useState<{ col: Tri; desc: boolean }>({ col: bien ? 'distanceKm' : 'date', desc: !bien });
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Set<string>>(new Set(bien?.selectionInitiale ?? []));
  const [voirSelection, setVoirSelection] = useState(false);
  const [focus, setFocus] = useState<string | null>(null); // « id#compteur » pour rouvrir la même vente
  const premier = useRef(true);

  const set = <K extends keyof CriteresMarche>(k: K, v: CriteresMarche[K]) => setCriteres((c) => ({ ...c, [k]: v }));

  const lancer = (c = criteres) => {
    setErreur(null);
    startCherche(async () => {
      const res = await rechercherMarche(c);
      if (res.ok) {
        setResultat(res.data);
        setPage(0);
      } else setErreur(res.error);
    });
  };

  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      lancer(criteresInitiaux);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) =>
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const ventesTriees = useMemo(() => {
    if (!resultat) return [];
    const base = voirSelection ? resultat.ventes.filter((v) => selection.has(v.id)) : resultat.ventes;
    const k = tri.col;
    return [...base].sort((a, b) => {
      const va = a[k] ?? (tri.desc ? -Infinity : Infinity);
      const vb = b[k] ?? (tri.desc ? -Infinity : Infinity);
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return tri.desc ? -r : r;
    });
  }, [resultat, tri, voirSelection, selection]);

  const choisies = useMemo(() => resultat?.ventes.filter((v) => selection.has(v.id)) ?? [], [resultat, selection]);
  const medianeSelection = useMemo(() => {
    const t = choisies.map((v) => v.prixM2).sort((a, b) => a - b);
    if (t.length === 0) return null;
    const m = Math.floor(t.length / 2);
    return t.length % 2 ? t[m]! : (t[m - 1]! + t[m]!) / 2;
  }, [choisies]);

  const estimer = () => {
    if (!bien) return;
    startEstime(async () => {
      const res = await estimerAvecSelection(bien.id, [...selection]);
      if (res.ok) {
        toast.success('Estimation recalculée sur votre sélection');
        router.push(`/dashboard/biens/${bien.id}`);
      } else toast.error(res.error);
    });
  };

  const pages = Math.ceil(ventesTriees.length / PAR_PAGE);
  const visibles = ventesTriees.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);
  const s = resultat?.stats;

  const Th = ({ col, children, right }: { col: Tri; children: React.ReactNode; right?: boolean }) => (
    <th className={cn('pb-2 font-medium', right && 'text-right')}>
      <button
        type='button'
        className='hover:text-foreground inline-flex items-center gap-1'
        onClick={() => {
          setTri((t) => ({ col, desc: t.col === col ? !t.desc : col !== 'distanceKm' }));
          setPage(0);
        }}
      >
        {children}
        {tri.col === col && <span aria-hidden='true'>{tri.desc ? '↓' : '↑'}</span>}
      </button>
    </th>
  );

  return (
    <div className='flex flex-col gap-5'>
      {bien && (
        <div className='border-cuivre/40 bg-cuivre/10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm'>
          <p>
            <span className='font-semibold'>Choix des comparables pour : </span>
            <Link href={`/dashboard/biens/${bien.id}`} className='underline underline-offset-4'>
              {bien.titre}
            </Link>
            <span className='text-muted-foreground'>
              {' '}
              · cochez les ventes à retenir dans le tableau ou sur la carte
              {bien.selectionManuelle ? ' (sélection manuelle actuelle pré-cochée)' : ' (comparables de l’estimation automatique pré-cochés)'}.
            </span>
          </p>
        </div>
      )}

      <form
        className='bg-card grid grid-cols-2 gap-3 rounded-2xl border p-4 sm:grid-cols-4 lg:grid-cols-8 sm:p-5'
        onSubmit={(e) => {
          e.preventDefault();
          lancer();
        }}
      >
        <div className='col-span-2 min-w-0 space-y-1.5 sm:col-span-4 lg:col-span-3'>
          <Label htmlFor='m-lieu' className='text-muted-foreground text-xs'>
            Adresse ou commune
          </Label>
          <Input id='m-lieu' value={criteres.lieu} onChange={(e) => set('lieu', e.target.value)} placeholder='12 rue Saint-Clair Roanne' />
        </div>
        <div className='min-w-0 space-y-1.5'>
          <Label htmlFor='m-rayon' className='text-muted-foreground text-xs'>
            Rayon
          </Label>
          <NativeSelect id='m-rayon' className='w-full' value={String(criteres.rayonKm)} onChange={(e) => set('rayonKm', Number(e.target.value))}>
            {RAYONS.map((r) => (
              <NativeSelectOption key={r} value={String(r)}>
                {r.toLocaleString('fr-FR')} km
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className='min-w-0 space-y-1.5'>
          <Label htmlFor='m-type' className='text-muted-foreground text-xs'>
            Type
          </Label>
          <NativeSelect id='m-type' className='w-full' value={criteres.type} onChange={(e) => set('type', e.target.value as CriteresMarche['type'])}>
            <NativeSelectOption value='maison'>Maisons</NativeSelectOption>
            <NativeSelectOption value='appartement'>Appartements</NativeSelectOption>
            <NativeSelectOption value='tous'>Tous</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className='min-w-0 space-y-1.5'>
          <Label htmlFor='m-annees' className='text-muted-foreground text-xs'>
            Période
          </Label>
          <NativeSelect id='m-annees' className='w-full' value={String(criteres.annees)} onChange={(e) => set('annees', Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((a) => (
              <NativeSelectOption key={a} value={String(a)}>
                {a} an{a > 1 ? 's' : ''}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className='col-span-2 flex items-end sm:col-span-1 lg:col-span-2'>
          <Button type='submit' disabled={cherche} className='h-8 w-full font-semibold'>
            {cherche ? (
              <>
                <Icons.spinner className='animate-spin' /> Recherche…
              </>
            ) : (
              <>
                <Icons.search /> Rechercher
              </>
            )}
          </Button>
        </div>
        <NumField id='m-smin' label='Surface min' unit='m²' value={criteres.surfaceMin} onChange={(n) => set('surfaceMin', n)} />
        <NumField id='m-smax' label='Surface max' unit='m²' value={criteres.surfaceMax} onChange={(n) => set('surfaceMax', n)} />
        <NumField id='m-pmin' label='Pièces min' value={criteres.piecesMin} onChange={(n) => set('piecesMin', n)} />
        <NumField id='m-pmax' label='Pièces max' value={criteres.piecesMax} onChange={(n) => set('piecesMax', n)} />
        <NumField id='m-tmin' label='Terrain min' unit='m²' value={criteres.terrainMin} onChange={(n) => set('terrainMin', n)} />
        <NumField id='m-tmax' label='Terrain max' unit='m²' value={criteres.terrainMax} onChange={(n) => set('terrainMax', n)} />
      </form>

      {erreur && (
        <p role='alert' className='text-crit text-sm'>
          {erreur}
        </p>
      )}

      {!resultat && cherche && <p className='text-muted-foreground text-sm'>Chargement des ventes DVF du secteur…</p>}

      {resultat && s && (
        <>
          <section aria-label='Indicateurs' className={cn('grid grid-cols-2 gap-3 lg:grid-cols-5', cherche && 'opacity-60')}>
            <Kpi label='Ventes' value={num.format(s.nb)} hint={`${resultat.criteres.annees} an(s), ${resultat.criteres.rayonKm.toLocaleString('fr-FR')} km`} />
            <Kpi
              label='Prix médian au m²'
              value={s.medianeM2 ? `${num.format(s.medianeM2)} €` : '—'}
              hint={s.q1M2 && s.q3M2 ? `moitié centrale : ${num.format(s.q1M2)} à ${num.format(s.q3M2)} €` : undefined}
            />
            <Kpi label='Prix médian' value={s.prixMedian ? eur.format(s.prixMedian) : '—'} />
            <Kpi label='Surface médiane' value={s.surfaceMediane ? `${num.format(s.surfaceMediane)} m²` : '—'} />
            <Kpi
              label='Tendance'
              value={resultat.tendanceAnnuelle === null ? '—' : `${resultat.tendanceAnnuelle >= 0 ? '+' : ''}${(resultat.tendanceAnnuelle * 100).toFixed(1).replace('.', ',')} %/an`}
              hint={resultat.tendanceAnnuelle === null ? 'pas assez de ventes par semestre' : 'évolution du prix au m²'}
            />
          </section>

          <div className='grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
            <section className='bg-card min-w-0 rounded-2xl border p-3'>
              <MarcheMap
                centre={resultat.centre}
                rayonKm={resultat.criteres.rayonKm}
                ventes={resultat.ventes}
                q1={s.q1M2 ?? 0}
                q3={s.q3M2 ?? 0}
                selection={selection}
                selectionActive={Boolean(bien)}
                onToggle={toggle}
                focus={focus}
              />
              <p className='text-muted-foreground mt-2 px-1 text-xs'>
                Couleur : du sauge (prix au m² bas du secteur) au cuivre (prix haut).
                {resultat.centre.precision === 'commune' && ' Centre placé au milieu de la commune.'}
                {resultat.ventes.some((v) => v.lat === null) && ' Certaines ventes sans coordonnées n’apparaissent que dans le tableau.'}
              </p>
            </section>

            <div className='flex min-w-0 flex-col gap-5'>
              <section className='bg-card min-w-0 rounded-2xl border p-4'>
                <h2 className='font-display mb-3 text-[17px] font-semibold'>Prix médian au m² par semestre</h2>
                {resultat.parSemestre.length > 1 ? (
                  <div className='h-52'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <ComposedChart data={resultat.parSemestre} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke='var(--border)' vertical={false} />
                        <XAxis dataKey='periode' tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId='m2' tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} width={48} domain={['auto', 'auto']} />
                        <YAxis yAxisId='nb' orientation='right' hide />
                        <Tooltip
                          contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)' }}
                          formatter={(v, n) => (n === 'medianeM2' ? [`${num.format(Number(v))} €/m²`, 'Médiane'] : [num.format(Number(v)), 'Ventes'])}
                        />
                        <Bar yAxisId='nb' dataKey='nb' fill='var(--sauge)' fillOpacity={0.25} radius={[3, 3, 0, 0]} />
                        <Line yAxisId='m2' dataKey='medianeM2' stroke='var(--cuivre)' strokeWidth={2} dot={{ r: 2.5, fill: 'var(--cuivre)' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className='text-muted-foreground text-sm'>Pas assez de ventes pour tracer une évolution.</p>
                )}
                <p className='text-muted-foreground mt-1 text-xs'>Barres : nombre de ventes. Ligne : prix médian au m².</p>
              </section>

              <section className='bg-card min-w-0 rounded-2xl border p-4'>
                <h2 className='font-display mb-3 text-[17px] font-semibold'>Par commune</h2>
                <ul className='divide-border max-h-56 divide-y overflow-y-auto text-sm'>
                  {resultat.parCommune.map((c) => (
                    <li key={c.commune} className='flex justify-between gap-3 py-1.5 tabular-nums'>
                      <span className='min-w-0 truncate'>{c.commune}</span>
                      <span className='text-muted-foreground shrink-0'>
                        {c.nb} ventes · <span className='text-foreground font-mono'>{num.format(c.medianeM2)} €/m²</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <section className='bg-card min-w-0 rounded-2xl border p-4 sm:p-5'>
            <header className='mb-3 flex flex-wrap items-center justify-between gap-2'>
              <h2 className='font-display text-[17px] font-semibold'>
                Ventes {voirSelection ? 'sélectionnées' : ''} ({num.format(ventesTriees.length)}
                {resultat.tronque && !voirSelection ? ` sur ${num.format(s.nb)}, les plus récentes` : ''})
              </h2>
              <div className='flex flex-wrap gap-2'>
                {bien && (
                  <Button variant={voirSelection ? 'secondary' : 'outline'} size='sm' onClick={() => { setVoirSelection((x) => !x); setPage(0); }}>
                    {voirSelection ? 'Voir toutes les ventes' : `Voir la sélection (${selection.size})`}
                  </Button>
                )}
                <Button variant='outline' size='sm' onClick={() => exporterCsv(ventesTriees, resultat.criteres.lieu)}>
                  <Icons.download /> Export Excel (CSV)
                </Button>
              </div>
            </header>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[820px] text-sm'>
                <thead>
                  <tr className='text-muted-foreground text-left text-xs'>
                    {bien && <th className='w-8 pb-2'><span className='sr-only'>Comparable</span></th>}
                    <Th col='date'>Date</Th>
                    <th className='pb-2 font-medium'>Adresse</th>
                    <Th col='surface' right>Surface</Th>
                    <Th col='pieces' right>Pièces</Th>
                    <Th col='terrain' right>Terrain</Th>
                    <Th col='prix' right>Prix</Th>
                    <Th col='prixM2' right>€/m²</Th>
                    <Th col='distanceKm' right>Distance</Th>
                  </tr>
                </thead>
                <tbody className='divide-border divide-y'>
                  {visibles.map((v) => (
                    <tr key={v.id} className={cn('tabular-nums', selection.has(v.id) && 'bg-cuivre/10', v.atypique && 'opacity-60')}>
                      {bien && (
                        <td className='py-1.5'>
                          <input
                            type='checkbox'
                            aria-label={`Comparable : ${v.adresse || v.commune}, ${eur.format(v.prix)}`}
                            checked={selection.has(v.id)}
                            onChange={() => toggle(v.id)}
                            className='accent-cuivre size-4 cursor-pointer'
                          />
                        </td>
                      )}
                      <td className='py-1.5 pr-3 whitespace-nowrap'>{dateFr.format(new Date(v.date))}</td>
                      <td className='py-1.5 pr-3'>
                        <button
                          type='button'
                          className='hover:text-cuivre text-left disabled:cursor-default disabled:hover:text-inherit'
                          disabled={v.lat === null}
                          onClick={() => setFocus(`${v.id}#${Date.now()}`)}
                        >
                          {v.type === 'appartement' ? 'Appt · ' : ''}
                          {v.adresse ? `${v.adresse.toLowerCase()}, ` : ''}
                          {v.commune}
                        </button>
                        {v.dependances > 0 && <span className='text-muted-foreground text-xs'> · {v.dependances} dép.</span>}
                      </td>
                      <td className='py-1.5 pr-3 text-right'>{num.format(v.surface)} m²</td>
                      <td className='py-1.5 pr-3 text-right'>{v.pieces ?? '—'}</td>
                      <td className='py-1.5 pr-3 text-right'>{v.terrain ? `${num.format(v.terrain)} m²` : '—'}</td>
                      <td className='py-1.5 pr-3 text-right'>{eur.format(v.prix)}</td>
                      <td className='py-1.5 pr-3 text-right font-mono'>{num.format(v.prixM2)}</td>
                      <td className='py-1.5 text-right'>{v.distanceKm === null ? '—' : `${v.distanceKm.toLocaleString('fr-FR')} km`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className='mt-3 flex items-center justify-between gap-2 text-xs'>
                <span className='text-muted-foreground'>
                  Page {page + 1} / {pages}
                </span>
                <div className='flex gap-2'>
                  <Button variant='outline' size='sm' disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Précédent
                  </Button>
                  <Button variant='outline' size='sm' disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                    Suivant
                  </Button>
                </div>
              </div>
            )}
            <p className='text-muted-foreground mt-3 text-xs'>
              Source : DVF, ventes notariées publiées par la DGFiP (data.gouv.fr), mises à jour deux fois par an avec environ
              6 mois de décalage. Seules les ventes d’un seul logement (avec ou sans dépendances) sont listées. Prix hors frais
              de notaire. Lignes estompées : prix au m² atypique (moins de 300 € ou plus de 9 000 €).
            </p>
          </section>
        </>
      )}

      {bien && (
        <div className='bg-background/90 border-cuivre/40 sticky bottom-3 z-30 rounded-2xl border shadow-lg backdrop-blur'>
          <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
            <p className='text-sm tabular-nums'>
              <span className='font-semibold'>{selection.size} vente{selection.size > 1 ? 's' : ''} sélectionnée{selection.size > 1 ? 's' : ''}</span>
              {medianeSelection !== null && (
                <span className='text-muted-foreground'>
                  {' '}
                  · médiane {num.format(medianeSelection)} €/m²
                  {bien.surface ? ` · soit ≈ ${eur.format(Math.round((medianeSelection * bien.surface) / 500) * 500)} pour ${num.format(bien.surface)} m², avant indexation et ajustements` : ''}
                </span>
              )}
              {choisies.length < selection.size && (
                <span className='text-muted-foreground'> · {selection.size - choisies.length} hors de cette recherche</span>
              )}
            </p>
            <div className='flex gap-2'>
              <Button variant='ghost' size='sm' disabled={selection.size === 0} onClick={() => setSelection(new Set())}>
                Tout décocher
              </Button>
              <Button className='font-semibold' disabled={estime || selection.size < 3} onClick={estimer}>
                {estime ? (
                  <>
                    <Icons.spinner className='animate-spin' /> Estimation (≈ 30 s)…
                  </>
                ) : (
                  'Estimer avec cette sélection'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
