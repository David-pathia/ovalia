import { Circle, Image, Line, Path, Polygon, Rect, Svg, Text, View } from '@react-pdf/renderer';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import {
  ASSAINISSEMENT,
  DVF_ENCADRE,
  PALIERS_EXEMPLES,
  seuilRecherche,
  typeAssainissement
} from '../laforet';
import { COUTS_ASSAINISSEMENT, DPE_ANNONCES, NEGOCIATION, valeurVerte } from '../sources';
import {
  C,
  Carte,
  PageDossier,
  Pastille,
  dateLongue,
  eur,
  nb,
  s,
  vide,
  type AvisPdfData
} from './base';

// Pages et encadrés centrés sur le bien : présentation, cadastre, stratégie de prix, DVF, assainissement, cible, avis final.

const texte = (v: unknown) => (vide(v) ? null : Array.isArray(v) ? v.join(', ') : String(v));

function Tuile({ label, valeur }: { label: string; valeur: string | null }) {
  return (
    <View style={{ width: '25%', padding: 3 }}>
      <View style={{ backgroundColor: C.pale, borderRadius: 10, padding: 8, minHeight: 50 }}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Text
          style={{ fontSize: 10, fontWeight: 700, color: C.marine, lineHeight: 1.3, marginTop: 2 }}
        >
          {valeur ?? '—'}
        </Text>
      </View>
    </View>
  );
}

function Colonne({
  titre,
  items,
  couleur,
  signe
}: {
  titre: string;
  items: string[];
  couleur: string;
  signe: string;
}) {
  return (
    <View
      style={{ flex: 1, borderWidth: 1.2, borderColor: couleur, borderRadius: 12, padding: 11 }}
      wrap={false}
    >
      <Text style={[s.h3, { color: couleur }]}>{titre}</Text>
      {items.length ? (
        items.map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <Text style={{ color: couleur, fontWeight: 700, width: 8 }}>{signe}</Text>
            <Text style={{ flex: 1, fontSize: 9 }}>{t}</Text>
          </View>
        ))
      ) : (
        <Text style={s.petit}>Aucun élément relevé.</Text>
      )}
    </View>
  );
}

export function BienSynthese({ d }: { d: AvisPdfData }) {
  const { bien, avis, pieces } = d;
  const photos = d.photos.bien.slice(0, 2);
  const chauffage =
    [bien.chauffage_systeme, bien.chauffage_energie].filter((x) => !vide(x)).join(', ') || null;
  const equipements = [
    ...((bien.exterieurs as string[] | null) ?? []),
    texte(bien.garage) ? `Garage : ${texte(bien.garage)}` : null,
    texte(bien.sous_sol_dependances),
    texte(bien.annexes)
  ].filter((x): x is string => Boolean(x));
  const releve = pieces.filter((p) => p.nom && p.surface);
  const total = releve.reduce((t, p) => t + (p.surface ?? 0), 0);
  const moitie = Math.ceil(releve.length / 2);
  return (
    <PageDossier titre='Votre bien' avis={avis}>
      {photos.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          {photos.map((p, i) => (
            <Image
              key={i}
              src={p}
              style={{ flex: 1, height: 135, borderRadius: 12, objectFit: 'cover' }}
            />
          ))}
        </View>
      )}
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginBottom: 8 }}
      >
        <Tuile
          label='Localisation'
          valeur={[bien.code_postal, bien.ville].filter(Boolean).join(' ') || null}
        />
        <Tuile label='Type' valeur={libelle(TYPES_BIEN, String(bien.type))} />
        <Tuile
          label='Surface habitable'
          valeur={bien.surface ? `${nb(Number(bien.surface), 2)} m²` : null}
        />
        <Tuile
          label='Terrain'
          valeur={bien.surface_terrain ? `${nb(Number(bien.surface_terrain))} m²` : null}
        />
        <Tuile
          label='Pièces / chambres'
          valeur={
            bien.pieces || bien.chambres
              ? `${bien.pieces ?? '—'} pièces · ${bien.chambres ?? '—'} ch.`
              : null
          }
        />
        <Tuile
          label='Construction'
          valeur={bien.annee_construction ? String(bien.annee_construction) : null}
        />
        <Tuile label='Chauffage' valeur={chauffage} />
        <Tuile
          label='DPE / GES'
          valeur={bien.dpe_classe ? `${bien.dpe_classe} / ${bien.ges_classe ?? '—'}` : 'à réaliser'}
        />
      </View>

      {(equipements.length > 0 || texte(bien.etat_general)) && (
        <View style={[s.carte, { padding: 12 }]} wrap={false}>
          {equipements.length > 0 && (
            <>
              <Text style={s.h3}>Équipements et prestations</Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 5,
                  marginBottom: texte(bien.etat_general) ? 8 : 0
                }}
              >
                {equipements.slice(0, 10).map((e) => (
                  <Pastille key={e} texte={e} />
                ))}
              </View>
            </>
          )}
          {texte(bien.etat_general) && (
            <Text>
              <Text style={{ fontWeight: 600, color: C.marine }}>État général : </Text>
              {texte(bien.etat_general)}
            </Text>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <Colonne
          titre='Les points forts'
          items={avis.analyse.pointsForts}
          couleur={C.ok}
          signe='+'
        />
        <Colonne
          titre='Les points de vigilance'
          items={avis.analyse.vigilance}
          couleur={C.alerte}
          signe='!'
        />
      </View>

      {releve.length > 0 && (
        <View wrap={false}>
          <Text style={s.h3}>{`Relevé des pièces · ${nb(total, 2)} m²`}</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {[releve.slice(0, moitie), releve.slice(moitie)].map((col, k) => (
              <View key={k} style={{ flex: 1 }}>
                {col.map((p, i) => (
                  <View key={i} style={[s.ligne, { paddingVertical: 2.5 }]}>
                    <Text
                      style={{ flex: 1, fontSize: 8.5 }}
                    >{`${p.nom}${p.niveau ? ` (${p.niveau})` : ''}`}</Text>
                    <Text
                      style={{ fontSize: 8.5, fontWeight: 600 }}
                    >{`${nb(p.surface ?? 0, 2)} m²`}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      )}
      <Text style={[s.petit, { marginTop: 6 }]}>
        Informations déclarées et relevées lors de notre visite, communiquées à titre indicatif.
      </Text>
    </PageDossier>
  );
}

const METHODE_PARCELLE = {
  adresse: 'Parcelle rattachée à l’adresse du bien dans la Base Adresse Nationale.',
  point: 'Parcelle située au point de l’adresse du bien (Base Adresse Nationale).',
  proche:
    'Parcelle la plus proche du point d’adresse, celui-ci se trouvant sur la voie publique : à confirmer avec le titre de propriété.'
} as const;

function LigneCadastre({ label, valeur }: { label: string; valeur: string }) {
  return (
    <View style={{ width: '50%', paddingVertical: 5, paddingRight: 8 }}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: 700, color: C.marine, lineHeight: 1.3 }}>
        {valeur}
      </Text>
    </View>
  );
}

export function Cadastre({ d }: { d: AvisPdfData }) {
  const c = d.cadastre;
  if (!c?.carte) return null;
  const p = c.parcelle;
  const { bien } = d;
  return (
    <PageDossier titre='Situation cadastrale' avis={d.avis}>
      <Carte
        carte={c.carte}
        hauteur={511 * c.carte.ratio}
        credit='Photographie aérienne et cadastre © IGN Géoplateforme'
      />
      <View style={[s.carte, { marginTop: 12 }]} wrap={false}>
        <Text style={s.h2}>Fiche cadastrale</Text>
        {p ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <LigneCadastre
                label='Adresse du bien'
                valeur={[bien.adresse, [bien.code_postal, bien.ville].filter(Boolean).join(' ')]
                  .filter(Boolean)
                  .join(', ')}
              />
              <LigneCadastre label='Commune' valeur={p.commune || String(bien.ville ?? '')} />
              <LigneCadastre label='Section' valeur={p.section} />
              <LigneCadastre label='Numéro de parcelle' valeur={p.numero} />
              <LigneCadastre
                label='Contenance'
                valeur={p.contenance ? `${nb(p.contenance)} m²` : 'non communiquée'}
              />
              <LigneCadastre label='Référence cadastrale' valeur={p.idu} />
            </View>
            <Text style={[s.petit, { marginTop: 4 }]}>{METHODE_PARCELLE[p.methode]}</Text>
          </>
        ) : (
          <Text>
            La parcelle n’a pas pu être identifiée automatiquement à partir de l’adresse : le repère
            orange situe l’adresse du bien.
          </Text>
        )}
      </View>
      <Text style={s.petit}>
        En orange, la parcelle du bien ; en fines lignes, les limites et numéros des parcelles
        voisines. Plan cadastral issu du Parcellaire Express de l’IGN, à valeur indicative : les
        limites cadastrales ne constituent pas un bornage, seul un géomètre-expert peut fixer les
        limites de propriété.
      </Text>
    </PageDossier>
  );
}

export function EncadreDvf() {
  return (
    <View
      style={[s.carte, { backgroundColor: C.pale, borderColor: C.pale, marginTop: 6, padding: 10 }]}
      wrap={false}
    >
      <Text style={s.h3}>Les données DVF</Text>
      <Text style={{ fontSize: 8.4 }}>{DVF_ENCADRE}</Text>
    </View>
  );
}

export function StrategiePrix({ d }: { d: AvisPdfData }) {
  const prix = d.avis.prix.conseille;
  const seuil = seuilRecherche(prix);
  return (
    <View>
      <Text style={[s.h2, { marginTop: 4 }]}>Notre stratégie de prix</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[s.carte, { flex: 1 }]} wrap={false}>
          <Text style={s.h3}>La négociation</Text>
          <Text>
            La négociation fait partie intégrante du marché immobilier.
            {NEGOCIATION
              ? ` ${NEGOCIATION.texte}`
              : ' Elle varie selon les périodes, les secteurs et les types de biens.'}
          </Text>
          <Text style={{ marginTop: 5 }}>Il faut distinguer trois prix :</Text>
          {[
            'le prix de présentation, affiché dans l’annonce\u00a0;',
            'le prix de vente espéré\u00a0;',
            'le prix effectivement négocié.'
          ].map((t) => (
            <Text key={t}>{`• ${t}`}</Text>
          ))}
          <Text style={{ marginTop: 5 }}>
            Il ne s’agit pas d’appliquer une décote automatique, mais d’anticiper le comportement
            des acquéreurs pour fixer un prix cohérent.
          </Text>
          {NEGOCIATION && (
            <Text style={[s.petit, { marginTop: 4 }]}>{`Source : ${NEGOCIATION.source}`}</Text>
          )}
        </View>
        <View style={[s.carte, { flex: 1 }]} wrap={false}>
          <Text style={s.h3}>Les seuils de recherche</Text>
          <Text>
            {
              'Sur les portails, les acquéreurs filtrent par budget maximum, souvent par paliers de 50\u00a0000\u00a0€. Un prix juste au-dessus d’un palier fait disparaître le bien des recherches de ce budget.'
            }
          </Text>
          <View style={{ marginTop: 5 }}>
            {PALIERS_EXEMPLES.map(([a, b]) => (
              <Text key={a}>{`• ${b} plutôt que ${a}`}</Text>
            ))}
          </View>
          {seuil ? (
            <View style={{ backgroundColor: C.pale, borderRadius: 8, padding: 7, marginTop: 6 }}>
              <Text style={{ fontWeight: 600, color: C.marine, fontSize: 9 }}>
                {`À ${eur(prix)}, votre bien n’apparaît pas dans les recherches « jusqu’à ${eur(seuil.palier)} ». Présenté à ${eur(seuil.suggestion)}, il y figurerait.`}
              </Text>
            </View>
          ) : null}
          <Text style={[s.petit, { marginTop: 4 }]}>
            Le raisonnement porte sur le prix affiché dans l’annonce, celui qu’utilisent les
            acquéreurs dans leurs recherches.
          </Text>
        </View>
      </View>
      <View style={[s.carteBleue, { padding: 12 }]} wrap={false}>
        <Text style={{ fontWeight: 600, textAlign: 'center' }}>
          « Un prix de présentation bien positionné ne sert pas uniquement à valoriser votre bien :
          il permet également d’être visible auprès du plus grand nombre d’acquéreurs correspondant
          à votre cible. »
        </Text>
      </View>
    </View>
  );
}

export function AttractiviteDpe({ d }: { d: AvisPdfData }) {
  const VALEUR_VERTE = valeurVerte(d.bien.type);
  const classe = String(d.bien.dpe_classe ?? '');
  const max = Math.max(...VALEUR_VERTE.lignes.map((l) => Math.abs(l.pct)), 1);
  return (
    <View style={[s.carte, { padding: 12 }]} wrap={false}>
      <Text style={s.h3}>{VALEUR_VERTE.titre}</Text>
      {VALEUR_VERTE.lignes.map((l) => (
        <View
          key={l.classe}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}
        >
          <Text
            style={{
              width: 24,
              fontWeight: 700,
              color: l.classe.includes(classe) && classe ? C.alerte : C.marine
            }}
          >
            {l.classe}
          </Text>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {l.pct < 0 && (
                <View
                  style={{
                    width: `${(Math.abs(l.pct) / max) * 100}%`,
                    height: 7,
                    backgroundColor: C.alerte,
                    borderRadius: 2
                  }}
                />
              )}
            </View>
            <View style={{ width: 1, backgroundColor: C.doux }} />
            <View style={{ flex: 1 }}>
              {l.pct > 0 && (
                <View
                  style={{
                    width: `${(l.pct / max) * 100}%`,
                    height: 7,
                    backgroundColor: C.ok,
                    borderRadius: 2
                  }}
                />
              )}
            </View>
          </View>
          <Text style={{ width: 44, textAlign: 'right', fontSize: 8.5, fontWeight: 600 }}>
            {l.pct === 0 ? 'réf.' : `${l.pct > 0 ? '+' : ''}${nb(l.pct, 1)} %`}
          </Text>
        </View>
      ))}
      <Text style={[s.petit, { marginTop: 5 }]}>{VALEUR_VERTE.source}</Text>
      <Text style={{ marginTop: 6, fontSize: 9 }}>{DPE_ANNONCES.texte}</Text>
      <Text style={s.petit}>{DPE_ANNONCES.source}</Text>
    </View>
  );
}

const F = { fontFamily: 'Lexend' } as const;

function Maison({ x = 8 }: { x?: number }) {
  return (
    <>
      <Polygon points={`${x},44 ${x + 30},22 ${x + 60},44`} fill={C.marine} />
      <Rect
        x={x + 6}
        y={44}
        width={48}
        height={30}
        fill={C.pale}
        stroke={C.marine}
        strokeWidth={1.2}
      />
      <Rect x={x + 24} y={56} width={11} height={18} fill={C.marine} />
    </>
  );
}

function SchemaCollectif() {
  return (
    <Svg width={200} height={95} viewBox='0 0 235 112'>
      <Rect x={0} y={74} width={235} height={38} fill='#EFE6D8' />
      <Line x1={0} y1={74} x2={235} y2={74} stroke='#8A7A60' strokeWidth={1} />
      <Maison />
      <Path d='M62 80 L150 92' stroke={C.ciel} strokeWidth={3} />
      <Rect
        x={146}
        y={80}
        width={14}
        height={18}
        fill={C.blanc}
        stroke={C.marine}
        strokeWidth={1}
      />
      <Line
        x1={172}
        y1={30}
        x2={172}
        y2={112}
        stroke={C.doux}
        strokeWidth={0.8}
        strokeDasharray='3,2'
      />
      <Path d='M160 94 L205 100' stroke={C.ciel} strokeWidth={3} />
      <Circle cx={215} cy={100} r={10} fill={C.marine} />
      <Text x={153} y={76} style={{ ...F, fontSize: 5.5, fill: C.texte }} textAnchor='middle'>
        regard
      </Text>
      <Text x={174} y={36} style={{ ...F, fontSize: 5.5, fill: C.doux }}>
        limite de propriété
      </Text>
      <Text x={215} y={84} style={{ ...F, fontSize: 5.5, fill: C.texte }} textAnchor='middle'>
        réseau public
      </Text>
      <Text x={100} y={108} style={{ ...F, fontSize: 5.5, fill: C.texte }} textAnchor='middle'>
        branchement privé
      </Text>
    </Svg>
  );
}

function SchemaIndividuel() {
  return (
    <Svg width={200} height={95} viewBox='0 0 235 112'>
      <Rect x={0} y={74} width={235} height={38} fill='#EFE6D8' />
      <Line x1={0} y1={74} x2={235} y2={74} stroke='#8A7A60' strokeWidth={1} />
      <Maison />
      <Path d='M62 80 L92 84' stroke={C.ciel} strokeWidth={3} />
      <Rect x={92} y={78} width={46} height={22} rx={6} fill={C.bleu} />
      <Text x={115} y={92} style={{ ...F, fontSize: 5.5, fill: C.blanc }} textAnchor='middle'>
        fosse
      </Text>
      <Path d='M138 86 L156 88' stroke={C.ciel} strokeWidth={3} />
      {[0, 1, 2].map((k) => (
        <Line
          key={k}
          x1={158}
          y1={84 + k * 8}
          x2={228}
          y2={84 + k * 8}
          stroke={C.ok}
          strokeWidth={2}
          strokeDasharray='5,3'
        />
      ))}
      <Text x={115} y={70} style={{ ...F, fontSize: 5.5, fill: C.texte }} textAnchor='middle'>
        pré-traitement
      </Text>
      <Text x={193} y={70} style={{ ...F, fontSize: 5.5, fill: C.texte }} textAnchor='middle'>
        traitement par le sol
      </Text>
      <Text x={193} y={110} style={{ ...F, fontSize: 5.5, fill: C.texte }} textAnchor='middle'>
        (épandage, filtre)
      </Text>
    </Svg>
  );
}

const NON_CONFORMITES = [
  'Absence d’installation ou rejet direct des eaux usées dans le milieu naturel',
  'Fosse ou traitement sous-dimensionné, dégradé ou non étanche',
  'Défaut d’entretien : vidange non réalisée, ventilation absente',
  'En collectif : eaux de pluie raccordées aux eaux usées (ou l’inverse)'
];

export function Assainissement({ d }: { d: AvisPdfData }) {
  const type = typeAssainissement(d.bien.assainissement);
  return (
    <PageDossier titre='L’assainissement' avis={d.avis}>
      <View style={[s.carte, { padding: 12 }]} wrap={false}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={s.h2}>L’assainissement en quelques mots</Text>
          {type && (
            <Pastille
              texte={`Votre bien : ${type === 'collectif' ? 'collectif' : 'non collectif'}`}
              fond={C.marine}
              couleur={C.blanc}
            />
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(
            [
              [
                'collectif',
                'Raccordé au réseau public',
                ASSAINISSEMENT.collectif,
                <SchemaCollectif key='c' />
              ],
              [
                'non_collectif',
                'Installation individuelle',
                ASSAINISSEMENT.nonCollectif,
                <SchemaIndividuel key='i' />
              ]
            ] as const
          ).map(([k, t, x, schema]) => (
            <View
              key={k}
              style={{
                flex: 1,
                borderRadius: 10,
                padding: 8,
                backgroundColor: type === k ? C.pale : C.blanc,
                borderWidth: 1,
                borderColor: type === k ? C.ciel : C.trait
              }}
            >
              <Text style={{ fontWeight: 700, color: C.marine, fontSize: 9.5 }}>{t}</Text>
              {schema}
              <Text style={{ fontSize: 7.8 }}>{x}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[s.carte, { padding: 12 }]} wrap={false}>
        <Text style={s.h3}>Les non-conformités les plus fréquentes</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {NON_CONFORMITES.map((n) => (
            <View key={n} style={{ flexDirection: 'row', gap: 6, marginTop: 3, width: '48.5%' }}>
              <Text style={{ color: C.alerte, fontWeight: 700, width: 8 }}>!</Text>
              <Text style={{ flex: 1, fontSize: 8.3 }}>{n}</Text>
            </View>
          ))}
        </View>
        <Text
          style={{ fontSize: 8.3, marginTop: 6 }}
        >{`Un contrôle défavorable peut ${ASSAINISSEMENT.risques.join(', ')}.`}</Text>
        <Text style={{ marginTop: 3, color: C.bleu, fontWeight: 600, fontSize: 8.3 }}>
          {ASSAINISSEMENT.accompagnement}
        </Text>
      </View>

      {COUTS_ASSAINISSEMENT && (
        <View style={[s.carte, { padding: 12 }]} wrap={false}>
          <Text style={s.h3}>Coûts indicatifs de remise en conformité</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {COUTS_ASSAINISSEMENT.groupes.map((g) => (
              <View key={g.titre} style={{ marginTop: 4, width: '48.5%' }}>
                <Text style={{ fontWeight: 700, color: C.marine, fontSize: 9 }}>{g.titre}</Text>
                {g.lignes.map((l) => (
                  <View key={l.libelle} style={[s.ligne, { paddingVertical: 1.5, gap: 4 }]}>
                    <Text style={{ flex: 1, fontSize: 7.8 }}>{l.libelle}</Text>
                    <Text style={{ fontSize: 7.8, fontWeight: 700, color: C.marine }}>
                      {l.fourchette}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
          <Text style={[s.petit, { marginTop: 4, fontSize: 6.5, lineHeight: 1.3 }]}>
            {COUTS_ASSAINISSEMENT.mention}
          </Text>
        </View>
      )}
      <Text style={s.petit}>{ASSAINISSEMENT.source}</Text>
    </PageDossier>
  );
}

export function CibleFinancement({ d }: { d: AvisPdfData }) {
  const { avis, credit } = d;
  const cibles = avis.analyse.cibles;
  return (
    <PageDossier titre='Cible acquéreur et financement' avis={avis}>
      {cibles.length > 0 && (
        <View style={s.carte} wrap={false}>
          <Text style={s.h2}>À qui s’adresse votre bien ?</Text>
          <Text style={{ marginBottom: 8 }}>
            Nos cibles prioritaires, choisies d’après les caractéristiques de votre bien : c’est à
            elles que s’adresseront notre annonce et nos actions.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {cibles.map((c, i) => (
              <View
                key={c.profil}
                style={{
                  flex: 1,
                  backgroundColor: i === 0 ? C.marine : C.pale,
                  borderRadius: 10,
                  padding: 10
                }}
              >
                <Text
                  style={{ fontSize: 7, letterSpacing: 0.8, color: i === 0 ? C.trait : C.doux }}
                >{`CIBLE ${i + 1}${i === 0 ? ' · PRIORITAIRE' : ''}`}</Text>
                <Text
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    color: i === 0 ? C.blanc : C.marine,
                    lineHeight: 1.3
                  }}
                >
                  {c.profil}
                </Text>
                <Text style={{ fontSize: 8.4, marginTop: 2, color: i === 0 ? C.blanc : C.texte }}>
                  {c.raison}
                </Text>
                {c.approche ? (
                  <Text
                    style={{
                      fontSize: 8,
                      marginTop: 5,
                      color: i === 0 ? C.trait : C.bleu,
                      fontWeight: 600
                    }}
                  >{`Notre approche : ${c.approche}`}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      )}
      {credit ? (
        <>
          <View style={s.carte} wrap={false}>
            <Text style={s.h2}>Le budget de vos acquéreurs</Text>
            <Text style={{ marginBottom: 8 }}>
              {`Pour un prix de ${eur(avis.prix.conseille)}, un acquéreur doit financer environ ${eur(avis.prix.conseille + credit.notaire)} avec les frais de notaire. Mensualités selon la durée et l’apport, assurance comprise :`}
            </Text>
            <View style={[s.ligne, { backgroundColor: C.pale }]}>
              <Text
                style={{ flex: 1.4, fontSize: 8, fontWeight: 600, color: C.marine, paddingLeft: 4 }}
              >
                Apport
              </Text>
              {credit.durees.map((n, i) => (
                <Text
                  key={n}
                  style={{
                    flex: 1,
                    fontSize: 8,
                    fontWeight: 600,
                    color: C.marine,
                    textAlign: 'right',
                    paddingRight: 4
                  }}
                >
                  {`${n} ans · ${credit.taux[i] === null ? '—' : `${nb(credit.taux[i]!, 2)} %`}`}
                </Text>
              ))}
            </View>
            {credit.lignes.map((l) => (
              <View key={l.apportPct} style={s.ligne}>
                <View style={{ flex: 1.4, paddingLeft: 4 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: 600 }}>
                    {l.apportPct === 0 ? 'Sans apport' : `${eur(l.apport)} (${l.apportPct} %)`}
                  </Text>
                  <Text style={s.petit}>{`emprunt ${eur(l.capital)}`}</Text>
                </View>
                {l.sims.map((sim, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'flex-end', paddingRight: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.marine }}>
                      {sim ? `${eur(sim.mensualite)}/mois` : '—'}
                    </Text>
                    {sim && <Text style={s.petit}>{`revenus ${eur(sim.revenusNecessaires)}`}</Text>}
                  </View>
                ))}
              </View>
            ))}
          </View>
          <Text style={s.petit}>
            {`Simulation indicative qui ne constitue pas une offre de prêt. Frais de notaire estimés à ${nb(credit.notairePct, 1)} %, assurance emprunteur ${nb(credit.assurancePct, 2)} % du capital par an, revenus nets nécessaires pour un taux d’endettement de 35 %. Taux moyens${credit.source ? ` : ${credit.source}` : ''}${credit.date ? `, au ${new Date(credit.date).toLocaleDateString('fr-FR')}` : ''}.`}
          </Text>
        </>
      ) : (
        <View style={s.carte}>
          <Text>
            Les taux de crédit ne sont pas renseignés : complétez la grille « Taux de crédit » pour
            afficher les simulations.
          </Text>
        </View>
      )}
    </PageDossier>
  );
}

export function AvisFinal({ d }: { d: AvisPdfData }) {
  const { avis, bien } = d;
  const assainissement = typeAssainissement(bien.assainissement);
  const reserves = [
    !bien.dpe_classe
      ? [
          'Le diagnostic de performance énergétique (DPE)',
          'Le classement énergétique peut influencer l’attractivité du bien, les travaux à prévoir et les conditions de commercialisation.'
        ]
      : null,
    assainissement !== 'collectif'
      ? [
          'Le contrôle de l’assainissement',
          'Lorsqu’il est requis, ses conclusions peuvent révéler des travaux nécessaires et avoir une incidence sur la négociation ou la valeur.'
        ]
      : null
  ].filter((x): x is string[] => x !== null);
  const est = d.estimation;
  const aj = [...est.ajustements]
    .sort((a, b) => Math.abs(b.pourcentage) - Math.abs(a.pourcentage))
    .slice(0, 2);
  const justifications = [
    `${nb(est.nbComparables)} ventes comparables des trois dernières années, à moins de ${nb(est.marche.rayonKm, 1)} km de votre bien (données DVF).`,
    `Un prix médian de ${nb(est.marche.prixM2)} € le m² pour les biens comparables, soit une valeur de marché de référence de ${eur(est.resultat.valeurBase)} pour ${nb(est.surface, 1)} m².`,
    est.ajustements.length
      ? `Des ajustements de ${est.resultat.totalAjustements > 0 ? '+' : ''}${nb(est.resultat.totalAjustements, 1)} % pour ce qui distingue votre bien : ${aj.map((a) => a.libelle.toLowerCase()).join(', ')}.`
      : null,
    avis.analyse.pointsForts.length
      ? `Ses atouts : ${avis.analyse.pointsForts.slice(0, 2).join(' ; ').toLowerCase()}.`
      : null,
    'Notre connaissance du marché roannais et des attentes des acquéreurs que nous rencontrons.'
  ].filter((x): x is string => Boolean(x));
  const caracteristiques = [
    libelle(TYPES_BIEN, String(bien.type)),
    bien.surface ? `${nb(Number(bien.surface), 1)} m²` : null,
    bien.pieces ? `${bien.pieces} pièces` : null,
    bien.chambres ? `${bien.chambres} chambres` : null,
    bien.surface_terrain ? `terrain ${nb(Number(bien.surface_terrain))} m²` : null,
    bien.dpe_classe ? `DPE ${bien.dpe_classe}` : null
  ].filter((x): x is string => Boolean(x));
  return (
    <PageDossier titre='Notre avis de valeur' avis={avis}>
      <Text style={{ fontSize: 15, fontWeight: 700, color: C.marine, lineHeight: 1.25 }}>
        Notre avis de valeur pour votre bien immobilier
      </Text>
      <Text style={{ color: C.doux, marginTop: 2 }}>
        {[bien.adresse, [bien.code_postal, bien.ville].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(', ')}
      </Text>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6, marginBottom: 12 }}
      >
        {caracteristiques.map((c) => (
          <Pastille key={c} texte={c} />
        ))}
      </View>

      <View style={[s.carte, { alignItems: 'center' }]} wrap={false}>
        <Text style={{ fontSize: 10, fontWeight: 600, color: C.marine, letterSpacing: 1 }}>
          LA VALEUR NETTE VENDEUR DE VOTRE BIEN EST ESTIMÉE ENTRE
        </Text>
        <Text
          style={{ fontSize: 18, fontWeight: 700, color: C.bleu, lineHeight: 1.3, marginTop: 4 }}
        >{`${eur(avis.prix.basse)} et ${eur(avis.prix.haute)}`}</Text>
        <View
          style={{
            marginTop: 10,
            backgroundColor: C.marine,
            borderRadius: 16,
            paddingVertical: 8,
            paddingHorizontal: 34,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: C.trait, fontSize: 8.5, letterSpacing: 1 }}>
            PRIX NET VENDEUR CONSEILLÉ
          </Text>
          <Text style={{ color: C.blanc, fontSize: 27, fontWeight: 700, lineHeight: 1.2 }}>
            {eur(avis.prix.conseille)}
          </Text>
        </View>
        <Text style={[s.petit, { marginTop: 6, textAlign: 'center' }]}>
          {`Estimation du ${dateLongue(avis.dateAvis)}. Le net vendeur est le montant qui vous reviendrait, avant éventuels frais, taxes ou remboursements à votre charge (prêt en cours, plus-value…) ; à ne pas confondre avec le prix affiché dans l’annonce, frais d’agence inclus.`}
        </Text>
      </View>

      <View style={[s.carte, { padding: 12 }]} wrap={false}>
        <Text style={s.h3}>Ce qui justifie notre estimation</Text>
        {justifications.map((j) => (
          <View key={j} style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
            <Text style={{ color: C.ciel, fontWeight: 700 }}>•</Text>
            <Text style={{ flex: 1, fontSize: 8.4 }}>{j}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1.4 }}>
          {reserves.length > 0 && (
            <View style={[s.carte, { backgroundColor: C.pale, borderColor: C.pale }]} wrap={false}>
              <Text style={s.h3}>Réserves éventuelles</Text>
              <Text style={{ fontSize: 8.6, marginBottom: 4 }}>
                Cet avis est établi sur la base des informations et documents disponibles. Il pourra
                être réexaminé si ces éléments, encore à confirmer, le justifient :
              </Text>
              {reserves.map(([t, x]) => (
                <View key={t} style={{ marginTop: 3 }}>
                  <Text style={{ fontWeight: 600, color: C.marine, fontSize: 9 }}>{t}</Text>
                  <Text style={{ fontSize: 8.6 }}>{x}</Text>
                </View>
              ))}
            </View>
          )}
          {avis.textes.conclusion ? (
            <Text
              style={{ fontSize: 9, fontWeight: 600, color: C.marine, lineHeight: 1.4 }}
            >{`« ${avis.textes.conclusion} »`}</Text>
          ) : null}
        </View>
        <View style={[s.carteBleue, { flex: 1, alignItems: 'center' }]} wrap={false}>
          {d.photoConseiller && (
            <Image
              src={d.photoConseiller}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                objectFit: 'cover',
                borderWidth: 2,
                borderColor: C.blanc,
                marginBottom: 6
              }}
            />
          )}
          <Text style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
            {avis.conseiller.nom}
          </Text>
          <Text style={{ color: C.trait, textAlign: 'center' }}>{avis.conseiller.titre}</Text>
          <Text style={{ marginTop: 6, fontWeight: 700 }}>{avis.conseiller.telephone}</Text>
          <Text>{avis.conseiller.email}</Text>
          <Text style={{ color: C.trait, marginTop: 4 }}>{avis.agence.nom}</Text>
        </View>
      </View>

      <Text style={[s.petit, { marginTop: 6, fontSize: 6.6, lineHeight: 1.3 }]}>
        Le présent dossier ne constitue pas une expertise immobilière. Il évalue, à une date
        déterminée, la fourchette de prix dans laquelle le bien pourrait raisonnablement être vendu
        à l’amiable, dans des conditions usuelles de cession, sur un marché donné. Il ne présume pas
        de l’évolution de l’offre et de la demande, ne constitue pas un prix de vente définitif et
        ne peut engager notre agence. Il est établi sous réserve que la situation de l’immeuble ne
        révèle aucun élément susceptible d’en minorer la valeur, d’en restreindre la propriété,
        l’usage ou la destination, ni de constituer un défaut de conformité, un vice caché ou une
        servitude. En cas de mise en vente par notre agence, une réactualisation sera effectuée.
      </Text>
    </PageDossier>
  );
}
