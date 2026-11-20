import { createHash, randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configMicrosoft, urlAutorisation, urlRetour } from '@/lib/microsoft/graph';

// Début de la connexion Microsoft : on envoie l'utilisateur (déjà connecté à Ovalia) vers Microsoft.
// /auth est public dans le proxy : la session Ovalia est donc vérifiée ici.
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/connexion?next=/dashboard/mails`);

  const config = configMicrosoft();
  if (!config) return NextResponse.redirect(`${origin}/dashboard/mails?erreur=configuration`);

  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const response = NextResponse.redirect(
    urlAutorisation(config, {
      redirectUri: urlRetour(origin),
      state,
      codeChallenge: challenge,
      email: user.email
    })
  );
  response.cookies.set('ms_oauth', `${state}.${verifier}`, {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax',
    path: '/auth/microsoft',
    maxAge: 600
  });
  return response;
}
