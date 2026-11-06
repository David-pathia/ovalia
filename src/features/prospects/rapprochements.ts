import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EstimationDetails } from '@/lib/estimation/estimer';
import { honorairesBareme } from '@/lib/rapprochement/honoraires';
import {
  SCORE_MIN,
  scoreRapprochement,
  type BienRapprochement,
  type CriteresProjet,
  type ProjetRapprochement
} from '@/lib/rapprochement/score';

// Recalcul des rapprochements : chaque bien face à chaque projet de recherche actif.
// Le statut et l'avis saisis par le conseiller sont conservés ; seuls score et détails sont mis à jour.

const NEGATIF = /\b(non|aucun|aucune|sans|pas|neant|néant|rien)\b/i;
const oui = (v: unknown): boolean | null => {
  const t = String(v ?? '').trim();
  if (!t) return null;
  return !NEGATIF.test(t);
};

type Ligne = Record<string, unknown>;

function versBien(
  b: Ligne,
  estimation: EstimationDetails | undefined,
  pieces: Ligne[]
): BienRapprochement {
  const exterieurs = ((b.exterieurs as string[] | null) ?? []).map((x) => x.toLowerCase());
  const net = estimation ? (estimation.prixRetenu ?? estimation.resultat.prixConseille) : null;
  const affiche = b.prix_affiche ? Number(b.prix_affiche) : null;
  // Prix FAI comparé au budget : prix affiché, sinon net vendeur + honoraires de la fiche, sinon net + barème Laforêt.
  const honoFiche = Number(b.hono_vendeur ?? 0) + Number(b.hono_acquereur ?? 0);
  const bareme = net ? honorairesBareme(net) : null;
  const eurs = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;
  const prix = affiche
    ? {
        fai: affiche,
        source: 'affiche' as const,
        detail: `prix affiché de la fiche : ${eurs(affiche)} FAI`
      }
    : net && honoFiche > 0
      ? {
          fai: net + honoFiche,
          source: 'fiche' as const,
          detail: `${eurs(net + honoFiche)} FAI = ${eurs(net)} net vendeur + ${eurs(honoFiche)} d’honoraires (fiche)`
        }
      : net && bareme
        ? {
            fai: net + bareme.montant,
            source: 'bareme' as const,
            detail: `${eurs(net + bareme.montant)} FAI = ${eurs(net)} net vendeur + ${eurs(bareme.montant)} d’honoraires (barème, ${bareme.libelle})`
          }
        : null;
  const terrain =
    b.surface_terrain === null || b.surface_terrain === undefined
      ? null
      : Number(b.surface_terrain);
  const garage = oui(b.garage) ?? (exterieurs.some((x) => x.includes('garage')) ? true : null);
  const exterieur =
    exterieurs.some((x) => /jardin|terrasse|balcon|cour|exterieur|extérieur/.test(x)) ||
    (terrain !== null && terrain > 0)
      ? true
      : b.type === 'appartement' && exterieurs.length
        ? false
        : null;
  const lat = b.latitude ?? estimation?.localisation.lat;
  const lon = b.longitude ?? estimation?.localisation.lon;
  return {
    id: b.id as string,
    type: b.type as string,
    prixFai: prix?.fai ?? null,
    prixSource: prix?.source ?? null,
    prixDetail: prix?.detail ?? null,
    chambres: b.chambres === null || b.chambres === undefined ? null : Number(b.chambres),
    surface: b.surface === null || b.surface === undefined ? null : Number(b.surface),
    terrain,
    codeInsee: estimation?.localisation.codeInsee ?? null,
    point:
      lat !== null && lat !== undefined && lon !== null && lon !== undefined
        ? { lat: Number(lat), lon: Number(lon) }
        : null,
    nbNiveaux: b.nb_niveaux === null || b.nb_niveaux === undefined ? null : Number(b.nb_niveaux),
    chambreRdc: pieces.some(
      (p) => /chambre/i.test(String(p.nom)) && /rdc|rez|^0$/i.test(String(p.niveau ?? ''))
    ),
    garage,
    exterieur,
    piscine: /piscine/i.test(`${b.annexes ?? ''} ${exterieurs.join(' ')}`),
    travauxAPrevoir: oui(b.travaux_a_prevoir)
  };
}

function versProjet(p: Ligne): ProjetRapprochement {
  return {
    id: p.id as string,
    types: (p.types_bien as string[]) ?? [],
    budgetMin: (p.budget_min as number | null) ?? null,
    budgetMax: (p.budget_max as number | null) ?? null,
    chambresMin: (p.chambres_min as number | null) ?? null,
    surfaceMin:
      p.surface_min === null || p.surface_min === undefined ? null : Number(p.surface_min),
    communes: ((p.communes as ProjetRapprochement['communes']) ?? []).filter(
      (c) => c && typeof c.lat === 'number'
    ),
    zone: (p.zone as ProjetRapprochement['zone']) ?? null,
    criteres: (p.criteres as CriteresProjet) ?? {}
  };
}

/** Recalcule les rapprochements (tous les biens, ou seulement ceux indiqués). Renvoie le nombre de rapprochements retenus. */
export async function recalculerRapprochements(
  supabase: SupabaseClient,
  filtre: { bienIds?: string[] } = {}
): Promise<number> {
  let requeteBiens = supabase.from('biens').select('*');
  if (filtre.bienIds?.length) requeteBiens = requeteBiens.in('id', filtre.bienIds);
  const [{ data: biens }, { data: projets }] = await Promise.all([
    requeteBiens,
    supabase
      .from('projets')
      .select('*, contacts(archive)')
      .eq('actif', true)
      .eq('nature', 'recherche')
  ]);
  if (!biens?.length) return 0;
  const ids = biens.map((b) => b.id as string);
  const [{ data: analyses }, { data: pieces }] = await Promise.all([
    supabase
      .from('bien_analyses')
      .select('bien_id, details, created_at')
      .in('bien_id', ids)
      .not('valeur_probable', 'is', null)
      .order('created_at', { ascending: false }),
    supabase.from('bien_pieces').select('bien_id, nom, niveau').in('bien_id', ids)
  ]);
  const estimationDe = new Map<string, EstimationDetails>();
  for (const a of analyses ?? [])
    if (!estimationDe.has(a.bien_id as string))
      estimationDe.set(a.bien_id as string, a.details as EstimationDetails);

  const actifs = (projets ?? [])
    .filter((p) => !(p.contacts as { archive?: boolean } | null)?.archive)
    .map(versProjet);
  const lignes: Ligne[] = [];
  const garder = new Set<string>();
  const maintenant = new Date().toISOString();
  for (const b of biens) {
    const bien = versBien(
      b,
      estimationDe.get(b.id as string),
      (pieces ?? []).filter((p) => p.bien_id === b.id)
    );
    for (const projet of actifs) {
      const r = scoreRapprochement(bien, projet);
      if (!r || r.score < SCORE_MIN) continue;
      garder.add(`${bien.id}|${projet.id}`);
      lignes.push({
        bien_id: bien.id,
        projet_id: projet.id,
        score: r.score,
        details: bien.prixDetail
          ? [{ critere: 'Prix', etat: 'inconnu', texte: bien.prixDetail }, ...r.details]
          : r.details,
        prix_compare: bien.prixFai,
        explication: r.details
          .filter((d) => d.etat === 'ok')
          .map((d) => d.critere)
          .join(', '),
        calcule_le: maintenant
      });
    }
  }
  for (let k = 0; k < lignes.length; k += 500) {
    const { error } = await supabase
      .from('rapprochements')
      .upsert(lignes.slice(k, k + 500), { onConflict: 'bien_id,projet_id' });
    if (error) console.error('rapprochements.upsert', error);
  }
  // Rapprochements devenus caducs : supprimés s'ils n'ont pas encore été traités par le conseiller.
  const { data: existants } = await supabase
    .from('rapprochements')
    .select('id, bien_id, projet_id, statut')
    .in('bien_id', ids);
  const caducs = (existants ?? [])
    .filter((r) => r.statut === 'nouveau' && !garder.has(`${r.bien_id}|${r.projet_id}`))
    .map((r) => r.id as string);
  for (let k = 0; k < caducs.length; k += 200)
    await supabase
      .from('rapprochements')
      .delete()
      .in('id', caducs.slice(k, k + 200));
  return lignes.length;
}
