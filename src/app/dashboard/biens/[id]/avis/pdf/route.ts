import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { genererAvisPdf } from '@/features/avis/pdf/render';

export const maxDuration = 120;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/connexion', _req.url));

  const res = await genererAvisPdf(supabase, id);
  if (!res.ok) return new NextResponse(res.error, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new NextResponse(new Uint8Array(res.pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${res.nom}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
