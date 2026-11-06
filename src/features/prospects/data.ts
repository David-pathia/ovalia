import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import type { DetailCritere } from '@/lib/rapprochement/score';
import type { RapprochementVue } from './components/rapprochements-liste';

type LigneRapprochement = {
  id: string;
  score: number;
  statut: RapprochementVue['statut'];
  details: DetailCritere[];
  prix_compare: number | null;
  bien_id: string;
  projets: {
    budget_max: number | null;
    informations: string | null;
    contacts: { nom: string; portable: string | null; archive: boolean } | null;
  } | null;
  biens?: {
    id: string;
    type: string;
    pieces: number | null;
    surface: number | null;
    ville: string | null;
  } | null;
};

/** Rapprochements d'un bien (ou de tous les biens), du meilleur score au moins bon, prospects archivés exclus. */
export async function chargerRapprochements(
  supabase: SupabaseClient,
  bienId?: string
): Promise<RapprochementVue[]> {
  let q = supabase
    .from('rapprochements')
    .select(
      'id, score, statut, details, prix_compare, bien_id, projets(budget_max, informations, contacts(nom, portable, archive)), biens(id, type, pieces, surface, ville)'
    )
    .order('score', { ascending: false })
    .limit(bienId ? 200 : 1000);
  if (bienId) q = q.eq('bien_id', bienId);
  const { data } = await q;
  return ((data ?? []) as unknown as LigneRapprochement[])
    .filter((r) => r.projets?.contacts && !r.projets.contacts.archive)
    .map((r) => ({
      id: r.id,
      score: r.score,
      statut: r.statut,
      details: r.details ?? [],
      prixCompare: r.prix_compare,
      prospect: {
        nom: r.projets!.contacts!.nom,
        telephone: r.projets!.contacts!.portable,
        budgetMax: r.projets!.budget_max,
        informations: r.projets!.informations
      },
      bien: r.biens
        ? {
            id: r.biens.id,
            titre: [
              libelle(TYPES_BIEN, r.biens.type),
              r.biens.pieces ? `${r.biens.pieces} p.` : null,
              r.biens.surface ? `${Number(r.biens.surface)} m²` : null
            ]
              .filter(Boolean)
              .join(' · '),
            ville: r.biens.ville
          }
        : undefined
    }));
}
