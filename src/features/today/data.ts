// Données d'exemple affichées tant que les modules ne sont pas branchés sur Supabase.

export type TaskKind = 'Appel' | 'Visite' | 'Estimation' | 'Mandat' | 'Comm.';

export const tasks: { id: string; time: string; title: string; detail: string; kind: TaskKind }[] = [
  { id: 't1', time: '09:00', title: 'Rappeler M. et Mme Bertin', detail: 'Retour sur l’offre, T4 rue des Tilleuls', kind: 'Appel' },
  { id: 't2', time: '10:30', title: 'Visite maison 5 pièces, Caluire', detail: 'Famille Moreau · checklist retour visite prête', kind: 'Visite' },
  { id: 't3', time: '12:00', title: 'Finaliser l’avis de valeur, chemin des Vignes', detail: '12 ventes DVF comparables déjà jointes', kind: 'Estimation' },
  { id: 't4', time: '14:00', title: 'Signature mandat exclusif, appartement T3', detail: 'Projet de mandat rédigé, à relire', kind: 'Mandat' },
  { id: 't5', time: '16:30', title: 'Saisir 2 estimations dans Laforêt Business', detail: 'Champs pré-remplis, à vérifier puis valider', kind: 'Estimation' },
  { id: 't6', time: '18:00', title: 'Publier le post LinkedIn de la semaine', detail: 'Brouillon proposé ci-contre', kind: 'Comm.' }
];

export const kpis = [
  { label: 'Mandats actifs', value: '42', hint: '+3 ce mois', trend: [20, 18, 19, 14, 15, 10, 11, 6] },
  { label: 'Rapprochements nouveaux', value: '7', hint: 'dont 3 au-dessus de 85 %', trend: [22, 20, 21, 16, 18, 12, 14, 8] },
  { label: 'Estimations en cours', value: '4', hint: '2 avis de valeur à finaliser', trend: [14, 16, 12, 15, 11, 13, 9, 12] },
  { label: 'Mails à traiter', value: '5', hint: 'brouillons IA prêts : 3', trend: [8, 12, 10, 14, 12, 16, 15, 18] }
];

export const matches = [
  {
    id: 'm1',
    title: 'Maison 5 p. · 128 m² · jardin 600 m²',
    subtitle: 'Caluire-et-Cuire · 545 000 € · rentrée hier',
    score: 92,
    with: [
      { name: 'Famille Moreau', score: 92 },
      { name: 'C. Lambert', score: 86 },
      { name: 'S. et P. Durand', score: 81 }
    ],
    why: 'Budget, secteur et nombre de chambres cochés. Point d’écart : 9 min de plus que souhaité jusqu’à l’école.',
    action: 'Envoyer le mail aux 3 clients'
  },
  {
    id: 'm2',
    title: 'Client · Mme Nguyen · T3 lumineux',
    subtitle: 'Budget 320 000 € · Croix-Rousse ou 4e · balcon souhaité',
    score: 84,
    with: [
      { name: 'T3 rue d’Austerlitz', score: 84 },
      { name: 'T3 bd des Canuts', score: 79 }
    ],
    why: null,
    action: 'Proposer les 2 biens'
  }
];

export const mails = [
  { id: 'e1', level: 'crit', from: 'Notaire Me Carle : pièces manquantes', summary: 'Il manque le diagnostic termites pour la vente Bertin. Brouillon de réponse prêt.', at: '08:12' },
  { id: 'e2', level: 'warn', from: 'Nouvelle demande via le mini-site', summary: 'Couple primo-accédant, budget 280 k€. Fiche client créée, à valider.', at: '07:46' },
  { id: 'e3', level: 'ok', from: 'Avis client : Famille Roche', summary: '5/5, « suivi impeccable ». Proposé pour le mini-site.', at: 'Hier' }
] as const;

export const syncQueue = [
  { id: 's1', kind: 'bien', label: 'Maison 5 p., Caluire', status: 'pending' },
  { id: 's2', kind: 'client', label: 'Famille Moreau', status: 'pending' },
  { id: 's3', kind: 'bien', label: 'T3 rue d’Austerlitz', status: 'exported' }
] as const;
