// Rapprochement bien ↔ projet de recherche : critères bloquants (type, budget, localisation, chambres, surface)
// puis critères de confort tirés des informations du prospect. Calcul pur, utilisable côté client et serveur.

import { distanceKm, type Point } from '@/lib/estimation/geo';

/** Fourchette de prix retenue autour du budget acquéreur (FAI) : de −15 % à +5 % ; en dehors, le bien est écarté. */
export const TOLERANCE_BUDGET = { dessous: 0.15, dessus: 0.05 };
export const SCORE_MIN = 50;

export type CriteresProjet = {
  garage?: boolean;
  terrain_min?: number | null;
  exterieur?: boolean;
  piscine?: boolean;
  plain_pied?: boolean;
  sans_travaux?: boolean;
  calme?: boolean;
  vue?: boolean;
  cachet?: boolean;
};

export type ProjetRapprochement = {
  id: string;
  types: string[]; // maison, appartement, immeuble, terrain, garage, local
  budgetMin: number | null;
  budgetMax: number | null;
  chambresMin: number | null;
  surfaceMin: number | null;
  communes: { code: string; nom: string; lat: number; lon: number }[];
  zone: { ville: string; lat: number; lon: number; rayon_km: number } | null;
  criteres: CriteresProjet;
};

export type BienRapprochement = {
  id: string;
  type: string;
  prixFai: number | null;
  prixSource: 'affiche' | 'fiche' | 'bareme' | null;
  /** Explication du prix FAI comparé au budget (prix affiché, ou net vendeur + honoraires). */
  prixDetail: string | null;
  chambres: number | null;
  surface: number | null;
  terrain: number | null;
  codeInsee: string | null;
  point: Point | null;
  nbNiveaux: number | null;
  chambreRdc: boolean;
  garage: boolean | null;
  exterieur: boolean | null;
  piscine: boolean;
  travauxAPrevoir: boolean | null;
};

export type EtatCritere = 'ok' | 'partiel' | 'ko' | 'inconnu';
export type DetailCritere = { critere: string; etat: EtatCritere; texte: string };

const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;

export function scoreRapprochement(
  bien: BienRapprochement,
  projet: ProjetRapprochement
): { score: number; details: DetailCritere[] } | null {
  const details: DetailCritere[] = [];
  let score = 100;

  // Type de bien : bloquant.
  if (projet.types.length && !projet.types.includes(bien.type)) return null;

  // Budget FAI : prix du bien entre −15 % et +5 % du budget (la borne basse de l'acquéreur est gardée si elle est plus basse).
  if (projet.budgetMax && bien.prixFai) {
    const plancher = Math.min(
      projet.budgetMax * (1 - TOLERANCE_BUDGET.dessous),
      projet.budgetMin ?? Infinity
    );
    const plafond = projet.budgetMax * (1 + TOLERANCE_BUDGET.dessus);
    if (bien.prixFai > plafond || bien.prixFai < plancher) return null;
    const ecart = bien.prixFai / projet.budgetMax - 1;
    if (ecart <= 0)
      details.push({
        critere: 'Budget',
        etat: 'ok',
        texte: `${fmt(bien.prixFai)} pour ${fmt(projet.budgetMax)} max.`
      });
    else {
      score -= 5;
      details.push({
        critere: 'Budget',
        etat: 'partiel',
        texte: `${fmt(bien.prixFai)}, +${Math.round(ecart * 100)} % sur son budget`
      });
    }
  } else
    details.push({
      critere: 'Budget',
      etat: 'inconnu',
      texte: bien.prixFai ? `${fmt(bien.prixFai)}, budget non précisé` : 'prix du bien inconnu'
    });

  // Localisation : communes citées ou zone autour d'une ville.
  if (projet.communes.length || projet.zone) {
    let etat: EtatCritere = 'ko';
    let texte = 'hors de sa zone de recherche';
    if (bien.codeInsee && projet.communes.some((c) => c.code === bien.codeInsee)) {
      etat = 'ok';
      texte = 'commune recherchée';
    } else if (bien.point) {
      const proche = projet.communes
        .map((c) => ({ c, d: distanceKm(bien.point!, { lat: c.lat, lon: c.lon }) }))
        .sort((a, b) => a.d - b.d)[0];
      const dZone = projet.zone
        ? distanceKm(bien.point, { lat: projet.zone.lat, lon: projet.zone.lon })
        : null;
      if (dZone !== null && dZone <= projet.zone!.rayon_km) {
        etat = 'ok';
        texte = `à ${Math.round(dZone)} km de ${projet.zone!.ville}`;
      } else if (proche && proche.d <= 3) {
        etat = 'partiel';
        texte = `à ${proche.d.toFixed(1).replace('.', ',')} km de ${proche.c.nom}`;
      } else if (dZone !== null && dZone <= projet.zone!.rayon_km * 1.3) {
        etat = 'partiel';
        texte = `à ${Math.round(dZone)} km de ${projet.zone!.ville}, un peu au-delà`;
      }
    } else {
      etat = 'inconnu';
      texte = 'position du bien inconnue';
    }
    if (etat === 'ko') return null;
    if (etat === 'partiel') score -= 15;
    if (etat === 'inconnu') score -= 5;
    details.push({ critere: 'Secteur', etat, texte });
  }

  // Chambres et surface minimales.
  if (projet.chambresMin) {
    if (bien.chambres === null) {
      score -= 5;
      details.push({
        critere: 'Chambres',
        etat: 'inconnu',
        texte: `${projet.chambresMin} demandées`
      });
    } else if (bien.chambres >= projet.chambresMin)
      details.push({
        critere: 'Chambres',
        etat: 'ok',
        texte: `${bien.chambres} pour ${projet.chambresMin} demandées`
      });
    else if (bien.chambres === projet.chambresMin - 1) {
      score -= 15;
      details.push({
        critere: 'Chambres',
        etat: 'partiel',
        texte: `${bien.chambres} pour ${projet.chambresMin} demandées`
      });
    } else return null;
  }
  if (projet.surfaceMin) {
    if (bien.surface === null) score -= 5;
    else if (bien.surface >= projet.surfaceMin)
      details.push({
        critere: 'Surface',
        etat: 'ok',
        texte: `${Math.round(bien.surface)} m² pour ${projet.surfaceMin} m² min.`
      });
    else if (bien.surface >= projet.surfaceMin * 0.9) {
      score -= 10;
      details.push({
        critere: 'Surface',
        etat: 'partiel',
        texte: `${Math.round(bien.surface)} m² pour ${projet.surfaceMin} m² min.`
      });
    } else return null;
  }

  // Critères de confort : non bloquants.
  const c = projet.criteres;
  const confort = (
    critere: string,
    demande: boolean | undefined,
    valeur: boolean | null,
    ok: string,
    ko: string
  ) => {
    if (!demande) return;
    if (valeur === null) {
      score -= 2;
      details.push({ critere, etat: 'inconnu', texte: 'à vérifier' });
    } else if (valeur) details.push({ critere, etat: 'ok', texte: ok });
    else {
      score -= 8;
      details.push({ critere, etat: 'ko', texte: ko });
    }
  };
  confort('Garage', c.garage, bien.garage, 'oui', 'pas de garage');
  if (c.terrain_min) {
    if (bien.terrain === null) {
      score -= 2;
      details.push({ critere: 'Terrain', etat: 'inconnu', texte: `${c.terrain_min} m² souhaités` });
    } else if (bien.terrain >= c.terrain_min)
      details.push({ critere: 'Terrain', etat: 'ok', texte: `${Math.round(bien.terrain)} m²` });
    else {
      score -= 8;
      details.push({
        critere: 'Terrain',
        etat: 'ko',
        texte: `${Math.round(bien.terrain)} m² pour ${c.terrain_min} souhaités`
      });
    }
  }
  confort('Extérieur', c.exterieur, bien.exterieur, 'oui', 'sans extérieur');
  confort(
    'Piscine',
    c.piscine,
    bien.piscine ? true : bien.terrain === null ? null : bien.terrain >= 400 ? null : false,
    'oui',
    'terrain trop petit'
  );
  confort(
    'Plain-pied',
    c.plain_pied,
    bien.nbNiveaux === 1 || bien.chambreRdc ? true : bien.nbNiveaux === null ? null : false,
    'vie de plain-pied possible',
    'pas de chambre au rez-de-chaussée'
  );
  confort(
    'Sans travaux',
    c.sans_travaux,
    bien.travauxAPrevoir === null ? null : !bien.travauxAPrevoir,
    'pas de gros travaux',
    'travaux à prévoir'
  );
  for (const [cle, libelle] of [
    ['calme', 'Calme'],
    ['vue', 'Vue'],
    ['cachet', 'Cachet']
  ] as const) {
    if (c[cle]) details.push({ critere: libelle, etat: 'inconnu', texte: 'à apprécier en visite' });
  }

  return { score: Math.max(0, Math.min(100, score)), details };
}
