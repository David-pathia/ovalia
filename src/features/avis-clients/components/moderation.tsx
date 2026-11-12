'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { modererAvis, supprimerInvitation } from '../actions';

export function Moderation({
  id,
  publication
}: {
  id: string;
  publication: 'a_valider' | 'publie' | 'refuse';
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const decider = (d: 'publie' | 'refuse' | 'a_valider') =>
    start(async () => {
      const res = await modererAvis(id, d);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  if (publication !== 'a_valider')
    return (
      <Button size='xs' variant='ghost' disabled={pending} onClick={() => decider('a_valider')}>
        Revenir à « à valider »
      </Button>
    );
  return (
    <div className='flex gap-1.5'>
      <Button size='xs' disabled={pending} onClick={() => decider('publie')}>
        Valider le témoignage
      </Button>
      <Button size='xs' variant='outline' disabled={pending} onClick={() => decider('refuse')}>
        Ne pas publier
      </Button>
    </div>
  );
}

export function SupprimerInvitation({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size='xs'
      variant='ghost'
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await supprimerInvitation(id);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          router.refresh();
        })
      }
    >
      Supprimer
    </Button>
  );
}
