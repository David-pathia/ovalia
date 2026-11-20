'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deconnecterMicrosoft } from '../actions';

export function Deconnecter() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size='xs'
      variant='ghost'
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm('Déconnecter la boîte mail d’Ovalia ?')) return;
          const res = await deconnecterMicrosoft();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success('Boîte mail déconnectée.');
          router.replace('/dashboard/mails');
        })
      }
    >
      Déconnecter
    </Button>
  );
}
