import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import type { EstimationDetails } from '@/lib/estimation/estimer';
import { MarcheExplorer, type BienCible } from '@/features/marche/components/marche-explorer';
import type { CriteresMarche } from '@/features/marche/types';

export const metadata: Metadata = { title: 'Marché' };
export const maxDuration = 120;

const CRITERES_DEFAUT: CriteresMarche = {
  lieu: 'Roanne',
  rayonKm: 3,
  type: 'maison',
  surfaceMin: null,
  surfaceMax: null,
  piecesMin: null,
  piecesMax: null,
  terrainMin: null,
  terrainMax: null,
  annees: 3
};

const arrondi = (n: number) => Math.round(n / 5) * 5;

export default async function MarchePage({ searchParams }: { searchParams: Promise<{ bien?: string }> }) {
  const { bien: bienId } = await searchParams;
  let criteres = CRITERES_DEFAUT;
  let bien: BienCible | null = null;

  if (bienId && /^[0-9a-f-]{36}$/.test(bienId)) {
    const supabase = await createClient();
    const [{ data: b }, { data: estimations }] = await Promise.all([
      supabase.from('biens').select('id, type, adresse, code_postal, ville, surface, pieces, surface_terrain').eq('id', bienId).maybeSingle(),
      supabase
        .from('bien_analyses')
        .select('details')
        .eq('bien_id', bienId)
        .not('valeur_probable', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
    ]);
    if (b) {
      const surface = b.surface === null ? null : Number(b.surface);
      const terrain = b.surface_terrain === null ? null : Number(b.surface_terrain);
      const d = estimations?.[0]?.details as EstimationDetails | undefined;
      const lieu = [b.adresse, b.code_postal, b.ville].filter(Boolean).join(' ');
      criteres = {
        ...CRITERES_DEFAUT,
        lieu: lieu || CRITERES_DEFAUT.lieu,
        rayonKm: d?.marche.rayonKm && d.selection !== 'manuelle' ? Math.min(12, Math.max(1, d.marche.rayonKm)) : 3,
        type: b.type === 'appartement' ? 'appartement' : b.type === 'maison' ? 'maison' : 'tous',
        surfaceMin: surface ? arrondi(surface * 0.7) : null,
        surfaceMax: surface ? arrondi(surface * 1.3) : null,
        piecesMin: b.pieces ? Math.max(1, b.pieces - 1) : null,
        piecesMax: b.pieces ? b.pieces + 1 : null,
        terrainMin: b.type === 'maison' && terrain ? arrondi(terrain / 3) : null,
        terrainMax: b.type === 'maison' && terrain ? arrondi(terrain * 3) : null,
        annees: 5
      };
      bien = {
        id: b.id,
        titre: [libelle(TYPES_BIEN, b.type), surface ? `${surface.toLocaleString('fr-FR')} m²` : null, b.ville].filter(Boolean).join(' · '),
        surface,
        selectionInitiale: d ? (d.ventesIds ?? d.comparables.map((c) => c.id).filter(Boolean)) : [],
        selectionManuelle: d?.selection === 'manuelle'
      };
    }
  }

  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='mb-5'>
        <p className='text-sauge text-[11px] font-semibold tracking-[0.16em] uppercase'>Expertise</p>
        <h1 className='font-display mt-1 text-3xl font-extrabold'>Marché</h1>
        <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
          Toutes les ventes notariées (DVF) autour d’une adresse : carte, prix au m², évolution, et choix des comparables
          pour une estimation.
        </p>
      </header>
      <MarcheExplorer criteresInitiaux={criteres} bien={bien} />
    </div>
  );
}
