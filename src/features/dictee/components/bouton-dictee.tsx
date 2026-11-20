'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { DUREE_MAX, enregistrer, ouvrirMicro, transcrireWav, versWav } from '../enregistreur';

type Etat = 'pret' | 'ecoute' | 'transcription';

/** Bouton micro : appuyer pour dicter, appuyer à nouveau pour arrêter ; renvoie le texte transcrit. */
export function BoutonDictee({
  onTexte,
  libelle = 'Dicter',
  className,
  disabled
}: {
  onTexte: (texte: string) => void;
  libelle?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [etat, setEtat] = useState<Etat>('pret');
  const [secondes, setSecondes] = useState(0);
  const arret = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (etat !== 'ecoute') return;
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [etat]);

  useEffect(() => {
    if (etat === 'ecoute' && secondes >= DUREE_MAX) {
      toast.info('Deux minutes au plus par dictée : enregistrement arrêté.');
      arret.current?.();
    }
  }, [etat, secondes]);

  // Quitter la page coupe le micro.
  useEffect(() => () => arret.current?.(), []);

  async function demarrer() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Ce navigateur ne permet pas de dicter. Essayez avec Chrome ou Safari à jour.');
      return;
    }
    let flux: MediaStream;
    try {
      flux = await ouvrirMicro();
    } catch {
      toast.error('Micro inaccessible : autorisez le micro pour Ovalia dans votre navigateur.');
      return;
    }
    const { arreter, fin } = enregistrer(flux);
    arret.current = arreter;
    setSecondes(0);
    setEtat('ecoute');
    const audio = await fin;
    arret.current = null;
    setEtat('transcription');
    try {
      const texte = await transcrireWav(await versWav(audio));
      onTexte(texte);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'La transcription a échoué.');
    } finally {
      setEtat('pret');
    }
  }

  const mmss = `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;

  return (
    <Button
      type='button'
      variant={etat === 'ecoute' ? 'destructive' : 'outline'}
      disabled={disabled || etat === 'transcription'}
      onClick={() => (etat === 'ecoute' ? arret.current?.() : void demarrer())}
      className={cn('gap-1.5', className)}
      aria-live='polite'
    >
      {etat === 'ecoute' ? (
        <>
          <span className='bg-current size-2 animate-pulse rounded-full' aria-hidden='true' />
          <Icons.stop /> Arrêter · <span className='tabular-nums'>{mmss}</span>
        </>
      ) : etat === 'transcription' ? (
        <>
          <Icons.spinner className='animate-spin' /> Transcription…
        </>
      ) : (
        <>
          <Icons.mic /> {libelle}
        </>
      )}
    </Button>
  );
}
