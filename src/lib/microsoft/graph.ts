import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { chiffrer, dechiffrer } from './chiffrement';

// Connexion à la boîte Microsoft 365 (adresse Laforêt) via Microsoft Graph, en droits délégués :
// Ovalia n'agit qu'au nom de l'utilisateur connecté, sur sa propre boîte.
// Identifiants dans les variables d'environnement (Vercel / .env.local), jamais dans le code :
// MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, JETONS_CHIFFREMENT_CLE.

export const SCOPES_MICROSOFT = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.Send'
];

const GRAPH = 'https://graph.microsoft.com/v1.0';

export function configMicrosoft() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const cleOk = (process.env.JETONS_CHIFFREMENT_CLE ?? '').length >= 32;
  if (!clientId || !clientSecret || !cleOk) return null;
  // « organizations » accepte tout compte professionnel ; l'identifiant du tenant Laforêt est plus strict.
  const tenant = process.env.MICROSOFT_TENANT_ID || 'organizations';
  return { clientId, clientSecret, tenant };
}

type Config = NonNullable<ReturnType<typeof configMicrosoft>>;

const urlLogin = (c: Config, chemin: string) =>
  `https://login.microsoftonline.com/${encodeURIComponent(c.tenant)}/oauth2/v2.0/${chemin}`;

/** Adresse de retour : elle doit figurer telle quelle dans l'application Entra ID. */
export const urlRetour = (origine: string) => `${origine}/auth/microsoft/callback`;

export function urlAutorisation(
  c: Config,
  p: { redirectUri: string; state: string; codeChallenge: string; email?: string | null }
) {
  const url = new URL(urlLogin(c, 'authorize'));
  url.search = new URLSearchParams({
    client_id: c.clientId,
    response_type: 'code',
    redirect_uri: p.redirectUri,
    response_mode: 'query',
    scope: SCOPES_MICROSOFT.join(' '),
    state: p.state,
    code_challenge: p.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
    ...(p.email ? { login_hint: p.email } : {})
  }).toString();
  return url.toString();
}

type ReponseJeton = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

async function demanderJeton(c: Config, params: Record<string, string>) {
  const res = await fetch(urlLogin(c, 'token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      scope: SCOPES_MICROSOFT.join(' '),
      ...params
    }),
    cache: 'no-store'
  });
  const json = (await res.json().catch(() => ({}))) as Partial<ReponseJeton> & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token)
    throw new ErreurMicrosoft(
      json.error ?? `http_${res.status}`,
      json.error_description?.split('\r\n')[0] ?? 'Microsoft a refusé la demande.'
    );
  return json as ReponseJeton;
}

export class ErreurMicrosoft extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function echangerCode(
  c: Config,
  p: { code: string; redirectUri: string; codeVerifier: string }
) {
  return demanderJeton(c, {
    grant_type: 'authorization_code',
    code: p.code,
    redirect_uri: p.redirectUri,
    code_verifier: p.codeVerifier
  });
}

export async function profilMicrosoft(accessToken: string) {
  const res = await fetch(`${GRAPH}/me?$select=displayName,mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new ErreurMicrosoft(`graph_${res.status}`, 'Profil Microsoft illisible.');
  const me = (await res.json()) as {
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
  };
  return { nom: me.displayName ?? null, email: me.mail ?? me.userPrincipalName ?? null };
}

/** Enregistre (ou remplace) les jetons chiffrés du compte de l'utilisateur connecté. */
export async function enregistrerJetons(
  supabase: SupabaseClient,
  ownerId: string,
  j: ReponseJeton,
  profil?: { nom: string | null; email: string | null },
  refreshPrecedent?: string
) {
  const refresh = j.refresh_token ?? refreshPrecedent;
  if (!refresh)
    throw new ErreurMicrosoft(
      'no_refresh_token',
      'Microsoft n’a pas fourni de jeton de rafraîchissement.'
    );
  const ligne = {
    owner_id: ownerId,
    access_token_chiffre: chiffrer(j.access_token),
    refresh_token_chiffre: chiffrer(refresh),
    // Marge d'une minute pour ne jamais présenter un jeton expiré.
    expire_le: new Date(Date.now() + (j.expires_in - 60) * 1000).toISOString(),
    scopes: j.scope ?? null,
    updated_at: new Date().toISOString(),
    ...(profil ? { email: profil.email, nom: profil.nom } : {})
  };
  const { error } = await supabase
    .from('comptes_microsoft')
    .upsert(ligne, { onConflict: 'owner_id' });
  if (error) throw new ErreurMicrosoft('stockage', error.message);
}

export type CompteMicrosoft = { email: string | null; nom: string | null };

/** Compte connecté et jeton valide (rafraîchi si besoin). Null si aucun compte n'est connecté. */
export async function jetonValide(supabase: SupabaseClient, ownerId: string) {
  const c = configMicrosoft();
  if (!c) return null;
  const { data, error } = await supabase
    .from('comptes_microsoft')
    .select('email, nom, access_token_chiffre, refresh_token_chiffre, expire_le')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw new ErreurMicrosoft('table', error.message);
  if (!data) return null;
  const compte: CompteMicrosoft = { email: data.email, nom: data.nom };
  if (new Date(data.expire_le).getTime() > Date.now())
    return { compte, accessToken: dechiffrer(data.access_token_chiffre) };

  const refresh = dechiffrer(data.refresh_token_chiffre);
  const j = await demanderJeton(c, { grant_type: 'refresh_token', refresh_token: refresh });
  await enregistrerJetons(supabase, ownerId, j, undefined, refresh);
  return { compte, accessToken: j.access_token };
}

export type MailRecu = {
  id: string;
  subject: string | null;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
  webLink: string;
  from?: { emailAddress: { name?: string; address?: string } };
};

/** Derniers mails de la boîte de réception (lecture seule, rien n'est stocké). */
export async function derniersMails(accessToken: string, nombre = 30) {
  const url = new URL(`${GRAPH}/me/mailFolders/inbox/messages`);
  url.search = new URLSearchParams({
    $top: String(nombre),
    $orderby: 'receivedDateTime desc',
    $select: 'subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments,importance,webLink'
  }).toString();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.body-content-type="text"' },
    cache: 'no-store'
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    throw new ErreurMicrosoft(
      json.error?.code ?? `graph_${res.status}`,
      json.error?.message ?? 'Lecture de la boîte impossible.'
    );
  }
  return ((await res.json()) as { value: MailRecu[] }).value;
}
