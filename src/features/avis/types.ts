import type { ComparableResume } from '@/lib/estimation/estimer';
import type { TonAnnonce } from '@/lib/ai/annonce-tons';

// Avis de valeur : réglages saisis par le conseiller, enregistrés dans `bien_analyses` (type « avis_valeur »).
// Les chiffres (marché, comparables, ajustements) sont relus dans l'estimation au moment de générer le PDF.

export type Agence = {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  site: string;
  horaires: string;
  mentions: string;
  /** Nombre de portails de diffusion (texte libre, ex. « 11 »). */
  portails: string;
  reseauxSociaux: string;
  /** Engagement de plantation d'arbres : modalités exactes. */
  arbres: string;
  /** Avis clients : note, nombre d'avis, plateforme (vide = rubrique masquée). */
  avisClients: string;
};

export type Conseiller = {
  nom: string;
  titre: string;
  telephone: string;
  email: string;
  /** Phrase de présentation affichée sous la photo, en couverture. */
  accroche: string;
};

export const CONSEILLER_DEFAUT: Conseiller = {
  nom: 'Julien Ossedat',
  titre: 'Accompagnateur de projet de vie',
  telephone: '06 48 94 54 77',
  email: 'roanne@laforet.com',
  accroche:
    'Estimation gratuite et personnalisée sur le Roannais · Achat et vente · Confiance et proximité'
};

// Pages dans l'ordre du dossier ; « Notre avis de valeur » clôt toujours le dossier.
export const PAGES_AVIS = [
  ['agence', 'Le réseau et votre agence Laforêt'],
  ['equipe', 'Une équipe à votre service'],
  ['bien', 'Votre bien'],
  ['cadastre', 'Situation cadastrale'],
  ['secteur', 'Votre secteur'],
  ['comparables', 'Les ventes comparables (DVF)'],
  ['positionnement', 'Le prix de marché'],
  ['ajustements', 'Ajustements et stratégie de prix'],
  ['valeurVerte', 'DPE et assainissement'],
  ['financement', 'Cible acquéreur et financement'],
  ['methode', 'Méthode et sources'],
  ['accompagnement', 'Votre accompagnement Laforêt'],
  ['exclusivite', 'Le mandat exclusif Favoriz'],
  ['annonce', 'Votre future annonce']
] as const;

export type PageAvis = (typeof PAGES_AVIS)[number][0];

export type Annonce = {
  ton: TonAnnonce;
  titre: string;
  texte: string;
  pointsForts: string[];
  honoraires: 'vendeur' | 'acquereur';
  /** Montant estimé des dépenses annuelles d'énergie, tel qu'indiqué sur le DPE (mention obligatoire). */
  depensesEnergie: string;
};

export type Etape = { titre: string; delai: string; texte: string };

export const ETAPES_DEFAUT: Etape[] = [
  {
    titre: 'Signature du mandat',
    delai: 'Jour J',
    texte:
      'Nous fixons ensemble le prix de présentation et la stratégie de mise en vente, et vous choisissez la formule de mandat qui vous convient.'
  },
  {
    titre: 'Dossier et diagnostics',
    delai: 'Semaine 1',
    texte:
      'Nous rassemblons les diagnostics obligatoires et les documents utiles à la vente, pour avancer sereinement et sans mauvaise surprise.'
  },
  {
    titre: 'Photos et annonce',
    delai: 'Semaine 1',
    texte:
      'Un reportage photo soigné et une annonce rédigée pour donner envie dès le premier regard, comme celle que nous vous présentons.'
  },
  {
    titre: 'Mise en ligne',
    delai: 'Semaine 2',
    texte:
      'Votre bien est diffusé sur laforet.com et les principaux portails, et présenté en priorité aux acquéreurs que nous accompagnons déjà.'
  },
  {
    titre: 'Visites',
    delai: 'Semaines 2 à 6',
    texte:
      'Nous organisons les visites avec des acquéreurs dont le projet et le financement sont vérifiés, et nous vous faisons un retour après chacune.'
  },
  {
    titre: 'Offre et compromis',
    delai: 'Dès la bonne offre',
    texte:
      'Nous négocions dans votre intérêt, puis nous vous accompagnons jusqu’au compromis et à la signature de l’acte chez le notaire.'
  }
];

export const MAX_ETAPES = 8;
export const TITRE_ANNONCE_MAX = 70;

export type AvisDetails = {
  version: 1;
  estimationId: string;
  dateAvis: string; // AAAA-MM-JJ
  destinataire: { civilite: string; nom: string; prenom: string };
  conseiller: Conseiller;
  agence: Agence;
  prix: {
    basse: number;
    haute: number;
    conseille: number;
    tauxHonoraires: number;
  };
  textes: { introduction: string; bien: string; conclusion: string };
  comparables: string[]; // clés des comparables retenus (cleComparable), 10 au plus
  photos: { couverture: string | null; bien: string[] }; // identifiants bien_images
  pages: Record<PageAvis, boolean>;
  annonce: Annonce;
  etapes: Etape[];
  analyse: AnalyseBien;
};

export type AnalyseBien = {
  pointsForts: string[];
  vigilance: string[];
  cibles: { profil: string; raison: string }[];
};

export const PROFILS_ACQUEREUR = [
  'Famille',
  'Couple',
  'Primo-accédant',
  'Investisseur',
  'Profession libérale',
  'Retraité',
  'Résidence secondaire'
];

export const CONCLUSION_DEFAUT =
  'Notre ambition est de vous proposer un avis de valeur juste, une stratégie de commercialisation efficace et un accompagnement humain et professionnel jusqu’à la concrétisation de votre projet immobilier.';

export const AGENCE_DEFAUT: Agence = {
  nom: 'Laforêt Roanne',
  adresse: '38 rue Émile Noirot',
  codePostal: '42300',
  ville: 'Roanne',
  telephone: '04 77 23 09 09',
  email: 'roanne@laforet.com',
  site: 'www.laforet.com/roanne',
  horaires: 'Du lundi au vendredi, 9 h - 12 h et 14 h - 18 h',
  mentions:
    'L’Agence Gambetta, SAS au capital de 10 000 €, siège social 38 rue Émile Noirot 42300 Roanne. SIREN 949 374 227, TVA FR60949374227. Agent immobilier et administrateur de biens, carte professionnelle (T) CPI 42012023000000003. Garanties financières transaction et gestion : Allianz, 1 cours Michelet, 92076 Paris La Défense. Chaque agence est une entité juridiquement et financièrement indépendante.',
  portails: '11',
  reseauxSociaux: 'LinkedIn, Facebook, Instagram, X',
  arbres: 'Le réseau Laforêt plante 30 000 arbres chaque année.',
  avisClients: ''
};

export const MAX_COMPARABLES_AVIS = 10;

export function cleComparable(
  c: Pick<ComparableResume, 'date' | 'prix' | 'surface'> & { id?: string }
) {
  return c.id ?? `${c.date}|${c.prix}|${c.surface}`;
}

export const arrondiPrix = (n: number, pas = 5000) => Math.round(n / pas) * pas;

/** Informations du bien nécessaires aux mentions légales de l'annonce. */
export type InfosAnnonce = {
  type: string | null;
  dpe: string | null;
  ges: string | null;
  copropriete: boolean | null;
  nbLots: number | null;
  chargesAnnuelles: number | null;
  procedure: boolean | null;
};

const nbFr = (n: number, d = 0) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: d }).replace(/[\u202f\u2009]/g, '\u00a0');

/** Mentions obligatoires d'une annonce de vente (prix et honoraires, DPE, copropriété, Géorisques). */
export function mentionsAnnonce(
  annonce: Annonce,
  prix: AvisDetails['prix'],
  infos: InfosAnnonce
): string[] {
  const hono = Math.round(prix.conseille * prix.tauxHonoraires);
  const net = prix.conseille - hono;
  const lignes: string[] = [];
  lignes.push(
    annonce.honoraires === 'acquereur'
      ? `Prix : ${nbFr(prix.conseille)}\u00a0€ honoraires inclus, dont ${nbFr((hono / net) * 100, 2)}\u00a0% TTC à la charge de l’acquéreur, soit ${nbFr(net)}\u00a0€ hors honoraires.`
      : `Prix : ${nbFr(prix.conseille)}\u00a0€, honoraires à la charge du vendeur.`
  );
  if (infos.dpe) {
    let dpe = `Classe énergie ${infos.dpe}, classe climat ${infos.ges ?? 'non communiquée'}.`;
    if (annonce.depensesEnergie.trim())
      dpe += ` Montant estimé des dépenses annuelles d’énergie pour un usage standard : ${annonce.depensesEnergie.trim()}.`;
    if (infos.dpe === 'F' || infos.dpe === 'G')
      dpe += ' Logement à consommation énergétique excessive.';
    lignes.push(dpe);
  } else lignes.push('Diagnostic de performance énergétique en cours de réalisation.');
  if (infos.copropriete || infos.type === 'appartement') {
    const parts = ['Bien soumis au statut de la copropriété'];
    if (infos.nbLots) parts.push(`${infos.nbLots} lots`);
    if (infos.chargesAnnuelles)
      parts.push(`charges courantes annuelles moyennes : ${nbFr(infos.chargesAnnuelles)}\u00a0€`);
    if (infos.procedure === true)
      parts.push('procédure en cours (article 29-1 de la loi du 10 juillet 1965)');
    if (infos.procedure === false) parts.push('aucune procédure en cours');
    lignes.push(`${parts.join(', ')}.`);
  }
  lignes.push(
    'Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques : www.georisques.gouv.fr.'
  );
  return lignes;
}

/** Texte complet à coller dans Laforêt Business ou sur un portail. */
export function annonceEnTexte(annonce: Annonce, prix: AvisDetails['prix'], infos: InfosAnnonce) {
  return [
    annonce.titre,
    annonce.texte,
    annonce.pointsForts.filter(Boolean).length
      ? `Points forts :\n${annonce.pointsForts
          .filter(Boolean)
          .map((p) => `- ${p}`)
          .join('\n')}`
      : '',
    mentionsAnnonce(annonce, prix, infos).join('\n')
  ]
    .filter(Boolean)
    .join('\n\n');
}
