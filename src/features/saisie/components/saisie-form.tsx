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
import { BIEN_FIELDS, BIEN_GROUPS, champsManquants, surfacePiece, type BienValues, type PieceInput } from '@/features/biens/fields';
import { GroupFields, ManquantsPanel, ReleveTable, Section } from '@/features/biens/components/fiche-fields';
import { analyserNote, enregistrerBien } from '../actions';
import type { Analyse, Extraction } from '../schema';

type Vendeur = NonNullable<Extraction['vendeur']>;

const EXEMPLE = `Maison 1967, 67 m², terrain 300 m², 2 niveaux, 3 chambres
Parpaing, combles isolés, murs non isolés, double vitrage PVC 2010
Chaudière gaz 20 ans, VMC salle de bains, tout-à-l'égout
Séjour 4,5 x 4 ; cuisine 3 x 2,7 ; chambre 1 3,2 x 3,1…
Garage 18 m² + buanderie, séjour plein sud
Vendeur : M. Dupont, 06 00 00 00 00, mutation, vente sous 6 mois, souhaite 150 000 €`;

const VENDEUR_VIDE: Vendeur = { civilite: null, nom: '', prenom: null, email: null, portable: null, telephone_fixe: null };

/** Valeurs de départ de la fiche à partir du brouillon de l'IA (même liste de champs que la fiche bien). */
function valeursDepuisBrouillon(brouillon: Extraction['bien']): BienValues {
  const b = brouillon as Record<string, unknown>;
  const valeurs: BienValues = {};
  for (const f of BIEN_FIELDS) {
    const v = b[f.key];
    if (f.kind === 'list') valeurs[f.key] = Array.isArray(v) ? v : [];
    else if (f.kind === 'bool') valeurs[f.key] = typeof v === 'boolean' ? v : f.key === 'prix_visible';
    else valeurs[f.key] = v ?? null;
  }
  valeurs.statut = 'estimation';
  valeurs.transaction = b.transaction ?? 'vente';
  return valeurs;
}

export function SaisieForm() {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [bien, setBien] = useState<BienValues | null>(null);
  const [ficheNa, setFicheNa] = useState<string[]>([]);
  const [pieces, setPieces] = useState<PieceInput[]>([]);
  const [vendeur, setVendeurState] = useState<Vendeur>(VENDEUR_VIDE);
  const [lecture, setLecture] = useState<Analyse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tente, setTente] = useState(false);
  const [analysing, startAnalyse] = useTransition();
  const [saving, startSave] = useTransition();

  const analyse = () => {
    setError(null);
    startAnalyse(async () => {
      const res = await analyserNote(note);
      if (!res.ok) return setError(res.error);
      setBien(valeursDepuisBrouillon(res.data.bien));
      setPieces(
        res.data.pieces.map((p) => {
          const piece = { nom: p.nom, longueur: p.longueur, largeur: p.largeur, surface: p.surface, niveau: p.niveau };
          return { ...piece, surface: surfacePiece(piece) };
        })
      );
      setVendeurState(res.data.vendeur ?? VENDEUR_VIDE);
      setLecture(res.data.analyse);
      setFicheNa([]);
      setTente(false);
    });
  };

  if (!bien || !lecture) {
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
            Suivez de préférence la fiche d’estimation Laforêt : tout ce qui manque devra être complété avant
            l’enregistrement. Sur téléphone, le micro du clavier permet de dicter.
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

  const set = (key: string, value: unknown) => setBien((b) => (b ? { ...b, [key]: value } : b));
  const toggleNa = (key: string) => setFicheNa((na) => (na.includes(key) ? na.filter((k) => k !== key) : [...na, key]));
  const setV = (key: keyof Vendeur, value: string) => setVendeurState((v) => ({ ...v, [key]: key === 'nom' ? value : value || null }));

  const manquants = champsManquants(bien, ficheNa, pieces);
  const manquantsKeys = new Set(tente ? manquants.map((m) => m.key) : []);
  const typeManquant = !bien.type;

  const enregistrer = () => {
    setError(null);
    setTente(true);
    if (typeManquant) return setError('Choisissez le type de bien.');
    if (manquants.length > 0) return setError('Complétez la fiche d’estimation avant d’enregistrer.');
    startSave(async () => {
      const res = await enregistrerBien(
        {
          bien: { ...bien, fiche_na: ficheNa },
          pieces: pieces.filter((p) => p.nom.trim()),
          vendeur: vendeur.nom.trim() ? vendeur : null,
          analyse: lecture
        },
        note
      );
      if (res.ok) {
        toast.success('Bien enregistré, estimation DVF en cours');
        router.push(`/dashboard/biens/${res.bienId}`);
      } else setError(res.error);
    });
  };

  return (
    <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'>
      <div className='flex min-w-0 flex-col gap-5'>
        <Section title='Le bien' className={cn(tente && typeManquant && 'border-crit/50')}>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <div className='min-w-0 space-y-1.5'>
              <Label htmlFor='type' className={cn('text-xs', tente && typeManquant ? 'text-crit' : 'text-muted-foreground')}>
                Type *
              </Label>
              <NativeSelect id='type' className='w-full' value={(bien.type as string) ?? ''} onChange={(e) => set('type', e.target.value || null)}>
                <NativeSelectOption value=''>À choisir</NativeSelectOption>
                {TYPES_BIEN.map(([v, l]) => (
                  <NativeSelectOption key={v} value={v}>
                    {l}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {(
              [
                ['adresse', 'Adresse', 'col-span-2'],
                ['code_postal', 'Code postal', ''],
                ['ville', 'Ville', '']
              ] as const
            ).map(([key, label, cls]) => (
              <div key={key} className={cn('min-w-0 space-y-1.5', cls)}>
                <Label htmlFor={`s-${key}`} className='text-muted-foreground text-xs'>
                  {label}
                </Label>
                <Input id={`s-${key}`} value={(bien[key] as string) ?? ''} onChange={(e) => set(key, e.target.value || null)} />
              </div>
            ))}
          </div>
          {!bien.ville && !bien.code_postal && (
            <p className='text-warn mt-2 text-xs'>Sans ville ni code postal, l’estimation DVF ne pourra pas se lancer.</p>
          )}
        </Section>

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
          onChange={setPieces}
        />

        <Section title='Vendeur'>
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
          <p className='text-muted-foreground mt-3 text-xs'>Laissez le nom vide pour ne pas créer de contact.</p>
        </Section>
      </div>

      <aside className='flex min-w-0 flex-col gap-5 xl:sticky xl:top-20'>
        <div className='bg-card space-y-3 rounded-2xl border p-4 sm:p-5'>
          <ManquantsPanel manquants={manquants} />
          {error && (
            <p role='alert' className='text-crit text-sm'>
              {error}
            </p>
          )}
          <Button
            onClick={enregistrer}
            disabled={saving || (tente && (manquants.length > 0 || typeManquant))}
            className='h-10 w-full font-semibold'
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le bien'}
          </Button>
          <Button variant='ghost' className='w-full' onClick={() => setBien(null)} disabled={saving}>
            Revenir à la note
          </Button>
          <p className='text-muted-foreground text-xs'>
            Le bien est créé au statut « Estimation », ajouté à la file Laforêt, puis estimé à partir des ventes DVF.
          </p>
        </div>

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
      </aside>
    </div>
  );
}
