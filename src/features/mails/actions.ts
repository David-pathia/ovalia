'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ErreurMail, SERVEUR_LAFORET, enregistrerCompte } from '@/lib/mail/imap';

type Resultat = { ok: true } | { ok: false; error: string };

const Connexion = z.object({
  email: z.email('Adresse e-mail invalide.').max(200),
  motDePasse: z.string().min(1, 'Indiquez le mot de passe de la messagerie.').max(200)
});

/** Connecte la boîte Laforêt : identifiants vérifiés auprès du serveur, mot de passe stocké chiffré. */
export async function connecterBoite(formData: FormData): Promise<Resultat> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const parsed = Connexion.safeParse({
    email: String(formData.get('email') ?? '').trim(),
    motDePasse: String(formData.get('motDePasse') ?? '')
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' };
  try {
    await enregistrerCompte(supabase, user.id, {
      ...SERVEUR_LAFORET,
      identifiant: parsed.data.email,
      motDePasse: parsed.data.motDePasse
    });
  } catch (e) {
    if (e instanceof ErreurMail)
      return {
        ok: false,
        error:
          e.code === 'table'
            ? 'Exécutez d’abord la migration « comptes mail » dans Supabase.'
            : e.message
      };
    console.error('mails.connexion', e);
    return { ok: false, error: 'La connexion a échoué.' };
  }
  revalidatePath('/dashboard/mails');
  return { ok: true };
}

/** Déconnecte la boîte mail : le mot de passe chiffré est supprimé d'Ovalia. */
export async function deconnecterBoite(): Promise<Resultat> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée.' };
  const { error } = await supabase.from('comptes_mail').delete().eq('owner_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/mails');
  return { ok: true };
}
