import 'server-only';
import { z } from 'zod';
import { anthropicConfigured, demanderTexte, extraireJson } from './client';

// Lecture commerciale du bien pour l'avis de valeur : points forts, points de vigilance et cible acquéreur.

const SyntheseSchema = z.object({
  pointsForts: z.array(z.string()),
  vigilance: z.array(z.string()),
  cibles: z.array(z.object({ profil: z.string(), raison: z.string(), approche: z.string() }))
});
export type SyntheseBien = z.infer<typeof SyntheseSchema>;

const SYSTEM = `Tu es conseiller immobilier dans une agence Laforêt (Roanne, Loire). On te donne la fiche d'un bien relevée lors de la visite.
Tu prépares, pour le dossier d'estimation remis au propriétaire, une lecture équilibrée et transparente du bien.

- pointsForts : 4 à 6 atouts qui soutiennent sa valeur et son attractivité (emplacement, jardin, luminosité, agencement, équipements, stationnement…). Une phrase courte chacun (12 mots au plus).
- vigilance : 2 à 5 points objectifs susceptibles d'influencer la commercialisation (travaux, DPE, chauffage ancien, assainissement à contrôler, absence d'extérieur…). Ton factuel et bienveillant, sans dramatiser. Une phrase courte chacun.
- cibles : les 2 ou 3 profils d'acquéreurs prioritaires, du plus au moins pertinent, choisis parmi les suivants et seulement s'ils sont réellement adaptés au bien :
  Famille (chambres, jardin, écoles, environnement) ; Primo-accédant (budget, financement, travaux éventuels) ;
  Investisseur (rentabilité locative, charges, potentiel de location) ; Profession libérale (accessibilité, stationnement, possibilités d'aménagement) ;
  Artisan (garage, atelier, dépendances, stockage) ; Retraité (plain-pied, accessibilité, proximité des commerces) ;
  Résidence secondaire (environnement, entretien, potentiel de loisirs).
  Pour chacun : « raison » = justification concrète tirée de la fiche (15 mots au plus) ; « approche » = comment adapter notre communication pour ce profil (15 mots au plus).

Règles : n'utilise que les informations fournies, n'invente rien ; ne parle ni du prix ni du motif de vente. Écris en français.

Réponds uniquement avec un objet JSON valide, sans texte autour :
${JSON.stringify(z.toJSONSchema(SyntheseSchema))}`;

const CHAMPS = [
  'type',
  'surface',
  'pieces',
  'chambres',
  'surface_terrain',
  'annee_construction',
  'annee_renovations',
  'nb_niveaux',
  'etage',
  'ascenseur',
  'type_construction',
  'isolation_combles',
  'isolation_murs',
  'isolation_plancher',
  'fenetres',
  'toiture',
  'chauffage_systeme',
  'chauffage_energie',
  'chauffage_annee',
  'eau_chaude',
  'ventilation',
  'assainissement',
  'dpe_classe',
  'ges_classe',
  'derniers_travaux',
  'travaux_a_prevoir',
  'garage',
  'sous_sol_dependances',
  'annexes',
  'orientation',
  'exterieurs',
  'etat_general',
  'observations',
  'ville'
] as const;

export async function genererSynthese(
  bien: Record<string, unknown>,
  pieces: { nom: string; surface: number | null }[]
): Promise<{ ok: true; synthese: SyntheseBien } | { ok: false; error: string }> {
  if (!anthropicConfigured())
    return { ok: false, error: 'Clé IA absente : complétez ces rubriques à la main.' };
  const fiche = Object.fromEntries(
    CHAMPS.map((k) => [k, bien[k]]).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  try {
    const { stopReason, texte } = await demanderTexte(
      SYSTEM,
      JSON.stringify({ bien: fiche, pieces }, null, 1)
    );
    if (stopReason === 'refusal')
      return { ok: false, error: 'L’IA a refusé de rédiger la synthèse.' };
    const parsed = SyntheseSchema.safeParse(extraireJson(texte));
    if (!parsed.success) return { ok: false, error: 'Réponse IA illisible : relancez.' };
    const nettoie = (l: string[], max: number) =>
      l
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, max);
    return {
      ok: true,
      synthese: {
        pointsForts: nettoie(parsed.data.pointsForts, 6),
        vigilance: nettoie(parsed.data.vigilance, 5),
        cibles: parsed.data.cibles.filter((c) => c.profil.trim()).slice(0, 3)
      }
    };
  } catch (error) {
    console.error('synthese.ia', error);
    return { ok: false, error: 'Le service IA n’a pas répondu : relancez.' };
  }
}
