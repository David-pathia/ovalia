import type { Metadata } from 'next';
import { Lexend } from 'next/font/google';
import { cn } from '@/lib/utils';
import { EnteteSite } from '@/features/site/components/entete';
import { PiedSite, WhatsAppFlottant } from '@/features/site/components/elements';

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lexend'
});

export const metadata: Metadata = {
  title: {
    default: 'Julien Ossedat · Laforêt Roanne',
    template: '%s · Julien Ossedat, Laforêt Roanne'
  },
  description:
    'Julien Ossedat, négociateur immobilier chez Laforêt Roanne : vente, achat et estimation dans le Roannais. « Je construis d’abord des relations avant de vendre des maisons. »',
  // Non référencé tant que l'usage de la marque Laforêt n'est pas validé par l'agence.
  robots: { index: false, follow: false }
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-site='julien'
      className={cn(
        'bg-background text-foreground flex min-h-screen flex-col font-sans',
        lexend.variable
      )}
    >
      <EnteteSite />
      <main className='flex-1'>{children}</main>
      <PiedSite />
      <WhatsAppFlottant />
    </div>
  );
}
