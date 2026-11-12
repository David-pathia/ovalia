// Contenus du site public de Julien Ossedat, repris du cahier des charges validé par Julien (novembre 2026).
// Ne rien ajouter qui ne vienne de lui : chiffres, anecdotes et témoignages doivent être authentiques.

export const JULIEN = {
  nom: 'Julien Ossedat',
  fonction: 'Négociateur immobilier chez Laforêt Roanne',
  telephone: '06 48 94 54 77',
  telephoneLien: 'tel:+33648945477',
  linkedin: 'https://www.linkedin.com/in/julien-ossedat/',
  signature: 'La proximité d’un homme, la force d’un réseau.',
  devise: 'Je construis d’abord des relations avant de vendre des maisons.'
};

export const AGENCE_SITE = {
  nom: 'Laforêt Roanne',
  adresse: '38 rue Émile Noirot',
  ville: '42300 Roanne',
  telephone: '04 77 23 09 09',
  telephoneLien: 'tel:+33477230909',
  email: 'roanne@laforet.com',
  horaires: 'Du lundi au vendredi, de 9 h à 12 h et de 14 h à 18 h'
};

/** Lien WhatsApp avec message prérempli (aucune donnée transmise par le site). */
export function lienWhatsApp(
  message = 'Bonjour Julien, je viens de consulter votre site et j’aimerais échanger avec vous au sujet de mon projet immobilier.'
) {
  return `https://wa.me/33648945477?text=${encodeURIComponent(message)}`;
}

export const MESSAGES_WHATSAPP = {
  rendezVous:
    'Bonjour Julien, je viens de consulter votre site et je souhaiterais prendre rendez-vous avec vous.',
  estimation: 'Bonjour Julien, je souhaiterais faire estimer mon bien. Il se situe à : '
};

export const PAGES_SITE = [
  ['/site', 'Accueil'],
  ['/site/mon-histoire', 'Mon histoire'],
  ['/site/valeurs', 'Mes valeurs'],
  ['/site/julien-et-laforet', 'Julien & Laforêt'],
  ['/site/methode', 'Ma méthode'],
  ['/site/contact', 'Contact']
] as const;

export const REPERES = [
  { valeur: '20 ans', libelle: 'de relation client chez Darty' },
  { valeur: '10 ans', libelle: 'à la direction du magasin de Mably' },
  { valeur: '+ de 30 ans', libelle: 'de vie dans le Roannais' },
  { valeur: 'ASR XV', libelle: 'éducateur auprès des enfants' }
];

export const ENGAGEMENTS_JULIEN = [
  {
    titre: 'Écouter avant de proposer',
    texte:
      'Comprendre vos motivations, vos contraintes et vos priorités avant de parler de prix, de surface ou de mandat.'
  },
  {
    titre: 'Expliquer clairement',
    texte:
      'Rendre accessibles les informations techniques, administratives et financières, pour que vous décidiez en toute connaissance.'
  },
  {
    titre: 'Être présent',
    texte:
      'Assurer un suivi régulier, de la première rencontre jusqu’aux prochaines étapes de votre projet.'
  },
  {
    titre: 'Mobiliser les bonnes personnes',
    texte: 'M’appuyer sur l’équipe Laforêt Roanne et sur les intervenants utiles à votre projet.'
  },
  {
    titre: 'M’améliorer',
    texte: 'Solliciter vos avis et utiliser vos retours pour progresser, visite après visite.'
  }
];

export const VALEURS_RUGBY = [
  { titre: 'Respect', texte: 'Des coéquipiers, des adversaires, des éducateurs et des règles.' },
  {
    titre: 'Solidarité et collectif',
    texte: 'Avancer ensemble, s’entraider, faire une place à chacun.'
  },
  { titre: 'Détermination', texte: 'Persévérer et apprendre de ses difficultés.' },
  {
    titre: 'Plaisir',
    texte: 'Donner envie aux enfants de pratiquer durablement une activité sportive.'
  }
];

export const FORMATIONS = [
  {
    titre: 'Le management',
    texte:
      'Fédérer, responsabiliser et accompagner. Pour vous : un interlocuteur qui sait coordonner les bonnes personnes autour de votre projet.'
  },
  {
    titre: 'Le DISC',
    texte:
      'Prendre en compte les différents styles de communication, sans enfermer personne dans une case. Pour vous : des explications adaptées à votre façon d’échanger.'
  },
  {
    titre: 'Les accords toltèques',
    texte:
      'La qualité de la parole, le refus des suppositions, le recul et l’engagement. Pour vous : moins de malentendus, et des désaccords gérés avec respect.'
  }
];

export const COMPLEMENTARITE = {
  julien: [
    '20 ans de relation client',
    '10 ans de direction du magasin Darty de Mably',
    'Plus de 30 ans d’ancrage roannais',
    'Un réseau local construit au fil des années',
    'Une expérience managériale et associative',
    'Une communication accessible'
  ],
  laforet: [
    'La notoriété d’une enseigne nationale',
    'Une agence physique au cœur de Roanne',
    'Une équipe disponible et complémentaire',
    'Des méthodes éprouvées',
    'Des outils de commercialisation, de diffusion et de suivi'
  ]
};
