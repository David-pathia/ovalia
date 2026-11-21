export type Lien = { id: string; libelle: string };

/** Action lue dans une note vocale, proposée au conseiller avant enregistrement. */
export type ActionProposee = {
  titre: string;
  type: 'appel' | 'visite' | 'estimation' | 'mandat' | 'communication' | 'autre';
  date: string | null;
  heure: string | null;
  detail: string | null;
  bien: Lien | null;
  contact: Lien | null;
};
