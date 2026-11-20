'use server';

import { createClient } from '@/lib/supabase/server';
import { ErreurMail, mailsPourTri } from '@/lib/mail/imap';
import { trierMails } from '@/lib/ai/tri-mails';
import { resumeProjet } from '@/features/prospects/types';
import type { ResultatTri } from './tri-types';

// Bouton « Trier ma boîte » : lit les mails (lecture seule), rassemble les dossiers utiles
// (biens, acquéreurs, rapprochements, visites) et demande le tri à l'IA. Rien n'est enregistré.

type Ligne = Record<string, unknown>;

const parisJour = () =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  }).format(new Date());

const sansVide = (o: Ligne) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)
    )
  );

export async function trierBoite(options: {
  bilan: boolean;
}): Promise<{ ok: true; resultat: ResultatTri } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const bilan = options?.bilan === true;

  let boite: Awaited<ReturnType<typeof mailsPourTri>>;
  try {
    boite = await mailsPourTri(supabase, user.id, {
      jours: bilan ? 8 : 10,
      max: 60
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof ErreurMail && e.code === 'identifiants'
          ? 'La messagerie refuse le mot de passe enregistré : reconnectez la boîte.'
          : 'La messagerie Laforêt ne répond pas. Réessayez dans quelques minutes.'
    };
  }
  if (!boite) return { ok: false, error: 'Connectez d’abord votre boîte mail.' };
  if (!boite.recus.length)
    return { ok: false, error: 'Aucun mail reçu ces derniers jours : rien à trier.' };

  const il_y_a = (j: number) => new Date(Date.now() - j * 86_400_000).toISOString();
  const [biens, acquereurs, rapprochements, taches] = await Promise.all([
    supabase
      .from('biens')
      .select(
        'id, reference, type, statut, ville, adresse, prix_affiche, surface, pieces, chambres, surface_terrain, mandat_fin, prochain_contact, disponible_le, updated_at, bien_contacts(role, contacts(nom, prenom, email, portable))'
      )
      .neq('statut', 'suspendu')
      .order('updated_at', { ascending: false })
      .limit(80),
    supabase
      .from('contacts')
      .select(
        'nom, prenom, email, portable, projets(types_bien, budget_max, chambres_min, surface_min, zone, communes, criteres, informations, date_contact, actif)'
      )
      .eq('archive', false)
      .contains('categories', ['acquereur'])
      .limit(200),
    supabase
      .from('rapprochements')
      .select(
        'score, statut, avis, envoye_at, biens(reference, type, ville), projets(contacts(nom, prenom))'
      )
      .neq('statut', 'ecarte')
      .gte('score', 60)
      .order('score', { ascending: false })
      .limit(60),
    supabase
      .from('taches')
      .select(
        'titre, detail, type, echeance, faite_at, biens(reference, ville), contacts(nom, prenom, email)'
      )
      .gte('echeance', il_y_a(21))
      .order('echeance')
      .limit(80)
  ]);

  const nom = (c: Ligne | null | undefined) =>
    c ? [c.prenom, c.nom].filter(Boolean).join(' ') : null;

  const contexte = {
    aujourdhui: parisJour(),
    demandeBilan: bilan,
    recus: boite.recus.map((m) =>
      sansVide({
        uid: m.uid,
        de: m.adresse ? `${m.de} <${m.adresse}>` : m.de,
        a: m.a,
        objet: m.sujet,
        date: m.date,
        lu: m.lu,
        pieceJointe: m.pieceJointe || undefined,
        important: m.important || undefined,
        texte: m.texte
      })
    ),
    envoyes: boite.envoyes,
    biens: ((biens.data ?? []) as Ligne[]).map((b) =>
      sansVide({
        reference: b.reference ?? `bien ${String(b.id).slice(0, 8)}`,
        type: b.type,
        statut: b.statut,
        ville: b.ville,
        adresse: b.adresse,
        prix_affiche: b.prix_affiche,
        surface: b.surface,
        pieces: b.pieces,
        chambres: b.chambres,
        terrain: b.surface_terrain,
        mandat_fin: b.mandat_fin,
        prochain_contact: b.prochain_contact,
        disponible_le: b.disponible_le,
        vendeurs: ((b.bien_contacts as Ligne[] | null) ?? [])
          .filter((x) => x.role === 'vendeur')
          .map((x) => {
            const c = x.contacts as Ligne | null;
            return sansVide({ nom: nom(c), email: c?.email, portable: c?.portable });
          })
      })
    ),
    acquereurs: ((acquereurs.data ?? []) as Ligne[]).flatMap((c) => {
      const projet = ((c.projets as Ligne[] | null) ?? []).find((p) => p.actif !== false);
      if (!projet) return [];
      return [
        sansVide({
          nom: nom(c),
          email: c.email,
          portable: c.portable,
          recherche: resumeProjet(projet as unknown as Parameters<typeof resumeProjet>[0]),
          informations: projet.informations,
          dernier_contact: projet.date_contact
        })
      ];
    }),
    rapprochements: ((rapprochements.data ?? []) as Ligne[]).map((r) => {
      const b = r.biens as Ligne | null;
      const p = r.projets as Ligne | null;
      return sansVide({
        bien: b ? [b.reference, b.type, b.ville].filter(Boolean).join(' · ') : null,
        client: nom(p?.contacts as Ligne | null),
        score: r.score,
        statut: r.statut,
        avis: r.avis,
        envoye_le: r.envoye_at
      });
    }),
    taches: ((taches.data ?? []) as Ligne[]).map((t) => {
      const b = t.biens as Ligne | null;
      const c = t.contacts as Ligne | null;
      return sansVide({
        titre: t.titre,
        type: t.type,
        detail: t.detail,
        echeance: t.echeance,
        faite: Boolean(t.faite_at),
        bien: b ? [b.reference, b.ville].filter(Boolean).join(' · ') : null,
        client: nom(c),
        email: c?.email
      });
    })
  };

  const res = await trierMails(contexte);
  if (!res.ok) return res;

  // En-têtes repris du serveur de messagerie, jamais de la réponse IA ; un mail oublié par l'IA reste visible.
  const parUid = new Map(boite.recus.map((m) => [m.uid, m]));
  const vus = new Set<number>();
  const mails = res.tri.mails.flatMap((t) => {
    const m = parUid.get(t.uid);
    if (!m || vus.has(t.uid)) return [];
    vus.add(t.uid);
    return [{ ...t, de: m.de, adresse: m.adresse, sujet: m.sujet, date: m.date }];
  });
  for (const m of boite.recus)
    if (!vus.has(m.uid))
      mails.push({
        uid: m.uid,
        categorie: 'info',
        action: 'Non classé par l’IA : à regarder.',
        de: m.de,
        adresse: m.adresse,
        sujet: m.sujet,
        date: m.date
      });

  return {
    ok: true,
    resultat: {
      trieLe: new Date().toISOString(),
      bilan,
      nbMails: boite.recus.length,
      resume: res.tri.resume,
      mails,
      rapprochements: res.tri.rapprochements.slice(0, 8),
      relances: res.tri.relances.slice(0, 10),
      priorites: res.tri.priorites.slice(0, 3),
      bilanSemaine: bilan ? (res.tri.bilan ?? null) : null
    }
  };
}
