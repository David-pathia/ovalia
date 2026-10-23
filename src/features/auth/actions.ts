'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; message?: string };

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

async function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { error: 'La connexion à Supabase n’est pas encore configurée.' };
  }
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Renseignez votre e-mail et votre mot de passe.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'E-mail ou mot de passe incorrect.' };

  redirect(safeNext(formData.get('next')));
}

export async function sendResetLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { error: 'La connexion à Supabase n’est pas encore configurée.' };
  }
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Renseignez votre e-mail.' };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await appUrl()}/auth/callback?next=/connexion/nouveau-mot-de-passe`
  });
  // Même réponse que le compte existe ou non, pour ne rien révéler.
  return { message: 'Si un compte existe pour cet e-mail, un lien vient de vous être envoyé.' };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 10) return { error: 'Le mot de passe doit faire au moins 10 caractères.' };
  if (password !== confirm) return { error: 'Les deux mots de passe ne correspondent pas.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Le lien a expiré. Demandez-en un nouveau depuis la page de connexion.' };

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/connexion');
}
