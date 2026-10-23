'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendResetLink, signIn, type AuthState } from '../actions';

const initial: AuthState = {};

function Feedback({ state }: { state: AuthState }) {
  if (state.error)
    return (
      <p role='alert' className='text-crit text-sm'>
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role='status' className='text-ok text-sm'>
        {state.message}
      </p>
    );
  return null;
}

export function SignInForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [loginState, loginAction, loginPending] = useActionState(signIn, initial);
  const [resetState, resetAction, resetPending] = useActionState(sendResetLink, initial);

  if (mode === 'reset') {
    return (
      <div className='space-y-6'>
        <div className='space-y-1.5'>
          <h2 className='font-display text-2xl font-extrabold'>Mot de passe oublié</h2>
          <p className='text-muted-foreground text-sm'>
            Indiquez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.
          </p>
        </div>
        <form action={resetAction} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='reset-email'>E-mail</Label>
            <Input id='reset-email' name='email' type='email' autoComplete='email' required className='h-10' />
          </div>
          <Feedback state={resetState} />
          <Button type='submit' className='h-10 w-full font-semibold' disabled={resetPending}>
            {resetPending ? 'Envoi…' : 'Recevoir le lien'}
          </Button>
        </form>
        <button
          type='button'
          onClick={() => setMode('login')}
          className='text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline'
        >
          ← Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='space-y-1.5'>
        <h2 className='font-display text-2xl font-extrabold'>Connexion</h2>
        <p className='text-muted-foreground text-sm'>Accédez à votre espace sécurisé.</p>
      </div>
      {linkError && (
        <p role='alert' className='text-crit text-sm'>
          Ce lien n’est plus valide. Demandez-en un nouveau.
        </p>
      )}
      <form action={loginAction} className='space-y-4'>
        <input type='hidden' name='next' value={next ?? ''} />
        <div className='space-y-2'>
          <Label htmlFor='email'>E-mail</Label>
          <Input id='email' name='email' type='email' autoComplete='email' required className='h-10' />
        </div>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='password'>Mot de passe</Label>
            <button
              type='button'
              onClick={() => setMode('reset')}
              className='text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline'
            >
              Mot de passe oublié ?
            </button>
          </div>
          <Input
            id='password'
            name='password'
            type='password'
            autoComplete='current-password'
            required
            className='h-10'
          />
        </div>
        <Feedback state={loginState} />
        <Button type='submit' className='h-10 w-full font-semibold' disabled={loginPending}>
          {loginPending ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  );
}
