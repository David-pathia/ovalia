import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ImportTableau } from '@/features/prospects/components/import-tableau';
import { resumeProjet, type ProjetImport } from '@/features/prospects/types';
import { SOURCE_IMPORT } from '@/features/prospects/import';

export const metadata: Metadata = { title: 'Prospects' };
// L'import lit le fichier avec l'IA (jusqu'à une minute ou deux pour une centaine de lignes).
export const maxDuration = 300;

type Ligne = {
  id: string;
  nom: string;
  portable: string | null;
  archive: boolean;
  importe_le: string | null;
  projets: (Pick<
    ProjetImport,
    'types_bien' | 'budget_max' | 'chambres_min' | 'surface_min' | 'zone' | 'communes' | 'criteres'
  > & {
    id: string;
    informations: string | null;
    date_contact: string | null;
    rapprochements: { id: string; statut: string }[];
  })[];
};

export default async function ProspectsPage({
  searchParams
}: {
  searchParams: Promise<{ archives?: string }>;
}) {
  const { archives } = await searchParams;
  const voirArchives = archives === '1';
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contacts')
    .select(
      'id, nom, portable, archive, importe_le, projets(id, types_bien, budget_max, chambres_min, surface_min, zone, communes, criteres, informations, date_contact, rapprochements(id, statut))'
    )
    .eq('source', SOURCE_IMPORT)
    .eq('archive', voirArchives)
    .order('nom');
  const prospects = (data ?? []) as unknown as Ligne[];
  const dernierImport = prospects
    .map((p) => p.importe_le)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className='flex flex-1 flex-col gap-5 px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header>
        <h1 className='font-display text-3xl font-extrabold'>Prospects acquéreurs</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          {voirArchives
            ? `${prospects.length} prospect(s) archivé(s)`
            : `${prospects.length} prospect(s) actif(s)`}
          {dernierImport &&
            ` · dernier import le ${new Date(dernierImport).toLocaleDateString('fr-FR')}`}{' '}
          ·{' '}
          <Link
            href={voirArchives ? '/dashboard/prospects' : '/dashboard/prospects?archives=1'}
            className='underline underline-offset-4'
          >
            {voirArchives ? 'voir les actifs' : 'voir les archivés'}
          </Link>{' '}
          ·{' '}
          <Link href='/dashboard/rapprochements' className='underline underline-offset-4'>
            rapprochements
          </Link>
        </p>
      </header>

      {!voirArchives && <ImportTableau />}

      {error ? (
        <p className='text-crit text-sm'>
          {error.code === '42703'
            ? 'Exécutez d’abord la migration « prospects » dans Supabase (SQL Editor).'
            : 'Lecture des prospects impossible.'}
        </p>
      ) : prospects.length === 0 ? (
        <p className='text-muted-foreground text-sm'>
          {voirArchives
            ? 'Aucun prospect archivé.'
            : 'Aucun prospect : importez le tableau de pilotage.'}
        </p>
      ) : (
        <ul className='bg-card divide-y rounded-2xl border'>
          {prospects.map((p) => {
            const projet = p.projets[0];
            const rapp = projet?.rapprochements ?? [];
            const aContacter = rapp.filter((r) => r.statut === 'nouveau').length;
            return (
              <li key={p.id} className='flex flex-wrap items-start justify-between gap-3 px-4 py-3'>
                <div className='min-w-0'>
                  <p className='font-medium'>
                    {p.nom}
                    {p.portable && (
                      <span className='text-muted-foreground ml-2 text-xs font-normal tabular-nums'>
                        {p.portable}
                      </span>
                    )}
                  </p>
                  <p className='text-muted-foreground text-xs'>{resumeProjet(projet ?? null)}</p>
                  {projet?.informations && (
                    <p className='text-muted-foreground mt-0.5 text-xs italic'>
                      « {projet.informations} »
                    </p>
                  )}
                </div>
                <div className='text-right text-xs'>
                  {rapp.length > 0 ? (
                    <Link
                      href='/dashboard/rapprochements'
                      className='text-cuivre font-semibold hover:underline'
                    >
                      {rapp.length} bien(s) correspondant(s)
                      {aContacter ? ` · ${aContacter} à contacter` : ''}
                    </Link>
                  ) : (
                    <span className='text-muted-foreground'>Aucun bien correspondant</span>
                  )}
                  {projet?.date_contact && (
                    <p className='text-muted-foreground'>
                      contact du {new Date(projet.date_contact).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
