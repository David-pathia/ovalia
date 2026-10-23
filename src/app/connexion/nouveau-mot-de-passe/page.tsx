import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { NewPasswordForm } from '@/features/auth/components/new-password-form';
import { getUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Nouveau mot de passe' };

export default async function NewPasswordPage() {
  const user = await getUser();

  return (
    <AuthShell>
      <div className='space-y-6'>
        <div className='space-y-1.5'>
          <h2 className='font-display text-2xl font-extrabold'>Choisir un mot de passe</h2>
          <p className='text-muted-foreground text-sm'>
            {user ? `Compte : ${user.email}` : 'Ouvrez cette page depuis le lien reçu par e-mail.'}
          </p>
        </div>
        {user ? (
          <NewPasswordForm />
        ) : (
          <Link href='/connexion' className='text-sm underline underline-offset-4'>
            Retour à la connexion
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
