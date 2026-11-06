// Barème des honoraires de transaction Laforêt Roanne, appliqué au net vendeur (choix validé par l'agence).
// Sert uniquement aux rapprochements : l'estimation et l'avis de valeur restent en net vendeur.

export const BAREME_HONORAIRES: { jusqua: number; forfait?: number; taux?: number }[] = [
  { jusqua: 60_000, forfait: 6_000 },
  { jusqua: 100_000, forfait: 7_500 },
  { jusqua: 150_000, forfait: 9_000 },
  { jusqua: Infinity, taux: 0.06 }
];

export function honorairesBareme(netVendeur: number): { montant: number; libelle: string } {
  const tranche = BAREME_HONORAIRES.find((t) => netVendeur <= t.jusqua)!;
  if (tranche.forfait) return { montant: tranche.forfait, libelle: 'forfait' };
  return {
    montant: Math.round(netVendeur * tranche.taux!),
    libelle: `${Math.round(tranche.taux! * 100)} %`
  };
}
