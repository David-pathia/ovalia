import type { Metadata } from 'next';
import { Icons } from '@/components/icons';
import { anthropicConfigured } from '@/lib/ai/client';
import {
  ErreurTypefully,
  TYPEFULLY_APP,
  compteLinkedin,
  listerPosts,
  typefullyConfigure,
  type CompteLinkedin,
  type PostTypefully
} from '@/lib/typefully';
import { Panel } from '@/features/today/components/panel';
import { Atelier } from '@/features/linkedin/components/atelier';
import { SupprimerPost } from '@/features/linkedin/components/supprimer-post';

export const metadata: Metadata = { title: 'LinkedIn' };
export const maxDuration = 120;

const date = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });

function ListePosts({
  posts,
  vide,
  quand,
  supprimable
}: {
  posts: PostTypefully[];
  vide: string;
  quand: (p: PostTypefully) => string | null;
  supprimable?: boolean;
}) {
  if (posts.length === 0) return <p className='text-muted-foreground text-sm'>{vide}</p>;
  return (
    <ul className='divide-y'>
      {posts.map((p) => {
        const q = quand(p);
        const lien = p.lienLinkedin ?? p.lienTypefully;
        return (
          <li key={p.id} className='flex items-start gap-3 py-2.5'>
            <div className='min-w-0 flex-1'>
              {q && <p className='text-cuivre text-xs font-semibold tabular-nums'>{date(q)}</p>}
              <p className='line-clamp-2 text-sm whitespace-pre-line'>{p.texte}</p>
            </div>
            {lien && (
              <a
                href={lien}
                target='_blank'
                rel='noreferrer'
                className='text-muted-foreground hover:text-foreground mt-1 shrink-0'
                aria-label={p.lienLinkedin ? 'Voir sur LinkedIn' : 'Ouvrir dans Typefully'}
              >
                <Icons.externalLink className='size-4' />
              </a>
            )}
            {supprimable && <SupprimerPost id={p.id} />}
          </li>
        );
      })}
    </ul>
  );
}

export default async function LinkedinPage() {
  const configure = typefullyConfigure();
  let compte: CompteLinkedin | null = null;
  let programmes: PostTypefully[] = [];
  let brouillons: PostTypefully[] = [];
  let publies: PostTypefully[] = [];
  let probleme: string | null = null;

  if (configure) {
    try {
      compte = await compteLinkedin();
      [programmes, brouillons, publies] = await Promise.all([
        listerPosts(compte.socialSetId, 'scheduled'),
        listerPosts(compte.socialSetId, 'draft', 10),
        listerPosts(compte.socialSetId, 'published', 10)
      ]);
    } catch (e) {
      probleme =
        e instanceof ErreurTypefully ? e.message : 'Typefully ne répond pas pour le moment.';
      if (!(e instanceof ErreurTypefully)) console.error('linkedin.page', e);
    }
  }

  return (
    <div className='flex flex-1 flex-col gap-5 px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='font-display text-3xl font-extrabold'>LinkedIn</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {compte
              ? `Connecté à Typefully · compte LinkedIn ${compte.nom}`
              : 'Idées, rédaction et planning de vos posts, publiés par Typefully.'}
          </p>
        </div>
        <a
          href={TYPEFULLY_APP}
          target='_blank'
          rel='noreferrer'
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
        >
          Ouvrir Typefully <Icons.externalLink className='size-3.5' />
        </a>
      </header>

      {probleme && (
        <p className='bg-warn/15 text-warn rounded-xl px-4 py-2.5 text-sm'>{probleme}</p>
      )}

      {!configure && (
        <section className='bg-card rounded-2xl border p-5 text-sm'>
          <h2 className='font-display text-[17px] font-semibold'>
            Connexion à Typefully à préparer
          </h2>
          <ol className='text-muted-foreground mt-2 list-decimal space-y-1 pl-5'>
            <li>Dans Typefully, vérifiez que votre compte LinkedIn est bien relié.</li>
            <li>Réglages → API : créez une clé (« API key ») et copiez-la.</li>
            <li>
              Dans Vercel (projet Ovalia → Settings → Environment Variables), ajoutez
              TYPEFULLY_API_KEY avec cette clé, puis redéployez.
            </li>
          </ol>
          <p className='text-muted-foreground mt-2'>
            En attendant, vous pouvez déjà trouver des idées, rédiger et copier vos posts.
          </p>
        </section>
      )}

      <Atelier typefullyPret={Boolean(compte)} iaPrete={anthropicConfigured()} />

      {compte && (
        <div className='grid gap-4 lg:grid-cols-3'>
          <Panel title='Programmés' icon={Icons.calendar} meta={programmes.length || undefined}>
            <ListePosts
              posts={programmes}
              vide='Aucun post programmé.'
              quand={(p) => p.programmeLe}
              supprimable
            />
          </Panel>
          <Panel title='Brouillons' icon={Icons.edit} meta={brouillons.length || undefined}>
            <ListePosts posts={brouillons} vide='Aucun brouillon.' quand={() => null} supprimable />
          </Panel>
          <Panel title='Publiés' icon={Icons.check}>
            <ListePosts
              posts={publies}
              vide='Rien de publié pour l’instant.'
              quand={(p) => p.publieLe}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
