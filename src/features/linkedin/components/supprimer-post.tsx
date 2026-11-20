'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { supprimer } from '../actions';

/** Retire un brouillon ou un post programmé de Typefully. */
export function SupprimerPost({ id }: { id: number }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <Button
      size='icon-sm'
      variant='ghost'
      aria-label='Supprimer'
      disabled={enCours}
      onClick={() => {
        if (!confirm('Supprimer ce post de Typefully ? Il ne sera pas publié.')) return;
        demarrer(async () => {
          const r = await supprimer(id);
          if (!r.ok) return void toast.error(r.error);
          toast.success('Post supprimé de Typefully.');
          router.refresh();
        });
      }}
    >
      {enCours ? <Icons.spinner className='animate-spin' /> : <Icons.trash />}
    </Button>
  );
}
