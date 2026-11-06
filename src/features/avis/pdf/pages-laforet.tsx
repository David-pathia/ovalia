import { Image, Text, View } from '@react-pdf/renderer';
import { ENGAGEMENTS, FAVORIZ, METIERS_AGENCE, RESEAU_LAFORET, SOURCES_RESEAU } from '../laforet';
import { C, PageDossier, Puce, s, type AvisPdfData } from './base';

// Pages institutionnelles du dossier : réseau et agence, équipe, accompagnement, mandat exclusif Favoriz.

/** Statistiques sourcées affichées sur la page Favoriz (vide tant qu'aucune source fiable n'est retenue). */
export const STATS_EXCLUSIVITE: { valeur: string; libelle: string; source: string }[] = [];

function Titre({ children }: { children: string }) {
  return (
    <Text
      style={{ fontSize: 15, fontWeight: 700, color: C.marine, lineHeight: 1.25, marginBottom: 8 }}
    >
      {children}
    </Text>
  );
}

function Liste({ items, couleur = C.texte }: { items: string[]; couleur?: string }) {
  return (
    <View>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
          <Puce />
          <Text style={{ flex: 1, color: couleur }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export function Agence({ d }: { d: AvisPdfData }) {
  const { avis } = d;
  const a = avis.agence;
  return (
    <PageDossier titre='Le réseau et votre agence' avis={avis}>
      <View style={s.carte}>
        <Text style={s.h2}>Laforêt, c’est…</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
          {RESEAU_LAFORET.map((r) => (
            <View
              key={r.libelle}
              style={{ width: '33.33%', alignItems: 'center', paddingHorizontal: 6 }}
            >
              <Text style={{ fontSize: 19, fontWeight: 700, color: C.bleu, lineHeight: 1.2 }}>
                {r.valeur}
              </Text>
              <Text
                style={{
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: C.marine,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  lineHeight: 1.3
                }}
              >
                {r.libelle}
              </Text>
              {r.source && <Text style={[s.petit, { textAlign: 'center' }]}>{r.source}</Text>}
            </View>
          ))}
        </View>
      </View>

      <View style={[s.carteBleue, { flexDirection: 'row', gap: 14 }]} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
            Une implantation et une synergie nationale
          </Text>
          <Text style={{ color: C.trait }}>
            Grâce à notre implantation et au fichier commun des agences Laforêt, votre bien peut
            être proposé à davantage d’acquéreurs, sur une zone géographique plus vaste, avec la
            collaboration de tout le réseau.
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[s.carte, { flex: 1.15 }]} wrap={false}>
          <Text style={s.h3}>{a.nom}</Text>
          <Text>{a.adresse}</Text>
          <Text>{`${a.codePostal} ${a.ville}`}</Text>
          <Text style={{ marginTop: 6, fontWeight: 600, color: C.marine }}>{a.telephone}</Text>
          <Text>{a.email}</Text>
          <Text>{a.site}</Text>
          <Text style={{ marginTop: 6, fontWeight: 600, color: C.marine }}>Nos horaires</Text>
          <Text>{a.horaires}</Text>
          <Text style={[s.petit, { marginTop: 6 }]}>{METIERS_AGENCE}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={[s.carte, { backgroundColor: C.pale, borderColor: C.pale }]} wrap={false}>
            <Text style={s.h3}>Le marché local, au quotidien</Text>
            <Text>
              Implantés à Roanne, nous suivons chaque jour les biens en vente dans le Roannais et
              rencontrons les acquéreurs qui les visitent : c’est cette connaissance du terrain qui
              affine chaque estimation.
            </Text>
          </View>
          {a.arbres.trim() ? (
            <View style={[s.carte, { backgroundColor: C.pale, borderColor: C.pale }]} wrap={false}>
              <Text style={s.h3}>Notre engagement environnemental</Text>
              <Text>{a.arbres}</Text>
            </View>
          ) : null}
          {a.avisClients.trim() ? (
            <View style={[s.carte, { backgroundColor: C.pale, borderColor: C.pale }]} wrap={false}>
              <Text style={s.h3}>L’avis de nos clients</Text>
              <Text>{a.avisClients}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={s.petit}>{SOURCES_RESEAU}</Text>
    </PageDossier>
  );
}

export function Equipe({ d }: { d: AvisPdfData }) {
  const { avis } = d;
  const a = avis.agence;
  return (
    <PageDossier titre='Une équipe à votre service' avis={avis}>
      <View style={[s.carteBleue, { padding: 18 }]} wrap={false}>
        <Text style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, textAlign: 'center' }}>
          {`« En nous confiant votre bien, vous ne bénéficiez pas des services d’un seul conseiller immobilier, mais de la force d’une équipe de ${d.equipe.length > 1 ? `${['', '', 'deux', 'trois', 'quatre', 'cinq', 'six'][d.equipe.length] ?? d.equipe.length} professionnels` : 'professionnels'} mobilisés pour la réussite de votre vente. »`}
        </Text>
      </View>

      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}
        wrap={false}
      >
        {d.equipe.map((m, i) => (
          <View key={m.prenom} style={{ width: 118, alignItems: 'center' }}>
            {m.photo ? (
              <Image
                src={m.photo}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 16,
                  borderWidth: 2.5,
                  borderColor: i % 2 ? C.marine : C.ciel,
                  objectFit: 'cover'
                }}
              />
            ) : (
              <View
                style={{ width: 104, height: 104, borderRadius: 16, backgroundColor: C.pale }}
              />
            )}
            <Text
              style={{ marginTop: 6, fontWeight: 700, color: C.marine, fontSize: 9.5 }}
            >{`${m.prenom} ${m.nom.toUpperCase()}`}</Text>
            <Text style={{ color: C.doux, fontSize: 8.5 }}>{m.role}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {[
          [
            'Complémentaires',
            'Direction, négociation, suivi commercial : chacun apporte son expertise à votre projet.'
          ],
          [
            'Informés ensemble',
            'Les acquéreurs que nous rencontrons et les retours de visite sont partagés dans toute l’équipe.'
          ],
          [
            'Disponibles',
            `Une agence ouverte du lundi au vendredi et une équipe joignable, pour vous comme pour vos acquéreurs.`
          ]
        ].map(([t, x]) => (
          <View key={t} style={{ flex: 1, backgroundColor: C.pale, borderRadius: 12, padding: 12 }}>
            <Text style={s.h3}>{t}</Text>
            <Text style={{ fontSize: 9 }}>{x}</Text>
          </View>
        ))}
      </View>

      <View style={[s.carte, { flexDirection: 'row', gap: 16, alignItems: 'center' }]} wrap={false}>
        <View style={{ width: 110, alignItems: 'center' }}>
          <Text style={{ fontSize: 44, fontWeight: 700, color: C.bleu, lineHeight: 1.1 }}>
            {a.portails || '—'}
          </Text>
          <Text
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: C.marine,
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
          >
            portails immobiliers
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Une diffusion puissante</Text>
          <Liste
            items={[
              `Votre annonce publiée sur ${a.portails || 'nos'} portails immobiliers, laforet.com et notre site d’agence.`,
              a.reseauxSociaux.trim()
                ? `Relayée sur nos réseaux sociaux : ${a.reseauxSociaux}.`
                : 'Relayée sur nos réseaux sociaux.',
              'Mise en avant dans notre vitrine, au cœur de Roanne, et dans le fichier commun des agences Laforêt.',
              'Plus de visibilité, c’est plus de contacts qualifiés et plus d’opportunités de vendre au bon prix.'
            ]}
          />
        </View>
      </View>
    </PageDossier>
  );
}

export function Accompagnement({ d }: { d: AvisPdfData }) {
  const { avis } = d;
  const etapes = avis.etapes.filter((e) => e.titre.trim());
  return (
    <PageDossier titre='Votre accompagnement' avis={avis}>
      <View style={[s.carteBleue, { padding: 16 }]} wrap={false}>
        <Text style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
          Avec Laforêt Roanne, vous êtes accompagné à chaque étape de votre vente.
        </Text>
      </View>

      {etapes.length > 0 && (
        <View style={{ flexDirection: 'row', marginBottom: 14, marginTop: 2 }} wrap={false}>
          {etapes.map((e, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                <View
                  style={{ flex: 1, height: 2, backgroundColor: i === 0 ? C.blanc : C.trait }}
                />
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: i % 2 ? C.ciel : C.marine,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ color: C.blanc, fontSize: 9, fontWeight: 700, lineHeight: 1 }}>
                    {i + 1}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: i === etapes.length - 1 ? C.blanc : C.trait
                  }}
                />
              </View>
              <Text
                style={{
                  fontSize: 7.8,
                  fontWeight: 700,
                  color: C.marine,
                  textAlign: 'center',
                  marginTop: 4,
                  lineHeight: 1.25,
                  paddingHorizontal: 2
                }}
              >
                {e.titre}
              </Text>
              {e.delai.trim() ? (
                <Text style={{ fontSize: 7, color: C.doux, textAlign: 'center' }}>{e.delai}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: 9
        }}
      >
        {ENGAGEMENTS.map((e, i) => (
          <View
            key={e.titre}
            style={{
              width: i === ENGAGEMENTS.length - 1 && ENGAGEMENTS.length % 2 ? '100%' : '48.8%',
              borderWidth: 1,
              borderColor: C.trait,
              borderRadius: 12,
              padding: 11,
              flexDirection: 'row',
              gap: 9
            }}
            wrap={false}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: C.pale,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ color: C.bleu, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>
                {i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 700, color: C.marine, fontSize: 10, lineHeight: 1.3 }}>
                {e.titre}
              </Text>
              <Text style={{ fontSize: 8.6, marginTop: 2 }}>{e.texte}</Text>
            </View>
          </View>
        ))}
      </View>
    </PageDossier>
  );
}

export function Exclusivite({ d }: { d: AvisPdfData }) {
  const { avis } = d;
  return (
    <PageDossier titre='Le mandat exclusif Favoriz' avis={avis}>
      <Titre>L’exclusivité, un engagement de confiance mutuelle.</Titre>
      <View
        style={[s.carte, { flexDirection: 'row', gap: 14, padding: 12, marginBottom: 8 }]}
        wrap={false}
      >
        <View style={{ flex: 1.2 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.marine,
              letterSpacing: 1,
              lineHeight: 1.1
            }}
          >
            FAVORIZ
          </Text>
          <Text style={{ fontWeight: 600, color: C.bleu, marginTop: 2 }}>{FAVORIZ.accroche}</Text>
          <Text style={[s.petit, { marginTop: 6 }]}>{FAVORIZ.liberte}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: C.pale, borderRadius: 10, padding: 10 }}>
          <Text style={s.h3}>Le plan d’action signé</Text>
          <Liste items={FAVORIZ.planAction} />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: 6,
          marginBottom: 8
        }}
      >
        {FAVORIZ.avantages.map((a, i) => (
          <View
            key={a.titre}
            style={{
              width: '48.8%',
              backgroundColor: i % 4 === 0 || i % 4 === 3 ? C.marine : C.bleu,
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 10
            }}
            wrap={false}
          >
            <Text
              style={{ color: C.blanc, fontWeight: 700, fontSize: 10, lineHeight: 1.3 }}
            >{`${i + 1}. ${a.titre}`}</Text>
            <Text style={{ color: C.trait, fontSize: 8.6, marginTop: 2 }}>{a.texte}</Text>
          </View>
        ))}
      </View>

      {STATS_EXCLUSIVITE.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }} wrap={false}>
          {STATS_EXCLUSIVITE.map((st) => (
            <View
              key={st.libelle}
              style={{ flex: 1, backgroundColor: C.pale, borderRadius: 10, padding: 10 }}
            >
              <Text style={s.kpiValeur}>{st.valeur}</Text>
              <Text style={{ fontSize: 8.5 }}>{st.libelle}</Text>
              <Text style={s.petit}>{st.source}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[s.carte, { padding: 12, marginBottom: 8 }]} wrap={false}>
        <Text style={s.h3}>Les services inclus dans Favoriz</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
          {FAVORIZ.services.map((x) => (
            <View key={x.titre} style={{ width: '33.33%', paddingRight: 8 }}>
              <Text style={{ fontWeight: 700, color: C.marine, fontSize: 9 }}>{x.titre}</Text>
              <Text style={{ fontSize: 8 }}>{x.texte}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[s.carteBleue, { padding: 11, marginBottom: 6 }]} wrap={false}>
        <Text
          style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.4, textAlign: 'center' }}
        >{`« ${FAVORIZ.conclusion} »`}</Text>
      </View>
      <Text style={[s.petit, { fontSize: 6.5, lineHeight: 1.3 }]}>{FAVORIZ.mentions}</Text>
    </PageDossier>
  );
}
