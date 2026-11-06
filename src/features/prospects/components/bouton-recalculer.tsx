'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { recalculerTout } from '../actions';

export function BoutonRecalculer() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant='outline'
      size='sm'
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await recalculerTout();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(`${res.n} rapprochement(s) calculé(s)`);
          router.refresh();
        })
      }
    >
      {pending ? <Icons.spinner className='animate-spin' /> : <Icons.sync />} Recalculer
    </Button>
  );
}
