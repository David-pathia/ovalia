import { z } from 'zod';

// Résultat du tri IA de la boîte mail (bouton « Trier ma boîte »).
// Partagé entre le serveur (validation de la réponse IA) et l'affichage.

export const CATEGORIES = [
  'urgent',
  'echeance',
  'reponse',
  'rapprochement',
  'relance',
  'info'
] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const LIBELLES_CATEGORIES: Record<Categorie, { titre: string; aide: string }> = {
  urgent: { titre: 'Urgent · sous 48 h', aide: 'Une vente, une offre ou un client en jeu' },
  echeance: { titre: 'Échéances', aide: 'Une date à tenir' },
  reponse: { titre: 'Réponses à valider', aide: 'Brouillon prêt, à relire' },
  rapprochement: { titre: 'Rapprochements', aide: 'Demandes ↔ biens qui arrivent' },
  relance: { titre: 'Anticipation et relances', aide: 'Ce qui risque de s’endormir' },
  info: { titre: 'À lire / information', aide: 'Réseau, portails, newsletters' }
};

const texte = z.string().trim();

export const BrouillonSchema = z.object({
  a: texte,
  objet: texte,
  texte: texte
});

export const TriSchema = z.object({
  resume: texte,
  mails: z.array(
    z.object({
      uid: z.number().int(),
      categorie: z.enum(CATEGORIES),
      action: texte,
      raison: texte.nullable().optional(),
      echeance: z.object({ date: z.string().nullable(), libelle: texte }).nullable().optional(),
      autresSujets: z.array(texte).nullable().optional(),
      brouillon: BrouillonSchema.nullable().optional()
    })
  ),
  rapprochements: z.array(
    z.object({
      client: texte,
      bien: texte,
      colle: z.array(texte),
      manque: z.array(texte),
      action: texte,
      brouillon: BrouillonSchema.nullable().optional()
    })
  ),
  relances: z.array(
    z.object({
      dossier: texte,
      ouEnEst: texte,
      manque: texte.nullable().optional(),
      action: texte,
      quand: texte,
      brouillon: BrouillonSchema.nullable().optional()
    })
  ),
  priorites: z.array(texte),
  bilan: z
    .object({
      avance: z.array(texte),
      suspens: z.array(texte),
      echeances: z.array(z.object({ jour: texte, quoi: texte })),
      plan: z.array(z.object({ jour: texte, actions: z.array(texte) })),
      conseil: texte
    })
    .nullable()
    .optional()
});
export type TriIA = z.infer<typeof TriSchema>;
export type Brouillon = z.infer<typeof BrouillonSchema>;

/** Mail tel qu'affiché : en-têtes lus sur le serveur (jamais repris de la réponse IA) + tri. */
export type MailTrie = TriIA['mails'][number] & {
  de: string;
  adresse: string | null;
  sujet: string | null;
  date: string;
};

export type ResultatTri = {
  trieLe: string;
  bilan: boolean;
  nbMails: number;
  resume: string;
  mails: MailTrie[];
  rapprochements: TriIA['rapprochements'];
  relances: TriIA['relances'];
  priorites: string[];
  bilanSemaine: NonNullable<TriIA['bilan']> | null;
};
