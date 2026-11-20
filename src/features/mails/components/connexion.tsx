'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { connecterBoite } from '../actions';

/** Formulaire de connexion de la boîte Laforêt (adresse + mot de passe de la messagerie). */
export function ConnexionBoite({ emailParDefaut }: { emailParDefaut?: string | null }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  function envoyer(formData: FormData) {
    demarrer(async () => {
      const res = await connecterBoite(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Boîte mail connectée.');
      router.refresh();
    });
  }

  return (
    <form action={envoyer} className='grid w-full max-w-md gap-3'>
      <div>
        <Label htmlFor='email' className='mb-1.5 text-xs'>
          Adresse Laforêt
        </Label>
        <Input
          id='email'
          name='email'
          type='email'
          required
          autoComplete='username'
          defaultValue={emailParDefaut ?? ''}
          placeholder='prenom.nom@laforet.com'
        />
      </div>
      <div>
        <Label htmlFor='motDePasse' className='mb-1.5 text-xs'>
          Mot de passe de la messagerie
        </Label>
        <Input
          id='motDePasse'
          name='motDePasse'
          type='password'
          required
          autoComplete='current-password'
        />
      </div>
      <Button type='submit' className='justify-self-start font-semibold' disabled={enCours}>
        <Icons.lock /> {enCours ? 'Vérification…' : 'Connecter ma boîte'}
      </Button>
    </form>
  );
}
