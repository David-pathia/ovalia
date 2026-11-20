import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  ErreurMicrosoft,
  configMicrosoft,
  derniersMails,
  jetonValide,
  type CompteMicrosoft,
  type MailRecu
} from '@/lib/microsoft/graph';
import { Deconnecter } from '@/features/mails/components/deconnecter';

export const metadata: Metadata = { title: 'Boîte mail' };

const MESSAGES: Record<string, string> = {
  configuration:
    'La connexion Microsoft n’est pas encore configurée (variables MICROSOFT_… et JETONS_CHIFFREMENT_CLE dans Vercel).',
  consentement:
    'Microsoft demande l’accord de l’administrateur informatique Laforêt avant d’autoriser Ovalia à lire la boîte.',
  access_denied: 'La connexion a été annulée ou refusée.',
  etat: 'La connexion a expiré ou a été interrompue. Recommencez.',
  stockage:
    'Impossible d’enregistrer la connexion : la migration « comptes Microsoft » est-elle exécutée ?'
};

function dateCourte(iso: string) {
  const d = new Date(iso);
  const aujourdhui = new Date().toDateString() === d.toDateString();
  return aujourdhui
    ? d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
      })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });
}

function Connecter({ libelle = 'Connecter ma boîte Microsoft' }: { libelle?: string }) {
  return (
    <a
      href='/auth/microsoft'
      className='bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold'
    >
      <Icons.login className='size-4' /> {libelle}
    </a>
  );
}

export default async function MailsPage({
  searchParams
}: {
  searchParams: Promise<{ erreur?: string; detail?: string; connexion?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let compte: CompteMicrosoft | null = null;
  let mails: MailRecu[] = [];
  let probleme: string | null = params.erreur
    ? `${MESSAGES[params.erreur] ?? 'La connexion à Microsoft a échoué.'}${params.detail && !MESSAGES[params.erreur] ? ` (${params.detail})` : ''}`
    : null;
  let reconnecter = false;

  const configure = configMicrosoft() !== null;
  if (configure && user) {
    try {
      const jeton = await jetonValide(supabase, user.id);
      if (jeton) {
        compte = jeton.compte;
        mails = await derniersMails(jeton.accessToken);
      }
    } catch (e) {
      if (e instanceof ErreurMicrosoft && e.code === 'table')
        probleme =
          'Exécutez d’abord la migration « comptes Microsoft » dans Supabase (SQL Editor).';
      else {
        probleme =
          'Microsoft ne répond pas ou la connexion a expiré. Reconnectez la boîte mail pour continuer.';
        reconnecter = true;
      }
    }
  }

  return (
    <div className='flex flex-1 flex-col gap-5 px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='font-display text-3xl font-extrabold'>Boîte mail</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {compte
              ? `Boîte de réception de ${compte.email ?? compte.nom ?? 'votre compte Microsoft'} · lecture seule`
              : 'Votre messagerie Laforêt (Microsoft 365), lue en direct : aucun mail n’est copié dans Ovalia.'}
          </p>
        </div>
        {compte && (
          <div className='flex items-center gap-2'>
            <a
              href='https://outlook.office.com/mail/'
              target='_blank'
              rel='noreferrer'
              className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
            >
              Ouvrir Outlook <Icons.externalLink className='size-3.5' />
            </a>
            <Deconnecter />
          </div>
        )}
      </header>

      {params.connexion === 'ok' && compte && (
        <p className='bg-ok/15 text-ok rounded-xl px-4 py-2.5 text-sm'>Boîte mail connectée.</p>
      )}
      {probleme && (
        <div className='bg-warn/15 text-warn flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm'>
          <span>{probleme}</span>
          {reconnecter && <Connecter libelle='Reconnecter' />}
        </div>
      )}

      {!configure ? (
        <section className='bg-card rounded-2xl border p-5 text-sm'>
          <h2 className='font-display text-[17px] font-semibold'>Connexion à préparer</h2>
          <p className='text-muted-foreground mt-1'>
            Ovalia attend l’application Microsoft (Entra ID) et ses identifiants. Une fois les
            variables ajoutées dans Vercel, un bouton « Connecter ma boîte Microsoft » apparaîtra
            ici.
          </p>
        </section>
      ) : !compte ? (
        !reconnecter && (
          <section className='bg-card flex flex-col items-start gap-3 rounded-2xl border p-5'>
            <h2 className='font-display text-[17px] font-semibold'>
              Connecter votre boîte Laforêt
            </h2>
            <p className='text-muted-foreground text-sm'>
              Vous serez redirigé vers Microsoft pour vous identifier avec votre compte habituel.
              Ovalia ne voit jamais votre mot de passe ; vous pouvez déconnecter la boîte à tout
              moment.
            </p>
            <Connecter />
          </section>
        )
      ) : mails.length === 0 ? (
        <p className='text-muted-foreground text-sm'>Aucun mail dans la boîte de réception.</p>
      ) : (
        <section className='bg-card rounded-2xl border'>
          <ul className='divide-y'>
            {mails.map((m) => (
              <li key={m.id}>
                <a
                  href={m.webLink}
                  target='_blank'
                  rel='noreferrer'
                  className='hover:bg-muted/50 flex gap-3 px-4 py-3 sm:px-5'
                >
                  <span
                    className={cn(
                      'mt-2 size-2 shrink-0 rounded-full',
                      m.isRead ? 'bg-transparent' : 'bg-cuivre'
                    )}
                    aria-label={m.isRead ? undefined : 'Non lu'}
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-baseline justify-between gap-3'>
                      <span className={cn('truncate', !m.isRead && 'font-semibold')}>
                        {m.from?.emailAddress.name ||
                          m.from?.emailAddress.address ||
                          'Expéditeur inconnu'}
                      </span>
                      <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                        {dateCourte(m.receivedDateTime)}
                      </span>
                    </span>
                    <span className='flex items-center gap-1.5'>
                      {m.importance === 'high' && (
                        <Icons.alertCircle
                          className='text-crit size-3.5 shrink-0'
                          aria-label='Important'
                        />
                      )}
                      <span className={cn('truncate text-sm', !m.isRead && 'font-medium')}>
                        {m.subject || '(sans objet)'}
                      </span>
                      {m.hasAttachments && (
                        <Icons.paperclip
                          className='text-muted-foreground size-3.5 shrink-0'
                          aria-label='Pièce jointe'
                        />
                      )}
                    </span>
                    <span className='text-muted-foreground line-clamp-1 text-xs'>
                      {m.bodyPreview}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
