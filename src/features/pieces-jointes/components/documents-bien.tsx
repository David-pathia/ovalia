'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { supprimerDocument } from '../actions';
import type { DocumentBien } from '../dossier';
import { tailleLisible } from '../types';

/** Documents PDF du dossier d'un bien (DPE, taxe foncière, plans…), ajoutés via « Joindre ». */
export function DocumentsBien({
  bienId,
  documents
}: {
  bienId: string;
  documents: DocumentBien[];
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  if (!documents.length) return null;

  const supprimer = (d: DocumentBien) => {
    if (!confirm(`Supprimer « ${d.nom} » du dossier ?`)) return;
    demarrer(async () => {
      const r = await supprimerDocument(bienId, d.chemin);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  };

  return (
    <section className='bg-card rounded-2xl border p-4 sm:p-5'>
      <h2 className='font-display mb-3 flex items-center gap-2 text-[17px] font-semibold'>
        <Icons.paperclip className='text-sauge size-[18px]' aria-hidden='true' />
        Documents du dossier
        <span className='text-muted-foreground font-mono text-xs font-normal'>
          {documents.length}
        </span>
      </h2>
      <ul className='divide-border divide-y'>
        {documents.map((d) => (
          <li key={d.chemin} className='flex items-center gap-3 py-2'>
            <Icons.fileTypePdf className='text-crit size-5 shrink-0' aria-hidden='true' />
            {d.url ? (
              <a
                href={d.url}
                target='_blank'
                rel='noreferrer'
                className='min-w-0 flex-1 truncate text-sm font-medium hover:underline'
              >
                {d.nom}
              </a>
            ) : (
              <span className='min-w-0 flex-1 truncate text-sm'>{d.nom}</span>
            )}
            {d.taille != null && (
              <span className='text-muted-foreground font-mono text-xs'>
                {tailleLisible(d.taille)}
              </span>
            )}
            <Button
              size='icon-xs'
              variant='ghost'
              className='text-muted-foreground'
              disabled={enCours}
              onClick={() => supprimer(d)}
              aria-label={`Supprimer ${d.nom}`}
            >
              <Icons.trash />
            </Button>
          </li>
        ))}
      </ul>
      <p className='text-muted-foreground mt-2 text-xs'>
        Ajoutez-en avec « Joindre » dans « Dicter ou joindre des informations » : chaque pièce est
        lue pour compléter la fiche.
      </p>
    </section>
  );
}
