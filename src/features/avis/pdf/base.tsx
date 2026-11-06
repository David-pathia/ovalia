import path from 'node:path';
import {
  Defs,
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
  Circle,
  Polygon
} from '@react-pdf/renderer';
import type { EstimationDetails } from '@/lib/estimation/estimer';
import type { Simulation } from '@/lib/credit';
import type { ResultatMarche } from '@/features/marche/types';
import type { BienValues } from '@/features/biens/fields';
import { type AvisDetails, type InfosAnnonce } from '../types';
import type { CarteStatique, Parcelle } from './carte';

// ---------------------------------------------------------------------------
// Charte du dossier remis au client : couleurs et typographie Laforêt.
// ---------------------------------------------------------------------------
export const C = {
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

export const FONTS = path.join(process.cwd(), 'src/features/avis/fonts');
Font.register({
  family: 'Lexend',
  fonts: [300, 400, 600, 700].map((w) => ({
    src: path.join(FONTS, `lexend-latin-${w}-normal.woff`),
    fontWeight: w
  }))
});
Font.registerHyphenationCallback((mot) => [mot]);

export const s = StyleSheet.create({
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
  /** couvertureRetouchee : photo principale retouchée par IA, signalée dans le dossier. */
  photos: { couverture: ImagePdf | null; bien: ImagePdf[]; couvertureRetouchee?: boolean };
  cadastre: {
    carte: CarteStatique | null;
    environnement: CarteStatique | null;
    parcelle: Parcelle | null;
  } | null;
  credit: {
    durees: number[];
    taux: (number | null)[];
    lignes: { apportPct: number; apport: number; capital: number; sims: (Simulation | null)[] }[];
    notaire: number;
    notairePct: number;
    assurancePct: number;
    source: string | null;
    date: string | null;
  } | null;
  equipe: { prenom: string; nom: string; role: string; photo: ImagePdf | null }[];
  infos: InfosAnnonce;
  photoConseiller: ImagePdf | null;
};

export const annonceVisible = (d: AvisPdfData) =>
  Boolean(d.avis.annonce && (d.avis.annonce.titre.trim() || d.avis.annonce.texte.trim()));

// L'espace fine insécable (U+202F) des nombres français n'existe pas dans la police : on la remplace par une espace insécable.
export const espace = (t: string) => t.replace(/[\u202f\u2009]/g, '\u00a0');
export const nb = (n: number, d = 0) =>
  espace(n.toLocaleString('fr-FR', { maximumFractionDigits: d }));
export const eur = (n: number) => `${nb(Math.round(n))}\u00a0€`;
export const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
export const moisAnnee = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric'
  });
export const vide = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

// ---------------------------------------------------------------------------
// Éléments communs
// ---------------------------------------------------------------------------
export function Bandeau({ titre }: { titre: string }) {
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

export function Pied({ avis }: { avis: AvisDetails }) {
  return (
    <View fixed style={s.pied}>
      <Text>
        {avis.agence.nom} · {avis.agence.telephone} · {avis.agence.email}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function PageDossier({
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

export function Kpi({ label, valeur, aide }: { label: string; valeur: string; aide?: string }) {
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

export function Carte({
  carte,
  hauteur,
  numeros,
  credit = 'Plan © IGN Géoplateforme'
}: {
  carte: CarteStatique;
  hauteur: number;
  numeros?: boolean;
  credit?: string;
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
      {carte.polygones.length > 0 && (
        <Svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          viewBox='0 0 100 100'
          preserveAspectRatio='none'
        >
          {carte.polygones.map((p, i) => (
            <Polygon
              key={i}
              points={p.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')}
              fill={C.alerte}
              fillOpacity={0.28}
              stroke={C.alerte}
              strokeWidth={0.5}
            />
          ))}
        </Svg>
      )}
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
        {credit}
      </Text>
    </View>
  );
}

export function Puce() {
  return (
    <Svg width={10} height={10} viewBox='0 0 10 10' style={{ marginTop: 2 }}>
      <Circle cx={5} cy={5} r={5} fill={C.ciel} />
      <Path d='M2.8 5.2 L4.4 6.8 L7.3 3.6' stroke={C.blanc} strokeWidth={1.3} fill='none' />
    </Svg>
  );
}

export function Pastille({
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

export const DPE = [
  ['A', 'jusqu’à 70', '#009C6D'],
  ['B', '71 à 110', '#52B153'],
  ['C', '111 à 180', '#78BD76'],
  ['D', '181 à 250', '#F4E70F'],
  ['E', '251 à 330', '#F0B50F'],
  ['F', '331 à 420', '#EB8235'],
  ['G', 'plus de 420', '#D7221F']
] as const;

export function ValeurChamp({ label, valeur }: { label: string; valeur: string }) {
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

export function formatChamp(v: unknown, unite?: string) {
  if (vide(v)) return null;
  if (typeof v === 'number') return `${nb(v, 2)}${unite ? ` ${unite}` : ''}`;
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))
    return new Date(v).toLocaleDateString('fr-FR');
  return String(v);
}
