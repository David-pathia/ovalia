import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  ErreurMail,
  WEBMAIL_LAFORET,
  boiteDeReception,
  messagerieConfiguree,
  type CompteMail,
  type MailRecu
} from '@/lib/mail/imap';
import { ConnexionBoite } from '@/features/mails/components/connexion';
import { Deconnecter } from '@/features/mails/components/deconnecter';

export const metadata: Metadata = { title: 'Boîte mail' };
export const maxDuration = 60;

const jour = (x: Date) => x.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

function dateCourte(iso: string) {
  const d = new Date(iso);
  return jour(d) === jour(new Date())
    ? d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
      })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });
}

export default async function MailsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let compte: CompteMail | null = null;
  let mails: MailRecu[] = [];
  let probleme: string | null = null;
  let reconnecter = false;

  const configure = messagerieConfiguree();
  if (configure && user) {
    try {
      const boite = await boiteDeReception(supabase, user.id);
      if (boite) ({ compte, mails } = boite);
    } catch (e) {
      if (e instanceof ErreurMail && e.code === 'table')
        probleme = 'Exécutez d’abord la migration « comptes mail » dans Supabase (SQL Editor).';
      else if (e instanceof ErreurMail && e.code === 'identifiants') {
        probleme =
          'La messagerie refuse le mot de passe enregistré (a-t-il changé ?). Saisissez-le à nouveau.';
        reconnecter = true;
      } else probleme = 'La messagerie Laforêt ne répond pas. Réessayez dans quelques minutes.';
    }
  }

  return (
    <div className='flex flex-1 flex-col gap-5 px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='font-display text-3xl font-extrabold'>Boîte mail</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {compte
              ? `Boîte de réception de ${compte.email ?? 'votre compte'} · lecture seule`
              : 'Votre messagerie Laforêt, lue en direct : aucun mail n’est copié dans Ovalia.'}
          </p>
        </div>
        {compte && (
          <div className='flex items-center gap-2'>
            <a
              href={WEBMAIL_LAFORET}
              target='_blank'
              rel='noreferrer'
              className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
            >
              Ouvrir la messagerie <Icons.externalLink className='size-3.5' />
            </a>
            <Deconnecter />
          </div>
        )}
      </header>

      {probleme && (
        <p className='bg-warn/15 text-warn rounded-xl px-4 py-2.5 text-sm'>{probleme}</p>
      )}

      {!configure ? (
        <section className='bg-card rounded-2xl border p-5 text-sm'>
          <h2 className='font-display text-[17px] font-semibold'>Connexion à préparer</h2>
          <p className='text-muted-foreground mt-1'>
            Ovalia attend sa clé de chiffrement (variable JETONS_CHIFFREMENT_CLE dans Vercel). Une
            fois ajoutée, vous pourrez connecter votre boîte Laforêt ici.
          </p>
        </section>
      ) : !compte || reconnecter ? (
        <section className='bg-card flex flex-col items-start gap-3 rounded-2xl border p-5'>
          <h2 className='font-display text-[17px] font-semibold'>
            {reconnecter ? 'Reconnecter votre boîte Laforêt' : 'Connecter votre boîte Laforêt'}
          </h2>
          <p className='text-muted-foreground max-w-xl text-sm'>
            Les mêmes identifiants que sur votre téléphone (messagerie.laforet.com). Le mot de passe
            est vérifié auprès de la messagerie puis enregistré chiffré ; vous pouvez déconnecter la
            boîte à tout moment. Ovalia ouvre la boîte en lecture seule : aucun mail n’est marqué
            comme lu.
          </p>
          <ConnexionBoite emailParDefaut={compte?.email ?? user?.email} />
        </section>
      ) : mails.length === 0 ? (
        <p className='text-muted-foreground text-sm'>Aucun mail dans la boîte de réception.</p>
      ) : (
        <section className='bg-card rounded-2xl border'>
          <ul className='divide-y'>
            {mails.map((m) => (
              <li key={m.uid}>
                <details className='group'>
                  <summary className='hover:bg-muted/50 flex cursor-pointer list-none gap-3 px-4 py-3 sm:px-5'>
                    <span
                      className={cn(
                        'mt-2 size-2 shrink-0 rounded-full',
                        m.lu ? 'bg-transparent' : 'bg-cuivre'
                      )}
                      aria-label={m.lu ? undefined : 'Non lu'}
                    />
                    <span className='min-w-0 flex-1'>
                      <span className='flex items-baseline justify-between gap-3'>
                        <span
                          className={cn('truncate', !m.lu && 'font-semibold')}
                          title={m.adresse ?? undefined}
                        >
                          {m.de}
                        </span>
                        <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                          {dateCourte(m.date)}
                        </span>
                      </span>
                      <span className='flex items-center gap-1.5'>
                        {m.important && (
                          <Icons.alertCircle
                            className='text-crit size-3.5 shrink-0'
                            aria-label='Important'
                          />
                        )}
                        <span className={cn('truncate text-sm', !m.lu && 'font-medium')}>
                          {m.sujet || '(sans objet)'}
                        </span>
                        {m.pieceJointe && (
                          <Icons.paperclip
                            className='text-muted-foreground size-3.5 shrink-0'
                            aria-label='Pièce jointe'
                          />
                        )}
                      </span>
                      <span className='text-muted-foreground line-clamp-1 text-xs group-open:hidden'>
                        {m.apercu}
                      </span>
                    </span>
                  </summary>
                  {m.apercu && (
                    <p className='text-muted-foreground px-9 pb-3 text-xs whitespace-pre-line sm:px-10'>
                      {m.apercu}
                      {m.apercu.length >= 400 && '…'}
                    </p>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
