'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ResultatTri } from '@/features/mails/tri-types';
import { cn } from '@/lib/utils';
import { aujourdhui, dateLisible, enParis } from '../dates';

// Dernier tri de la boîte mail, gardé dans ce navigateur par la page Boîte mail (même clé).
const CLE = 'ovalia.tri-boite';

export function DernierTri() {
  const [tri, setTri] = useState<ResultatTri | null | undefined>(undefined);

  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE);
      setTri(brut ? (JSON.parse(brut) as ResultatTri) : null);
    } catch {
      setTri(null);
    }
  }, []);

  if (tri === undefined) return <div className='bg-muted/40 h-16 animate-pulse rounded-xl' />;

  const jour = tri ? enParis(tri.trieLe).date : null;
  const ancien = !jour || jour !== aujourdhui();
  const urgents = tri?.mails.filter((m) => m.categorie === 'urgent') ?? [];
  const reponses = tri?.mails.filter((m) => m.categorie === 'reponse').length ?? 0;

  return (
    <div className='flex flex-col gap-3'>
      {tri ? (
        <>
          <p className='text-muted-foreground text-xs'>
            Trié {dateLisible(jour!)} à {enParis(tri.trieLe).heure} · {tri.nbMails} mails ·{' '}
            <span className={cn(urgents.length && 'text-crit font-semibold')}>
              {urgents.length} urgent{urgents.length > 1 ? 's' : ''}
            </span>{' '}
            · {reponses} réponse{reponses > 1 ? 's' : ''} à valider
          </p>
          {urgents.length > 0 && (
            <ul className='divide-border divide-y'>
              {urgents.slice(0, 3).map((m) => (
                <li key={m.uid} className='grid grid-cols-[8px_minmax(0,1fr)] gap-3 py-2'>
                  <span className='bg-crit mt-1.5 size-2 rounded-full' aria-hidden='true' />
                  <div className='min-w-0'>
                    <p className='truncate font-semibold'>{m.sujet ?? m.de}</p>
                    <p className='text-muted-foreground text-[12.5px]'>{m.action}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!urgents.length && tri.priorites[0] && <p className='text-[13px]'>{tri.priorites[0]}</p>}
        </>
      ) : (
        <p className='text-muted-foreground text-[13px]'>
          Pas encore de tri sur ce navigateur. Le tri lit vos mails des 10 derniers jours et les
          croise avec vos biens et vos acquéreurs.
        </p>
      )}
      <Button
        size='sm'
        variant={ancien ? 'default' : 'outline'}
        className='self-start font-semibold'
        nativeButton={false}
        render={<Link href='/dashboard/mails' />}
      >
        {ancien ? 'Trier ma boîte du jour' : 'Ouvrir la boîte'}
      </Button>
    </div>
  );
}
