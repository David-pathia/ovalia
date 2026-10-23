import { z } from 'zod';
import { CLASSIF_PROJET, STATUTS_BIEN, TYPES_BIEN, TYPES_MANDAT } from '@/lib/biens/options';

// Champs de la fiche bien, regroupés comme les onglets Laforêt.
// La même description sert à l'affichage du formulaire et à la validation côté serveur.

type Options = readonly (readonly [string, string])[];

type Commun = {
  key: string;
  label: string;
  wide?: boolean;
  /** Exigé par la fiche d'estimation Laforêt avant tout enregistrement. */
  fiche?: boolean;
  /** Interdit l'option « inconnu / sans objet » (surface habitable). */
  naInterdit?: boolean;
  /** Indication donnée à l'IA de la saisie rapide. */
  aide?: string;
};

export type FieldDef = Commun &
  (
    | { kind: 'text' | 'textarea' | 'date' | 'list' }
    | { kind: 'int' | 'num'; unit?: string }
    | { kind: 'bool' | 'tri' }
    | { kind: 'select'; options: Options; required?: boolean }
  );

export type FieldGroup = { id: string; title: string; fiche?: boolean; fields: FieldDef[] };

const TRANSACTIONS = [
  ['vente', 'Vente'],
  ['location', 'Location']
] as const;
const DPE = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => [c, c] as const);

export const BIEN_GROUPS: FieldGroup[] = [
  {
    id: 'fiche-generales',
    title: '1. Informations générales',
    fiche: true,
    fields: [
      { key: 'annee_construction', label: 'Année de construction', kind: 'int', fiche: true },
      { key: 'annee_renovations', label: 'Année des extensions ou rénovations', kind: 'text', fiche: true },
      { key: 'surface', label: 'Surface habitable déclarée', kind: 'num', unit: 'm²', fiche: true, naInterdit: true },
      { key: 'surface_terrain', label: 'Surface du terrain', kind: 'num', unit: 'm²', fiche: true },
      { key: 'nb_niveaux', label: 'Nombre de niveaux', kind: 'int', fiche: true },
      { key: 'chambres', label: 'Nombre de chambres', kind: 'int', fiche: true }
    ]
  },
  {
    id: 'fiche-construction',
    title: '2. Construction et isolation',
    fiche: true,
    fields: [
      { key: 'type_construction', label: 'Type de construction', kind: 'text', fiche: true, aide: 'pierre, parpaing, brique, pisé, ossature bois…' },
      { key: 'isolation_combles', label: 'Isolation des combles / toiture', kind: 'text', fiche: true },
      { key: 'isolation_murs', label: 'Isolation des murs', kind: 'text', fiche: true, aide: 'intérieure, extérieure, aucune' },
      { key: 'isolation_plancher', label: 'Isolation du plancher bas', kind: 'text', fiche: true },
      { key: 'fenetres', label: 'Type et âge des fenêtres / double vitrage', kind: 'text', fiche: true },
      { key: 'toiture', label: 'État et âge de la toiture', kind: 'text', fiche: true }
    ]
  },
  {
    id: 'fiche-chauffage',
    title: '3. Chauffage et équipements',
    fiche: true,
    fields: [
      { key: 'chauffage_systeme', label: 'Système de chauffage principal', kind: 'text', fiche: true, aide: 'chaudière, radiateurs, plancher chauffant, poêle…' },
      { key: 'chauffage_energie', label: 'Énergie utilisée', kind: 'text', fiche: true, aide: 'gaz, électricité, bois, fioul, PAC…' },
      { key: 'chauffage_annee', label: 'Année d’installation du chauffage', kind: 'int', fiche: true, aide: 'si la note dit « 20 ans », calcule l’année' },
      { key: 'eau_chaude', label: 'Production d’eau chaude sanitaire', kind: 'text', fiche: true },
      { key: 'ventilation', label: 'Ventilation', kind: 'text', fiche: true, aide: 'VMC simple flux, double flux, naturelle…' },
      { key: 'assainissement', label: 'Assainissement', kind: 'text', fiche: true, aide: 'collectif (tout-à-l’égout) ou individuel' }
    ]
  },
  {
    id: 'fiche-charges',
    title: '4. Charges, diagnostics et travaux',
    fiche: true,
    fields: [
      { key: 'taxe_fonciere', label: 'Taxe foncière annuelle', kind: 'int', unit: '€', fiche: true },
      { key: 'dpe_classe', label: 'Classe DPE', kind: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => [c, c] as const), fiche: true },
      { key: 'dpe_date', label: 'Date du diagnostic DPE', kind: 'date', fiche: true },
      { key: 'consommation_energie_annuelle', label: 'Consommation énergétique annuelle', kind: 'int', unit: '€/an', fiche: true },
      { key: 'derniers_travaux', label: 'Derniers travaux réalisés et dates', kind: 'textarea', fiche: true },
      { key: 'travaux_a_prevoir', label: 'Travaux importants restant à prévoir', kind: 'textarea', fiche: true },
      { key: 'documents_disponibles', label: 'Diagnostics, factures et plans disponibles', kind: 'text', fiche: true, wide: true }
    ]
  },
  {
    id: 'fiche-exterieurs',
    title: '5. Extérieurs et projet de vente',
    fiche: true,
    fields: [
      { key: 'garage', label: 'Garage : surface et caractéristiques', kind: 'text', fiche: true },
      { key: 'sous_sol_dependances', label: 'Sous-sol / cave / dépendances : surfaces', kind: 'text', fiche: true },
      { key: 'annexes', label: 'Terrasse, piscine, véranda ou autres annexes', kind: 'text', fiche: true },
      { key: 'orientation', label: 'Orientation du séjour et du jardin', kind: 'text', fiche: true },
      { key: 'motif_vente', label: 'Motif de la vente et délai souhaité', kind: 'text', fiche: true },
      { key: 'prix_envisage', label: 'Prix envisagé par les propriétaires', kind: 'int', unit: '€', fiche: true },
      { key: 'observations', label: 'Observations', kind: 'textarea', wide: true }
    ]
  },
  {
    id: 'entete',
    title: 'En-tête Laforêt',
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
      { key: 'pieces', label: 'Pièces principales', kind: 'int', aide: 'séjour + chambres + bureau, sans cuisine ni pièces d’eau' },
      { key: 'etage', label: 'Étage', kind: 'int' },
      { key: 'nb_etages', label: 'Nb d’étages de l’immeuble', kind: 'int' },
      { key: 'ascenseur', label: 'Ascenseur', kind: 'tri' },
      { key: 'exterieurs', label: 'Extérieurs et annexes (mots-clés)', kind: 'list', wide: true, aide: 'garage, jardin, terrasse, cave, buanderie…' },
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
    title: 'Diagnostics (détail)',
    fields: [
      { key: 'dpe_valeur', label: 'Consommation', kind: 'int', unit: 'kWh/m²/an' },
      { key: 'ges_classe', label: 'GES', kind: 'select', options: DPE },
      { key: 'ges_valeur', label: 'Émissions', kind: 'int', unit: 'kg CO₂/m²/an' }
    ]
  },
  {
    id: 'notes',
    title: 'Notes internes',
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

export const FICHE_FIELDS = BIEN_FIELDS.filter((f) => f.fiche);

export const BienUpdateSchema = z.object({
  ...Object.fromEntries(BIEN_FIELDS.map((f) => [f.key, zodFor(f)])),
  fiche_na: z.array(z.string())
}) as unknown as z.ZodType<Record<string, unknown> & { fiche_na: string[] }>;

/** Version « brouillon » pour l'IA : tout est facultatif (null si la note ne le dit pas). */
export const BienBrouillonSchema = z.object(
  Object.fromEntries(
    BIEN_FIELDS.filter((f) => f.kind !== 'bool' || f.key === 'web').map((f) => {
      const base = zodFor(f);
      const schema = f.kind === 'list' ? base : f.kind === 'bool' ? z.boolean().nullable() : base instanceof z.ZodNullable ? base : base.nullable();
      return [f.key, f.aide ? schema.describe(`${f.label} (${f.aide})`) : schema.describe(f.label)];
    })
  )
);

export const PieceInputSchema = z.object({
  nom: z.string().trim().min(1),
  longueur: z.number().nullable(),
  largeur: z.number().nullable(),
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

const vide = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

export type Manquant = { key: string; label: string; groupe: string };

/** Ce qui manque à la fiche d'estimation Laforêt : bloque l'enregistrement tant que la liste n'est pas vide. */
export function champsManquants(bien: BienValues, ficheNa: string[], pieces: PieceInput[]): Manquant[] {
  const manquants: Manquant[] = [];
  for (const groupe of BIEN_GROUPS.filter((g) => g.fiche)) {
    for (const f of groupe.fields.filter((x) => x.fiche)) {
      const na = !f.naInterdit && ficheNa.includes(f.key);
      if (vide(bien[f.key]) && !na) manquants.push({ key: f.key, label: f.label, groupe: groupe.title });
    }
  }
  const releve = pieces.filter((p) => p.nom.trim());
  if (releve.length === 0) {
    manquants.push({ key: 'pieces', label: 'Relevé des pièces (au moins une pièce)', groupe: 'Relevé des pièces' });
  }
  releve.forEach((p) => {
    if (!(p.longueur && p.longueur > 0 && p.largeur && p.largeur > 0)) {
      manquants.push({ key: 'pieces', label: `${p.nom} : longueur × largeur`, groupe: 'Relevé des pièces' });
    }
  });
  return manquants;
}

/** Surface d'une pièce : longueur × largeur si les deux sont connues, sinon la surface saisie. */
export function surfacePiece(p: Pick<PieceInput, 'longueur' | 'largeur' | 'surface'>) {
  return p.longueur && p.largeur ? Math.round(p.longueur * p.largeur * 100) / 100 : p.surface;
}
