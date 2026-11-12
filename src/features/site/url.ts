import 'server-only';
import { headers } from 'next/headers';

/** Adresse publique du site (domaine de la requête en cours, en attendant le nom de domaine définitif). */
export async function urlPublique() {
  const h = await headers();
  const hote = h.get('x-forwarded-host') ?? h.get('host') ?? 'ovalia-alpha.vercel.app';
  const protocole = h.get('x-forwarded-proto') ?? 'https';
  return `${protocole}://${hote}`;
}
