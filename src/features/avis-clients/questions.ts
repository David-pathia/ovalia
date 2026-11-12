// Questionnaire « Votre avis compte » : les 5 questions du cahier des charges de Julien, notées de 1 à 5 étoiles.

export const QUESTIONS_AVIS = [
  {
    cle: 'note_professionnalisme',
    critere: 'Professionnalisme',
    question: 'Comment évaluez-vous la qualité globale de mon accompagnement pendant cette visite ?'
  },
  {
    cle: 'note_clarte',
    critere: 'Clarté',
    question:
      'Les informations communiquées sur le bien et la visite étaient-elles claires et complètes ?'
  },
  {
    cle: 'note_ecoute',
    critere: 'Écoute',
    question: 'Vous êtes-vous senti écouté et compris dans votre projet ?'
  },
  {
    cle: 'note_relation',
    critere: 'Relation humaine',
    question: 'Comment évaluez-vous mon accueil, ma disponibilité et ma sympathie ?'
  },
  {
    cle: 'note_recommandation',
    critere: 'Recommandation',
    question: 'Recommanderiez-vous mon accompagnement à votre entourage ?'
  }
] as const;

export type CleNote = (typeof QUESTIONS_AVIS)[number]['cle'];

export const MESSAGE_INVITATION = (prenom: string | null, lien: string) =>
  `Bonjour${prenom ? ` ${prenom}` : ''}, merci pour votre visite ! Votre avis m’aide à progresser : pourriez-vous répondre à 5 questions rapides (1 minute) ? ${lien} Julien Ossedat, Laforêt Roanne`;
