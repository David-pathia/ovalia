import type { CriteresProjet } from '@/lib/rapprochement/score';

// Types partagés de l'import des prospects (aperçu côté navigateur, application côté serveur).

export type ProjetImport = {
  types_bien: string[];
  budget_min: number | null;
  budget_max: number | null;
  chambres_min: number | null;
  surface_min: number | null;
  communes: { code: string; nom: string; lat: number; lon: number }[];
  zone: { ville: string; lat: number; lon: number; rayon_km: number } | null;
  criteres: CriteresProjet;
  localisation_texte: string | null;
  informations: string | null;
  date_contact: string | null;
  import_brut: Record<string, string | null>;
  import_hash: string;
};

export type ItemImport = {
  cle: string;
  nom: string;
  telephone: string | null;
  statut: 'nouveau' | 'modifie' | 'inchange';
  contactId: string | null;
  projetId: string | null;
  changements: string[];
  projet: ProjetImport | null;
};

export type AnalyseImport = {
  items: ItemImport[];
  absents: { contactId: string; nom: string }[];
  doublons: string[];
};

export const LIBELLES_CRITERES: Record<keyof CriteresProjet, string> = {
  garage: 'Garage',
  terrain_min: 'Terrain',
  exterieur: 'Extérieur',
  piscine: 'Piscine / piscinable',
  plain_pied: 'Plain-pied',
  sans_travaux: 'Sans travaux',
  calme: 'Calme',
  vue: 'Vue',
  cachet: 'Cachet'
};

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;

/** Résumé lisible des critères compris par l'IA, pour vérification avant import. */
export function resumeProjet(
  p: Pick<
    ProjetImport,
    'types_bien' | 'budget_max' | 'chambres_min' | 'surface_min' | 'zone' | 'communes' | 'criteres'
  > | null
) {
  if (!p) return '';
  const crit = Object.entries(p.criteres)
    .filter(([, v]) => v)
    .map(([k, v]) =>
      k === 'terrain_min'
        ? `terrain ${v} m²`
        : LIBELLES_CRITERES[k as keyof typeof LIBELLES_CRITERES]?.toLowerCase()
    )
    .filter(Boolean);
  return [
    p.types_bien.join(' / ') || 'type ?',
    p.budget_max ? `≤ ${eur(p.budget_max)}` : null,
    p.chambres_min ? `${p.chambres_min} ch.+` : null,
    p.surface_min ? `${p.surface_min} m²+` : null,
    p.zone
      ? `${p.zone.rayon_km} km autour de ${p.zone.ville}`
      : p.communes.length
        ? p.communes.map((c) => c.nom).join(', ')
        : 'secteur ?',
    crit.length ? crit.join(', ') : null
  ]
    .filter(Boolean)
    .join(' · ');
}
