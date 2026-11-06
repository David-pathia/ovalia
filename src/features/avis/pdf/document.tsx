import {
  Circle,
  Defs,
  Document,
  Image,
  Line,
  LinearGradient,
  Page,
  Path,
  Polygon,
  Rect,
  Stop,
  Svg,
  Text,
  View
} from '@react-pdf/renderer';
import { LIBELLE_SECTEUR } from '@/lib/estimation/calcul';
import { Accompagnement, Agence, Equipe, Exclusivite } from './pages-laforet';
import {
  AttractiviteDpe,
  Assainissement,
  AvisFinal,
  BienSynthese,
  Cadastre,
  CibleFinancement,
  EncadreDvf,
  StrategiePrix
} from './pages-bien';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import { PAGES_AVIS, mentionsAnnonce } from '../types';
import {
  C,
  Carte,
  DPE,
  Kpi,
  PageDossier,
  Pastille,
  Puce,
  ValeurChamp,
  annonceVisible,
  dateLongue,
  espace,
  eur,
  moisAnnee,
  nb,
  s,
  vide,
  type AvisPdfData
} from './base';
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

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 26, gap: 14 }}>
          {d.photoConseiller && (
            <Image
              src={d.photoConseiller}
              style={{
                width: 78,
                height: 78,
                borderRadius: 39,
                objectFit: 'cover',
                borderWidth: 2.5,
                borderColor: C.ciel
              }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 7.5,
                fontWeight: 600,
                color: C.ciel,
                letterSpacing: 1,
                lineHeight: 1.3
              }}
            >
              VOTRE CONSEILLER
            </Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: C.marine, lineHeight: 1.25 }}>
              {avis.conseiller.nom}
            </Text>
            {avis.conseiller.titre ? (
              <Text style={{ fontSize: 9, fontWeight: 600, color: C.bleu, lineHeight: 1.3 }}>
                {avis.conseiller.titre}
              </Text>
            ) : null}
            {avis.conseiller.accroche ? (
              <Text style={{ fontSize: 7.5, color: C.doux, lineHeight: 1.4, marginTop: 3 }}>
                {avis.conseiller.accroche}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: C.marine,
                lineHeight: 1.3,
                marginTop: 4
              }}
            >
              {avis.conseiller.telephone}
            </Text>
          </View>
          <View
            style={{ width: 128, borderLeftWidth: 1, borderLeftColor: C.ciel, paddingLeft: 12 }}
          >
            <Text style={{ fontWeight: 600, color: C.marine, fontSize: 9.5 }}>Votre agence</Text>
            <Text style={{ fontSize: 8, color: C.marine }}>{avis.agence.nom}</Text>
            <Text style={{ fontSize: 8, color: C.marine }}>{avis.agence.adresse}</Text>
            <Text
              style={{ fontSize: 8, color: C.marine }}
            >{`${avis.agence.codePostal} ${avis.agence.ville.toUpperCase()}`}</Text>
            <Text style={{ fontSize: 8, color: C.marine }}>{avis.agence.telephone}</Text>
            <Text style={{ fontSize: 8, color: C.marine }}>{avis.agence.email}</Text>
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

/** Pages réellement présentes dans le dossier, dans l'ordre (hors couverture, sommaire et avis final). */
function pagesActives(d: AvisPdfData) {
  return PAGES_AVIS.filter(
    ([k]) =>
      d.avis.pages[k] !== false &&
      (k !== 'comparables' || d.comparables.length > 0) &&
      (k !== 'positionnement' ||
        (d.estimation.distributionM2?.length ?? d.estimation.comparables.length) >= 3) &&
      (k !== 'cadastre' || Boolean(d.cadastre?.carte)) &&
      (k !== 'annonce' || annonceVisible(d)) &&
      (k !== 'equipe' || d.equipe.length > 0)
  );
}

function Sommaire({ d }: { d: AvisPdfData }) {
  const titres = [...pagesActives(d).map(([, t]) => t), 'Notre avis de valeur'];
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

function Comparables({ d }: { d: AvisPdfData }) {
  const lignes = d.comparables;
  if (lignes.length === 0) return null;
  const m = d.secteur.marche;
  const typeLib = d.bien.type === 'appartement' ? 'Appartements' : 'Maisons';
  const m2 = lignes.map((c) => c.prixM2).sort((a, b) => a - b);
  const med =
    m2.length % 2 ? m2[(m2.length - 1) / 2]! : (m2[m2.length / 2 - 1]! + m2[m2.length / 2]!) / 2;
  return (
    <PageDossier titre='Les ventes de votre secteur' avis={d.avis}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <Kpi
          label='Périmètre de recherche'
          valeur={`${nb(d.estimation.marche.rayonKm, 1)} km`}
          aide={
            d.estimation.marche.secteur
              ? LIBELLE_SECTEUR[d.estimation.marche.secteur]
              : 'autour du bien'
          }
        />
        {m?.stats.medianeM2 ? (
          <>
            <Kpi
              label={`${typeLib} vendu(e)s`}
              valeur={nb(m.stats.nb)}
              aide={`à moins de ${nb(m.criteres.rayonKm, 1)} km, 3 ans`}
            />
            <Kpi
              label='Prix médian du secteur'
              valeur={`${nb(m.stats.medianeM2)} €/m²`}
              aide='toutes surfaces confondues'
            />
          </>
        ) : null}
        <Kpi
          label='Tendance'
          valeur={
            d.estimation.marche.tendanceAnnuelle === null
              ? 'stable'
              : `${d.estimation.marche.tendanceAnnuelle >= 0 ? '+' : ''}${nb(d.estimation.marche.tendanceAnnuelle * 100, 1)} %/an`
          }
          aide='évolution du prix au m²'
        />
      </View>
      {(d.carteComparables ?? d.secteur.carte) && (
        <View style={{ marginBottom: 10 }}>
          <Carte
            carte={(d.carteComparables ?? d.secteur.carte)!}
            hauteur={d.carteComparables ? 140 : 115}
            numeros
          />
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
        <View key={c.n} style={[s.ligne, { paddingVertical: 2.5 }]} wrap={false}>
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
            marginTop: 8,
            paddingVertical: 10,
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
        {`${d.estimation.marche.criteres}. Ventes retenues pour leur proximité, leur surface, leur nombre de pièces et leur terrain proches de votre bien ; prix à la date de l’acte.`}
      </Text>
      <EncadreDvf />
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
    <PageDossier titre='Le prix de marché' avis={avis}>
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
      {avis.textes.bien ? (
        <View style={[s.carteBleue, { padding: 14, marginTop: 12 }]} wrap={false}>
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
      ) : null}
    </PageDossier>
  );
}

function Ajustements({ d }: { d: AvisPdfData }) {
  const { estimation, avis } = d;
  const r = estimation.resultat;
  return (
    <PageDossier titre='Ajustements et stratégie de prix' avis={avis}>
      <View style={s.carte} wrap={false}>
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
      <StrategiePrix d={d} />
    </PageDossier>
  );
}

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
        <Text style={{ marginBottom: 6 }}>
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
                  marginBottom: 1.5
                }}
              >
                <View
                  style={{
                    width: 70 + i * 22,
                    height: 14,
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
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            marginTop: 6,
            backgroundColor: C.pale,
            borderRadius: 8,
            padding: 6
          }}
        >
          <Svg width={46} height={28} viewBox='0 0 170 104'>
            <Polygon points='20,46 85,8 150,46' fill={C.blanc} stroke={C.marine} strokeWidth={6} />
            <Rect
              x={30}
              y={46}
              width={110}
              height={52}
              fill={C.blanc}
              stroke={C.marine}
              strokeWidth={6}
            />
            <Rect x={74} y={66} width={22} height={32} fill={C.marine} />
            <Path d='M50 40 L85 20 L120 40' stroke={C.ok} strokeWidth={10} fill='none' />
          </Svg>
          <Text style={{ flex: 1, fontSize: 8 }}>
            Les leviers pour gagner une classe : isoler les combles et les murs, remplacer les
            fenêtres anciennes, moderniser le chauffage et la ventilation. Un audit énergétique
            chiffre précisément les travaux.
          </Text>
        </View>
      </View>
      <AttractiviteDpe d={d} />
    </PageDossier>
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
          <Text style={{ color: C.trait, fontSize: 7.5 }}>net vendeur</Text>
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
            `Les ventes de maisons et d’appartements des ${d.estimation.periodeAns === 3 ? 'trois' : 'cinq'} dernières années, issues des actes notariés et publiées par l’administration fiscale (base DVF, data.gouv.fr). Seules les ventes d’un seul logement sont retenues, pour que le prix corresponde à un bien identifiable.`
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
        {`Sources : DVF (DGFiP, data.gouv.fr), publiées deux fois par an avec environ six mois de décalage ; plans, photographies aériennes et cadastre © IGN Géoplateforme ; valeur verte : Notaires de France ; populations INSEE (geo.api.gouv.fr). Dossier établi le ${dateLongue(d.avis.dateAvis)} sur ${nb(estimation.nbComparables)} ventes comparables, indice de confiance ${m.confiance}.`}
      </Text>
      <Text style={[s.petit, { marginTop: 10 }]}>{avis.agence.mentions}</Text>
    </PageDossier>
  );
}

const PAGES: Record<string, (props: { d: AvisPdfData }) => React.ReactElement | null> = {
  agence: Agence,
  equipe: Equipe,
  bien: BienSynthese,
  cadastre: Cadastre,
  comparables: Comparables,
  positionnement: Positionnement,
  ajustements: Ajustements,
  valeurVerte: ValeurVerte,
  assainissement: Assainissement,
  financement: CibleFinancement,
  methode: Methode,
  accompagnement: Accompagnement,
  exclusivite: Exclusivite,
  annonce: Annonce
};

export function AvisDocument({ d }: { d: AvisPdfData }) {
  return (
    <Document
      title={`Estimation - ${[d.bien.adresse, d.bien.ville].filter(Boolean).join(' ')}`}
      author={d.avis.agence.nom}
      creator='Ovalia'
      language='fr'
    >
      <Couverture d={d} />
      <Sommaire d={d} />
      {pagesActives(d).map(([k]) => {
        const Composant = PAGES[k];
        return Composant ? <Composant key={k} d={d} /> : null;
      })}
      <AvisFinal d={d} />
    </Document>
  );
}
