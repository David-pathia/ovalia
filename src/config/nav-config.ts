import { NavGroup } from '@/types';

/**
 * Menu latéral et barre de recherche ⌘K.
 * `label` sur un item = badge « Bientôt » tant que le module n'est pas livré.
 */
export const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { title: "Aujourd'hui", url: '/dashboard', icon: 'today', shortcut: ['a', 'a'], items: [] }
    ]
  },
  {
    label: 'Portefeuille',
    items: [
      { title: 'Biens', url: '/dashboard/biens', icon: 'bien', shortcut: ['b', 'b'], label: 'Bientôt', items: [] },
      { title: 'Contacts', url: '/dashboard/contacts', icon: 'teams', shortcut: ['c', 'c'], label: 'Bientôt', items: [] },
      { title: 'Rapprochements', url: '/dashboard/rapprochements', icon: 'rapprochement', shortcut: ['r', 'r'], label: 'Bientôt', items: [] }
    ]
  },
  {
    label: 'Expertise',
    items: [
      { title: 'Estimations', url: '/dashboard/estimations', icon: 'estimation', shortcut: ['e', 'e'], label: 'Bientôt', items: [] },
      { title: 'Avis de valeur', url: '/dashboard/avis-de-valeur', icon: 'avisValeur', label: 'Bientôt', items: [] },
      { title: 'Mandats', url: '/dashboard/mandats', icon: 'mandat', shortcut: ['m', 'm'], label: 'Bientôt', items: [] },
      { title: 'Travaux', url: '/dashboard/travaux', icon: 'travaux', shortcut: ['t', 'r'], label: 'Bientôt', items: [] }
    ]
  },
  {
    label: 'Communication',
    items: [
      { title: 'Boîte mail', url: '/dashboard/mails', icon: 'mail', label: 'Bientôt', items: [] },
      { title: 'LinkedIn', url: '/dashboard/linkedin', icon: 'linkedin', label: 'Bientôt', items: [] },
      { title: 'Mini-site', url: '/dashboard/mini-site', icon: 'site', label: 'Bientôt', items: [] }
    ]
  },
  {
    label: 'Réglages',
    items: [
      { title: 'Synchronisation Laforêt', url: '/dashboard/laforet', icon: 'sync', label: 'Bientôt', items: [] }
    ]
  }
];

/** Descriptions affichées sur les pages des modules à venir. */
export const moduleDescriptions: Record<string, string> = {
  biens: 'Fiches biens au format Laforêt : prix et honoraires, mandat, pièces, photos, diffusion et synchronisation.',
  contacts:
    'Fiches contacts (vendeurs, demandeurs) et projets de recherche : budget, communes, surface, pièces.',
  rapprochements:
    'Croisement automatique biens ↔ projets de recherche, avec un score et un mail prêt à envoyer.',
  estimations:
    'Aide à l’estimation à partir des ventes DVF du secteur, et pré-remplissage de Laforêt Business.',
  'avis-de-valeur': 'Avis de valeur détaillé, chiffres et comparables à l’appui, exporté en PDF.',
  mandats: 'Aide à la rédaction des mandats à partir de la fiche du bien et du client.',
  travaux: 'Outil d’estimation du coût des travaux à réaliser, poste par poste.',
  mails: 'Tri de la boîte mail, résumés et brouillons de réponse.',
  linkedin: 'Idées de posts, rédaction et planning de publication.',
  'mini-site': 'Mini-site de Julien Ossedat : retours de visite, avis clients et documents utiles.',
  laforet:
    'File des biens, contacts et projets à envoyer vers Laforêt. La connexion sera branchée dès réception de l’API.'
};
