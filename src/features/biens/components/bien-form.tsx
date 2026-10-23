'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { GroupFields, ManquantsPanel, ReleveTable, Section } from './fiche-fields';
import { cn } from '@/lib/utils';
import { marquerPointVerifie, mettreAJourBien, supprimerBien } from '../actions';
import { BIEN_GROUPS, champsManquants, type AVerifier, type BienValues, type PieceInput, type VendeurInput } from '../fields';

export type Analyse = {
  id: string;
  synthese: string | null;
  points_forts: string[];
  points_faibles: string[];
  a_verifier: AVerifier[];
  laforet_extra: { chauffage?: string | null; equipements?: string[]; loyer_potentiel?: number | null };
};

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function BienForm({
  bienId,
  initial,
  initialNa,
  initialPieces,
  initialVendeur,
  vendeurId,
  analyse
}: {
  bienId: string;
  initial: BienValues;
  initialNa: string[];
  initialPieces: PieceInput[];
  initialVendeur: VendeurInput | null;
  vendeurId: string | null;
  analyse: Analyse | null;
}) {
  const router = useRouter();
  const [bien, setBien] = useState<BienValues>(initial);
  const [pieces, setPieces] = useState<PieceInput[]>(initialPieces);
  const [ficheNa, setFicheNa] = useState<string[]>(initialNa);
  const [tente, setTente] = useState(false);
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
  const setV = (key: keyof VendeurInput, value: string) => {
    setVendeur((v) => ({ ...v, [key]: key === 'nom' ? value : value || null }));
    setDirty(true);
  };

  const prix = bien.prix_bien as number | null;
  const pct = (v: unknown) => (prix && typeof v === 'number' ? `soit ${fmt.format((v * 100) / prix)} %` : null);
  const manquants = champsManquants(bien, ficheNa, pieces);
  const manquantsKeys = new Set(tente ? manquants.map((m) => m.key) : []);
  const toggleNa = (key: string) => {
    setFicheNa((na) => (na.includes(key) ? na.filter((k) => k !== key) : [...na, key]));
    setDirty(true);
  };
  const restants = points.filter((p) => !p.traite).length;

  const enregistrer = () => {
    setError(null);
    setTente(true);
    if (manquants.length > 0) {
      setError('Complétez la fiche d’estimation avant d’enregistrer.');
      return;
    }
    startSave(async () => {
      const res = await mettreAJourBien(bienId, {
        bien: { ...bien, fiche_na: ficheNa },
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
        {BIEN_GROUPS.filter((g) => g.fiche).map((group) => (
          <GroupFields
            key={group.id}
            group={group}
            values={bien}
            ficheNa={ficheNa}
            manquants={manquantsKeys}
            onChange={set}
            onToggleNa={toggleNa}
          />
        ))}

        <ReleveTable
          pieces={pieces}
          surfaceHabitable={(bien.surface as number | null) ?? null}
          invalid={tente && manquantsKeys.has('pieces')}
          onChange={(ps) => {
            setPieces(ps);
            setDirty(true);
          }}
        />

        {BIEN_GROUPS.filter((g) => !g.fiche).map((group) => (
          <GroupFields
            key={group.id}
            group={group}
            values={bien}
            ficheNa={ficheNa}
            manquants={manquantsKeys}
            onChange={set}
            onToggleNa={toggleNa}
            hints={{ hono_vendeur: pct(bien.hono_vendeur), hono_acquereur: pct(bien.hono_acquereur) }}
          />
        ))}

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
          <ManquantsPanel manquants={manquants} />
          {error && (
            <p role='alert' className='text-crit text-sm'>
              {error}
            </p>
          )}
          <Button onClick={enregistrer} disabled={saving || !dirty || (tente && manquants.length > 0)} className='h-10 w-full font-semibold'>
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
