import 'server-only';
import { z } from 'zod';
import { anthropicConfigured, demanderTexte, extraireJson } from './client';

// Structure les colonnes en texte libre du tableau de prospects (type, budget, localisation, informations).

const LigneSchema = z.object({
  i: z.number(),
  types: z.array(z.enum(['maison', 'appartement', 'immeuble', 'terrain', 'garage', 'local'])),
  budget_min: z.number().nullable(),
  budget_max: z.number().nullable(),
  communes: z.array(z.string()),
  zone: z.object({ ville: z.string(), rayon_km: z.number() }).nullable(),
  criteres: z.object({
    garage: z.boolean().optional(),
    terrain_min: z.number().nullable().optional(),
    exterieur: z.boolean().optional(),
    piscine: z.boolean().optional(),
    plain_pied: z.boolean().optional(),
    sans_travaux: z.boolean().optional(),
    calme: z.boolean().optional(),
    vue: z.boolean().optional(),
    cachet: z.boolean().optional()
  })
});
const ReponseSchema = z.object({ lignes: z.array(LigneSchema) });
export type ProspectStructure = z.infer<typeof LigneSchema>;

const SYSTEM = `Tu aides une agence immobilière de Roanne (Loire, 42) à structurer son fichier d'acquéreurs.
Pour chaque ligne, déduis :
- types : parmi maison, appartement, immeuble, terrain, garage, local (« local commercial » → local ; « ferme » → maison ; « studio » → appartement ; « maison ou appartement » → les deux). Vide si non précisé.
- budget_min / budget_max en euros : « 300000 » → max 300000 ; « 150000/250000 » → min 150000, max 250000.
- communes : les communes citées, écrites correctement (« ST JUST EN CHEVALET » → « Saint-Just-en-Chevalet », « LE COT » → « Le Coteau »). Un code postal (« 42155 ») → les communes principales de ce code. Les régions informelles (« côte roannaise ») → les communes citées s'il y en a, sinon une zone.
- zone : si la recherche est exprimée en distance ou en temps (« 15 minutes de Roanne », « 10 km de Saint-Symphorien-de-Lay », « jusqu'à 25 min »), la ville centre (Roanne par défaut) et un rayon en km (1 minute ≈ 1 km). Sinon null.
- criteres, à partir des informations : garage, terrain_min (m²), exterieur (jardin, terrasse, extérieur), piscine (piscine ou terrain piscinable), plain_pied (plain-pied, chambre au rez-de-chaussée), sans_travaux, calme, vue, cachet (pierre, caractère, cachet). N'indique que ce qui est demandé.
N'invente rien. Réponds uniquement avec un objet JSON valide, sans texte autour :
${JSON.stringify(z.toJSONSchema(ReponseSchema))}`;

export type LigneAStructurer = {
  i: number;
  type: string;
  budget: string;
  localisation: string;
  informations: string;
};

async function lot(lignes: LigneAStructurer[]): Promise<ProspectStructure[]> {
  const { texte } = await demanderTexte(SYSTEM, JSON.stringify(lignes));
  const parsed = ReponseSchema.safeParse(extraireJson(texte));
  return parsed.success ? parsed.data.lignes : [];
}

/** Structure les lignes par lots de 25, en parallèle. Les lignes non comprises reviennent sans critères. */
export async function structurerProspects(
  lignes: LigneAStructurer[]
): Promise<{ ok: true; resultats: Map<number, ProspectStructure> } | { ok: false; error: string }> {
  if (!lignes.length) return { ok: true, resultats: new Map() };
  if (!anthropicConfigured())
    return { ok: false, error: 'Clé IA absente : la lecture des critères est impossible.' };
  const lots: LigneAStructurer[][] = [];
  for (let k = 0; k < lignes.length; k += 25) lots.push(lignes.slice(k, k + 25));
  try {
    const resultats = (await Promise.all(lots.map(lot))).flat();
    return { ok: true, resultats: new Map(resultats.map((r) => [r.i, r])) };
  } catch (error) {
    console.error('prospects.ia', error);
    return { ok: false, error: 'Le service IA n’a pas répondu : relancez l’import.' };
  }
}
