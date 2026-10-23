// Listes Laforêt (identiques aux contraintes SQL de la table `biens`).

export const TYPES_BIEN = [
  ['appartement', 'Appartement'],
  ['maison', 'Maison'],
  ['immeuble', 'Immeuble'],
  ['terrain', 'Terrain'],
  ['garage', 'Garage'],
  ['local', 'Local']
] as const;

export const STATUTS_BIEN = [
  ['estimation', 'Estimation'],
  ['avant_premiere', 'En avant-première'],
  ['mandat_en_cours', 'Mandat en cours'],
  ['sous_offre', 'Sous offre'],
  ['suspendu', 'Suspendu']
] as const;

export const TYPES_MANDAT = [
  ['favoriz', 'Favoriz'],
  ['simple', 'Mandat simple']
] as const;

export const CLASSIF_PROJET = [
  ['court_terme', 'Court terme'],
  ['moyen_terme', 'Moyen terme'],
  ['long_terme', 'Long terme']
] as const;

export type TypeBien = (typeof TYPES_BIEN)[number][0];

export function libelle(list: readonly (readonly [string, string])[], value: string | null | undefined) {
  return list.find(([v]) => v === value)?.[1] ?? value ?? '—';
}
