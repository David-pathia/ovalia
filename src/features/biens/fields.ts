import { z } from 'zod';
import { CLASSIF_PROJET, STATUTS_BIEN, TYPES_BIEN, TYPES_MANDAT } from '@/lib/biens/options';

// Champs de la fiche bien, regroupés comme les onglets Laforêt.
// La même description sert à l'affichage du formulaire et à la validation côté serveur.

type Options = readonly (readonly [string, string])[];

export type FieldDef =
  | { key: string; label: string; kind: 'text' | 'textarea' | 'date' | 'list'; wide?: boolean }
  | { key: string; label: string; kind: 'int' | 'num'; unit?: string; wide?: boolean }
  | { key: string; label: string; kind: 'bool' | 'tri'; wide?: boolean }
  | { key: string; label: string; kind: 'select'; options: Options; required?: boolean; wide?: boolean };

export type FieldGroup = { id: string; title: string; fields: FieldDef[] };

const TRANSACTIONS = [
  ['vente', 'Vente'],
  ['location', 'Location']
] as const;
const DPE = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => [c, c] as const);

export const BIEN_GROUPS: FieldGroup[] = [
  {
    id: 'entete',
    title: 'En-tête',
    fields: [
      { key: 'statut', label: 'Statut', kind: 'select', options: STATUTS_BIEN, required: true },
      { key: 'type', label: 'Type', kind: 'select', options: TYPES_BIEN, required: true },
      { key: 'transaction', label: 'Transaction', kind: 'select', options: TRANSACTIONS, required: true },
      { key: 'classif_projet', label: 'Classif projet', kind: 'select', options: CLASSIF_PROJET },
      { key: 'reference', label: 'Référence', kind: 'text' },
      { key: 'numero_mandat', label: 'N° mandat', kind: 'text' },
      { key: 'prochain_contact', label: 'Prochain contact', kind: 'date' },
      { key: 'disponible_le', label: 'Disponible le', kind: 'date' },
      { key: 'suivi_par', label: 'Suivi par', kind: 'text' },
      { key: 'web', label: 'Diffusé sur le web', kind: 'bool' }
    ]
  },
  {
    id: 'composition',
    title: 'Composition',
    fields: [
      { key: 'pieces', label: 'Pièces', kind: 'int' },
      { key: 'chambres', label: 'Chambres', kind: 'int' },
      { key: 'surface', label: 'Surface', kind: 'num', unit: 'm²' },
      { key: 'surface_terrain', label: 'Terrain', kind: 'num', unit: 'm²' },
      { key: 'etage', label: 'Étage', kind: 'int' },
      { key: 'nb_etages', label: 'Nb d’étages', kind: 'int' },
      { key: 'annee_construction', label: 'Année de construction', kind: 'int' },
      { key: 'ascenseur', label: 'Ascenseur', kind: 'tri' },
      { key: 'exterieurs', label: 'Extérieurs et annexes', kind: 'list', wide: true },
      { key: 'etat_general', label: 'État général', kind: 'text', wide: true }
    ]
  },
  {
    id: 'prix',
    title: 'Prix et honoraires',
    fields: [
      { key: 'prix_bien', label: 'Prix du bien', kind: 'int', unit: '€' },
      { key: 'hono_vendeur', label: 'Hono. vendeur', kind: 'int', unit: '€' },
      { key: 'hono_acquereur', label: 'Hono. acquéreur', kind: 'int', unit: '€' },
      { key: 'prix_affiche', label: 'Prix affiché', kind: 'int', unit: '€' },
      { key: 'net_vendeur', label: 'Reste au vendeur', kind: 'int', unit: '€' },
      { key: 'frais_notaire', label: 'Notaire', kind: 'int', unit: '€' },
      { key: 'prix_visible', label: 'Prix visible', kind: 'bool' }
    ]
  },
  {
    id: 'mandat',
    title: 'Mandat',
    fields: [
      { key: 'type_mandat', label: 'Type de mandat', kind: 'select', options: TYPES_MANDAT },
      { key: 'mandat_debut', label: 'Début', kind: 'date' },
      { key: 'mandat_fin', label: 'Fin', kind: 'date' },
      { key: 'numero_isuivi', label: 'N° i-SUIVI', kind: 'text' },
      { key: 'isuivi', label: 'i-SUIVI', kind: 'bool' },
      { key: 'gav', label: 'G.A.V.', kind: 'bool' },
      { key: 'bien_exception', label: 'Bien d’exception', kind: 'bool' }
    ]
  },
  {
    id: 'localisation',
    title: 'Localisation',
    fields: [
      { key: 'adresse', label: 'Adresse', kind: 'text', wide: true },
      { key: 'complement_adresse', label: 'Complément', kind: 'text', wide: true },
      { key: 'code_postal', label: 'Code postal', kind: 'text' },
      { key: 'ville', label: 'Ville', kind: 'text' },
      { key: 'code_postal_internet', label: 'Code postal internet', kind: 'text' },
      { key: 'ville_internet', label: 'Ville internet', kind: 'text' },
      { key: 'adresse_sur_fiche', label: 'Adresse sur fiche commerciale', kind: 'tri' },
      { key: 'geoloc_precise', label: 'Géolocaliser à l’adresse précise', kind: 'tri' }
    ]
  },
  {
    id: 'financier',
    title: 'Aspects financiers et copropriété',
    fields: [
      { key: 'taxe_fonciere', label: 'Taxe foncière', kind: 'int', unit: '€/an' },
      { key: 'charges_copro_mensuelles', label: 'Charges copropriété', kind: 'num', unit: '€/mois' },
      { key: 'copropriete', label: 'Copropriété', kind: 'tri' },
      { key: 'nb_lots', label: 'Nb de lots', kind: 'int' },
      { key: 'charges_copro_annuelles', label: 'Charges annuelles', kind: 'num', unit: '€/an' },
      { key: 'procedure_en_cours', label: 'Procédure en cours', kind: 'tri' },
      { key: 'loyer_mensuel_hc', label: 'Loyer mensuel HC', kind: 'num', unit: '€' },
      { key: 'encadrement_loyers', label: 'Encadrement des loyers', kind: 'tri' }
    ]
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    fields: [
      { key: 'dpe_classe', label: 'DPE', kind: 'select', options: DPE },
      { key: 'dpe_valeur', label: 'Consommation', kind: 'int', unit: 'kWh/m²/an' },
      { key: 'ges_classe', label: 'GES', kind: 'select', options: DPE },
      { key: 'ges_valeur', label: 'Émissions', kind: 'int', unit: 'kg CO₂/m²/an' },
      { key: 'dpe_date', label: 'Date du DPE', kind: 'date' }
    ]
  },
  {
    id: 'notes',
    title: 'Notes',
    fields: [{ key: 'notes', label: 'Notes internes', kind: 'textarea', wide: true }]
  }
];

export const BIEN_FIELDS = BIEN_GROUPS.flatMap((g) => g.fields);

function zodFor(f: FieldDef): z.ZodType {
  switch (f.kind) {
    case 'int':
      return z.number().int().nullable();
    case 'num':
      return z.number().nullable();
    case 'bool':
      return z.boolean();
    case 'tri':
      return z.boolean().nullable();
    case 'list':
      return z.array(z.string());
    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
    case 'select': {
      const values = f.options.map(([v]) => v) as [string, ...string[]];
      return f.required ? z.enum(values) : z.enum(values).nullable();
    }
    default:
      return z.string().nullable();
  }
}

export const BienUpdateSchema = z.object(Object.fromEntries(BIEN_FIELDS.map((f) => [f.key, zodFor(f)])));

export const PieceInputSchema = z.object({
  nom: z.string().trim().min(1),
  surface: z.number().nullable(),
  niveau: z.string().nullable()
});

export const VendeurInputSchema = z.object({
  civilite: z.string().nullable(),
  nom: z.string(),
  prenom: z.string().nullable(),
  email: z.string().nullable(),
  portable: z.string().nullable(),
  telephone_fixe: z.string().nullable()
});

export type BienValues = Record<string, unknown>;
export type PieceInput = z.infer<typeof PieceInputSchema>;
export type VendeurInput = z.infer<typeof VendeurInputSchema>;
export type AVerifier = { champ: string; question: string; traite?: boolean };
