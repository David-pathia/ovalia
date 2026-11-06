import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MODEL, anthropicConfigured, demanderTexte, extraireJson } from '@/lib/ai/client';
import { genererAnnonce, type AnnonceIA } from '@/lib/ai/annonce';
import { genererSynthese, type SyntheseBien } from '@/lib/ai/synthese';
import { recalculerRapprochements } from '@/features/prospects/rapprochements';
import { communesProches, localiser, ventesDvf } from './dvf';
import {
  calculerValeurs,
  densiteSecteur,
  moisDepuis,
  marcheSurSelection,
  selectionnerComparables,
  type Ajustement,
  type Comparable,
  type Marche,
  type Resultat
} from './calcul';

export type EstimationDetails = {
  version: 1;
  source: 'dvf';
  localisation: {
    commune: string;
    codeInsee: string;
    precision: 'adresse' | 'commune';
    lat: number;
    lon: number;
  };
  surface: number;
  marche: Marche;
  comparables: ComparableResume[];
  nbComparables: number;
  /** Prix au m² indexés de toutes les ventes comparables (courbe de positionnement de l'avis de valeur). */
  distributionM2?: number[];
  ajustements: Ajustement[];
  resultat: Resultat;
  /** Toujours 0 : l'estimation ne parle que de net vendeur (champ gardé pour les anciennes estimations). */
  tauxHonoraires: number;
  /** Prix net vendeur saisi par le conseiller quand l'estimation ne lui convient pas. */
  prixRetenu?: number | null;
  /** « manuelle » : ventes choisies par le conseiller sur la page Marché (identifiants DVF dans `ventesIds`). */
  selection?: 'auto' | 'manuelle';
  ventesIds?: string[];
  strategie: string | null;
  iaErreur: string | null;
  /** Points forts, points de vigilance et cible acquéreur (avis de valeur). */
  synthese?: SyntheseBien | null;
  /** Ancienneté maximale des ventes comparables, en années (3 ; 5 pour les anciennes estimations). */
  periodeAns?: number;
  /** Projet d'annonce (ton chaleureux) rédigé avec l'estimation, repris par l'avis de valeur. */
  annonce?: AnnonceIA | null;
};

export type ComparableResume = Pick<
  Comparable,
  | 'id'
  | 'lat'
  | 'lon'
  | 'date'
  | 'prix'
  | 'surface'
  | 'pieces'
  | 'terrain'
  | 'dependances'
  | 'adresse'
  | 'commune'
  | 'distanceKm'
  | 'prixM2'
  | 'prixM2Indexe'
  | 'poids'
>;

export type EstimationResult = { ok: true; analyseId: string } | { ok: false; error: string };

const AjustementsSchema = z.object({
  ajustements: z.array(
    z.object({
      libelle: z.string(),
      pourcentage: z.number(),
      justification: z.string()
    })
  ),
  argumentaire: z.string(),
  strategie: z.string()
});

const SYSTEM = `Tu es l'expert en estimation d'une agence Laforêt (Roanne, Loire).
On te donne un bien et une analyse du marché tirée des ventes notariées DVF (ventes réelles, prix net hors frais de notaire).
Le prix au m² DVF ne tient pas compte de l'état, du DPE, du chauffage, des annexes ni de la qualité du bien : c'est ton rôle de proposer des ajustements.

Règles
- Propose entre 0 et 6 ajustements en pourcentage de la valeur de marché, chacun entre -15 et +15, total entre -25 et +25.
- Un ajustement ne se justifie que par une information présente dans la fiche (chauffage ancien, DPE, isolation, garage, terrain plus grand ou plus petit que les comparables, travaux, exposition…). N'ajuste pas ce que les comparables intègrent déjà (surface, nombre de pièces, localisation).
- Sois prudent si une information manque : signale-la dans l'argumentaire plutôt que d'inventer un ajustement.
- L'argumentaire (5 à 8 phrases) est destiné à l'avis de valeur remis au vendeur : ton professionnel, factuel, chiffres DVF à l'appui (prix au m² médian, nombre de ventes, période), sans jargon.
- La stratégie (2 à 4 phrases) s'adresse au conseiller : prix de présentation, marge de négociation, arguments à mettre en avant, points à faire valider (DPE, travaux).
- Écris en français.

Réponds uniquement avec un objet JSON valide, sans texte autour :
${JSON.stringify(z.toJSONSchema(AjustementsSchema))}`;

function resumeComparable(c: Comparable): ComparableResume {
  return {
    id: c.id,
    lat: c.lat,
    lon: c.lon,
    date: c.date,
    prix: c.prix,
    surface: c.surface,
    pieces: c.pieces,
    terrain: c.terrain,
    dependances: c.dependances,
    adresse: c.adresse,
    commune: c.commune,
    distanceKm: c.distanceKm === null ? null : Math.round(c.distanceKm * 10) / 10,
    prixM2: Math.round(c.prixM2),
    prixM2Indexe: Math.round(c.prixM2Indexe),
    poids: Math.round(c.poids * 100) / 100
  };
}

async function proposerAjustements(contexte: string) {
  if (!anthropicConfigured())
    return { erreur: 'Clé IA absente : aucun ajustement qualitatif.' } as const;
  try {
    const { stopReason, texte } = await demanderTexte(SYSTEM, contexte);
    if (stopReason === 'refusal')
      return { erreur: 'L’IA a refusé de proposer des ajustements.' } as const;
    const parsed = AjustementsSchema.safeParse(extraireJson(texte));
    if (!parsed.success)
      return {
        erreur: 'Réponse IA illisible : aucun ajustement appliqué.'
      } as const;
    const ajustements = parsed.data.ajustements.slice(0, 6).map((a) => ({
      ...a,
      pourcentage: Math.max(-15, Math.min(15, Math.round(a.pourcentage * 10) / 10))
    }));
    return {
      ajustements,
      argumentaire: parsed.data.argumentaire,
      strategie: parsed.data.strategie
    } as const;
  } catch (error) {
    console.error('estimation.ia', error);
    return {
      erreur: 'Le service IA n’a pas répondu : aucun ajustement appliqué.'
    } as const;
  }
}

/** Estime un bien à partir des ventes DVF et enregistre le résultat dans `bien_analyses`. */
export async function estimerBien(
  supabase: SupabaseClient,
  bienId: string,
  options: { ventesIds?: string[] } = {}
): Promise<EstimationResult> {
  const [{ data: bien }, { data: pieces }, { data: lectures }, { data: precedente }] =
    await Promise.all([
      supabase.from('biens').select('*').eq('id', bienId).maybeSingle(),
      supabase
        .from('bien_pieces')
        .select('nom, surface, niveau')
        .eq('bien_id', bienId)
        .order('ordre'),
      supabase
        .from('bien_analyses')
        .select('points_forts, points_faibles, note_source')
        .eq('bien_id', bienId)
        .is('valeur_probable', null)
        .neq('type', 'avis_valeur')
        .order('created_at', { ascending: false })
        .limit(1),
      // Le prix net vendeur saisi par le conseiller est conservé d'une estimation à l'autre.
      supabase
        .from('bien_analyses')
        .select('details')
        .eq('bien_id', bienId)
        .not('valeur_probable', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
    ]);
  if (!bien) return { ok: false, error: 'Bien introuvable.' };
  if (bien.type !== 'maison' && bien.type !== 'appartement') {
    return {
      ok: false,
      error: 'L’estimation DVF ne couvre pour l’instant que les maisons et les appartements.'
    };
  }
  const surface = Number(bien.surface);
  if (!(surface > 0))
    return {
      ok: false,
      error: 'Renseignez la surface pour lancer l’estimation.'
    };

  const loc = await localiser(bien);
  if (!loc)
    return {
      ok: false,
      error: 'Renseignez la ville ou le code postal pour lancer l’estimation.'
    };

  // Ventes des 3 dernières années uniquement. En secteur rural, la recherche peut s'étendre jusqu'à 20 km.
  const charger = async (rayon: number, max: number) =>
    (
      await ventesDvf(
        (await communesProches(loc, rayon)).slice(0, max).map((c) => c.code),
        3
      )
    ).filter((v) => moisDepuis(v.date) <= 36);
  let ventes = await charger(8, 12);
  if (densiteSecteur(ventes, loc, bien.type) === 'rural') ventes = await charger(20, 30);
  const bienEstime = {
    type: bien.type,
    surface,
    pieces: bien.pieces,
    terrain: bien.surface_terrain ? Number(bien.surface_terrain) : null
  };
  const manuelle = Boolean(options.ventesIds?.length);
  let selection;
  if (manuelle) {
    const ids = new Set(options.ventesIds);
    // Les ventes choisies peuvent venir d'une commune plus éloignée que le rayon automatique.
    const manquantes = options.ventesIds!.length - ventes.filter((v) => ids.has(v.id)).length;
    const pool =
      manquantes > 0
        ? [
            ...ventes,
            ...(await ventesDvf(
              (await communesProches(loc, 25)).slice(0, 40).map((c) => c.code),
              3
            ))
          ]
        : ventes;
    // Même règle qu'en automatique : seules les ventes des 3 dernières années sont retenues.
    const choisies = [
      ...new Map(
        pool.filter((v) => ids.has(v.id) && moisDepuis(v.date) <= 36).map((v) => [v.id, v])
      ).values()
    ];
    selection = marcheSurSelection(bienEstime, choisies, ventes, loc, loc.precision === 'adresse');
    if (!selection) return { ok: false, error: 'Choisissez au moins 3 ventes comparables.' };
  } else {
    selection = selectionnerComparables(bienEstime, ventes, loc, loc.precision === 'adresse');
    if (!selection) {
      return {
        ok: false,
        error: `Pas assez de ventes comparables autour de ${loc.commune} pour estimer ce bien.`
      };
    }
  }
  const { comparables, marche } = selection;
  const top = comparables.slice(0, manuelle ? 60 : 15).map(resumeComparable);

  const lecture = lectures?.[0];
  const contexte = JSON.stringify(
    {
      bien: {
        type: bien.type,
        surface,
        pieces: bien.pieces,
        chambres: bien.chambres,
        terrain_m2: bien.surface_terrain,
        annee_construction: bien.annee_construction,
        etage: bien.etage,
        ascenseur: bien.ascenseur,
        dpe: bien.dpe_classe,
        ges: bien.ges_classe,
        exterieurs: bien.exterieurs,
        etat_general: bien.etat_general,
        taxe_fonciere: bien.taxe_fonciere,
        charges_copro_mensuelles: bien.charges_copro_mensuelles,
        complements: bien.laforet_extra,
        pieces_detail: pieces,
        notes: bien.notes,
        commune: loc.commune
      },
      lecture_conseiller: lecture ?? null,
      marche_dvf: {
        prix_m2_median_indexe: Math.round(marche.prixM2),
        prix_m2_premier_quartile: Math.round(marche.prixM2Bas),
        prix_m2_troisieme_quartile: Math.round(marche.prixM2Haut),
        valeur_de_marche_brute: Math.round(surface * marche.prixM2),
        nombre_comparables: comparables.length,
        criteres: marche.criteres,
        tendance_annuelle_pct:
          marche.tendanceAnnuelle === null ? null : Math.round(marche.tendanceAnnuelle * 1000) / 10,
        confiance: marche.confiance,
        terrain_median_comparables: Math.round(
          [...comparables.map((c) => c.terrain)].sort((a, b) => a - b)[
            Math.floor(comparables.length / 2)
          ] ?? 0
        ),
        exemples: top.slice(0, 10)
      }
    },
    null,
    1
  );

  // L'annonce ne dépend pas du marché : elle est rédigée en même temps que les ajustements.
  const piecesIa = (pieces ?? []).map((p) => ({
    nom: p.nom,
    surface: p.surface === null ? null : Number(p.surface)
  }));
  const [ia, annonce, synthese] = await Promise.all([
    proposerAjustements(contexte),
    genererAnnonce(
      bien,
      (pieces ?? []).map((p) => ({
        nom: p.nom,
        surface: p.surface === null ? null : Number(p.surface),
        niveau: p.niveau
      }))
    ),
    genererSynthese(bien, piecesIa)
  ]);
  const ajustements: Ajustement[] = 'erreur' in ia ? [] : ia.ajustements;
  const resultat = calculerValeurs(surface, marche, ajustements);

  const details: EstimationDetails = {
    version: 1,
    source: 'dvf',
    localisation: {
      commune: loc.commune,
      codeInsee: loc.codeInsee,
      precision: loc.precision,
      lat: loc.lat,
      lon: loc.lon
    },
    surface,
    marche,
    comparables: top,
    nbComparables: comparables.length,
    distributionM2: comparables.map((c) => Math.round(c.prixM2Indexe)),
    ajustements,
    resultat,
    tauxHonoraires: 0,
    prixRetenu: (precedente?.[0]?.details as EstimationDetails | undefined)?.prixRetenu ?? null,
    selection: manuelle ? 'manuelle' : 'auto',
    ventesIds: manuelle ? comparables.map((c) => c.id) : undefined,
    strategie: 'erreur' in ia ? null : ia.strategie,
    iaErreur: 'erreur' in ia ? (ia.erreur ?? null) : null,
    annonce: annonce.ok ? annonce.annonce : null,
    synthese: synthese.ok ? synthese.synthese : null,
    periodeAns: 3
  };

  const { data: analyse, error } = await supabase
    .from('bien_analyses')
    .insert({
      bien_id: bienId,
      type: 'estimation',
      valeur_basse: resultat.valeurBasse,
      valeur_probable: resultat.valeurProbable,
      valeur_haute: resultat.valeurHaute,
      prix_m2: resultat.prixM2,
      synthese: 'erreur' in ia ? null : ia.argumentaire,
      details,
      modele: 'erreur' in ia ? 'dvf' : `dvf + ${MODEL}`
    })
    .select('id')
    .single();
  if (error || !analyse) {
    console.error('bien_analyses.insert estimation', error);
    return { ok: false, error: 'L’estimation n’a pas pu être enregistrée.' };
  }

  if (loc.precision === 'adresse' && bien.latitude === null) {
    await supabase.from('biens').update({ latitude: loc.lat, longitude: loc.lon }).eq('id', bienId);
  }
  // Le prix ayant pu changer, les rapprochements du bien sont recalculés.
  await recalculerRapprochements(supabase, { bienIds: [bienId] }).catch((e) => console.error('rapprochements.estimation', e));
  return { ok: true, analyseId: analyse.id as string };
}

/** Recalcule les valeurs après modification des ajustements par le conseiller. */
export function recalculer(
  details: EstimationDetails,
  ajustements: Ajustement[]
): EstimationDetails {
  return {
    ...details,
    ajustements,
    resultat: calculerValeurs(details.surface, details.marche, ajustements)
  };
}
