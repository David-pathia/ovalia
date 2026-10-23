import type { Metadata } from 'next';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { SignInForm } from '@/features/auth/components/sign-in-form';

export const metadata: Metadata = { title: 'Connexion' };

export default async function ConnexionPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>;
}) {
  const { next, erreur } = await searchParams;
  return (
    <AuthShell>
      <SignInForm next={next} linkError={erreur === 'lien'} />
    </AuthShell>
  );
}
