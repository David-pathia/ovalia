import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EstimationDetails } from '@/lib/estimation/estimer';
import { fourchetteNetVendeur, prixNetVendeur } from '@/lib/estimation/prix';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import {
  AGENCE_DEFAUT,
  CONCLUSION_DEFAUT,
  CONSEILLER_DEFAUT,
  ETAPES_DEFAUT,
  PAGES_AVIS,
  MAX_COMPARABLES_AVIS,
  arrondiPrix,
  cleComparable,
  type Annonce,
  type AvisDetails,
  type InfosAnnonce
} from './types';

export type EstimationAvis = {
  id: string;
  createdAt: string;
  argumentaire: string | null;
  details: EstimationDetails;
};
export type PhotoAvis = { id: string; path: string; url: string | null };
export type VendeurAvis = {
  civilite: string | null;
  nom: string;
  prenom: string | null;
  email: string | null;
  portable: string | null;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function chargerBienPourAvis(supabase: SupabaseClient, bienId: string) {
  const [
    { data: bien },
    { data: pieces },
    { data: liens },
    { data: estimations },
    { data: avis },
    { data: images }
  ] = await Promise.all([
    supabase.from('biens').select('*').eq('id', bienId).maybeSingle(),
    supabase
      .from('bien_pieces')
      .select('nom, longueur, largeur, surface, niveau, exposition, sol, commentaire')
      .eq('bien_id', bienId)
      .order('ordre'),
    supabase
      .from('bien_contacts')
      .select('contacts(civilite, nom, prenom, email, portable)')
      .eq('bien_id', bienId)
      .eq('role', 'vendeur')
      .limit(1),
    supabase
      .from('bien_analyses')
      .select('id, created_at, synthese, details')
      .eq('bien_id', bienId)
      .not('valeur_probable', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('bien_analyses')
      .select('id, details')
      .eq('bien_id', bienId)
      .eq('type', 'avis_valeur')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('bien_images')
      .select('id, storage_path')
      .eq('bien_id', bienId)
      .eq('confidentielle', false)
      .order('ordre')
  ]);
  if (!bien) return null;

  const e = estimations?.[0];
  const estimation: EstimationAvis | null = e
    ? {
        id: e.id,
        createdAt: e.created_at,
        argumentaire: e.synthese,
        details: e.details as EstimationDetails
      }
    : null;

  const chemins = (images ?? []).map((i) => i.storage_path as string);
  const { data: signees } = chemins.length
    ? await supabase.storage.from('biens').createSignedUrls(chemins, 60 * 60)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const photos: PhotoAvis[] = (images ?? []).map((i) => ({
    id: i.id,
    path: i.storage_path,
    url: signees?.find((s) => s.path === i.storage_path)?.signedUrl ?? null
  }));

  return {
    bien,
    pieces: (pieces ?? []).map((p) => ({
      ...p,
      longueur: num(p.longueur),
      largeur: num(p.largeur),
      surface: num(p.surface)
    })),
    vendeur: (liens?.[0]?.contacts ?? null) as unknown as VendeurAvis | null,
    estimation,
    avis: avis?.[0] ? { id: avis[0].id as string, details: avis[0].details as AvisDetails } : null,
    photos
  };
}

export type BienPourAvis = NonNullable<Awaited<ReturnType<typeof chargerBienPourAvis>>>;

export function titreBien(bien: Record<string, unknown>) {
  return [
    libelle(TYPES_BIEN, bien.type as string),
    bien.pieces ? `${bien.pieces} pièces` : null,
    bien.surface ? `${Number(bien.surface).toLocaleString('fr-FR')} m²` : null
  ]
    .filter(Boolean)
    .join(' · ');
}

const triOuNull = (v: unknown) => (v === true || v === false ? v : null);

/** Informations du bien reprises dans les mentions légales de l'annonce. */
export function infosAnnonce(bien: Record<string, unknown>): InfosAnnonce {
  return {
    type: (bien.type as string | null) ?? null,
    dpe: (bien.dpe_classe as string | null) ?? null,
    ges: (bien.ges_classe as string | null) ?? null,
    copropriete: triOuNull(bien.copropriete),
    nbLots: num(bien.nb_lots),
    chargesAnnuelles:
      num(bien.charges_copro_annuelles) ??
      (bien.charges_copro_mensuelles ? Number(bien.charges_copro_mensuelles) * 12 : null),
    procedure: triOuNull(bien.procedure_en_cours)
  };
}

/** Annonce de départ : celle rédigée par l'IA avec l'estimation, sinon un titre simple à compléter. */
function annonceParDefaut(
  bien: Record<string, unknown>,
  ia: EstimationDetails['annonce']
): Annonce {
  const conso = num(bien.consommation_energie_annuelle);
  const titre = [
    libelle(TYPES_BIEN, bien.type as string),
    bien.pieces ? `${bien.pieces} pièces` : null,
    bien.ville ? `à ${bien.ville}` : null
  ]
    .filter(Boolean)
    .join(' ');
  return {
    ton: 'chaleureux',
    titre: ia?.titre ?? titre,
    texte: ia?.texte ?? '',
    pointsForts: ia?.pointsForts ?? [],
    honoraires: 'vendeur',
    depensesEnergie: conso ? `environ ${conso.toLocaleString('fr-FR')} € par an` : ''
  };
}

/** Avis par défaut : repris du dernier avis du bien s'il existe, sinon construit depuis l'estimation. */
export function avisParDefaut(
  donnees: BienPourAvis,
  precedentAgence?: AvisDetails['agence'],
  precedentConseiller?: AvisDetails['conseiller']
): AvisDetails | null {
  const { estimation, vendeur, avis, photos } = donnees;
  if (!estimation) return null;
  const fourchette = fourchetteNetVendeur(estimation.details);
  const tri = [...estimation.details.comparables].sort((a, b) => b.poids - a.poids);
  const neuf: AvisDetails = {
    version: 1,
    estimationId: estimation.id,
    dateAvis: new Date().toISOString().slice(0, 10),
    destinataire: {
      civilite: vendeur?.civilite ?? '',
      nom: vendeur?.nom ?? '',
      prenom: vendeur?.prenom ?? ''
    },
    // Le conseiller est repris d'un avis à l'autre ; les avis antérieurs à la photo de couverture repartent du profil par défaut.
    conseiller:
      precedentConseiller?.accroche !== undefined ? precedentConseiller : CONSEILLER_DEFAUT,
    agence: { ...AGENCE_DEFAUT, ...precedentAgence },
    prix: {
      basse: arrondiPrix(fourchette.basse),
      haute: arrondiPrix(fourchette.haute),
      conseille: prixNetVendeur(estimation.details),
      tauxHonoraires: 0
    },
    textes: {
      introduction:
        'Vous nous avez confié l’estimation de votre bien. Ce dossier présente la valeur de marché que nous retenons et, surtout, les éléments concrets qui la justifient : les ventes réellement conclues dans votre secteur, les caractéristiques de votre bien et notre connaissance du marché local.',
      bien: estimation.argumentaire ?? '',
      conclusion: CONCLUSION_DEFAUT
    },
    comparables: tri.slice(0, 8).map(cleComparable),
    photos: {
      couverture: photos[0]?.id ?? null,
      bien: photos.slice(1, 5).map((p) => p.id)
    },
    pages: Object.fromEntries(PAGES_AVIS.map(([k]) => [k, true])) as AvisDetails['pages'],
    annonce: annonceParDefaut(donnees.bien, estimation.details.annonce),
    etapes: ETAPES_DEFAUT,
    analyse: estimation.details.synthese ?? { pointsForts: [], vigilance: [], cibles: [] }
  };
  if (!avis) return neuf;
  // Un avis existant garde ses réglages (les avis antérieurs à l'annonce la reçoivent ici) ;
  // s'il portait sur une estimation plus ancienne, prix et comparables sont repris de la nouvelle.
  const garde: AvisDetails = {
    ...avis.details,
    pages: { ...neuf.pages, ...avis.details.pages },
    annonce: avis.details.annonce?.texte.trim() ? avis.details.annonce : neuf.annonce,
    etapes: avis.details.etapes ?? neuf.etapes,
    conseiller:
      avis.details.conseiller.accroche === undefined ? neuf.conseiller : avis.details.conseiller,
    agence: { ...AGENCE_DEFAUT, ...avis.details.agence },
    // Synthèse : reprise de l'estimation tant que le conseiller n'en a pas rédigé.
    analyse:
      avis.details.analyse?.pointsForts.length || avis.details.analyse?.vigilance.length
        ? avis.details.analyse
        : neuf.analyse
  };
  // Un seul prix net vendeur par bien : celui de l'estimation (estimé ou retenu par le conseiller), sans honoraires.
  garde.prix = { ...garde.prix, conseille: prixNetVendeur(estimation.details), tauxHonoraires: 0 };
  if (garde.prix.conseille < garde.prix.basse || garde.prix.conseille > garde.prix.haute) {
    garde.prix = { ...garde.prix, basse: neuf.prix.basse, haute: neuf.prix.haute };
  }
  if (garde.estimationId === estimation.id) return garde;
  return {
    ...garde,
    estimationId: estimation.id,
    prix: neuf.prix,
    comparables: neuf.comparables,
    textes: { ...garde.textes, bien: neuf.textes.bien }
  };
}

export const MAX_COMPARABLES = MAX_COMPARABLES_AVIS;
