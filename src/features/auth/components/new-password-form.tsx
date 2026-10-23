'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword, type AuthState } from '../actions';

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {} as AuthState);

  return (
    <form action={action} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='password'>Nouveau mot de passe</Label>
        <Input id='password' name='password' type='password' autoComplete='new-password' minLength={10} required className='h-10' />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='confirm'>Confirmation</Label>
        <Input id='confirm' name='confirm' type='password' autoComplete='new-password' minLength={10} required className='h-10' />
      </div>
      {state.error && (
        <p role='alert' className='text-crit text-sm'>
          {state.error}
        </p>
      )}
      <Button type='submit' className='h-10 w-full font-semibold' disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer et entrer'}
      </Button>
    </form>
  );
}
