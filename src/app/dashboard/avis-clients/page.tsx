import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { urlPublique } from '@/features/site/url';
import { QUESTIONS_AVIS, type CleNote } from '@/features/avis-clients/questions';
import { CreerInvitation } from '@/features/avis-clients/components/invitation';
import { Moderation, SupprimerInvitation } from '@/features/avis-clients/components/moderation';

export const metadata: Metadata = { title: 'Avis clients' };

type Avis = Record<CleNote, number | null> & {
  id: string;
  prenom: string | null;
  canal: string | null;
  commentaire: string | null;
  publication_autorisee: boolean;
  nom_publication: string | null;
  publication: 'a_valider' | 'publie' | 'refuse';
  repondu_le: string | null;
  created_at: string;
  biens: { type: string; ville: string | null } | null;
};

/** Les n derniers mois (AAAA-MM), du plus ancien au plus récent. */
function derniersMois(n: number) {
  const d = new Date();
  d.setDate(1);
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(d);
    m.setMonth(d.getMonth() - (n - 1 - i));
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
  });
}

const moyenne = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
const note = (n: number | null) =>
  n === null
    ? '—'
    : n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Etoiles({ valeur }: { valeur: number }) {
  return (
    <span className='text-cuivre tracking-tight' aria-label={`${valeur} sur 5`}>
      {'★'.repeat(valeur)}
      <span className='text-muted-foreground/40'>{'★'.repeat(5 - valeur)}</span>
    </span>
  );
}

export default async function AvisClientsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  // Le lien général (QR code) dépose les avis chez le propriétaire du site : le compte de Julien.
  if (user)
    await supabase
      .from('site_config')
      .upsert({ owner_id: user.id }, { onConflict: 'owner_id', ignoreDuplicates: true });

  const [{ data, error }, { data: biens }, base] = await Promise.all([
    supabase
      .from('avis_clients')
      .select('*, biens(type, ville)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('biens')
      .select('id, type, ville, adresse')
      .order('created_at', { ascending: false })
      .limit(200),
    urlPublique()
  ]);
  const tous = (data ?? []) as unknown as Avis[];
  const recus = tous
    .filter((a) => a.repondu_le)
    .sort((a, b) => b.repondu_le!.localeCompare(a.repondu_le!));
  const enAttente = tous.filter((a) => !a.repondu_le);
  const parCritere = QUESTIONS_AVIS.map((q) => ({
    ...q,
    moyenne: moyenne(recus.map((a) => a[q.cle]).filter((n): n is number => n !== null))
  }));
  const globale = moyenne(
    recus.map((a) => moyenne(QUESTIONS_AVIS.map((q) => a[q.cle] ?? 0).filter((n) => n > 0)) ?? 0)
  );
  const recommandent = recus.filter((a) => (a.note_recommandation ?? 0) >= 4).length;
  const aValider = recus.filter(
    (a) => a.publication_autorisee && a.publication === 'a_valider'
  ).length;

  // Évolution : moyenne générale par mois sur les 6 derniers mois.
  const mois = derniersMois(6);
  const evolution = mois.map((m) => {
    const l = recus.filter((a) => a.repondu_le!.startsWith(m));
    return {
      mois: m,
      n: l.length,
      moyenne: moyenne(l.map((a) => moyenne(QUESTIONS_AVIS.map((q) => a[q.cle] ?? 0)) ?? 0))
    };
  });

  const lienGeneral = `${base}/site/avis`;
  const qr = await QRCode.toDataURL(lienGeneral, {
    margin: 1,
    width: 1024,
    color: { dark: '#1f3a8a', light: '#ffffff' }
  });

  return (
    <div className='flex flex-1 flex-col gap-5 px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header>
        <h1 className='font-display text-3xl font-extrabold'>Avis clients</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Questionnaire « Votre avis compte » après visite. Aucun témoignage n’est publié sans
          l’accord du client et votre validation.
        </p>
      </header>

      {error ? (
        <p className='text-crit text-sm'>
          Exécutez d’abord la migration « avis clients » dans Supabase (SQL Editor).
        </p>
      ) : (
        <>
          <section className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {[
              [
                'Avis reçus',
                String(recus.length),
                `${enAttente.length} lien(s) en attente de réponse`
              ],
              [
                'Note moyenne',
                globale === null ? '—' : `${note(globale)} / 5`,
                'tous critères confondus'
              ],
              [
                'Recommandent',
                recus.length ? `${Math.round((recommandent / recus.length) * 100)} %` : '—',
                'note de 4 ou 5 sur la recommandation'
              ],
              ['Témoignages à valider', String(aValider), 'publication autorisée par le client']
            ].map(([l, v, a]) => (
              <div key={l} className='bg-card rounded-2xl border p-4'>
                <p className='text-muted-foreground text-xs'>{l}</p>
                <p className='font-display text-cuivre mt-1 text-3xl font-extrabold tabular-nums'>
                  {v}
                </p>
                <p className='text-muted-foreground mt-1 text-xs'>{a}</p>
              </div>
            ))}
          </section>

          <div className='grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
            <section className='bg-card rounded-2xl border p-4 sm:p-5'>
              <h2 className='font-display text-[17px] font-semibold'>
                Demander un avis après une visite
              </h2>
              <p className='text-muted-foreground mt-1 mb-4 text-xs'>
                Un lien personnel par client : il ne peut répondre qu’une fois.
              </p>
              <CreerInvitation
                base={base}
                biens={(biens ?? []).map((b) => ({
                  id: b.id as string,
                  titre: [libelle(TYPES_BIEN, b.type as string), b.adresse, b.ville]
                    .filter(Boolean)
                    .join(' · ')
                }))}
              />
            </section>
            <section className='bg-card rounded-2xl border p-4 sm:p-5'>
              <h2 className='font-display text-[17px] font-semibold'>Lien général et QR code</h2>
              <p className='text-muted-foreground mt-1 text-xs break-all'>
                Pour les cartes de visite et les panneaux : {lienGeneral}
              </p>
              <div className='mt-3 flex items-center gap-4'>
                {/* eslint-disable-next-line @next/next/no-img-element -- image générée (data URL) */}
                <img
                  src={qr}
                  alt='QR code du questionnaire Votre avis compte'
                  className='size-28 rounded-lg bg-white p-1.5'
                />
                <a
                  href={qr}
                  download='qr-avis-julien-ossedat.png'
                  className='bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold'
                >
                  <Icons.download className='size-4' /> Télécharger
                </a>
              </div>
            </section>
          </div>

          <div className='grid gap-5 lg:grid-cols-2'>
            <section className='bg-card rounded-2xl border p-4 sm:p-5'>
              <h2 className='font-display text-[17px] font-semibold'>Détail par critère</h2>
              <ul className='mt-3 space-y-2.5'>
                {parCritere.map((c) => (
                  <li key={c.cle}>
                    <div className='flex justify-between text-sm'>
                      <span>{c.critere}</span>
                      <span className='font-mono tabular-nums'>{note(c.moyenne)}</span>
                    </div>
                    <div className='bg-muted mt-1 h-2 rounded-full'>
                      <div
                        className='bg-cuivre h-2 rounded-full'
                        style={{ width: `${((c.moyenne ?? 0) / 5) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section className='bg-card rounded-2xl border p-4 sm:p-5'>
              <h2 className='font-display text-[17px] font-semibold'>Évolution sur 6 mois</h2>
              <div className='mt-4 flex h-32 items-end gap-3'>
                {evolution.map((e) => (
                  <div key={e.mois} className='flex flex-1 flex-col items-center gap-1'>
                    <span className='font-mono text-xs tabular-nums'>
                      {e.moyenne === null ? '' : note(e.moyenne)}
                    </span>
                    <div
                      className={cn(
                        'w-full rounded-t-md',
                        e.moyenne === null ? 'bg-muted h-1' : 'bg-sauge'
                      )}
                      style={
                        e.moyenne === null ? undefined : { height: `${(e.moyenne / 5) * 90}px` }
                      }
                    />
                    <span className='text-muted-foreground text-[11px]'>
                      {new Date(`${e.mois}-01`).toLocaleDateString('fr-FR', { month: 'short' })}
                    </span>
                    <span className='text-muted-foreground text-[10px]'>{e.n} avis</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className='bg-card rounded-2xl border p-4 sm:p-5'>
            <h2 className='font-display text-[17px] font-semibold'>Avis reçus</h2>
            {recus.length === 0 ? (
              <p className='text-muted-foreground mt-2 text-sm'>Aucun avis pour le moment.</p>
            ) : (
              <ul className='mt-3 divide-y'>
                {recus.map((a) => (
                  <li key={a.id} className='py-3'>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <div>
                        <p className='font-medium'>
                          {a.prenom ?? (a.canal === 'qr' ? 'Lien général (QR code)' : 'Client')}
                          {a.biens && (
                            <span className='text-muted-foreground font-normal'>
                              {' '}
                              ·{' '}
                              {[libelle(TYPES_BIEN, a.biens.type), a.biens.ville]
                                .filter(Boolean)
                                .join(' ')}
                            </span>
                          )}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          le {new Date(a.repondu_le!).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      {a.publication_autorisee ? (
                        <div className='flex items-center gap-2'>
                          <span
                            className={cn(
                              'rounded-md px-2 py-0.5 text-xs',
                              a.publication === 'publie'
                                ? 'bg-ok/15 text-ok'
                                : a.publication === 'refuse'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-warn/15 text-warn'
                            )}
                          >
                            {a.publication === 'publie'
                              ? 'Témoignage validé'
                              : a.publication === 'refuse'
                                ? 'Non publié'
                                : 'Publication autorisée, à valider'}
                          </span>
                          <Moderation id={a.id} publication={a.publication} />
                        </div>
                      ) : (
                        <span className='text-muted-foreground text-xs'>
                          Publication non autorisée
                        </span>
                      )}
                    </div>
                    <ul className='mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2 lg:grid-cols-5'>
                      {QUESTIONS_AVIS.map((q) => (
                        <li key={q.cle} className='flex justify-between gap-2 lg:block'>
                          <span className='text-muted-foreground text-xs'>{q.critere}</span>{' '}
                          <Etoiles valeur={a[q.cle] ?? 0} />
                        </li>
                      ))}
                    </ul>
                    {a.commentaire && <p className='mt-2 text-sm'>« {a.commentaire} »</p>}
                    {a.publication_autorisee && a.nom_publication && (
                      <p className='text-muted-foreground mt-1 text-xs'>
                        Signature souhaitée : {a.nom_publication}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {enAttente.length > 0 && (
            <section className='bg-card rounded-2xl border p-4 sm:p-5'>
              <h2 className='font-display text-[17px] font-semibold'>
                Liens envoyés, en attente de réponse
              </h2>
              <ul className='mt-3 divide-y'>
                {enAttente.map((a) => (
                  <li key={a.id} className='flex items-center justify-between gap-3 py-2 text-sm'>
                    <span>
                      {a.prenom ?? 'Client'}
                      {a.biens && (
                        <span className='text-muted-foreground'>
                          {' '}
                          ·{' '}
                          {[libelle(TYPES_BIEN, a.biens.type), a.biens.ville]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      )}
                      <span className='text-muted-foreground'>
                        {' '}
                        · envoyé le {new Date(a.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                    <SupprimerInvitation id={a.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
