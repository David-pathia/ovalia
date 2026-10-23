import { z } from 'zod';

// Ce que l'IA renvoie à partir d'une note libre, et ce que l'écran de vérification renvoie à l'enregistrement.
// Tout est nullable : l'IA ne remplit que ce qui est écrit dans la note.

export const PieceSchema = z.object({
  nom: z.string().describe('Nom de la pièce au format Laforêt : Séjour, Cuisine, Chambre 1, Salle de bains, WC, Entrée, Cellier…'),
  surface: z.number().nullable().describe('Surface en m²'),
  niveau: z.string().nullable().describe('RDC, 1er étage… si précisé')
});

export const ExtractionSchema = z.object({
  bien: z.object({
    type: z.enum(['appartement', 'maison', 'immeuble', 'terrain', 'garage', 'local']).nullable(),
    transaction: z.enum(['vente', 'location']),
    adresse: z.string().nullable(),
    code_postal: z.string().nullable(),
    ville: z.string().nullable(),
    surface: z.number().nullable().describe('Surface habitable en m²'),
    surface_terrain: z.number().nullable().describe('Surface du terrain en m²'),
    pieces: z.number().int().nullable().describe('Nombre de pièces principales (séjour + chambres + bureau), sans cuisine, salle de bains, WC, entrée'),
    chambres: z.number().int().nullable(),
    etage: z.number().int().nullable(),
    nb_etages: z.number().int().nullable(),
    annee_construction: z.number().int().nullable(),
    prix_bien: z.number().int().nullable().describe('Prix demandé ou envisagé par le vendeur, en euros, seulement si écrit'),
    dpe_classe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullable(),
    taxe_fonciere: z.number().int().nullable().describe('En euros par an, seulement si la note le dit clairement'),
    charges_copro_mensuelles: z.number().nullable(),
    loyer_potentiel: z.number().nullable().describe('Loyer mensuel envisageable ou actuel, en euros'),
    chauffage: z.string().nullable().describe('Énergie, type et âge de la chaudière'),
    exterieurs: z.array(z.string()).describe('garage, jardin, terrain, balcon, terrasse, cave, parking, buanderie, dépendance…'),
    equipements: z.array(z.string()).describe('Double vitrage, VMC, isolation, tout-à-l’égout, rangements…'),
    etat_general: z.string().nullable(),
    description_courte: z.string().describe('Une phrase factuelle qui résume le bien')
  }),
  pieces: z.array(PieceSchema),
  vendeur: z
    .object({
      civilite: z.string().nullable(),
      nom: z.string(),
      prenom: z.string().nullable(),
      email: z.string().nullable(),
      portable: z.string().nullable(),
      telephone_fixe: z.string().nullable()
    })
    .nullable(),
  analyse: z.object({
    points_forts: z.array(z.string()),
    points_faibles: z.array(z.string()).describe('Points de vigilance pour la vente ou l’estimation'),
    synthese: z.string().describe('3 à 5 phrases pour le conseiller : profil du bien, cible d’acquéreurs, leviers de valorisation'),
    a_verifier: z
      .array(
        z.object({
          champ: z.string().describe('Champ concerné (ville, taxe_fonciere, nom, type…)'),
          question: z.string().describe('Question précise à poser au vendeur ou à vérifier')
        })
      )
      .describe('Informations manquantes, ambiguës ou incohérentes')
  })
});

export type Extraction = z.infer<typeof ExtractionSchema>;
