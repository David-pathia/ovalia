import { z } from 'zod';
import { BienBrouillonSchema } from '@/features/biens/fields';

// Ce que l'IA renvoie à partir d'une note libre. Les champs du bien sont ceux de la fiche Laforêt
// (même liste que la fiche bien), tous facultatifs : l'IA ne remplit que ce que la note dit.

export const PieceBrouillonSchema = z.object({
  nom: z.string().describe('Nom au format Laforêt : Entrée, Séjour, Cuisine, Chambre 1, Salle de bains, WC, Dégagement…'),
  longueur: z.number().nullable().describe('Longueur en mètres, seulement si la note donne les dimensions'),
  largeur: z.number().nullable().describe('Largeur en mètres, seulement si la note donne les dimensions'),
  surface: z.number().nullable().describe('Surface en m² si la note la donne'),
  niveau: z.string().nullable()
});

export const VendeurSchema = z.object({
  civilite: z.string().nullable(),
  nom: z.string(),
  prenom: z.string().nullable(),
  email: z.string().nullable(),
  portable: z.string().nullable(),
  telephone_fixe: z.string().nullable()
});

export const AnalyseSchema = z.object({
  points_forts: z.array(z.string()),
  points_faibles: z.array(z.string()).describe('Points de vigilance pour la vente ou l’estimation'),
  synthese: z.string().describe('3 à 5 phrases pour le conseiller : profil du bien, cible d’acquéreurs, leviers de valorisation'),
  a_verifier: z
    .array(
      z.object({
        champ: z.string().describe('Champ concerné'),
        question: z.string().describe('Question précise à poser au vendeur ou à vérifier')
      })
    )
    .describe('Informations ambiguës ou incohérentes (les champs simplement absents sont signalés par l’application)')
});

export const ExtractionSchema = z.object({
  bien: BienBrouillonSchema,
  pieces: z.array(PieceBrouillonSchema),
  vendeur: VendeurSchema.nullable(),
  analyse: AnalyseSchema
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type Analyse = z.infer<typeof AnalyseSchema>;
