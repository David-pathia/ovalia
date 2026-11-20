// Partagé entre le serveur (rédaction IA) et le navigateur (choix du ton).

export const TONS_LINKEDIN = {
  pro: 'Professionnel',
  proche: 'Proche et chaleureux',
  pedagogique: 'Pédagogique'
} as const;
export type TonLinkedin = keyof typeof TONS_LINKEDIN;

export type IdeePost = { titre: string; angle: string; categorie: string };
