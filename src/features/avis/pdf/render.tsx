import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { analyseMarche } from '@/features/marche/core';
import { lireParametresCredit } from '@/features/credit/data';
import { simuler, tauxPourDuree, usurePourDuree } from '@/lib/credit';
import { avisParDefaut, chargerBienPourAvis, infosAnnonce } from '../data';
import { cleComparable, type AvisDetails } from '../types';
import { COUCHE_ORTHO_CADASTRE, carteStatique, parcelleDuBien } from './carte';
import { EQUIPE_TRANSACTION } from '../laforet';
import { AvisDocument } from './document';
import type { AvisPdfData, ImagePdf } from './base';

async function telechargerImage(
  supabase: SupabaseClient,
  chemin: string
): Promise<ImagePdf | null> {
  const { data } = await supabase.storage.from('biens').download(chemin);
  if (!data) return null;
  const format = /\.png$/i.test(chemin) ? 'png' : 'jpg';
  return { data: Buffer.from(await data.arrayBuffer()), format };
}

async function population(codeInsee: string) {
  try {
    const res = await fetch(`https://geo.api.gouv.fr/communes/${codeInsee}?fields=population`, {
      next: { revalidate: 60 * 60 * 24 * 30 }
    });
    if (!res.ok) return null;
    return ((await res.json()) as { population?: number }).population ?? null;
  } catch {
    return null;
  }
}

// Photo du conseiller pour la couverture (fichier du projet, tracé par next.config).
async function photoConseiller(): Promise<ImagePdf | null> {
  try {
    return {
      data: await readFile(path.join(process.cwd(), 'src/features/avis/assets/conseiller.jpg')),
      format: 'jpg'
    };
  } catch {
    return null;
  }
}

const ASSETS = path.join(process.cwd(), 'src/features/avis/assets');

async function lireImage(fichier: string): Promise<ImagePdf | null> {
  try {
    return { data: await readFile(path.join(ASSETS, fichier)), format: 'jpg' };
  } catch {
    return null;
  }
}

/** Situation cadastrale : parcelle retrouvée à partir de l'adresse exacte du bien, sur photo aérienne et cadastre. */
async function cadastre(
  adresse: string,
  repli: { lat: number; lon: number } | null
): Promise<AvisPdfData['cadastre']> {
  const { parcelle, point } = await parcelleDuBien(adresse, repli);
  if (!point) return null;
  const polygones = parcelle?.contour.length ? [parcelle.contour] : [];
  const carte = await carteStatique(parcelle ? [point] : [{ ...point, principal: true }], {
    couches: COUCHE_ORTHO_CADASTRE,
    polygones,
    etendueMinM: 160,
    margeM: 40,
    largeur: 1600,
    hauteur: 1150
  });
  // Avec la parcelle, son contour suffit ; sans elle, le repère situe l'adresse.
  if (carte && parcelle) carte.reperes = [];
  return { carte, environnement: null, parcelle };
}

/** Construit toutes les données du dossier puis rend le PDF. */
export async function genererAvisPdf(
  supabase: SupabaseClient,
  bienId: string
): Promise<{ ok: true; pdf: Buffer; nom: string } | { ok: false; error: string }> {
  const donnees = await chargerBienPourAvis(supabase, bienId);
  if (!donnees) return { ok: false, error: 'Bien introuvable.' };
  const { bien, pieces, estimation, photos } = donnees;
  // Avis relu et complété comme dans l'éditeur : un avis enregistré avant une évolution du dossier reçoit les nouveaux champs.
  const avis: AvisDetails | null | undefined = donnees.avis ? avisParDefaut(donnees) : undefined;
  if (!estimation) return { ok: false, error: 'Lancez d’abord l’estimation du bien.' };
  if (!avis) return { ok: false, error: 'Enregistrez d’abord l’avis de valeur.' };

  const det = estimation.details;
  const loc = det.localisation;
  const tri = [...det.comparables].sort((a, b) => b.poids - a.poids);
  const retenus = avis.comparables.length
    ? tri.filter((c) => avis.comparables.includes(cleComparable(c)))
    : tri.slice(0, 8);
  const comparables = retenus.map((c, i) => ({ ...c, n: i + 1 }));

  const pointBien =
    bien.latitude && bien.longitude
      ? { lat: Number(bien.latitude), lon: Number(bien.longitude) }
      : loc.precision === 'adresse'
        ? { lat: loc.lat, lon: loc.lon }
        : null;
  const [
    marche,
    pop,
    carteSecteur,
    carteComp,
    couverture,
    imagesBien,
    parametres,
    cadastreBien,
    equipe
  ] = await Promise.all([
    analyseMarche({
      lieu: [bien.adresse, bien.code_postal, bien.ville].filter(Boolean).join(' ') || loc.commune,
      rayonKm: Math.min(5, Math.max(1, Math.ceil(det.marche.rayonKm || 3))),
      type: bien.type === 'appartement' ? 'appartement' : 'maison',
      surfaceMin: null,
      surfaceMax: null,
      piecesMin: null,
      piecesMax: null,
      terrainMin: null,
      terrainMax: null,
      annees: 3
    }).then((r) => (r.ok ? r.data : null)),
    population(loc.codeInsee),
    carteStatique([{ lat: loc.lat, lon: loc.lon, principal: true }], {
      etendueMinM: 1800,
      largeur: 1400,
      hauteur: 560
    }),
    (async () => {
      // Les estimations antérieures à l'avis de valeur ne gardaient pas les coordonnées des ventes : elles n'apparaissent pas sur la carte.
      const points = comparables.filter(
        (c) => typeof c.lat === 'number' && typeof c.lon === 'number'
      );
      return carteStatique(
        [
          { lat: loc.lat, lon: loc.lon, principal: true },
          ...points.map((c) => ({
            lat: c.lat as number,
            lon: c.lon as number,
            libelle: String(c.n)
          }))
        ],
        { etendueMinM: 1500, largeur: 1400, hauteur: 700, margeM: 300 }
      );
    })(),
    avis.photos.couverture ? photos.find((p) => p.id === avis.photos.couverture) : undefined,
    Promise.all(
      avis.photos.bien
        .map((id) => photos.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => telechargerImage(supabase, p.path))
    ),
    lireParametresCredit(),
    cadastre([bien.adresse, bien.code_postal, bien.ville].filter(Boolean).join(' '), pointBien),
    Promise.all(
      EQUIPE_TRANSACTION.map(async (m) => ({
        prenom: m.prenom,
        nom: m.nom,
        role: m.role,
        photo: await lireImage(m.photo)
      }))
    )
  ]);

  // Grille de financement : durées 15 / 20 / 25 ans × apport 0 %, 10 %, 20 % (frais de notaire inclus dans le besoin).
  let credit: AvisPdfData['credit'] = null;
  const notaire = Math.round((avis.prix.conseille * parametres.notaire_pct) / 100);
  const besoin = avis.prix.conseille + notaire;
  const durees = [15, 20, 25];
  const taux = durees.map((n) => tauxPourDuree(parametres, n));
  if (taux.some((t) => t !== null)) {
    credit = {
      durees,
      taux,
      lignes: [0, 10, 20].map((apportPct) => {
        const apport = Math.round((besoin * apportPct) / 100);
        const capital = besoin - apport;
        return {
          apportPct,
          apport,
          capital,
          sims: durees.map((n, i) =>
            taux[i] === null
              ? null
              : simuler(
                  capital,
                  taux[i]!,
                  n,
                  parametres.assurance_pct,
                  usurePourDuree(parametres, n)
                )
          )
        };
      }),
      notaire,
      notairePct: parametres.notaire_pct,
      assurancePct: parametres.assurance_pct,
      source: parametres.source,
      date: parametres.taux_du
    };
  }

  const data: AvisPdfData = {
    avis,
    bien,
    pieces: pieces as AvisPdfData['pieces'],
    estimation: det,
    secteur: {
      commune: loc.commune,
      population: pop,
      marche,
      carte: carteSecteur
    },
    comparables,
    carteComparables: carteComp && carteComp.reperes.length > 1 ? carteComp : null,
    photos: {
      couverture: couverture ? await telechargerImage(supabase, couverture.path) : null,
      bien: imagesBien.filter((x): x is ImagePdf => x !== null)
    },
    credit,
    cadastre: cadastreBien,
    equipe,
    infos: infosAnnonce(bien),
    photoConseiller: await photoConseiller()
  };

  const pdf = await renderToBuffer(<AvisDocument d={data} />);
  const nom = `estimation-${
    [bien.ville, bien.adresse]
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'bien'
  }.pdf`;
  return { ok: true, pdf, nom };
}
