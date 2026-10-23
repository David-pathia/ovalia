import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { createClient } from '@/lib/supabase/server';
import { STATUTS_BIEN, TYPES_BIEN, libelle } from '@/lib/biens/options';

export const metadata: Metadata = { title: 'Biens' };

type Row = {
  id: string;
  type: string;
  statut: string;
  ville: string | null;
  code_postal: string | null;
  surface: number | null;
  surface_terrain: number | null;
  pieces: number | null;
  chambres: number | null;
  annee_construction: number | null;
  prix_bien: number | null;
  created_at: string;
  bien_analyses: { synthese: string | null; points_forts: string[]; details: { a_verifier?: { traite?: boolean }[] } }[];
  bien_contacts: { role: string; contacts: { nom: string; prenom: string | null } | null }[];
};

const fmt = new Intl.NumberFormat('fr-FR');

export default async function BiensPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('biens')
    .select(
      'id, type, statut, ville, code_postal, surface, surface_terrain, pieces, chambres, annee_construction, prix_bien, created_at, bien_analyses(synthese, points_forts, details), bien_contacts(role, contacts(nom, prenom))'
    )
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'bien_analyses', ascending: false })
    .limit(1, { referencedTable: 'bien_analyses' });

  const biens = (data ?? []) as unknown as Row[];

  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='mb-5 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sauge text-[11px] font-semibold tracking-[0.16em] uppercase'>Portefeuille</p>
          <h1 className='font-display mt-1 text-3xl font-extrabold'>Biens</h1>
        </div>
        <Button className='h-9 font-semibold' nativeButton={false} render={<Link href='/dashboard/saisie' />}>
          <Icons.sparkles /> Saisie rapide
        </Button>
      </header>

      {error && (
        <p role='alert' className='text-crit text-sm'>
          Impossible de charger les biens. Rechargez la page.
        </p>
      )}

      {!error && biens.length === 0 && (
        <div className='bg-card mx-auto mt-10 max-w-md rounded-2xl border p-8 text-center'>
          <Icons.bien className='text-sauge mx-auto mb-3 size-8' aria-hidden='true' />
          <h2 className='font-display text-xl font-extrabold'>Aucun bien pour l’instant</h2>
          <p className='text-muted-foreground mt-2 text-sm'>
            Collez votre première note d’estimation dans la saisie rapide : la fiche se remplit toute seule.
          </p>
        </div>
      )}

      <ul className='grid gap-4 lg:grid-cols-2'>
        {biens.map((b) => {
          const analyse = b.bien_analyses[0];
          const vendeur = b.bien_contacts.find((c) => c.role === 'vendeur')?.contacts;
          const aVerifier = analyse?.details?.a_verifier?.filter((q) => !q.traite).length ?? 0;
          return (
            <li key={b.id} className='min-w-0'>
              <Link
                href={`/dashboard/biens/${b.id}`}
                className='bg-card hover:border-cuivre/50 focus-visible:ring-ring block h-full rounded-2xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:p-5'
              >
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='font-semibold'>
                    {libelle(TYPES_BIEN, b.type)}
                    {b.pieces ? ` ${b.pieces} pièces` : ''}
                    {b.surface ? ` · ${fmt.format(b.surface)} m²` : ''}
                    {b.surface_terrain ? ` · terrain ${fmt.format(b.surface_terrain)} m²` : ''}
                  </p>
                  <p className='text-muted-foreground text-[12.5px]'>
                    {[b.code_postal, b.ville].filter(Boolean).join(' ') || 'Ville à compléter'}
                    {b.annee_construction ? ` · ${b.annee_construction}` : ''}
                    {vendeur ? ` · ${[vendeur.prenom, vendeur.nom].filter(Boolean).join(' ')}` : ''}
                  </p>
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  <span className='bg-sauge/15 text-sauge rounded-full px-2 py-0.5 text-[11px] font-semibold'>
                    {libelle(STATUTS_BIEN, b.statut)}
                  </span>
                  {aVerifier > 0 && (
                    <span className='bg-cuivre/15 text-cuivre rounded-full px-2 py-0.5 text-[11px] font-semibold'>
                      {aVerifier} à vérifier
                    </span>
                  )}
                </div>
              </div>
              {b.prix_bien && (
                <p className='font-display mt-2 text-xl font-extrabold tabular-nums'>{fmt.format(b.prix_bien)} €</p>
              )}
              {analyse?.synthese && <p className='mt-3 line-clamp-3 text-sm'>{analyse.synthese}</p>}
              {analyse?.points_forts?.length ? (
                <div className='mt-3 flex flex-wrap gap-1.5'>
                  {analyse.points_forts.slice(0, 4).map((p) => (
                    <span key={p} className='bg-background/50 rounded-full border px-2.5 py-0.5 text-xs'>
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
