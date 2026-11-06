// Contenus Laforêt du dossier d'estimation : réseau, équipe, engagements, mandat Favoriz, encadrés pédagogiques.
// Chiffres du réseau repris de la plaquette officielle Laforêt (sources indiquées) ; ne pas en ajouter sans source.

export const RESEAU_LAFORET: { valeur: string; libelle: string; source?: string }[] = [
  { valeur: '720', libelle: 'agences en France' },
  { valeur: '4 800', libelle: 'professionnels' },
  { valeur: '+ de 30 ans', libelle: 'de savoir-faire' },
  { valeur: 'N° 1', libelle: 'de la confiance depuis 2010', source: 'enquête annuelle IFOP' },
  { valeur: '93 %', libelle: 'de clients satisfaits', source: 'enquête Qualitelis 2023' },
  { valeur: 'Meilleure', libelle: 'franchise depuis 2020', source: 'enquête annuelle Qualimétrie' }
];

export const SOURCES_RESEAU =
  'Chiffres du réseau Laforêt. N° 1 de la confiance : enquête annuelle IFOP. Satisfaction : enquête Laforêt réalisée par Qualitelis en 2023. Meilleure franchise : enquête annuelle Qualimétrie.';

/** Équipe transaction présentée dans le dossier (chemins relatifs à src/features/avis/assets). */
export const EQUIPE_TRANSACTION = [
  { prenom: 'Sabine', nom: 'Lorton', role: 'Directrice', photo: 'equipe/sabine.jpg' },
  { prenom: 'Victoria', nom: 'Martins Justo', role: 'Directrice', photo: 'equipe/victoria.jpg' },
  { prenom: 'Julien', nom: 'Ossedat', role: 'Négociateur', photo: 'conseiller.jpg' /* même photo qu'en couverture */ },
  { prenom: 'Fabienne', nom: 'Defont', role: 'Agent commerciale', photo: 'equipe/fabienne.jpg' }
] as const;

export const METIERS_AGENCE =
  'Vente · Location · Gestion · Location meublée · Expertise · Vente de neuf · Locaux commerciaux · Fonds de commerce · Viager · Investissement locatif';

export const ENGAGEMENTS: { titre: string; texte: string }[] = [
  {
    titre: 'Des diagnostics facilités',
    texte:
      'Nous sollicitons pour vous des devis auprès de diagnostiqueurs partenaires pour les diagnostics obligatoires, notamment le DPE, avec des remises commerciales négociées.'
  },
  {
    titre: 'Le contrôle d’assainissement organisé',
    texte:
      'Nous organisons les démarches et le rendez-vous de contrôle, et vous aidons à comprendre les résultats et les éventuelles suites à donner.'
  },
  {
    titre: 'Un compte rendu après chaque visite',
    texte:
      'Chaque visite vous est signalée par e-mail, puis débriefée par téléphone ou par e-mail : impressions des acquéreurs, remarques, points de blocage.'
  },
  {
    titre: 'Un point mensuel de vive voix',
    texte:
      'Au minimum une fois par mois : bilan des visites, des contacts acquéreurs, des retours, de la visibilité de l’annonce et des ajustements utiles.'
  },
  {
    titre: 'Une agence physique à Roanne',
    texte:
      'Un vrai lieu d’accueil au 38 rue Émile Noirot, ouvert du lundi au vendredi de 9 h à 12 h et de 14 h à 18 h, pour vous comme pour vos acquéreurs.'
  },
  {
    titre: 'Le compromis préparé en agence',
    texte:
      'Dans le cadre de nos habilitations, nous préparons et organisons la signature du compromis en agence, en lien avec les notaires. Les délais légaux, dont la rétractation de l’acquéreur, restent applicables.'
  },
  {
    titre: 'Une large diffusion',
    texte:
      'Votre bien est diffusé sur 11 portails immobiliers et sur nos réseaux sociaux, pour toucher toutes les catégories d’acquéreurs.'
  }
];

export const FAVORIZ = {
  accroche: 'Le meilleur des services Laforêt dans un mandat exclusif de vente',
  planAction: ['Attirer les acquéreurs', 'Préparer les visites', 'Suivre et analyser le projet'],
  liberte:
    'Votre liberté est préservée : vous pouvez à tout moment résilier le mandat d’exclusivité Favoriz si nous ne respectons pas nos engagements.',
  avantages: [
    {
      titre: 'Un engagement réciproque',
      texte:
        'Vous nous accordez votre confiance ; nous nous engageons pleinement dans la réussite de votre vente.'
    },
    {
      titre: 'Une transparence totale',
      texte:
        'Une stratégie partagée, des comptes rendus réguliers et un suivi précis de la commercialisation.'
    },
    {
      titre: 'Une communication maîtrisée',
      texte:
        'Un seul prix de présentation, une annonce cohérente et des informations homogènes sur tous les portails.'
    },
    {
      titre: 'Une négociation mieux maîtrisée',
      texte:
        'Pas de multiplication des annonces et des interlocuteurs, qui donne une impression de difficulté à vendre : la valeur perçue de votre bien est préservée.'
    },
    {
      titre: 'Une vente potentiellement plus rapide',
      texte:
        'Une équipe mobilisée, une stratégie unique et un suivi organisé peuvent contribuer à réduire les délais.'
    },
    {
      titre: 'Des moyens concentrés',
      texte:
        'Toute notre équipe transaction travaille sur le même objectif, avec une communication coordonnée.'
    }
  ],
  services: [
    {
      titre: 'Photos professionnelles',
      texte: 'Pour séduire les futurs acquéreurs dès la première image.'
    },
    {
      titre: 'Garantie après-vente',
      texte: 'Votre bien garanti deux ans contre les vices cachés, sous conditions (1).'
    },
    {
      titre: 'I-SUIVI',
      texte:
        'Suivez en ligne la vente de votre bien : performances de l’annonce et comptes rendus de visites.'
    },
    {
      titre: 'Visio Visit',
      texte: 'Une première visite à distance, en visioconférence, avant la visite réelle.'
    },
    {
      titre: 'Signature électronique',
      texte: 'Mandat et compromis signés sur ordinateur ou tablette, sans vous déplacer.'
    },
    {
      titre: 'En tête des résultats',
      texte: 'Sur laforet.com, les mandats Favoriz apparaissent en tête des résultats de recherche.'
    }
  ],
  mentions:
    '(1) Assurance offerte sous conditions d’éligibilité pour les biens en mandat Favoriz vendus par l’agence au prix affiché, si l’acte authentique donne lieu au versement d’honoraires supérieurs à 1 990 € TTC et dans les limites du contrat d’assurance. Conditions sur laforet.com/garantie-apres-vente. Services liés au mandat Favoriz selon prestations disponibles en agence.',
  conclusion:
    'Avec l’exclusivité Laforêt, nous partageons un objectif commun : vendre votre bien dans les meilleures conditions, grâce à une stratégie cohérente, un engagement réciproque et une transparence totale.'
};

export const DVF_EXPLICATION = {
  definition:
    'DVF signifie « Demandes de valeurs foncières » : ce sont les données publiques des ventes immobilières enregistrées par l’administration fiscale. Le prix DVF est la valeur foncière déclarée dans l’acte, hors frais de notaire et hors droits et taxes liés à l’acquisition.',
  honoraires: [
    'Honoraires à la charge du vendeur : ils sont généralement inclus dans le prix déclaré.',
    'Honoraires à la charge de l’acquéreur et distincts du prix : ils ne sont normalement pas compris dans la valeur foncière.'
  ],
  ecart:
    'Le prix DVF n’est donc pas toujours équivalent au prix « frais d’agence inclus » affiché dans une annonce.',
  limites: [
    'l’état intérieur du logement',
    'la qualité des rénovations',
    'les travaux à réaliser',
    'la classe énergie (DPE)',
    'les prestations et équipements',
    'l’année de construction',
    'les particularités qui justifient une surcote ou une décote'
  ],
  conclusion:
    'Ces données sont une base de comparaison indispensable, complétée par notre analyse professionnelle de votre bien.'
};

export const ASSAINISSEMENT = {
  collectif:
    'Assainissement collectif : le logement est raccordé au réseau public (tout-à-l’égout). Hors Île-de-France, le contrôle du raccordement n’est obligatoire à la vente que si un arrêté municipal l’impose.',
  nonCollectif:
    'Assainissement non collectif (fosse septique, micro-station…) : installation individuelle propre au logement. Le rapport de contrôle du SPANC doit dater de moins de 3 ans à la signature de l’acte de vente ; en cas de non-conformité, les travaux doivent être réalisés au plus tard un an après la vente.',
  source:
    'service-public.gouv.fr, « Diagnostic immobilier : assainissement des eaux usées » (vérifié le 26 février 2025).',
  risques: [
    'nécessiter des travaux',
    'représenter un coût supplémentaire',
    'devenir un point de négociation',
    'retarder la transaction',
    'créer un désaccord entre vendeur et acquéreur'
  ],
  accompagnement:
    'Nous organisons pour vous le rendez-vous de contrôle et vous accompagnons dans la lecture du rapport.'
};

export function typeAssainissement(v: unknown): 'collectif' | 'non_collectif' | null {
  const t = String(v ?? '').toLowerCase();
  if (!t) return null;
  if (/non.?collectif|individuel|fosse|micro|spanc|autonome|épandage|epandage/.test(t))
    return 'non_collectif';
  if (/collectif|égout|egout|réseau|reseau/.test(t)) return 'collectif';
  return null;
}

/**
 * Seuils de recherche des portails (paliers de 50 000 €) : si le prix affiché dépasse de peu un palier,
 * le bien disparaît des recherches « jusqu'à » ce palier. Renvoie le prix conseillé juste sous le palier.
 */
export function seuilRecherche(
  prixFai: number
): { palier: number; suggestion: number; ecart: number } | null {
  const pas = 50_000;
  const palier = Math.floor(prixFai / pas) * pas;
  if (palier <= 0 || prixFai <= palier) return null;
  const ecart = (prixFai - palier) / palier;
  if (ecart > 0.05) return null;
  return { palier, suggestion: palier - 1_000, ecart };
}

export const PALIERS_EXEMPLES: [string, string][] = [
  ['205\u00a0000\u00a0€', '199\u00a0000\u00a0€'],
  ['255\u00a0000\u00a0€', '249\u00a0000\u00a0€'],
  ['305\u00a0000\u00a0€', '299\u00a0000\u00a0€']
];
