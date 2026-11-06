import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AvisEditor } from '@/features/avis/components/avis-editor';
import { avisParDefaut, chargerBienPourAvis, infosAnnonce, titreBien } from '@/features/avis/data';
import type { AvisDetails } from '@/features/avis/types';

export const metadata: Metadata = { title: 'Avis de valeur' };

export default async function AvisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const donnees = await chargerBienPourAvis(supabase, id);
  if (!donnees) notFound();

  // L'agence du dernier avis (tous biens confondus) sert de modèle pour les suivants.
  const { data: dernier } = await supabase
    .from('bien_analyses')
    .select('details')
    .eq('type', 'avis_valeur')
    .order('created_at', { ascending: false })
    .limit(1);
  const agence = (dernier?.[0]?.details as AvisDetails | undefined)?.agence;
  const initial = avisParDefaut(donnees, user, agence);
  const { bien, estimation } = donnees;

  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='mb-5'>
        <Link
          href={`/dashboard/biens/${id}`}
          className='text-muted-foreground hover:text-foreground text-xs'
        >
          ← Retour à la fiche
        </Link>
        <h1 className='font-display mt-1 text-3xl font-extrabold'>Avis de valeur</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          {titreBien(bien)} ·{' '}
          {[bien.adresse, bien.code_postal, bien.ville].filter(Boolean).join(' ')}
        </p>
      </header>
      {!initial || !estimation ? (
        <div className='bg-card max-w-xl rounded-2xl border p-6'>
          <h2 className='font-display text-xl font-extrabold'>Estimation nécessaire</h2>
          <p className='text-muted-foreground mt-2 text-sm'>
            L’avis de valeur s’appuie sur l’estimation DVF du bien. Lancez-la depuis la fiche, puis
            revenez ici.
          </p>
          <Link
            href={`/dashboard/biens/${id}`}
            className='mt-4 inline-block text-sm underline underline-offset-4'
          >
            Ouvrir la fiche du bien
          </Link>
        </div>
      ) : (
        <AvisEditor
          bienId={id}
          ownerId={user.id}
          initial={initial}
          comparables={estimation.details.comparables}
          photosInitiales={donnees.photos.map((p) => ({
            id: p.id,
            url: p.url
          }))}
          suggestion={{
            basse: estimation.details.resultat.valeurBasse,
            haute: estimation.details.resultat.valeurHaute,
            conseille: estimation.details.resultat.prixConseille
          }}
          infos={infosAnnonce(bien)}
        />
      )}
    </div>
  );
}
