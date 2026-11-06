// Prix net vendeur retenu : celui saisi par le conseiller s'il a corrigé l'estimation, sinon le prix estimé.
// Calcul pur, utilisable côté client et serveur.

type Base = {
  resultat: {
    valeurBasse: number;
    valeurProbable: number;
    valeurHaute: number;
    prixConseille: number;
  };
  prixRetenu?: number | null;
};

const arrondi = (n: number, pas: number) => Math.round(n / pas) * pas;

export function prixNetVendeur(d: Base) {
  return d.prixRetenu ?? d.resultat.prixConseille;
}

/** Fourchette affichée : celle de l'estimation, recentrée sur le prix saisi par le conseiller le cas échéant. */
export function fourchetteNetVendeur(d: Base) {
  const r = d.resultat;
  if (!d.prixRetenu || !r.valeurProbable) return { basse: r.valeurBasse, haute: r.valeurHaute };
  const k = d.prixRetenu / r.valeurProbable;
  return { basse: arrondi(r.valeurBasse * k, 500), haute: arrondi(r.valeurHaute * k, 500) };
}
