'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { apercu, deposerPieces, retirerPiece } from '../televersement';
import { ACCEPT, PIECES_MAX, tailleLisible, type PieceJointe } from '../types';

/**
 * Bouton « Joindre » : photos (appareil photo du téléphone ou galerie) et PDF. Les fichiers partent
 * aussitôt dans le stockage privé ; `dossier` = identifiant du bien, ou « brouillons/<uuid> » pendant une saisie.
 */
export function BoutonPieces({
  dossier,
  nombre,
  onAjout,
  libelle = 'Joindre des fichiers',
  disabled,
  className
}: {
  dossier: string;
  nombre: number;
  onAjout: (pieces: PieceJointe[]) => void;
  libelle?: string;
  disabled?: boolean;
  className?: string;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(0);

  async function choisir(liste: FileList | null) {
    if (!liste?.length) return;
    const place = PIECES_MAX - nombre;
    const fichiers = [...liste].slice(0, Math.max(0, place));
    if (liste.length > place)
      toast.info(
        `${PIECES_MAX} pièces au plus par lecture : les suivantes n’ont pas été ajoutées.`
      );
    if (!fichiers.length) return;
    setEnvoi(fichiers.length);
    try {
      const { pieces, refus } = await deposerPieces(fichiers, dossier);
      refus.forEach((r) => toast.error(r));
      if (pieces.length) onAjout(pieces);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setEnvoi(0);
      if (champ.current) champ.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={champ}
        type='file'
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => void choisir(e.target.files)}
      />
      <Button
        type='button'
        variant='outline'
        disabled={disabled || envoi > 0 || nombre >= PIECES_MAX}
        onClick={() => champ.current?.click()}
        className={cn('gap-1.5', className)}
      >
        {envoi ? (
          <>
            <Icons.spinner className='animate-spin' /> Envoi ({envoi})…
          </>
        ) : (
          <>
            <Icons.paperclip /> {libelle}
          </>
        )}
      </Button>
    </>
  );
}

function Vignette({ piece }: { piece: PieceJointe }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (piece.type === 'image') void apercu(piece.chemin).then(setUrl);
  }, [piece]);
  if (piece.type === 'pdf')
    return (
      <span className='bg-crit/10 text-crit grid size-9 shrink-0 place-items-center rounded-md'>
        <Icons.fileTypePdf className='size-5' aria-hidden='true' />
      </span>
    );
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- lien signé temporaire
    <img src={url} alt='' className='size-9 shrink-0 rounded-md object-cover' />
  ) : (
    <span className='bg-muted size-9 shrink-0 animate-pulse rounded-md' />
  );
}

/** Liste des pièces jointes ; `supprimable` retire aussi le fichier du stockage (brouillon). */
export function ListePieces({
  pieces,
  onRetirer,
  supprimable = true
}: {
  pieces: PieceJointe[];
  onRetirer?: (chemin: string) => void;
  supprimable?: boolean;
}) {
  if (!pieces.length) return null;
  return (
    <ul className='flex flex-wrap gap-2'>
      {pieces.map((p) => (
        <li
          key={p.chemin}
          className='bg-background/50 flex max-w-64 items-center gap-2 rounded-lg border py-1 pr-1 pl-1'
        >
          <Vignette piece={p} />
          <span className='min-w-0 flex-1'>
            <span className='block truncate text-xs font-medium'>{p.nom}</span>
            <span className='text-muted-foreground block font-mono text-[10.5px]'>
              {tailleLisible(p.taille)}
            </span>
          </span>
          {onRetirer && (
            <Button
              type='button'
              size='icon-xs'
              variant='ghost'
              aria-label={`Retirer ${p.nom}`}
              onClick={() => {
                if (supprimable) void retirerPiece(p.chemin);
                onRetirer(p.chemin);
              }}
            >
              <Icons.close />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
