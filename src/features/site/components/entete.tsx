'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { JULIEN, PAGES_SITE } from '../contenu';

export function EnteteSite() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  return (
    <header className='border-border/70 bg-background/90 sticky top-0 z-40 border-b backdrop-blur'>
      <div className='mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6'>
        <Link href='/site' className='leading-tight' onClick={() => setOuvert(false)}>
          <span className='font-display text-marine block text-lg font-bold'>{JULIEN.nom}</span>
          <span className='text-muted-foreground block text-xs whitespace-nowrap'>{JULIEN.fonction}</span>
        </Link>
        <nav className='hidden items-center gap-1 xl:flex' aria-label='Navigation principale'>
          {PAGES_SITE.slice(1).map(([href, titre]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                chemin === href ? 'text-marine bg-pale' : 'text-foreground/80 hover:text-marine'
              )}
            >
              {titre}
            </Link>
          ))}
          <Link
            href='/site/contact#rendez-vous'
            className='bg-bleu ml-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:opacity-90'
          >
            Prendre rendez-vous
          </Link>
        </nav>
        <button
          type='button'
          className='text-marine rounded-lg p-2 xl:hidden'
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={ouvert}
          onClick={() => setOuvert((o) => !o)}
        >
          {ouvert ? <Icons.close className='size-6' /> : <Icons.menu className='size-6' />}
        </button>
      </div>
      {ouvert && (
        <nav className='border-border border-t px-4 pb-4 xl:hidden' aria-label='Navigation mobile'>
          {PAGES_SITE.map(([href, titre]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOuvert(false)}
              className={cn(
                'block rounded-lg px-3 py-2.5 text-base',
                chemin === href ? 'text-marine bg-pale font-semibold' : 'text-foreground'
              )}
            >
              {titre}
            </Link>
          ))}
          <Link
            href='/site/contact#rendez-vous'
            onClick={() => setOuvert(false)}
            className='bg-bleu mt-2 block rounded-lg px-4 py-3 text-center font-semibold text-white'
          >
            Prendre rendez-vous
          </Link>
        </nav>
      )}
    </header>
  );
}
