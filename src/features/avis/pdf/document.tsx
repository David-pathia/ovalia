import path from 'node:path';
import {
  Defs,
  Document,
  Font,
  Image,
  LinearGradient,
  Page,
  Path,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
  Line,
  Circle
} from '@react-pdf/renderer';
import type { EstimationDetails } from '@/lib/estimation/estimer';
import type { Simulation } from '@/lib/credit';
import type { ResultatMarche } from '@/features/marche/types';
import { BIEN_GROUPS, type BienValues } from '@/features/biens/fields';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import {
  PAGES_APRES_ESTIMATION,
  PAGES_AVIS,
  mentionsAnnonce,
  type AvisDetails,
  type InfosAnnonce
} from '../types';
import type { CarteStatique } from './carte';

// ---------------------------------------------------------------------------
// Charte du dossier remis au client : couleurs et typographie Laforêt.
// ---------------------------------------------------------------------------
const C = {
  marine: '#1F3A8A',
  bleu: '#2B55B0',
  ciel: '#4A9BDD',
  pale: '#EAF2FB',
  trait: '#B9D3EF',
  texte: '#1C2747',
  doux: '#5B6B8C',
  blanc: '#FFFFFF',
  ok: '#2E8B57',
  alerte: '#C2410C'
};

const FONTS = path.join(process.cwd(), 'src/features/avis/fonts');
Font.register({
  family: 'Lexend',
  fonts: [300, 400, 600, 700].map((w) => ({
    src: path.join(FONTS, `lexend-latin-${w}-normal.woff`),
    fontWeight: w
  }))
});
Font.registerHyphenationCallback((mot) => [mot]);

const s = StyleSheet.create({
  page: {
    fontFamily: 'Lexend',
    fontSize: 9.5,
    color: C.texte,
    paddingTop: 92,
    paddingBottom: 54,
    paddingHorizontal: 42,
    lineHeight: 1.45
  },
  bandeau: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 42,
    height: 40,
    justifyContent: 'center',
    paddingLeft: 42
  },
  bandeauTexte: {
    color: C.blanc,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 2.4,
    lineHeight: 1.2
  },
  pied: {
    position: 'absolute',
    bottom: 22,
    left: 42,
    right: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.doux
  },
  carte: {
    borderWidth: 1.2,
    borderColor: C.ciel,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  carteBleue: {
    backgroundColor: C.marine,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    color: C.blanc
  },
  h2: {
    fontSize: 14,
    fontWeight: 600,
    color: C.marine,
    marginBottom: 8,
    lineHeight: 1.25
  },
  h3: {
    fontSize: 10.5,
    fontWeight: 600,
    color: C.marine,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  petit: { fontSize: 7.5, color: C.doux },
  ligne: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: C.trait,
    paddingVertical: 4
  },
  kpiValeur: {
    fontSize: 17,
    fontWeight: 700,
    color: C.marine,
    lineHeight: 1.25,
    marginVertical: 2
  },
  kpiLabel: {
    fontSize: 7.5,
    color: C.doux,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    lineHeight: 1.3
  }
});

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------
export type ImagePdf = { data: Buffer; format: 'jpg' | 'png' };
export type ComparablePdf = EstimationDetails['comparables'][number] & {
  n: number;
};

export type AvisPdfData = {
  avis: AvisDetails;
  bien: BienValues & Record<string, unknown>;
  pieces: {
    nom: string;
    longueur: number | null;
    largeur: number | null;
    surface: number | null;
    niveau: string | null;
  }[];
  estimation: EstimationDetails;
  secteur: {
    commune: string;
    population: number | null;
    marche: ResultatMarche | null;
    carte: CarteStatique | null;
  };
  comparables: ComparablePdf[];
  carteComparables: CarteStatique | null;
  photos: { couverture: ImagePdf | null; bien: ImagePdf[] };
  credit: {
    simulations: Simulation[];
    apport: number;
    capital: number;
    source: string | null;
    date: string | null;
  } | null;
  infos: InfosAnnonce;
};

const annonceVisible = (d: AvisPdfData) =>
  Boolean(d.avis.annonce && (d.avis.annonce.titre.trim() || d.avis.annonce.texte.trim()));

// L'espace fine insécable (U+202F) des nombres français n'existe pas dans la police : on la remplace par une espace insécable.
const espace = (t: string) => t.replace(/[\u202f\u2009]/g, '\u00a0');
const nb = (n: number, d = 0) => espace(n.toLocaleString('fr-FR', { maximumFractionDigits: d }));
const eur = (n: number) => `${nb(Math.round(n))}\u00a0€`;
const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
const moisAnnee = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric'
  });
const vide = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

// ---------------------------------------------------------------------------
// Éléments communs
// ---------------------------------------------------------------------------
function Bandeau({ titre }: { titre: string }) {
  return (
    <View fixed style={s.bandeau}>
      <Svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 553,
          height: 40
        }}
        viewBox='0 0 553 40'
      >
        <Defs>
          <LinearGradient id='bandeau' x1='0' y1='0' x2='1' y2='0'>
            <Stop offset='0' stopColor={C.marine} />
            <Stop offset='0.65' stopColor={C.bleu} />
            <Stop offset='1' stopColor={C.ciel} />
          </LinearGradient>
        </Defs>
        <Rect x='0' y='0' width='553' height='40' fill='url(#bandeau)' />
      </Svg>
      <Text style={s.bandeauTexte}>{titre.toUpperCase()}</Text>
    </View>
  );
}

function Pied({ avis }: { avis: AvisDetails }) {
  return (
    <View fixed style={s.pied}>
      <Text>
        {avis.agence.nom} · {avis.agence.telephone} · {avis.agence.email}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function PageDossier({
  titre,
  avis,
  children
}: {
  titre: string;
  avis: AvisDetails;
  children: React.ReactNode;
}) {
  return (
    <Page size='A4' style={s.page} wrap>
      <Bandeau titre={titre} />
      {children}
      <Pied avis={avis} />
    </Page>
  );
}

function Kpi({ label, valeur, aide }: { label: string; valeur: string; aide?: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.pale,
        borderRadius: 10,
        padding: 10
      }}
    >
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValeur}>{valeur}</Text>
      {aide && <Text style={s.petit}>{aide}</Text>}
    </View>
  );
}

function Carte({
  carte,
  hauteur,
  numeros
}: {
  carte: CarteStatique;
  hauteur: number;
  numeros?: boolean;
}) {
  return (
    <View
      style={{
        position: 'relative',
        height: hauteur,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.trait
      }}
    >
      <Image src={carte.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {carte.reperes.map((r, i) =>
        r.principal ? (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${r.x}%`,
              top: `${r.y}%`,
              marginLeft: -9,
              marginTop: -9,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.alerte,
              borderWidth: 3,
              borderColor: C.blanc
            }}
          />
        ) : (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${r.x}%`,
              top: `${r.y}%`,
              marginLeft: -7,
              marginTop: -7,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: C.marine,
              borderWidth: 1.5,
              borderColor: C.blanc,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {numeros && (
              <Text
                style={{
                  color: C.blanc,
                  fontSize: 6.5,
                  fontWeight: 700,
                  lineHeight: 1
                }}
              >
                {r.libelle}
              </Text>
            )}
          </View>
        )
      )}
      <Text
        style={{
          position: 'absolute',
          right: 4,
          bottom: 3,
          fontSize: 5.5,
          color: C.doux,
          backgroundColor: '#ffffffcc',
          paddingHorizontal: 3
        }}
      >
        Plan © IGN Géoplateforme
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
function Couverture({ d }: { d: AvisPdfData }) {
  const { avis, bien } = d;
  const destinataire = [
    avis.destinataire.civilite,
    avis.destinataire.prenom,
    avis.destinataire.nom.toUpperCase()
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Page size='A4' style={{ fontFamily: 'Lexend', color: C.texte }}>
      <Svg
        fixed
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 595,
          height: 841
        }}
        viewBox='0 0 595 841'
      >
        <Defs>
          <LinearGradient id='fond' x1='0' y1='0' x2='1' y2='0.3'>
            <Stop offset='0' stopColor={C.marine} />
            <Stop offset='0.7' stopColor={C.bleu} />
            <Stop offset='1' stopColor={C.ciel} />
          </LinearGradient>
        </Defs>
        <Rect x='0' y='0' width='595' height='841' fill='url(#fond)' />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 46,
          right: 46,
          bottom: 96,
          backgroundColor: C.blanc,
          borderRadius: 20,
          paddingHorizontal: 44,
          paddingTop: 50
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: C.ciel,
            lineHeight: 1.15
          }}
        >
          L’estimation
        </Text>
        <Text
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: C.marine,
            lineHeight: 1.15
          }}
        >
          de votre bien
        </Text>

        <View
          style={{
            alignSelf: 'center',
            marginTop: 30,
            backgroundColor: C.marine,
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 34,
            alignItems: 'center'
          }}
        >
          {destinataire && (
            <Text style={{ color: C.blanc, fontSize: 10.5, fontWeight: 600 }}>{destinataire}</Text>
          )}
          {!vide(bien.adresse) && (
            <Text style={{ color: C.blanc, fontSize: 10.5, fontWeight: 600 }}>
              {String(bien.adresse)}
            </Text>
          )}
          <Text style={{ color: C.blanc, fontSize: 10.5, fontWeight: 600 }}>
            {[bien.code_postal, bien.ville].filter(Boolean).join(' ')}
          </Text>
        </View>

        {d.photos.couverture ? (
          <Image
            src={d.photos.couverture}
            style={{
              marginTop: 26,
              height: 270,
              borderRadius: 14,
              objectFit: 'cover'
            }}
          />
        ) : (
          <View
            style={{
              marginTop: 26,
              height: 270,
              borderRadius: 14,
              backgroundColor: C.pale,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: C.doux, fontSize: 11 }}>
              {libelle(TYPES_BIEN, String(bien.type))}
              {bien.surface ? ` · ${nb(Number(bien.surface))} m²` : ''}
            </Text>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 34,
            gap: 16
          }}
        >
          <View
            style={{
              alignItems: 'flex-end',
              borderRightWidth: 1,
              borderRightColor: C.ciel,
              paddingRight: 16
            }}
          >
            <Text style={{ fontWeight: 600, color: C.marine, fontSize: 10 }}>Votre agence</Text>
            <Text style={{ fontSize: 8.5, color: C.marine }}>{avis.agence.nom}</Text>
            <Text style={{ fontSize: 8.5, color: C.marine }}>{avis.agence.adresse}</Text>
            <Text
              style={{ fontSize: 8.5, color: C.marine }}
            >{`${avis.agence.codePostal} ${avis.agence.ville.toUpperCase()}`}</Text>
            <Text style={{ fontSize: 8.5, color: C.marine }}>{avis.agence.telephone}</Text>
            <Text style={{ fontSize: 8.5, color: C.marine }}>{avis.agence.email}</Text>
          </View>
          <View>
            <Text style={{ fontWeight: 600, color: C.ciel, fontSize: 10 }}>Votre conseiller</Text>
            {avis.conseiller.nom.split(' ').map((p, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: C.ciel }}>
                {i === avis.conseiller.nom.split(' ').length - 1 ? p.toUpperCase() : p}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <View style={{ position: 'absolute', right: 46, bottom: 18, width: 92 }}>
        <Text
          style={{
            color: C.blanc,
            fontSize: 7,
            fontWeight: 700,
            marginBottom: 3,
            lineHeight: 1.2
          }}
        >
          {'POUR AVANCER,\nPASSEZ PAR'}
        </Text>
        <View
          style={{
            backgroundColor: C.bleu,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text
            style={{
              color: C.blanc,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 1,
              lineHeight: 1.2
            }}
          >
            LAFORÊT
          </Text>
        </View>
      </View>
    </Page>
  );
}

function Sommaire({ d }: { d: AvisPdfData }) {
  const actives = PAGES_AVIS.filter(
    ([k]) =>
      d.avis.pages[k] &&
      (k !== 'financement' || d.credit) &&
      (k !== 'ajustements' || d.estimation.ajustements.length > 0) &&
      (k !== 'comparables' || d.comparables.length > 0) &&
      (k !== 'annonce' || annonceVisible(d)) &&
      (k !== 'etapes' || d.avis.etapes?.length)
  );
  const apres = (k: string) =>
    PAGES_APRES_ESTIMATION.includes(k as (typeof PAGES_APRES_ESTIMATION)[number]);
  const titres = [
    'Introduction',
    ...actives.filter(([k]) => !apres(k)).map(([, t]) => t),
    'Notre estimation',
    ...actives.filter(([k]) => apres(k)).map(([, t]) => t)
  ];
  return (
    <PageDossier titre='Sommaire' avis={d.avis}>
      <View style={{ marginTop: 20 }}>
        {titres.map((t, i) => (
          <View
            key={t}
            style={{
              backgroundColor: i % 2 ? C.ciel : C.marine,
              borderRadius: 8,
              paddingVertical: 11,
              paddingHorizontal: 18,
              marginBottom: 9,
              flexDirection: 'row',
              gap: 14
            }}
          >
            <Text
              style={{
                color: C.blanc,
                fontWeight: 700,
                fontSize: 11,
                width: 18
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text
              style={{
                color: C.blanc,
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: 1
              }}
            >
              {t.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
    </PageDossier>
  );
}

function Introduction({ d }: { d: AvisPdfData }) {
  const { avis } = d;
  return (
    <PageDossier titre='Introduction' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Votre estimation, chiffres à l’appui</Text>
        <Text>{avis.textes.introduction}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[s.carteBleue, { flex: 1 }]}>
          <Text
            style={{
              fontSize: 9,
              color: C.trait,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            Votre conseiller
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginTop: 4,
              lineHeight: 1.25
            }}
          >
            {avis.conseiller.nom}
          </Text>
          <Text style={{ color: C.trait }}>{avis.conseiller.titre}</Text>
          <Text style={{ marginTop: 10 }}>{avis.conseiller.telephone}</Text>
          <Text>{avis.conseiller.email}</Text>
        </View>
        <View style={[s.carte, { flex: 1 }]}>
          <Text style={s.h3}>{avis.agence.nom}</Text>
          <Text>{avis.agence.adresse}</Text>
          <Text>{`${avis.agence.codePostal} ${avis.agence.ville}`}</Text>
          <Text style={{ marginTop: 6 }}>{avis.agence.telephone}</Text>
          <Text>{avis.agence.email}</Text>
          <Text>{avis.agence.site}</Text>
          <Text style={[s.petit, { marginTop: 6 }]}>{avis.agence.horaires}</Text>
        </View>
      </View>
      <View style={s.carte}>
        <Text style={s.h3}>Ce que contient ce dossier</Text>
        {[
          'Les ventes réellement conclues autour de chez vous, issues des actes notariés (base DVF de l’administration fiscale).',
          'Le relevé complet de votre bien : surfaces, construction, isolation, chauffage, travaux, extérieurs.',
          'Les ventes les plus comparables à votre bien, sur une carte et dans un tableau.',
          'La position de votre bien sur son marché et les ajustements qui expliquent notre estimation.',
          'Ce que votre bien représente pour un acquéreur : performance énergétique et budget de financement.'
        ].map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 6, marginBottom: 3 }}>
            <Text style={{ color: C.ciel }}>•</Text>
            <Text style={{ flex: 1 }}>{t}</Text>
          </View>
        ))}
      </View>
    </PageDossier>
  );
}

function GraphiqueSemestres({
  points
}: {
  points: { periode: string; nb: number; medianeM2: number }[];
}) {
  if (points.length < 2) return null;
  const W = 470;
  const H = 120;
  const min = Math.min(...points.map((p) => p.medianeM2));
  const max = Math.max(...points.map((p) => p.medianeM2));
  const pad = (max - min) * 0.15 || max * 0.05;
  const lo = min - pad;
  const hi = max + pad;
  const maxNb = Math.max(...points.map((p) => p.nb));
  const x = (i: number) => 30 + (i * (W - 50)) / (points.length - 1);
  const y = (v: number) => H - 18 - ((v - lo) / (hi - lo)) * (H - 30);
  const ligne = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.medianeM2).toFixed(1)}`)
    .join(' ');
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {points.map((p, i) => (
        <Rect
          key={`b${i}`}
          x={x(i) - 9}
          y={H - 18 - (p.nb / maxNb) * 50}
          width={18}
          height={(p.nb / maxNb) * 50}
          fill={C.trait}
        />
      ))}
      <Line x1='30' y1={H - 18} x2={W - 20} y2={H - 18} stroke={C.trait} strokeWidth={0.8} />
      <Path d={ligne} stroke={C.marine} strokeWidth={2} fill='none' />
      {points.map((p, i) => (
        <Circle key={`c${i}`} cx={x(i)} cy={y(p.medianeM2)} r={2.6} fill={C.marine} />
      ))}
      {points.map((p, i) => (
        <Text
          key={`t${i}`}
          x={x(i)}
          y={H - 6}
          style={{ fontSize: 6.5, fill: C.doux, fontFamily: 'Lexend' }}
          textAnchor='middle'
        >
          {p.periode}
        </Text>
      ))}
      {points.map((p, i) => (
        <Text
          key={`v${i}`}
          x={x(i)}
          y={y(p.medianeM2) - 6}
          style={{ fontSize: 6.5, fill: C.marine, fontFamily: 'Lexend' }}
          textAnchor='middle'
        >
          {nb(p.medianeM2)}
        </Text>
      ))}
    </Svg>
  );
}

function Secteur({ d }: { d: AvisPdfData }) {
  const { secteur, bien } = d;
  const m = secteur.marche;
  const typeLib = bien.type === 'appartement' ? 'appartements' : 'maisons';
  return (
    <PageDossier titre='Votre secteur' avis={d.avis}>
      {secteur.carte && (
        <View style={{ marginBottom: 12 }}>
          <Carte carte={secteur.carte} hauteur={210} />
        </View>
      )}
      {m && m.stats.medianeM2 ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Kpi
              label={`${typeLib} vendu(e)s`}
              valeur={nb(m.stats.nb)}
              aide={`à moins de ${nb(m.criteres.rayonKm, 1)} km, ${m.criteres.annees} ans`}
            />
            <Kpi
              label='Prix médian au m²'
              valeur={eur(m.stats.medianeM2)}
              aide={
                m.stats.q1M2 && m.stats.q3M2
                  ? `moitié centrale : ${nb(m.stats.q1M2)} à ${nb(m.stats.q3M2)} €`
                  : undefined
              }
            />
            <Kpi
              label='Prix médian'
              valeur={m.stats.prixMedian ? eur(m.stats.prixMedian) : '—'}
              aide={
                m.stats.surfaceMediane
                  ? `surface médiane ${nb(m.stats.surfaceMediane)} m²`
                  : undefined
              }
            />
            <Kpi
              label='Tendance'
              valeur={
                m.tendanceAnnuelle === null
                  ? 'stable'
                  : `${m.tendanceAnnuelle >= 0 ? '+' : ''}${nb(m.tendanceAnnuelle * 100, 1)} %/an`
              }
              aide='évolution du prix au m²'
            />
          </View>
          <View style={s.carte}>
            <Text style={s.h3}>Prix médian au m² des {typeLib}, par semestre</Text>
            <GraphiqueSemestres points={m.parSemestre} />
            <Text style={s.petit}>
              Barres : nombre de ventes. Courbe : prix médian au m², ventes notariées (DVF).
            </Text>
          </View>
          <View style={s.carte}>
            <Text style={s.h3}>Ce que disent les ventes</Text>
            <Text>
              {`Sur les ${m.criteres.annees} dernières années, ${nb(m.stats.nb)} ${typeLib} ont été vendu(e)s dans un rayon de ${nb(m.criteres.rayonKm, 1)} km autour de votre bien, à un prix médian de ${nb(m.stats.medianeM2)} € le m². La moitié de ces ventes se situe entre ${nb(m.stats.q1M2 ?? 0)} et ${nb(m.stats.q3M2 ?? 0)} € le m² : l’écart s’explique par l’état, les prestations, l’emplacement exact et la performance énergétique de chaque bien.`}
              {m.parCommune.length > 1 &&
                ` Par commune : ${m.parCommune
                  .slice(0, 4)
                  .map((c) => `${c.commune} ${nb(c.medianeM2)} €/m² (${c.nb} ventes)`)
                  .join(', ')}.`}
            </Text>
          </View>
        </>
      ) : (
        <View style={s.carte}>
          <Text>
            Les données de ventes du secteur n’ont pas pu être chargées au moment de l’édition de ce
            dossier.
          </Text>
        </View>
      )}
      {secteur.population && (
        <Text style={s.petit}>
          {secteur.commune} compte {nb(secteur.population)} habitants (source INSEE via
          geo.api.gouv.fr).
        </Text>
      )}
    </PageDossier>
  );
}

function ValeurChamp({ label, valeur }: { label: string; valeur: string }) {
  return (
    <View style={[s.ligne, { gap: 8 }]} wrap={false}>
      <Text
        style={{
          width: '42%',
          color: C.marine,
          fontWeight: 600,
          fontSize: 8.5
        }}
      >
        {label}
      </Text>
      <Text style={{ flex: 1, fontSize: 8.5 }}>{valeur}</Text>
    </View>
  );
}

function formatChamp(v: unknown, unite?: string) {
  if (vide(v)) return null;
  if (typeof v === 'number') return `${nb(v, 2)}${unite ? ` ${unite}` : ''}`;
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))
    return new Date(v).toLocaleDateString('fr-FR');
  return String(v);
}

function Bien({ d }: { d: AvisPdfData }) {
  const { bien, pieces, avis } = d;
  const na = (bien.fiche_na as string[] | undefined) ?? [];
  const groupes = BIEN_GROUPS.filter((g) => g.fiche);
  const total = pieces.reduce((t, p) => t + (p.surface ?? 0), 0);
  return (
    <PageDossier titre='Votre bien' avis={avis}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Kpi label='Type' valeur={libelle(TYPES_BIEN, String(bien.type))} />
        <Kpi label='Surface' valeur={bien.surface ? `${nb(Number(bien.surface), 2)} m²` : '—'} />
        <Kpi
          label='Terrain'
          valeur={bien.surface_terrain ? `${nb(Number(bien.surface_terrain))} m²` : '—'}
        />
        <Kpi label='Chambres' valeur={bien.chambres ? String(bien.chambres) : '—'} />
        <Kpi label='DPE / GES' valeur={`${bien.dpe_classe ?? '—'} / ${bien.ges_classe ?? '—'}`} />
      </View>

      {d.photos.bien.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {d.photos.bien.map((p, i) => (
            <Image
              key={i}
              src={p}
              style={{
                flex: 1,
                height: d.photos.bien.length > 2 ? 100 : 150,
                borderRadius: 10,
                objectFit: 'cover'
              }}
            />
          ))}
        </View>
      )}

      {avis.textes.bien && (
        <View style={[s.carteBleue, { padding: 14 }]} wrap={false}>
          <Text
            style={{
              fontSize: 9,
              color: C.trait,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4
            }}
          >
            Notre regard sur votre bien
          </Text>
          <Text>{avis.textes.bien}</Text>
        </View>
      )}

      {groupes.map((g) => {
        const lignes = g.fields
          .map((f) => {
            const v = formatChamp(bien[f.key], 'unit' in f ? f.unit : undefined);
            return {
              label: f.label,
              valeur: v ?? (na.includes(f.key) ? 'Non connu / sans objet' : null)
            };
          })
          .filter((l): l is { label: string; valeur: string } => l.valeur !== null);
        if (lignes.length === 0) return null;
        return (
          <View key={g.id} style={{ marginBottom: 10 }}>
            <Text style={s.h3} minPresenceAhead={60}>
              {g.title.replace(/^\d+\.\s*/, '')}
            </Text>
            {lignes.map((l) => (
              <ValeurChamp key={l.label} label={l.label} valeur={l.valeur} />
            ))}
          </View>
        );
      })}

      {pieces.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={s.h3} minPresenceAhead={80}>
            Relevé des pièces
          </Text>
          <View style={[s.ligne, { backgroundColor: C.pale }]} fixed={false}>
            <Text style={{ flex: 2, fontWeight: 600, color: C.marine, fontSize: 8 }}>Pièce</Text>
            <Text style={{ flex: 1, fontWeight: 600, color: C.marine, fontSize: 8 }}>Niveau</Text>
            <Text
              style={{
                flex: 1.3,
                fontWeight: 600,
                color: C.marine,
                fontSize: 8,
                textAlign: 'right'
              }}
            >
              Dimensions
            </Text>
            <Text
              style={{
                flex: 1,
                fontWeight: 600,
                color: C.marine,
                fontSize: 8,
                textAlign: 'right'
              }}
            >
              Surface
            </Text>
          </View>
          {pieces.map((p, i) => (
            <View key={i} style={s.ligne} wrap={false}>
              <Text style={{ flex: 2, fontSize: 8.5, fontWeight: 600 }}>{p.nom}</Text>
              <Text style={{ flex: 1, fontSize: 8.5 }}>{p.niveau ?? ''}</Text>
              <Text style={{ flex: 1.3, fontSize: 8.5, textAlign: 'right' }}>
                {p.longueur && p.largeur ? `${nb(p.longueur, 2)} x ${nb(p.largeur, 2)} m` : ''}
              </Text>
              <Text style={{ flex: 1, fontSize: 8.5, textAlign: 'right' }}>
                {p.surface ? `${nb(p.surface, 2)} m²` : '—'}
              </Text>
            </View>
          ))}
          <View style={[s.ligne, { borderBottomWidth: 0 }]}>
            <Text
              style={{
                flex: 4.3,
                fontSize: 8.5,
                fontWeight: 700,
                color: C.marine
              }}
            >
              Total relevé
            </Text>
            <Text
              style={{
                flex: 1,
                fontSize: 8.5,
                fontWeight: 700,
                color: C.marine,
                textAlign: 'right'
              }}
            >
              {nb(total, 2)} m²
            </Text>
          </View>
        </View>
      )}
      <Text style={[s.petit, { marginTop: 8 }]}>
        Informations déclarées et relevées lors de notre visite, communiquées à titre indicatif.
      </Text>
    </PageDossier>
  );
}

function Comparables({ d }: { d: AvisPdfData }) {
  const lignes = d.comparables;
  if (lignes.length === 0) return null;
  const m2 = lignes.map((c) => c.prixM2).sort((a, b) => a - b);
  const med =
    m2.length % 2 ? m2[(m2.length - 1) / 2]! : (m2[m2.length / 2 - 1]! + m2[m2.length / 2]!) / 2;
  return (
    <PageDossier titre='Ventes comparables' avis={d.avis}>
      {d.carteComparables && (
        <View style={{ marginBottom: 12 }}>
          <Carte carte={d.carteComparables} hauteur={250} numeros />
          <Text style={[s.petit, { marginTop: 3 }]}>
            Point orange : votre bien. Points numérotés : ventes du tableau ci-dessous.
          </Text>
        </View>
      )}
      <View style={[s.ligne, { backgroundColor: C.pale }]}>
        {[
          ['N°', 0.4, 'left'],
          ['Vente', 0.9, 'left'],
          ['Adresse', 2.6, 'left'],
          ['Surface', 0.9, 'right'],
          ['Pièces', 0.6, 'right'],
          ['Terrain', 0.9, 'right'],
          ['Prix', 1.1, 'right'],
          ['€/m²', 0.8, 'right'],
          ['Distance', 0.8, 'right']
        ].map(([t, f, a]) => (
          <Text
            key={t as string}
            style={{
              flex: f as number,
              fontSize: 7.5,
              fontWeight: 600,
              color: C.marine,
              textAlign: a as 'left' | 'right'
            }}
          >
            {t as string}
          </Text>
        ))}
      </View>
      {lignes.map((c) => (
        <View key={c.n} style={s.ligne} wrap={false}>
          <Text style={{ flex: 0.4, fontSize: 8, fontWeight: 700, color: C.marine }}>{c.n}</Text>
          <Text style={{ flex: 0.9, fontSize: 8 }}>{moisAnnee(c.date)}</Text>
          <Text
            style={{ flex: 2.6, fontSize: 8 }}
          >{`${c.adresse ? `${c.adresse.toLowerCase()}, ` : ''}${c.commune}`}</Text>
          <Text style={{ flex: 0.9, fontSize: 8, textAlign: 'right' }}>{nb(c.surface)} m²</Text>
          <Text style={{ flex: 0.6, fontSize: 8, textAlign: 'right' }}>{c.pieces ?? '—'}</Text>
          <Text style={{ flex: 0.9, fontSize: 8, textAlign: 'right' }}>
            {c.terrain ? `${nb(c.terrain)} m²` : '—'}
          </Text>
          <Text style={{ flex: 1.1, fontSize: 8, textAlign: 'right' }}>{eur(c.prix)}</Text>
          <Text
            style={{
              flex: 0.8,
              fontSize: 8,
              textAlign: 'right',
              fontWeight: 600
            }}
          >
            {nb(c.prixM2)}
          </Text>
          <Text style={{ flex: 0.8, fontSize: 8, textAlign: 'right' }}>
            {c.distanceKm === null ? '—' : `${nb(c.distanceKm, 1)} km`}
          </Text>
        </View>
      ))}
      <View
        style={[
          s.carteBleue,
          {
            marginTop: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        ]}
        wrap={false}
      >
        <Text style={{ fontSize: 10 }}>Prix médian au m² de ces {lignes.length} ventes</Text>
        <Text style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{eur(med)}</Text>
      </View>
      <Text style={s.petit}>
        Ventes notariées publiées par l’administration fiscale (DVF). Prix net vendeur hors frais de
        notaire, à la date de l’acte. Les ventes ont été retenues pour leur proximité, leur surface,
        leur nombre de pièces et leur terrain proches de votre bien.
      </Text>
    </PageDossier>
  );
}

function Positionnement({ d }: { d: AvisPdfData }) {
  const { estimation, avis } = d;
  const surface = estimation.surface;
  const valeurs = estimation.distributionM2?.length
    ? estimation.distributionM2
    : estimation.comparables.map((c) => c.prixM2Indexe ?? c.prixM2);
  if (valeurs.length < 3) return null;
  const bas = avis.prix.basse / surface;
  const haut = avis.prix.haute / surface;
  const min = Math.min(...valeurs, bas) * 0.92;
  const max = Math.max(...valeurs, haut) * 1.06;
  const n = 14;
  const pas = (max - min) / n;
  const bacs = Array.from(
    { length: n },
    (_, i) => valeurs.filter((v) => v >= min + i * pas && v < min + (i + 1) * pas).length
  );
  const maxBac = Math.max(...bacs, 1);
  const W = 470;
  const H = 190;
  const x = (v: number) => 10 + ((v - min) / (max - min)) * (W - 20);
  return (
    <PageDossier titre='Votre bien sur son marché' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Où se situe votre bien ?</Text>
        <Text style={{ marginBottom: 10 }}>
          Le prix de marché se situe dans la zone d’équilibre entre l’offre et la demande, là où se
          conclut la majorité des ventes. Au-dessus, les prix sont « optimistes » : des biens sont
          proposés à ce niveau, mais peu d’acquéreurs les achètent. En dessous, ils sont «
          pessimistes ».
        </Text>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Rect
            x={x(bas)}
            y={8}
            width={Math.max(2, x(haut) - x(bas))}
            height={H - 40}
            fill={C.pale}
          />
          {bacs.map((b, i) => (
            <Rect
              key={i}
              x={x(min + i * pas) + 1}
              y={H - 32 - (b / maxBac) * (H - 52)}
              width={(W - 20) / n - 2}
              height={(b / maxBac) * (H - 52)}
              fill={
                min + (i + 0.5) * pas >= bas && min + (i + 0.5) * pas <= haut ? C.marine : C.ciel
              }
            />
          ))}
          <Line x1='10' y1={H - 32} x2={W - 10} y2={H - 32} stroke={C.trait} strokeWidth={1} />
          <Text x={14} y={20} style={{ fontSize: 8, fill: C.doux, fontFamily: 'Lexend' }}>
            Prix pessimistes
          </Text>
          <Text
            x={W - 14}
            y={20}
            style={{ fontSize: 8, fill: C.doux, fontFamily: 'Lexend' }}
            textAnchor='end'
          >
            Prix optimistes
          </Text>
          {[min, (min + max) / 2, max].map((v, i) => (
            <Text
              key={i}
              x={x(v)}
              y={H - 18}
              style={{ fontSize: 7, fill: C.doux, fontFamily: 'Lexend' }}
              textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
            >
              {`${nb(v)} €/m²`}
            </Text>
          ))}
          <Text
            x={Math.min(W - 70, Math.max(70, (x(bas) + x(haut)) / 2))}
            y={H - 4}
            style={{
              fontSize: 7.5,
              fill: C.marine,
              fontWeight: 700,
              fontFamily: 'Lexend'
            }}
            textAnchor='middle'
          >
            {`Prix de marché : ${nb(bas)} à ${nb(haut)} €/m²`}
          </Text>
        </Svg>
        <Text style={s.petit}>
          Répartition des prix au m² des {valeurs.length} ventes comparables du secteur, remis à la
          date du jour selon l’évolution du secteur. Zone foncée : fourchette retenue pour votre
          bien ({eur(avis.prix.basse)} à {eur(avis.prix.haute)} pour {nb(surface, 2)} m²).
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Kpi
          label='Comparables analysés'
          valeur={nb(estimation.nbComparables)}
          aide={estimation.marche.criteres}
        />
        <Kpi
          label='Médiane du secteur'
          valeur={`${nb(estimation.marche.prixM2)} €/m²`}
          aide='ventes comparables, indexées'
        />
        <Kpi
          label='Indice de confiance'
          valeur={estimation.marche.confiance}
          aide='selon le nombre et la dispersion des ventes'
        />
      </View>
    </PageDossier>
  );
}

function Ajustements({ d }: { d: AvisPdfData }) {
  const { estimation, avis } = d;
  const r = estimation.resultat;
  return (
    <PageDossier titre='Ajustements de valeur' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Du marché à votre bien</Text>
        <Text style={{ marginBottom: 10 }}>
          Les ventes du secteur donnent une valeur de référence. Elle est ensuite ajustée selon ce
          qui distingue votre bien des ventes comparables.
        </Text>
        <View style={[s.ligne, { backgroundColor: C.pale }]}>
          <Text style={{ flex: 3, fontWeight: 600, color: C.marine, fontSize: 8.5 }}>
            Valeur de référence du marché
          </Text>
          <Text
            style={{
              flex: 1,
              fontWeight: 700,
              color: C.marine,
              fontSize: 8.5,
              textAlign: 'right'
            }}
          >
            {eur(r.valeurBase)}
          </Text>
        </View>
        {estimation.ajustements.map((a, i) => (
          <View key={i} style={s.ligne} wrap={false}>
            <View style={{ flex: 3 }}>
              <Text style={{ fontWeight: 600, fontSize: 8.5 }}>{a.libelle}</Text>
              <Text style={s.petit}>{a.justification}</Text>
            </View>
            <Text
              style={{
                flex: 1,
                textAlign: 'right',
                fontSize: 9,
                fontWeight: 600,
                color: a.pourcentage < 0 ? C.alerte : C.ok
              }}
            >
              {`${a.pourcentage > 0 ? '+' : ''}${nb(a.pourcentage, 1)} %`}
            </Text>
          </View>
        ))}
        <View style={[s.ligne, { borderBottomWidth: 0, marginTop: 4 }]}>
          <Text style={{ flex: 3, fontWeight: 700, color: C.marine }}>Total des ajustements</Text>
          <Text
            style={{
              flex: 1,
              fontWeight: 700,
              color: C.marine,
              textAlign: 'right'
            }}
          >{`${r.totalAjustements > 0 ? '+' : ''}${nb(r.totalAjustements, 1)} %`}</Text>
        </View>
      </View>
    </PageDossier>
  );
}

const DPE = [
  ['A', 'jusqu’à 70', '#009C6D'],
  ['B', '71 à 110', '#52B153'],
  ['C', '111 à 180', '#78BD76'],
  ['D', '181 à 250', '#F4E70F'],
  ['E', '251 à 330', '#F0B50F'],
  ['F', '331 à 420', '#EB8235'],
  ['G', 'plus de 420', '#D7221F']
] as const;

function consequencesDpe(classe: string | null): string[] {
  if (!classe)
    return [
      'Le diagnostic de performance énergétique (DPE) doit être réalisé avant la mise en vente : il conditionne la diffusion de l’annonce.'
    ];
  const c = classe.toUpperCase();
  const lignes: string[] = [];
  if (c === 'F' || c === 'G')
    lignes.push(
      'Vente : un audit énergétique est obligatoire depuis le 1er avril 2023 pour une maison ou un immeuble en monopropriété.'
    );
  if (c === 'E')
    lignes.push(
      'Vente : un audit énergétique est obligatoire depuis le 1er janvier 2025 pour une maison ou un immeuble en monopropriété.'
    );
  if (c === 'D')
    lignes.push(
      'Vente : l’audit énergétique deviendra obligatoire le 1er janvier 2034 pour une maison ou un immeuble en monopropriété.'
    );
  if (c === 'G')
    lignes.push(
      'Location : les logements classés G ne peuvent plus être mis en location depuis le 1er janvier 2025.'
    );
  if (c === 'F')
    lignes.push(
      'Location : interdiction de louer à partir du 1er janvier 2028 ; loyers gelés depuis août 2022.'
    );
  if (c === 'E') lignes.push('Location : interdiction de louer à partir du 1er janvier 2034.');
  if (c === 'F' || c === 'G')
    lignes.push(
      'Ces contraintes réduisent le nombre d’acquéreurs investisseurs et pèsent sur la négociation : les travaux de rénovation sont un argument à chiffrer.'
    );
  if (['A', 'B', 'C', 'D'].includes(c))
    lignes.push(
      'Votre classement n’impose aucune contrainte de location aujourd’hui : c’est un argument à mettre en avant auprès des acquéreurs.'
    );
  return lignes;
}

function ValeurVerte({ d }: { d: AvisPdfData }) {
  const { bien, avis } = d;
  const classe = (bien.dpe_classe as string | null) ?? null;
  return (
    <PageDossier titre='La valeur verte de votre bien' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Performance énergétique</Text>
        <Text style={{ marginBottom: 10 }}>
          Le prix de marché d’un bien dépend aussi de sa performance énergétique, qui pèse dans la
          décision et le budget des acquéreurs.
        </Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            {DPE.map(([l, plage, couleur], i) => (
              <View
                key={l}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 3
                }}
              >
                <View
                  style={{
                    width: 70 + i * 22,
                    height: 17,
                    backgroundColor: couleur,
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 6
                  }}
                >
                  <Text
                    style={{
                      fontSize: 6.5,
                      color: i > 4 ? C.blanc : C.texte,
                      lineHeight: 1.2
                    }}
                  >
                    {plage}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: i > 4 ? C.blanc : C.texte,
                      lineHeight: 1.2
                    }}
                  >
                    {l}
                  </Text>
                </View>
                {classe === l && (
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 9,
                      fontWeight: 700,
                      color: C.marine
                    }}
                  >
                    {`< Votre bien${bien.dpe_valeur ? ` : ${nb(Number(bien.dpe_valeur))} kWh/m²/an` : ''}`}
                  </Text>
                )}
              </View>
            ))}
            <Text style={[s.petit, { marginTop: 4 }]}>
              Consommation en kWh d’énergie primaire par m² et par an.
            </Text>
          </View>
          <View style={{ width: 170 }}>
            <Kpi
              label='Classe énergie'
              valeur={classe ?? 'à réaliser'}
              aide={
                bien.dpe_date
                  ? `DPE du ${new Date(String(bien.dpe_date)).toLocaleDateString('fr-FR')}`
                  : undefined
              }
            />
            <View style={{ height: 8 }} />
            <Kpi
              label='Émissions (GES)'
              valeur={(bien.ges_classe as string | null) ?? '—'}
              aide={bien.ges_valeur ? `${nb(Number(bien.ges_valeur))} kg CO2/m²/an` : undefined}
            />
          </View>
        </View>
      </View>
      <View style={s.carte}>
        <Text style={s.h3}>Ce que cela implique pour votre bien</Text>
        {consequencesDpe(classe).map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
            <Text style={{ color: C.ciel }}>•</Text>
            <Text style={{ flex: 1 }}>{t}</Text>
          </View>
        ))}
        {[
          ['Travaux importants à prévoir', bien.travaux_a_prevoir],
          ['Derniers travaux réalisés', bien.derniers_travaux],
          ['Isolation des combles', bien.isolation_combles],
          ['Isolation des murs', bien.isolation_murs],
          [
            'Chauffage',
            [
              bien.chauffage_systeme,
              bien.chauffage_energie,
              bien.chauffage_annee ? `installé en ${bien.chauffage_annee}` : null
            ]
              .filter(Boolean)
              .join(', ')
          ]
        ]
          .filter(([, v]) => !vide(v))
          .map(([l, v]) => (
            <ValeurChamp key={l as string} label={l as string} valeur={String(v)} />
          ))}
        <Text style={[s.petit, { marginTop: 6 }]}>
          La durée de validité d’un DPE est de 10 ans (les DPE réalisés avant le 1er juillet 2021 ne
          sont plus valables). Informations communiquées à titre indicatif.
        </Text>
      </View>
    </PageDossier>
  );
}

function Financement({ d }: { d: AvisPdfData }) {
  const { credit, avis } = d;
  if (!credit || credit.simulations.length === 0) return null;
  return (
    <PageDossier titre='Le budget de vos acquéreurs' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Qui peut acheter votre bien ?</Text>
        <Text>
          {`Au prix de présentation de ${eur(avis.prix.conseille)}, frais de notaire inclus et avec un apport de ${eur(credit.apport)}, un acquéreur emprunte environ ${eur(credit.capital)}. Voici ce que cela représente chaque mois.`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {credit.simulations.map((sim) => (
          <View key={sim.annees} style={[s.carteBleue, { flex: 1 }]}>
            <Text
              style={{
                fontSize: 9,
                color: C.trait,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >{`Sur ${sim.annees} ans · taux ${nb(sim.taux, 2)} %`}</Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: 700,
                marginTop: 4,
                lineHeight: 1.25
              }}
            >{`${eur(sim.mensualite)} / mois`}</Text>
            <Text style={{ color: C.trait }}>assurance comprise</Text>
            <Text
              style={{ marginTop: 8 }}
            >{`Revenus nets nécessaires : ${eur(sim.revenusNecessaires)} / mois`}</Text>
            <Text>{`Coût total du crédit : ${eur(sim.coutTotal)}`}</Text>
          </View>
        ))}
      </View>
      <Text style={s.petit}>
        {`Simulation indicative qui ne constitue pas une offre de prêt. Taux moyens ${credit.source ? `: ${credit.source}` : ''}${credit.date ? `, en date du ${new Date(credit.date).toLocaleDateString('fr-FR')}` : ''}. Taux d’endettement maximal de 35 %, assurance comprise.`}
      </Text>
    </PageDossier>
  );
}

function Estimation({ d }: { d: AvisPdfData }) {
  const { avis } = d;
  const hono = Math.round(avis.prix.conseille * avis.prix.tauxHonoraires);
  return (
    <PageDossier titre='Votre bien sur son marché immobilier' avis={avis}>
      <View style={s.carte} wrap={false}>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            color: C.marine,
            letterSpacing: 1.2,
            lineHeight: 1.3
          }}
        >
          LE PRIX DE MARCHÉ DE VOTRE
        </Text>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            color: C.marine,
            letterSpacing: 1.2,
            lineHeight: 1.3
          }}
        >
          BIEN EST ESTIMÉ ENTRE
        </Text>
        <View
          style={{
            alignSelf: 'center',
            marginTop: 10,
            backgroundColor: C.bleu,
            borderRadius: 18,
            paddingVertical: 12,
            paddingHorizontal: 36
          }}
        >
          <Text
            style={{
              color: C.blanc,
              fontSize: 21,
              fontWeight: 700,
              lineHeight: 1.25
            }}
          >{`${eur(avis.prix.basse)} et ${eur(avis.prix.haute)}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Kpi
            label='Prix de présentation conseillé'
            valeur={eur(avis.prix.conseille)}
            aide='honoraires d’agence inclus'
          />
          <Kpi
            label='Honoraires'
            valeur={eur(hono)}
            aide={`${nb(avis.prix.tauxHonoraires * 100, 2)} % du prix, à la charge du vendeur`}
          />
          <Kpi label='Net vendeur' valeur={eur(avis.prix.conseille - hono)} />
        </View>
        <Text style={[s.petit, { textAlign: 'center', marginTop: 8 }]}>
          La fourchette repose sur les éléments disponibles lors de notre visite. En l’absence de
          certains diagnostics, elle pourra être réajustée dès leur fourniture.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[s.carte, { flex: 1.4, backgroundColor: C.pale, borderColor: C.pale }]}>
          <Text>{`Cette estimation a été établie le ${dateLongue(avis.dateAvis)} par ${avis.conseiller.nom}. Pour y parvenir, nous avons pris en compte :`}</Text>
          {[
            'les ventes conclues dans votre secteur (actes notariés) ;',
            'les informations que vous nous avez fournies ;',
            'l’ensemble des caractéristiques relevées lors de notre visite.'
          ].map((t) => (
            <Text key={t}>{`• ${t}`}</Text>
          ))}
          {avis.textes.conclusion && <Text style={{ marginTop: 8 }}>{avis.textes.conclusion}</Text>}
        </View>
        <View style={[s.carteBleue, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
            {avis.conseiller.nom}
          </Text>
          <Text style={{ color: C.trait }}>{avis.conseiller.titre}</Text>
          <Text style={{ marginTop: 8 }}>{avis.conseiller.telephone}</Text>
          <Text>{avis.conseiller.email}</Text>
        </View>
      </View>
      <View style={[s.carteBleue, { padding: 14 }]}>
        <Text style={{ fontSize: 7.8, lineHeight: 1.4 }}>
          Le présent dossier d’estimation ne constitue en aucun cas une expertise immobilière. Il
          permet d’évaluer, à une date déterminée, la fourchette de prix dans laquelle un bien
          immobilier pourrait raisonnablement être vendu à l’amiable, dans des conditions usuelles
          de cession, sur un marché donné. Cette valeur a été estimée sur la base du marché
          immobilier à cette date ; elle ne présume pas de l’évolution de l’offre et de la demande,
          ne constitue pas un prix de vente définitif et ne peut engager notre agence. Elle est
          faite sous réserve que la situation de l’immeuble ne révèle aucun élément susceptible d’en
          minorer la valeur, d’en restreindre la propriété, l’usage ou la destination, ni de
          constituer un défaut de conformité, un vice caché ou une servitude. En cas de mise en
          vente par notre agence, une réactualisation de cette estimation sera effectuée.
        </Text>
      </View>
    </PageDossier>
  );
}

function Puce() {
  return (
    <Svg width={10} height={10} viewBox='0 0 10 10' style={{ marginTop: 2 }}>
      <Circle cx={5} cy={5} r={5} fill={C.ciel} />
      <Path d='M2.8 5.2 L4.4 6.8 L7.3 3.6' stroke={C.blanc} strokeWidth={1.3} fill='none' />
    </Svg>
  );
}

function Pastille({
  texte,
  fond = C.pale,
  couleur = C.marine
}: {
  texte: string;
  fond?: string;
  couleur?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: fond,
        borderRadius: 10,
        paddingVertical: 4,
        paddingHorizontal: 9
      }}
    >
      <Text
        style={{
          fontSize: 8.5,
          fontWeight: 600,
          color: couleur,
          lineHeight: 1.2
        }}
      >
        {texte}
      </Text>
    </View>
  );
}

function Annonce({ d }: { d: AvisPdfData }) {
  const { avis, bien } = d;
  const a = avis.annonce;
  const vignettes = d.photos.bien.slice(0, 3);
  const couleurDpe = DPE.find(([l]) => l === bien.dpe_classe)?.[2];
  const caracteristiques = [
    bien.surface ? `${nb(Number(bien.surface), 1)} m²` : null,
    bien.pieces ? `${bien.pieces} pièces` : null,
    bien.chambres ? `${bien.chambres} chambre${Number(bien.chambres) > 1 ? 's' : ''}` : null,
    bien.surface_terrain ? `Terrain ${nb(Number(bien.surface_terrain))} m²` : null
  ].filter((x): x is string => Boolean(x));
  const paragraphes = a.texte
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const points = a.pointsForts.filter((p) => p.trim());
  return (
    <PageDossier titre='Votre bien, prêt à être présenté' avis={avis}>
      <Text style={{ marginBottom: 10, color: C.doux }}>
        Voici comment nous présenterions votre bien aux acquéreurs, sur laforet.com et les
        principaux portails, dès la signature du mandat.
      </Text>
      <View style={{ position: 'relative' }}>
        {d.photos.couverture ? (
          <Image
            src={d.photos.couverture}
            style={{ height: 180, borderRadius: 12, objectFit: 'cover' }}
          />
        ) : (
          <View
            style={{
              height: 120,
              borderRadius: 12,
              backgroundColor: C.pale,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: C.doux, fontSize: 10 }}>
              Reportage photo réalisé à la signature du mandat
            </Text>
          </View>
        )}
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: '#ffffffe6',
            borderRadius: 9,
            paddingVertical: 3,
            paddingHorizontal: 8
          }}
        >
          <Text
            style={{
              fontSize: 7,
              fontWeight: 600,
              color: C.marine,
              letterSpacing: 0.5,
              lineHeight: 1.2
            }}
          >
            PROJET D’ANNONCE · NON PUBLIÉE
          </Text>
        </View>
      </View>
      {vignettes.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          {vignettes.map((p, i) => (
            <Image
              key={i}
              src={p}
              style={{
                flex: 1,
                height: 62,
                borderRadius: 8,
                objectFit: 'cover'
              }}
            />
          ))}
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          marginTop: 12,
          alignItems: 'center'
        }}
        wrap={false}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: C.marine,
              lineHeight: 1.25
            }}
          >
            {a.titre}
          </Text>
          <Text style={{ color: C.doux, marginTop: 2 }}>
            {[bien.code_postal, bien.ville].filter(Boolean).join(' ')}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: C.marine,
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 14,
            alignItems: 'flex-end'
          }}
        >
          <Text
            style={{
              color: C.blanc,
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.2
            }}
          >
            {eur(avis.prix.conseille)}
          </Text>
          <Text style={{ color: C.trait, fontSize: 7.5 }}>
            {a.honoraires === 'acquereur'
              ? 'honoraires inclus'
              : 'honoraires à la charge du vendeur'}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 10
        }}
      >
        {caracteristiques.map((c) => (
          <Pastille key={c} texte={c} />
        ))}
        {bien.dpe_classe ? (
          <Pastille
            texte={`DPE ${bien.dpe_classe}`}
            fond={couleurDpe ?? C.pale}
            couleur={['F', 'G'].includes(String(bien.dpe_classe)) ? C.blanc : C.texte}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
        <View style={{ flex: 1.75 }}>
          {paragraphes.map((p, i) => (
            <Text key={i} style={{ marginBottom: 6, fontSize: 9, lineHeight: 1.5 }}>
              {p}
            </Text>
          ))}
        </View>
        {points.length > 0 && (
          <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: C.pale, borderRadius: 12, padding: 12 }} wrap={false}>
              <Text style={s.h3}>Les points forts</Text>
              {points.map((p) => (
                <View key={p} style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                  <Puce />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 8.8,
                      fontWeight: 600,
                      color: C.marine
                    }}
                  >
                    {p}
                  </Text>
                </View>
              ))}
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: C.trait,
                borderRadius: 12,
                padding: 10,
                marginTop: 8
              }}
              wrap={false}
            >
              <Text style={s.kpiLabel}>Contact et visites</Text>
              <Text style={{ fontWeight: 600, color: C.marine, marginTop: 2 }}>
                {avis.conseiller.nom}
              </Text>
              <Text style={{ fontSize: 8.5 }}>{avis.conseiller.telephone}</Text>
              <Text style={{ fontSize: 8.5 }}>{avis.agence.nom}</Text>
            </View>
          </View>
        )}
      </View>

      <View
        style={{
          borderTopWidth: 0.8,
          borderTopColor: C.trait,
          paddingTop: 6,
          marginTop: 6
        }}
        wrap={false}
      >
        {mentionsAnnonce(a, avis.prix, d.infos).map((m) => (
          <Text key={m} style={[s.petit, { lineHeight: 1.4 }]}>
            {espace(m)}
          </Text>
        ))}
      </View>
    </PageDossier>
  );
}

function Etapes({ d }: { d: AvisPdfData }) {
  const { avis } = d;
  const etapes = avis.etapes.filter((e) => e.titre.trim() || e.texte.trim());
  return (
    <PageDossier titre='Les prochaines étapes' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Et maintenant ?</Text>
        <Text>
          Vous connaissez la valeur de votre bien. Voici comment nous le vendrons ensemble, étape
          par étape, avec un interlocuteur unique qui vous tient informé à chaque moment.
        </Text>
      </View>
      <View style={{ marginTop: 6, marginBottom: 6 }}>
        {etapes.map((e, i) => {
          const derniere = i === etapes.length - 1;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 14 }} wrap={false}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: i % 2 ? C.ciel : C.marine,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text
                    style={{
                      color: C.blanc,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>
                {!derniere && (
                  <View
                    style={{
                      width: 2,
                      flexGrow: 1,
                      minHeight: 22,
                      backgroundColor: C.trait
                    }}
                  />
                )}
              </View>
              <View style={{ flex: 1, paddingBottom: derniere ? 0 : 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 3
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: C.marine,
                      lineHeight: 1.25
                    }}
                  >
                    {e.titre}
                  </Text>
                  {e.delai.trim() ? <Pastille texte={e.delai} /> : null}
                </View>
                {e.texte.trim() ? (
                  <Text style={{ marginTop: 3, color: C.texte }}>{e.texte}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <View
        style={[
          s.carteBleue,
          { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }
        ]}
        wrap={false}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
            Prêt à lancer la vente de votre bien ?
          </Text>
          <Text style={{ color: C.trait, marginTop: 3 }}>
            Nous fixons ensemble le rendez-vous de signature et la date de mise en ligne.
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
            {avis.conseiller.nom}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
            {avis.conseiller.telephone}
          </Text>
          <Text style={{ color: C.trait }}>{avis.conseiller.email}</Text>
        </View>
      </View>
    </PageDossier>
  );
}

function Methode({ d }: { d: AvisPdfData }) {
  const { estimation, avis } = d;
  const m = estimation.marche;
  return (
    <PageDossier titre='Méthode et sources' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Comment nous avons calculé</Text>
        {[
          [
            'Les ventes',
            'Toutes les ventes de maisons et d’appartements des cinq dernières années, issues des actes notariés et publiées par l’administration fiscale (base DVF, data.gouv.fr). Seules les ventes d’un seul logement sont retenues, pour que le prix corresponde à un bien identifiable.'
          ],
          [
            'Le choix des comparables',
            `${m.criteres}. ${estimation.selection === 'manuelle' ? 'Votre conseiller a vérifié et choisi ces ventes une à une sur la carte du secteur.' : 'Les critères sont élargis progressivement si le secteur compte peu de ventes.'}`
          ],
          [
            'La mise à jour des prix',
            `Chaque vente est remise à la date du jour selon l’évolution du prix au m² dans le secteur${m.tendanceAnnuelle === null ? '' : ` (${m.tendanceAnnuelle >= 0 ? '+' : ''}${nb(m.tendanceAnnuelle * 100, 1)} % par an)`}.`
          ],
          [
            'La pondération',
            'Les ventes les plus récentes, les plus proches et les plus semblables en surface comptent davantage dans le calcul du prix médian au m².'
          ],
          [
            'Les ajustements',
            'Les éléments que les ventes ne reflètent pas (état, énergie, annexes, travaux) sont chiffrés un par un et justifiés.'
          ],
          [
            'L’expertise locale',
            'Votre conseiller confronte ces chiffres à sa connaissance des biens en vente dans le secteur et des attentes des acquéreurs qu’il rencontre chaque jour.'
          ]
        ].map(([t, v]) => (
          <View key={t} style={{ marginBottom: 8 }} wrap={false}>
            <Text style={s.h3}>{t}</Text>
            <Text>{v}</Text>
          </View>
        ))}
      </View>
      <Text style={s.petit}>
        {`Sources : DVF (DGFiP, data.gouv.fr), publiées deux fois par an avec environ six mois de décalage ; plans © IGN Géoplateforme ; populations INSEE (geo.api.gouv.fr). Dossier établi le ${dateLongue(d.avis.dateAvis)} sur ${nb(estimation.nbComparables)} ventes comparables, indice de confiance ${m.confiance}.`}
      </Text>
      <Text style={[s.petit, { marginTop: 10 }]}>{avis.agence.mentions}</Text>
    </PageDossier>
  );
}

export function AvisDocument({ d }: { d: AvisPdfData }) {
  const p = d.avis.pages;
  return (
    <Document
      title={`Estimation - ${[d.bien.adresse, d.bien.ville].filter(Boolean).join(' ')}`}
      author={d.avis.agence.nom}
      creator='Ovalia'
      language='fr'
    >
      <Couverture d={d} />
      <Sommaire d={d} />
      <Introduction d={d} />
      {p.secteur && <Secteur d={d} />}
      {p.bien && <Bien d={d} />}
      {p.comparables && <Comparables d={d} />}
      {p.positionnement && <Positionnement d={d} />}
      {p.ajustements && d.estimation.ajustements.length > 0 && <Ajustements d={d} />}
      {p.valeurVerte && <ValeurVerte d={d} />}
      {p.financement && <Financement d={d} />}
      <Estimation d={d} />
      {p.annonce && annonceVisible(d) && <Annonce d={d} />}
      {p.etapes && d.avis.etapes?.length > 0 && <Etapes d={d} />}
      {p.methode && <Methode d={d} />}
    </Document>
  );
}
