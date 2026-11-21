'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Icons, type Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  DUREE_MAX,
  enregistrer,
  ouvrirMicro,
  transcrireWav,
  versWav
} from '@/features/dictee/enregistreur';
import { TYPES_TACHE } from '@/features/today/types';
import { dateLisible } from '@/features/today/dates';
import { enregistrerNote, lireNote } from '../actions';
import type { ActionProposee } from '../types';

type Etape = 'pret' | 'ecoute' | 'transcription' | 'lecture' | 'propositions';

/** Bien ou contact reconnu dans la note ; retirable si l'IA s'est trompée. */
function Rattachement({
  icone: Icone,
  libelle,
  retirer
}: {
  icone: Icon;
  libelle: string;
  retirer: () => void;
}) {
  return (
    <span className='bg-sauge/15 text-sauge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs'>
      <Icone className='size-3.5' aria-hidden='true' />
      {libelle}
      <button
        type='button'
        onClick={retirer}
        className='hover:text-foreground ml-0.5'
        aria-label={`Retirer ${libelle}`}
      >
        <Icons.close className='size-3' />
      </button>
    </span>
  );
}
type Ligne = ActionProposee & { garder: boolean };

/**
 * Note vocale : un appui pour parler, un appui pour arrêter. La note est transcrite puis découpée
 * en actions (rappeler, visiter, saisir un mandat…) que le conseiller valide avant l'ajout à « Aujourd'hui ».
 * `grand` : gros bouton pour le téléphone (page /dashboard/note, icône sur l'écran d'accueil).
 */
export function NoteVocale({ grand, onTermine }: { grand?: boolean; onTermine?: () => void }) {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>('pret');
  const [secondes, setSecondes] = useState(0);
  const [texte, setTexte] = useState('');
  const [resume, setResume] = useState<string | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [enregistrement, demarrerEnregistrement] = useTransition();
  const arret = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (etape !== 'ecoute') return;
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [etape]);

  useEffect(() => {
    if (etape === 'ecoute' && secondes >= DUREE_MAX) {
      toast.info('Deux minutes au plus par note : enregistrement arrêté.');
      arret.current?.();
    }
  }, [etape, secondes]);

  useEffect(() => () => arret.current?.(), []);

  async function lire(note: string) {
    setEtape('lecture');
    const r = await lireNote(note);
    if (!r.ok) {
      toast.error(r.error);
      setEtape('pret');
      return;
    }
    if (r.repli) toast.info('Lecture automatique indisponible : la note est gardée telle quelle.');
    setResume(r.resume);
    setLignes(r.actions.map((a) => ({ ...a, garder: true })));
    setEtape('propositions');
  }

  async function parler() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(
        'Ce navigateur ne permet pas d’enregistrer. Essayez avec Safari ou Chrome à jour.'
      );
      return;
    }
    let flux: MediaStream;
    try {
      flux = await ouvrirMicro();
    } catch {
      toast.error('Micro inaccessible : autorisez le micro pour Ovalia.');
      return;
    }
    const { arreter, fin } = enregistrer(flux);
    arret.current = arreter;
    setSecondes(0);
    setEtape('ecoute');
    const audio = await fin;
    arret.current = null;
    setEtape('transcription');
    let note: string;
    try {
      note = await transcrireWav(await versWav(audio));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'La transcription a échoué.');
      setEtape('pret');
      return;
    }
    const complet = texte.trim() ? `${texte.trim()}\n${note}` : note;
    setTexte(complet);
    await lire(complet);
  }

  const modifier = (i: number, patch: Partial<Ligne>) =>
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const gardees = lignes.filter((l) => l.garder && l.titre.trim());

  function valider() {
    demarrerEnregistrement(async () => {
      const r = await enregistrerNote({
        note: texte,
        actions: gardees.map((l) => ({
          titre: l.titre,
          type: l.type,
          date: l.date || null,
          heure: l.heure || null,
          detail: l.detail,
          bienId: l.bien?.id ?? null,
          contactId: l.contact?.id ?? null
        }))
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `${r.n} action${r.n > 1 ? 's' : ''} ajoutée${r.n > 1 ? 's' : ''} à « Aujourd’hui »`
      );
      recommencer();
      router.refresh();
      onTermine?.();
    });
  }

  function recommencer() {
    setTexte('');
    setResume(null);
    setLignes([]);
    setEtape('pret');
  }

  const mmss = `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;
  const occupe = etape === 'transcription' || etape === 'lecture';

  if (etape === 'propositions')
    return (
      <div className='flex flex-col gap-4'>
        {resume && <p className='text-muted-foreground text-sm'>{resume}</p>}
        <ul className='flex flex-col gap-3'>
          {lignes.map((l, i) => (
            <li
              key={i}
              className={cn(
                'bg-background/40 flex flex-col gap-2 rounded-xl border p-3',
                !l.garder && 'opacity-50'
              )}
            >
              <div className='flex items-center gap-2.5'>
                <input
                  type='checkbox'
                  checked={l.garder}
                  onChange={(e) => modifier(i, { garder: e.target.checked })}
                  className='accent-sauge size-5 shrink-0 cursor-pointer'
                  aria-label='Garder cette action'
                />
                <Input
                  value={l.titre}
                  onChange={(e) => modifier(i, { titre: e.target.value })}
                  aria-label='Action'
                  className='font-medium'
                />
              </div>
              {l.detail && (
                <Textarea
                  value={l.detail}
                  onChange={(e) => modifier(i, { detail: e.target.value || null })}
                  aria-label='Détail'
                  rows={2}
                  className='text-[13px]'
                />
              )}
              <div className='flex flex-wrap items-center gap-2'>
                <NativeSelect
                  size='sm'
                  value={l.type}
                  onChange={(e) => modifier(i, { type: e.target.value as Ligne['type'] })}
                  aria-label='Type'
                >
                  {TYPES_TACHE.map(([v, t]) => (
                    <NativeSelectOption key={v} value={v}>
                      {t}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  type='date'
                  value={l.date ?? ''}
                  onChange={(e) => modifier(i, { date: e.target.value || null })}
                  aria-label='Jour'
                  className='h-7 w-36 text-[13px]'
                />
                <Input
                  type='time'
                  value={l.heure ?? ''}
                  onChange={(e) => modifier(i, { heure: e.target.value || null })}
                  aria-label='Heure'
                  className='h-7 w-26 text-[13px]'
                />
                <span className='text-muted-foreground text-xs'>
                  {l.date ? dateLisible(l.date) : 'aujourd’hui'}
                </span>
              </div>
              {(l.bien || l.contact) && (
                <div className='flex flex-wrap gap-1.5'>
                  {l.bien && (
                    <Rattachement
                      icone={Icons.bien}
                      libelle={l.bien.libelle}
                      retirer={() => modifier(i, { bien: null })}
                    />
                  )}
                  {l.contact && (
                    <Rattachement
                      icone={Icons.user}
                      libelle={l.contact.libelle}
                      retirer={() => modifier(i, { contact: null })}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        <details className='text-muted-foreground text-xs'>
          <summary className='cursor-pointer'>Note dictée</summary>
          <p className='mt-1 whitespace-pre-wrap'>{texte}</p>
        </details>
        <div className='flex flex-wrap gap-2'>
          <Button
            onClick={valider}
            disabled={enregistrement || !gardees.length}
            className={cn('font-semibold', grand && 'h-11 flex-1 text-base')}
          >
            {enregistrement ? <Icons.spinner className='animate-spin' /> : <Icons.check />}
            Ajouter {gardees.length} action{gardees.length > 1 ? 's' : ''} à Aujourd’hui
          </Button>
          <Button
            variant='outline'
            onClick={recommencer}
            disabled={enregistrement}
            className={cn(grand && 'h-11')}
          >
            Annuler
          </Button>
        </div>
      </div>
    );

  return (
    <div className={cn('flex flex-col gap-4', grand && 'items-center text-center')}>
      <button
        type='button'
        onClick={() => (etape === 'ecoute' ? arret.current?.() : void parler())}
        disabled={occupe}
        aria-live='polite'
        className={cn(
          'grid place-items-center rounded-full font-semibold shadow-lg transition-transform active:scale-95 disabled:opacity-70',
          grand ? 'size-44 text-lg' : 'size-28 self-center',
          etape === 'ecoute'
            ? 'bg-crit animate-pulse text-white'
            : 'bg-primary text-primary-foreground'
        )}
      >
        <span className='flex flex-col items-center gap-1.5'>
          {etape === 'ecoute' ? (
            <>
              <Icons.stop className={grand ? 'size-12' : 'size-8'} />
              <span className='tabular-nums'>{mmss}</span>
            </>
          ) : occupe ? (
            <>
              <Icons.spinner className={cn('animate-spin', grand ? 'size-12' : 'size-8')} />
              <span className='text-sm'>
                {etape === 'transcription' ? 'J’écoute…' : 'Je range…'}
              </span>
            </>
          ) : (
            <>
              <Icons.mic className={grand ? 'size-14' : 'size-9'} />
              <span className={grand ? '' : 'text-sm'}>Parler</span>
            </>
          )}
        </span>
      </button>
      <p className='text-muted-foreground text-sm'>
        {etape === 'ecoute'
          ? 'Appuyez à nouveau pour terminer (2 minutes au plus).'
          : 'Ex. : « Rappeler Mme Durand jeudi pour la baisse de prix, et saisir le mandat Favoriz de la maison de Mably demain. »'}
      </p>
      <details className={cn('w-full text-left', grand && 'max-w-md')}>
        <summary className='text-muted-foreground cursor-pointer text-xs'>
          Ou écrire la note
        </summary>
        <div className='mt-2 flex flex-col gap-2'>
          <Textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={3}
            placeholder='Rappeler…, envoyer…, visiter…'
            aria-label='Note écrite'
          />
          <Button
            variant='outline'
            size='sm'
            className='self-start'
            disabled={occupe || texte.trim().length < 3}
            onClick={() => void lire(texte)}
          >
            Transformer en actions
          </Button>
        </div>
      </details>
      {grand && (
        <Link href='/dashboard' className='text-sauge text-sm underline underline-offset-4'>
          Voir ma journée
        </Link>
      )}
    </div>
  );
}
