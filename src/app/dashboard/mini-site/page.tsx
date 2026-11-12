import type { Metadata } from 'next';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { Icons } from '@/components/icons';
import { PAGES_SITE } from '@/features/site/contenu';

export const metadata: Metadata = { title: 'Mini-site' };

export default async function MiniSitePage() {
  const h = await headers();
  const hote = h.get('x-forwarded-host') ?? h.get('host') ?? 'ovalia-alpha.vercel.app';
  const protocole = h.get('x-forwarded-proto') ?? 'https';
  const base = `${protocole}://${hote}`;
  const accueil = `${base}/site`;
  const options = { margin: 1, color: { dark: '#1f3a8a', light: '#ffffff' } };
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(accueil, { ...options, width: 1024 }),
    QRCode.toString(accueil, { ...options, type: 'svg' })
  ]);

  return (
    <div className='flex flex-1 flex-col gap-5 px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header>
        <h1 className='font-display text-3xl font-extrabold'>Mini-site de Julien</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Site public, non référencé sur Google tant que l’usage de la marque Laforêt n’est pas
          validé par l’agence.
        </p>
      </header>

      <div className='grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'>
        <section className='bg-card rounded-2xl border p-4 sm:p-5'>
          <h2 className='font-display text-[17px] font-semibold'>Pages en ligne</h2>
          <ul className='mt-3 divide-y'>
            {PAGES_SITE.map(([href, titre]) => (
              <li key={href} className='flex items-center justify-between gap-3 py-2.5'>
                <span className='font-medium'>{titre}</span>
                <a
                  href={href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-cuivre inline-flex items-center gap-1 text-sm hover:underline'
                >
                  {href} <Icons.externalLink className='size-3.5' />
                </a>
              </li>
            ))}
          </ul>
          <h3 className='mt-5 text-sm font-semibold'>Déjà en place</h3>
          <p className='text-muted-foreground mt-1 text-sm'>
            Boutons WhatsApp (message prérempli), téléphone et LinkedIn ; bouton WhatsApp flottant
            sur mobile ; mentions légales.
          </p>
          <h3 className='mt-4 text-sm font-semibold'>Prochaines étapes</h3>
          <p className='text-muted-foreground mt-1 text-sm'>
            Questionnaire « Votre avis compte » et son tableau de bord, formulaire de demande
            d’estimation (création du prospect dans Ovalia), réservation de rendez-vous en ligne.
          </p>
        </section>

        <section className='bg-card rounded-2xl border p-4 sm:p-5'>
          <h2 className='font-display text-[17px] font-semibold'>QR code du site</h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            Pour les cartes de visite, les panneaux et les supports de prospection. Il ouvre{' '}
            {accueil}.
          </p>
          <div className='mt-4 flex justify-center rounded-xl bg-white p-4'>
            {/* eslint-disable-next-line @next/next/no-img-element -- image générée (data URL) */}
            <img src={png} alt='QR code du site de Julien Ossedat' className='size-48' />
          </div>
          <div className='mt-4 flex flex-wrap gap-2'>
            <a
              href={png}
              download='qr-julien-ossedat.png'
              className='bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold'
            >
              <Icons.download className='size-4' /> PNG (impression)
            </a>
            <a
              href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
              download='qr-julien-ossedat.svg'
              className='inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold'
            >
              <Icons.download className='size-4' /> SVG (imprimeur)
            </a>
          </div>
          <p className='text-muted-foreground mt-3 text-xs'>
            À régénérer quand le nom de domaine définitif sera branché.
          </p>
        </section>
      </div>
    </div>
  );
}
