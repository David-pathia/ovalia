import Link from 'next/link';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AGENCE_SITE, JULIEN, MESSAGES_WHATSAPP, PAGES_SITE, lienWhatsApp } from '../contenu';

// Briques communes du site : titres de section, citations, boutons d'action, pied de page.

export function Section({
  children,
  className,
  fond
}: {
  children: React.ReactNode;
  className?: string;
  fond?: 'pale' | 'marine';
}) {
  return (
    <section
      className={cn(
        fond === 'pale' && 'bg-pale',
        fond === 'marine' && 'bg-marine text-white',
        className
      )}
    >
      <div className='mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20'>{children}</div>
    </section>
  );
}

export function Surtitre({ children, clair }: { children: React.ReactNode; clair?: boolean }) {
  return (
    <p
      className={cn(
        'mb-2 text-xs font-semibold tracking-[0.18em] uppercase',
        clair ? 'text-ciel' : 'text-bleu'
      )}
    >
      {children}
    </p>
  );
}

export function Titre({
  children,
  clair,
  className
}: {
  children: React.ReactNode;
  clair?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'font-display text-3xl leading-tight font-bold sm:text-4xl',
        clair ? 'text-white' : 'text-marine',
        className
      )}
    >
      {children}
    </h2>
  );
}

export function Citation({ children, clair }: { children: React.ReactNode; clair?: boolean }) {
  return (
    <blockquote
      className={cn(
        'border-ciel my-8 border-l-4 pl-5 text-xl leading-relaxed font-medium italic sm:text-2xl',
        clair ? 'text-white' : 'text-marine'
      )}
    >
      « {children} »
    </blockquote>
  );
}

export function BoutonsContact({
  estimation = true,
  clair
}: {
  estimation?: boolean;
  clair?: boolean;
}) {
  return (
    <div className='flex flex-wrap gap-3'>
      <Link
        href='/site/contact#rendez-vous'
        className='bg-bleu inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm hover:opacity-90'
      >
        <Icons.calendar className='size-5' /> Prendre rendez-vous
      </Link>
      <a
        href={lienWhatsApp()}
        target='_blank'
        rel='noopener noreferrer'
        className='bg-whatsapp inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm hover:opacity-90'
      >
        <Icons.whatsapp className='size-5' /> Échanger sur WhatsApp
      </a>
      {estimation && (
        <a
          href={lienWhatsApp(MESSAGES_WHATSAPP.estimation)}
          target='_blank'
          rel='noopener noreferrer'
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border-2 px-5 py-3 font-semibold',
            clair
              ? 'border-white/70 text-white hover:bg-white/10'
              : 'border-bleu text-bleu hover:bg-pale'
          )}
        >
          <Icons.estimation className='size-5' /> Faire estimer mon bien
        </a>
      )}
    </div>
  );
}

/** Bouton WhatsApp flottant, sur mobile uniquement. */
export function WhatsAppFlottant() {
  return (
    <a
      href={lienWhatsApp()}
      target='_blank'
      rel='noopener noreferrer'
      aria-label='Échanger avec Julien sur WhatsApp'
      className='bg-whatsapp fixed right-4 bottom-4 z-50 flex size-14 items-center justify-center rounded-full text-white shadow-lg lg:hidden'
    >
      <Icons.whatsapp className='size-7' />
    </a>
  );
}

export function PiedSite() {
  return (
    <footer className='bg-marine text-white'>
      <div className='mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6'>
        <div>
          <p className='font-display text-xl font-bold'>{JULIEN.nom}</p>
          <p className='text-white/75 text-sm'>{JULIEN.fonction}</p>
          <p className='text-ciel mt-3 text-sm italic'>{JULIEN.signature}</p>
          <div className='mt-4 flex flex-col gap-2 text-sm'>
            <a
              href={JULIEN.telephoneLien}
              className='inline-flex items-center gap-2 hover:underline'
            >
              <Icons.phone className='size-4' /> {JULIEN.telephone}
            </a>
            <a
              href={lienWhatsApp()}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 hover:underline'
            >
              <Icons.whatsapp className='size-4' /> WhatsApp
            </a>
            <a
              href={JULIEN.linkedin}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 hover:underline'
            >
              <Icons.linkedin className='size-4' /> LinkedIn
            </a>
          </div>
        </div>
        <div className='text-sm'>
          <p className='font-semibold'>{AGENCE_SITE.nom}</p>
          <p className='text-white/80'>
            {AGENCE_SITE.adresse}, {AGENCE_SITE.ville}
          </p>
          <p className='text-white/80'>{AGENCE_SITE.telephone}</p>
          <p className='text-white/80'>{AGENCE_SITE.email}</p>
          <p className='text-white/80 mt-2'>{AGENCE_SITE.horaires}</p>
        </div>
        <nav className='flex flex-col gap-1.5 text-sm' aria-label='Plan du site'>
          {PAGES_SITE.map(([href, titre]) => (
            <Link key={href} href={href} className='text-white/80 hover:text-white hover:underline'>
              {titre}
            </Link>
          ))}
          <Link href='/site/avis' className='text-white/80 hover:text-white hover:underline'>
            Votre avis compte
          </Link>
          <Link
            href='/site/mentions-legales'
            className='text-white/80 hover:text-white hover:underline'
          >
            Mentions légales et confidentialité
          </Link>
        </nav>
      </div>
      <p className='border-white/15 border-t px-4 py-4 text-center text-xs text-white/60'>
        Julien Ossedat est négociateur immobilier salarié de l’agence Laforêt Roanne. Chaque agence
        Laforêt est une entité juridiquement et financièrement indépendante.
      </p>
    </footer>
  );
}

export function EnTetePage({
  surtitre,
  titre,
  intro
}: {
  surtitre: string;
  titre: string;
  intro: string;
}) {
  return (
    <section className='from-pale bg-gradient-to-b to-white'>
      <div className='mx-auto max-w-4xl px-4 pt-14 pb-8 sm:px-6 sm:pt-20'>
        <Surtitre>{surtitre}</Surtitre>
        <h1 className='font-display text-marine text-4xl leading-tight font-bold sm:text-5xl'>
          {titre}
        </h1>
        <p className='text-foreground/80 mt-5 text-lg leading-relaxed'>{intro}</p>
      </div>
    </section>
  );
}

export function Texte({ children }: { children: React.ReactNode }) {
  return (
    <div className='text-foreground/85 mx-auto max-w-4xl space-y-5 px-4 text-lg leading-relaxed sm:px-6'>
      {children}
    </div>
  );
}
