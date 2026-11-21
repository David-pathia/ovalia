import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import { aujourdhui, dateLisible, ecartJours, enParis, plusJours } from './dates';
import type { ActionJour, Journee, Moment, Nature, Personne } from './types';

// Collecte de la journée : chaque règle transforme des dossiers en actions concrètes.
// Rien n'est inventé ni stocké : une action disparaît quand le dossier change
// (tâche cochée, prochain contact reporté, rapprochement traité, avis préparé…).

/** Score minimal d'un rapprochement pour figurer dans la journée. */
const SCORE_MIN = 70;
/** Un acquéreur sans contact depuis ce nombre de jours est à rappeler. */
const ACQUEREUR_JOURS = 45;
/** Fenêtre de surveillance des fins de mandat. */
const MANDAT_JOURS = 30;
/** Avis de valeur remis sans mandat depuis ce nombre de jours : relance. */
const ESTIMATION_RELANCE_JOURS = 10;

type Contact = { nom: string; prenom: string | null; portable: string | null };
type BienLigne = {
  id: string;
  reference: string | null;
  type: string;
  statut: string;
  type_mandat: string | null;
  pieces: number | null;
  surface: number | null;
  ville: string | null;
  prochain_contact: string | null;
  mandat_fin: string | null;
  created_at: string;
  bien_contacts: { role: string; contacts: Contact | null }[] | null;
};

const nomComplet = (c: Contact) => [c.prenom, c.nom].filter(Boolean).join(' ');

const titreBien = (b: BienLigne) =>
  [
    libelle(TYPES_BIEN, b.type),
    b.pieces ? `${b.pieces} p.` : null,
    b.surface ? `${Number(b.surface)} m²` : null,
    b.ville
  ]
    .filter(Boolean)
    .join(' · ');

const vendeurs = (b: BienLigne) =>
  (b.bien_contacts ?? [])
    .filter((bc) => bc.role === 'vendeur' && bc.contacts)
    .map((bc) => bc.contacts!);

/** Moment d'une date : en retard, aujourd'hui, dans la semaine ou plus tard. */
function momentDe(date: string | null, jour: string): Moment {
  if (!date) return 'plus_tard';
  const e = ecartJours(jour, date);
  if (e < 0) return 'retard';
  if (e === 0) return 'jour';
  if (e <= 7) return 'semaine';
  return 'plus_tard';
}

const action = (a: Partial<ActionJour> & Pick<ActionJour, 'id' | 'moment' | 'nature' | 'titre'>) =>
  ({
    detail: null,
    date: null,
    heure: null,
    href: null,
    lien: null,
    telephone: null,
    geste: null,
    ...a
  }) satisfies ActionJour;

export async function chargerJournee(supabase: SupabaseClient): Promise<Journee> {
  const jour = aujourdhui();
  const dans7 = plusJours(jour, 7);
  const manques: string[] = [];

  const [tachesR, biensR, rapprochementsR, projetsR, syncR] = await Promise.all([
    supabase
      .from('taches')
      .select(
        'id, titre, detail, type, echeance, faite_at, bien_id, contacts(nom, prenom, portable)'
      )
      .or(`faite_at.is.null,faite_at.gte.${new Date(Date.now() - 86_400_000).toISOString()}`)
      .order('echeance', { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from('biens')
      .select(
        'id, reference, type, statut, type_mandat, pieces, surface, ville, prochain_contact, mandat_fin, created_at, bien_contacts(role, contacts(nom, prenom, portable))'
      )
      .neq('statut', 'suspendu')
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .from('rapprochements')
      .select(
        'id, score, created_at, bien_id, projets(informations, contacts(nom, prenom, portable, archive))'
      )
      .eq('statut', 'nouveau')
      .gte('score', SCORE_MIN)
      .order('score', { ascending: false })
      .limit(300),
    supabase
      .from('projets')
      .select('id, date_contact, informations, contacts!inner(nom, prenom, portable, archive)')
      .eq('actif', true)
      .eq('nature', 'recherche')
      .eq('contacts.archive', false)
      .lt('date_contact', plusJours(jour, -ACQUEREUR_JOURS))
      .order('date_contact', { ascending: false })
      .limit(300),
    supabase
      .from('laforet_sync')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente')
  ]);

  const biens = (biensR.data ?? []) as unknown as BienLigne[];
  const parId = new Map(biens.map((b) => [b.id, b]));
  const estimations = biens.filter((b) => b.statut === 'estimation');

  // Analyses (estimation, avis de valeur) et avis clients des biens concernés.
  const idsAnalyses = biens
    .filter((b) => b.statut === 'estimation' || b.statut === 'sous_offre')
    .map((b) => b.id);
  const [analysesR, avisR] = await Promise.all([
    idsAnalyses.length
      ? supabase
          .from('bien_analyses')
          .select('bien_id, type, valeur_probable, created_at')
          .in('bien_id', idsAnalyses)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('avis_clients').select('id, bien_id, repondu_le, publication').limit(1000)
  ]);
  if (avisR.error) manques.push('avis clients');

  const analyses = (analysesR.data ?? []) as {
    bien_id: string;
    type: string;
    valeur_probable: number | null;
    created_at: string;
  }[];
  const avis = (avisR.data ?? []) as {
    id: string;
    bien_id: string | null;
    repondu_le: string | null;
    publication: string;
  }[];

  const actions: ActionJour[] = [];

  // 1. Tâches saisies.
  for (const t of (tachesR.data ?? []) as unknown as {
    id: string;
    titre: string;
    detail: string | null;
    type: string;
    echeance: string | null;
    faite_at: string | null;
    bien_id: string | null;
    contacts: Contact | null;
  }[]) {
    const quand = t.echeance ? enParis(t.echeance) : null;
    const faite = !!t.faite_at;
    // Une tâche faite reste visible le jour où elle a été cochée, pour garder la trace de la journée.
    if (faite && enParis(t.faite_at!).date !== jour) continue;
    const bien = t.bien_id ? parId.get(t.bien_id) : undefined;
    actions.push(
      action({
        id: `tache:${t.id}`,
        moment: faite ? 'jour' : quand ? momentDe(quand.date, jour) : 'jour',
        nature: (NATURES_TACHE.includes(t.type) ? t.type : 'autre') as Nature,
        titre: t.titre,
        detail:
          [t.detail, bien ? titreBien(bien) : null, t.contacts ? nomComplet(t.contacts) : null]
            .filter(Boolean)
            .join(' · ') || null,
        date: quand?.date ?? null,
        heure: quand && quand.heure !== '00:00' ? quand.heure : null,
        href: bien ? `/dashboard/biens/${bien.id}` : null,
        lien: bien ? 'Fiche du bien' : null,
        telephone: t.contacts?.portable ?? (bien ? (vendeurs(bien)[0]?.portable ?? null) : null),
        geste: { type: 'tache', tacheId: t.id, faite }
      })
    );
  }

  // 2. Relances vendeurs : champ « Prochain contact » de la fiche bien.
  for (const b of biens) {
    if (!b.prochain_contact || b.prochain_contact > dans7) continue;
    const v = vendeurs(b)[0];
    actions.push(
      action({
        id: `relance:${b.id}`,
        moment: momentDe(b.prochain_contact, jour),
        nature: 'appel',
        titre: v ? `Rappeler ${nomComplet(v)}` : 'Recontacter le vendeur',
        detail: `${titreBien(b)} · ${libelle(STATUTS_COURTS, b.statut)}`,
        date: b.prochain_contact,
        href: `/dashboard/biens/${b.id}`,
        lien: 'Fiche du bien',
        telephone: v?.portable ?? null,
        geste: { type: 'relance', bienId: b.id }
      })
    );
  }

  // 3. Échéances de mandat (30 jours avant, et jusqu'à 30 jours après si rien n'a bougé).
  for (const b of biens) {
    if (!b.mandat_fin || !['mandat_en_cours', 'avant_premiere', 'sous_offre'].includes(b.statut))
      continue;
    const e = ecartJours(jour, b.mandat_fin);
    if (e > MANDAT_JOURS || e < -MANDAT_JOURS) continue;
    const v = vendeurs(b)[0];
    const mandat =
      b.type_mandat === 'favoriz' ? 'Mandat Favoriz' : b.type_mandat ? 'Mandat simple' : 'Mandat';
    actions.push(
      action({
        id: `mandat:${b.id}`,
        moment: e < 0 ? 'retard' : e <= 7 ? 'semaine' : 'plus_tard',
        nature: 'mandat',
        titre:
          e < 0
            ? `${mandat} échu depuis ${-e} j`
            : `${mandat} : fin ${e === 0 ? 'aujourd’hui' : `dans ${e} j`}`,
        detail: [
          titreBien(b),
          b.statut === 'sous_offre'
            ? 'sous offre : vérifier que le mandat couvre la signature'
            : 'faire le point avec le vendeur et proposer la prolongation',
          v ? nomComplet(v) : null
        ]
          .filter(Boolean)
          .join(' · '),
        date: b.mandat_fin,
        href: `/dashboard/biens/${b.id}`,
        lien: 'Fiche du bien',
        telephone: v?.portable ?? null
      })
    );
  }

  // 4. Acquéreurs à appeler : nouveaux rapprochements, regroupés par bien.
  const parBien = new Map<string, { personnes: Personne[]; recent: string }>();
  for (const r of (rapprochementsR.data ?? []) as unknown as {
    id: string;
    score: number;
    created_at: string;
    bien_id: string;
    projets: {
      informations: string | null;
      contacts: Contact & { archive: boolean };
    } | null;
  }[]) {
    const c = r.projets?.contacts;
    if (!c || c.archive || !parId.has(r.bien_id)) continue;
    const g = parBien.get(r.bien_id) ?? { personnes: [], recent: r.created_at };
    g.personnes.push({
      id: r.id,
      nom: nomComplet(c),
      telephone: c.portable,
      score: r.score,
      info: r.projets?.informations ?? null
    });
    if (r.created_at > g.recent) g.recent = r.created_at;
    parBien.set(r.bien_id, g);
  }
  for (const [bienId, g] of parBien) {
    const b = parId.get(bienId)!;
    const n = g.personnes.length;
    // Un bien qui vient d'entrer : aujourd'hui. Des rapprochements qui attendent depuis plus de 3 jours : en retard.
    const attente = ecartJours(enParis(g.recent).date, jour);
    actions.push(
      action({
        id: `rapprochements:${bienId}`,
        moment: attente > 3 ? 'retard' : 'jour',
        nature: 'acquereur',
        titre: `Appeler ${n} acquéreur${n > 1 ? 's' : ''} pour ce bien`,
        detail: titreBien(b),
        href: `/dashboard/biens/${bienId}`,
        lien: 'Fiche du bien',
        geste: { type: 'rapprochements', personnes: g.personnes.slice(0, 6) }
      })
    );
  }

  // 5. Estimations : avis de valeur à préparer, puis relance si le mandat n'est pas signé.
  for (const b of estimations) {
    const a = analyses.filter((x) => x.bien_id === b.id);
    const estimation = a
      .filter((x) => x.type === 'estimation' && x.valeur_probable != null)
      .sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
    const avisValeur = a
      .filter((x) => x.type === 'avis_valeur')
      .sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
    const v = vendeurs(b)[0];
    if (estimation && !avisValeur) {
      const age = ecartJours(enParis(estimation.created_at).date, jour);
      if (age > 60) continue;
      actions.push(
        action({
          id: `avis-valeur:${b.id}`,
          moment: age > 7 ? 'retard' : age > 2 ? 'jour' : 'semaine',
          nature: 'estimation',
          titre: 'Préparer l’avis de valeur',
          detail: [titreBien(b), v ? nomComplet(v) : null, `estimé il y a ${age} j`]
            .filter(Boolean)
            .join(' · '),
          href: `/dashboard/biens/${b.id}/avis`,
          lien: 'Ouvrir l’avis'
        })
      );
    } else if (avisValeur && !b.prochain_contact) {
      const age = ecartJours(enParis(avisValeur.created_at).date, jour);
      if (age < ESTIMATION_RELANCE_JOURS || age > 90) continue;
      actions.push(
        action({
          id: `relance-estimation:${b.id}`,
          moment: 'semaine',
          nature: 'mandat',
          titre: v
            ? `Relancer ${nomComplet(v)} pour le mandat`
            : 'Relancer le vendeur pour le mandat',
          detail: `${titreBien(b)} · avis de valeur préparé il y a ${age} j, toujours en estimation`,
          href: `/dashboard/biens/${b.id}`,
          lien: 'Fiche du bien',
          telephone: v?.portable ?? null,
          geste: { type: 'relance', bienId: b.id }
        })
      );
    }
  }

  // 6. Avis clients : témoignages reçus à valider, avis à demander après une vente.
  if (!avisR.error) {
    const aValider = avis.filter((x) => x.repondu_le && x.publication === 'a_valider').length;
    if (aValider)
      actions.push(
        action({
          id: 'temoignages',
          moment: 'jour',
          nature: 'avis',
          titre: `Valider ${aValider} témoignage${aValider > 1 ? 's' : ''} reçu${aValider > 1 ? 's' : ''}`,
          detail: 'Relire puis publier sur votre site, ou garder pour vous',
          href: '/dashboard/avis-clients',
          lien: 'Avis clients'
        })
      );
    const avecAvis = new Set(avis.map((x) => x.bien_id).filter(Boolean));
    for (const b of biens) {
      if (b.statut !== 'sous_offre' || avecAvis.has(b.id)) continue;
      const v = vendeurs(b)[0];
      actions.push(
        action({
          id: `avis-client:${b.id}`,
          moment: 'plus_tard',
          nature: 'avis',
          titre: v ? `Demander un avis à ${nomComplet(v)}` : 'Demander un avis au vendeur',
          detail: `${titreBien(b)} · sous offre : le bon moment pour un témoignage`,
          href: '/dashboard/avis-clients',
          lien: 'Créer le lien',
          telephone: v?.portable ?? null
        })
      );
    }
  }

  // 7. Acquéreurs sans nouvelles : les plus récemment refroidis d'abord (les plus faciles à relancer).
  const froids = (projetsR.data ?? []) as unknown as {
    id: string;
    date_contact: string;
    informations: string | null;
    contacts: Contact;
  }[];
  if (froids.length)
    actions.push(
      action({
        id: 'acquereurs-froids',
        moment: 'plus_tard',
        nature: 'acquereur',
        titre: `${froids.length} acquéreur${froids.length > 1 ? 's' : ''} sans contact depuis ${ACQUEREUR_JOURS} jours`,
        detail: 'Un appel pour savoir où en est leur recherche',
        href: '/dashboard/prospects',
        lien: 'Prospects',
        geste: {
          type: 'personnes',
          personnes: froids.slice(0, 5).map((p) => ({
            id: p.id,
            nom: nomComplet(p.contacts),
            telephone: p.contacts.portable,
            info: `dernier contact ${dateLisible(p.date_contact, jour)}`
          }))
        }
      })
    );

  // Tri : moment, puis date et heure, puis tâches cochées en bas.
  const ordre: Record<Moment, number> = { retard: 0, jour: 1, semaine: 2, plus_tard: 3 };
  actions.sort(
    (a, b) =>
      ordre[a.moment] - ordre[b.moment] ||
      Number(a.geste?.type === 'tache' && a.geste.faite) -
        Number(b.geste?.type === 'tache' && b.geste.faite) ||
      (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
      (a.heure ?? '99').localeCompare(b.heure ?? '99')
  );

  const mandats = biens.filter((b) => ['mandat_en_cours', 'sous_offre'].includes(b.statut));
  const favoriz = mandats.filter((b) => b.type_mandat === 'favoriz').length;
  const aPreparer = actions.filter((a) => a.id.startsWith('avis-valeur:')).length;
  const nbRapprochements = [...parBien.values()].reduce((n, g) => n + g.personnes.length, 0);
  const aFaire = actions.filter(
    (a) =>
      (a.moment === 'retard' || a.moment === 'jour') &&
      !(a.geste?.type === 'tache' && a.geste.faite)
  );

  return {
    actions,
    indicateurs: [
      {
        label: 'À faire aujourd’hui',
        valeur: aFaire.length,
        aide: `dont ${aFaire.filter((a) => a.moment === 'retard').length} en retard`,
        href: '#feuille-de-route'
      },
      {
        label: 'Mandats actifs',
        valeur: mandats.length,
        aide: mandats.length ? `dont ${favoriz} Favoriz` : 'mandat en cours ou sous offre',
        href: '/dashboard/biens'
      },
      {
        label: 'Estimations en cours',
        valeur: estimations.length,
        aide: aPreparer ? `${aPreparer} avis de valeur à préparer` : 'aucun avis en attente',
        href: '/dashboard/biens'
      },
      {
        label: 'Acquéreurs à appeler',
        valeur: nbRapprochements,
        aide: `rapprochements à ${SCORE_MIN} % et plus`,
        href: '/dashboard/rapprochements'
      }
    ],
    synchroEnAttente: syncR.count ?? 0,
    manques
  };
}

const NATURES_TACHE: string[] = ['appel', 'visite', 'estimation', 'mandat', 'communication'];

const STATUTS_COURTS = [
  ['estimation', 'estimation'],
  ['avant_premiere', 'avant-première'],
  ['mandat_en_cours', 'mandat en cours'],
  ['sous_offre', 'sous offre'],
  ['suspendu', 'suspendu']
] as const;
