import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ErreurMicrosoft,
  configMicrosoft,
  echangerCode,
  enregistrerJetons,
  profilMicrosoft,
  urlRetour
} from '@/lib/microsoft/graph';

const memes = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Retour de Microsoft : on vérifie l'état, on échange le code contre les jetons et on les stocke chiffrés.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const retour = (params: Record<string, string>) => {
    const res = NextResponse.redirect(
      `${origin}/dashboard/mails?${new URLSearchParams(params).toString()}`
    );
    res.cookies.delete({ name: 'ms_oauth', path: '/auth/microsoft' });
    return res;
  };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/connexion?next=/dashboard/mails`);

  const config = configMicrosoft();
  if (!config) return retour({ erreur: 'configuration' });

  // Refus de l'utilisateur ou de l'administrateur (ex. consentement administrateur requis).
  const erreurMs = searchParams.get('error');
  if (erreurMs) {
    const detail = searchParams.get('error_description') ?? '';
    const code = /AADSTS(65001|90094|90095)/.test(detail) ? 'consentement' : erreurMs;
    return retour({ erreur: code, detail: detail.split('\r\n')[0].slice(0, 300) });
  }

  const [state, verifier] = (request.cookies.get('ms_oauth')?.value ?? '').split('.');
  const recu = searchParams.get('state') ?? '';
  const code = searchParams.get('code');
  if (!state || !verifier || !code || !memes(state, recu)) return retour({ erreur: 'etat' });

  try {
    const jetons = await echangerCode(config, {
      code,
      redirectUri: urlRetour(origin),
      codeVerifier: verifier
    });
    const profil = await profilMicrosoft(jetons.access_token);
    await enregistrerJetons(supabase, user.id, jetons, profil);
    return retour({ connexion: 'ok' });
  } catch (e) {
    const err = e instanceof ErreurMicrosoft ? e : new ErreurMicrosoft('inconnue', String(e));
    return retour({ erreur: err.code, detail: err.message.slice(0, 300) });
  }
}
