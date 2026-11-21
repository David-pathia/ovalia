// Page « Aujourd'hui » : une seule liste d'actions, construite à partir des tâches et des dossiers
// (relances vendeurs, échéances de mandat, acquéreurs à appeler, avis à préparer ou à demander).
// Partagé entre le serveur (collecte) et l'affichage.

export type Moment = 'retard' | 'jour' | 'semaine' | 'plus_tard';

export const MOMENTS: { cle: Moment; titre: string; aide: string }[] = [
  { cle: 'retard', titre: 'En retard', aide: 'À traiter en premier' },
  { cle: 'jour', titre: 'Aujourd’hui', aide: 'Prévu ou à faire ce jour' },
  { cle: 'semaine', titre: 'Cette semaine', aide: 'Les 7 prochains jours' },
  { cle: 'plus_tard', titre: 'À anticiper', aide: 'Quand vous avez un moment' }
];

export type Nature =
  | 'appel'
  | 'visite'
  | 'estimation'
  | 'mandat'
  | 'acquereur'
  | 'avis'
  | 'communication'
  | 'autre';

export const NATURES: Record<Nature, string> = {
  appel: 'Appel',
  visite: 'Visite',
  estimation: 'Estimation',
  mandat: 'Mandat',
  acquereur: 'Acquéreur',
  avis: 'Avis client',
  communication: 'Comm.',
  autre: 'Tâche'
};

/** Types de la table `taches` (contrainte SQL). */
export const TYPES_TACHE = [
  ['appel', 'Appel'],
  ['visite', 'Visite'],
  ['estimation', 'Estimation'],
  ['mandat', 'Mandat'],
  ['communication', 'Communication'],
  ['autre', 'Autre']
] as const;
export type TypeTache = (typeof TYPES_TACHE)[number][0];

export type Personne = {
  id: string; // rapprochement ou projet
  nom: string;
  telephone: string | null;
  score?: number;
  info?: string | null;
};

export type ActionJour = {
  id: string;
  moment: Moment;
  nature: Nature;
  titre: string;
  detail: string | null;
  /** Date (AAAA-MM-JJ) et heure (HH:MM) affichées, quand il y en a une. */
  date: string | null;
  heure: string | null;
  href: string | null;
  lien: string | null; // libellé du lien
  telephone: string | null;
  /** Ce que les boutons permettent de faire sur l'action. */
  geste:
    | { type: 'tache'; tacheId: string; faite: boolean }
    | { type: 'relance'; bienId: string }
    | { type: 'rapprochements'; personnes: Personne[] }
    | { type: 'personnes'; personnes: Personne[] }
    | null;
};

export type Indicateur = { label: string; valeur: number; aide: string; href: string };

export type Journee = {
  actions: ActionJour[];
  indicateurs: Indicateur[];
  synchroEnAttente: number;
  /** Tables absentes (migration non exécutée) : l'écran fonctionne sans. */
  manques: string[];
};
