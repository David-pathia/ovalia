import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dicteeConfiguree, transcrire } from '@/lib/ai/dictee';

// Reçoit une dictée (WAV 16 kHz mono, 2 minutes au plus ≈ 3,8 Mo) et renvoie le texte.
// Corps brut plutôt qu'une action serveur : celles-ci sont limitées à 1 Mo.

export const maxDuration = 120;

const TAILLE_MAX = 4_300_000; // limite Vercel : 4,5 Mo par requête

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Session expirée : reconnectez-vous.' }, { status: 401 });
  if (!dicteeConfiguree())
    return NextResponse.json(
      { error: 'Dictée non configurée : ajoutez la variable AI_GATEWAY_API_KEY sur Vercel.' },
      { status: 503 }
    );

  const audio = Buffer.from(await request.arrayBuffer());
  if (audio.length < 1000)
    return NextResponse.json(
      { error: 'Enregistrement vide : rien n’a été capté.' },
      { status: 400 }
    );
  if (audio.length > TAILLE_MAX || audio.subarray(0, 4).toString() !== 'RIFF')
    return NextResponse.json({ error: 'Enregistrement trop long ou illisible.' }, { status: 400 });

  try {
    const texte = await transcrire(audio);
    if (!texte)
      return NextResponse.json(
        { error: 'Aucune parole reconnue. Rapprochez-vous du micro et réessayez.' },
        { status: 422 }
      );
    return NextResponse.json({ texte });
  } catch (e) {
    console.error('dictee', e);
    return NextResponse.json(
      { error: 'La transcription a échoué. Réessayez dans un instant.' },
      { status: 502 }
    );
  }
}
