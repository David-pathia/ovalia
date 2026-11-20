import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ImapFlow, type MessageStructureObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import { chiffrer, dechiffrer } from './chiffrement';

// Boîte mail Laforêt : messagerie BlueMind, lue en IMAP (comme sur l'iPhone de Julien).
// Le mot de passe est saisi par l'utilisateur dans Ovalia, chiffré (AES-256-GCM, JETONS_CHIFFREMENT_CLE)
// puis stocké dans `comptes_mail`. La boîte est ouverte en lecture seule : aucun mail n'est copié
// dans Ovalia ni marqué comme lu.

export const SERVEUR_LAFORET = { hote: 'messagerie.laforet.com', port: 993 };
export const WEBMAIL_LAFORET = 'https://messagerie.laforet.com/';

export const messagerieConfiguree = () => (process.env.JETONS_CHIFFREMENT_CLE ?? '').length >= 32;

export class ErreurMail extends Error {
  constructor(
    public code: 'identifiants' | 'serveur' | 'table' | 'stockage' | 'configuration',
    message: string
  ) {
    super(message);
  }
}

type Acces = { hote: string; port: number; identifiant: string; motDePasse: string };

function client(a: Acces) {
  return new ImapFlow({
    host: a.hote,
    port: a.port,
    secure: true,
    auth: { user: a.identifiant, pass: a.motDePasse },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000
  });
}

async function connecter(a: Acces) {
  const imap = client(a);
  imap.on('error', () => {}); // erreurs réseau tardives : déjà traitées par l'appel en cours
  try {
    await imap.connect();
  } catch (e) {
    imap.close(); // sinon la connexion refusée reste ouverte et bloque la fonction
    const err = e as { authenticationFailed?: boolean; code?: string };
    if (err.authenticationFailed)
      throw new ErreurMail('identifiants', 'Adresse ou mot de passe refusé par la messagerie.');
    throw new ErreurMail('serveur', 'La messagerie Laforêt ne répond pas. Réessayez plus tard.');
  }
  return imap;
}

/** Vérifie les identifiants auprès du serveur puis les enregistre (mot de passe chiffré). */
export async function enregistrerCompte(
  supabase: SupabaseClient,
  ownerId: string,
  a: Acces & { nom?: string | null }
) {
  if (!messagerieConfiguree())
    throw new ErreurMail('configuration', 'Clé de chiffrement absente (JETONS_CHIFFREMENT_CLE).');
  const imap = await connecter(a);
  await imap.logout().catch(() => {});
  const { error } = await supabase.from('comptes_mail').upsert(
    {
      owner_id: ownerId,
      email: a.identifiant,
      nom: a.nom ?? null,
      serveur: a.hote,
      port: a.port,
      identifiant: a.identifiant,
      mot_de_passe_chiffre: chiffrer(a.motDePasse),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'owner_id' }
  );
  if (error)
    throw new ErreurMail(
      /comptes_mail/.test(error.message) ? 'table' : 'stockage',
      'Impossible d’enregistrer la connexion.'
    );
}

export type CompteMail = { email: string | null; nom: string | null };

async function lireAcces(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase
    .from('comptes_mail')
    .select('email, nom, serveur, port, identifiant, mot_de_passe_chiffre')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw new ErreurMail('table', error.message);
  if (!data) return null;
  return {
    compte: { email: data.email, nom: data.nom } as CompteMail,
    acces: {
      hote: data.serveur as string,
      port: Number(data.port),
      identifiant: data.identifiant as string,
      motDePasse: dechiffrer(data.mot_de_passe_chiffre as string)
    }
  };
}

export type MailRecu = {
  uid: number;
  sujet: string | null;
  de: string;
  adresse: string | null;
  date: string;
  lu: boolean;
  pieceJointe: boolean;
  important: boolean;
  apercu: string;
};

function aPieceJointe(s?: MessageStructureObject): boolean {
  if (!s) return false;
  if (s.disposition === 'attachment') return true;
  return (s.childNodes ?? []).some(aPieceJointe);
}

const ESPACES = /\s+/g;

/** Compte connecté et derniers mails de la boîte de réception (null si aucune boîte connectée). */
export async function boiteDeReception(
  supabase: SupabaseClient,
  ownerId: string,
  nombre = 30
): Promise<{ compte: CompteMail; mails: MailRecu[] } | null> {
  if (!messagerieConfiguree()) return null;
  const lu = await lireAcces(supabase, ownerId);
  if (!lu) return null;
  const imap = await connecter(lu.acces);
  const mails: MailRecu[] = [];
  try {
    const boite = await imap.mailboxOpen('INBOX', { readOnly: true });
    if (boite.exists > 0) {
      const debut = Math.max(1, boite.exists - nombre + 1);
      for await (const m of imap.fetch(`${debut}:*`, {
        uid: true,
        flags: true,
        envelope: true,
        internalDate: true,
        bodyStructure: true,
        headers: ['importance', 'x-priority'],
        // Début du message seulement : assez pour l'aperçu, sans télécharger les pièces jointes.
        source: { maxLength: 24_000 }
      })) {
        const entetes = m.headers?.toString('utf8').toLowerCase() ?? '';
        let apercu = '';
        if (m.source) {
          const p = await simpleParser(m.source, { skipImageLinks: true }).catch(() => null);
          apercu = (p?.text ?? '').replace(ESPACES, ' ').trim().slice(0, 400);
        }
        const de = m.envelope?.from?.[0];
        const date = m.envelope?.date ?? m.internalDate;
        mails.push({
          uid: m.uid,
          sujet: m.envelope?.subject ?? null,
          de: de?.name || de?.address || 'Expéditeur inconnu',
          adresse: de?.address ?? null,
          date: (date instanceof Date ? date : new Date(date ?? Date.now())).toISOString(),
          lu: m.flags?.has('\\Seen') ?? false,
          pieceJointe: aPieceJointe(m.bodyStructure),
          important: /importance:\s*high|x-priority:\s*[12]/.test(entetes),
          apercu
        });
      }
    }
  } catch (e) {
    if (e instanceof ErreurMail) throw e;
    throw new ErreurMail('serveur', 'Lecture de la boîte impossible.');
  } finally {
    await imap.logout().catch(() => {});
  }
  mails.sort((a, b) => b.date.localeCompare(a.date));
  return { compte: lu.compte, mails };
}

// ——— Lecture pour le tri IA (bouton « Trier ma boîte ») ———

export type MailATrier = {
  uid: number;
  de: string;
  adresse: string | null;
  a: string[];
  sujet: string | null;
  date: string;
  lu: boolean;
  pieceJointe: boolean;
  important: boolean;
  texte: string;
};

export type MailEnvoye = { a: string[]; sujet: string | null; date: string };

// Coupe l'historique cité (« Le … a écrit : », « De : », message transféré) : seul le nouveau texte compte.
const CITATION =
  /\n\s*(?:Le .{5,120} a écrit\s*:|On .{5,120} wrote:|De\s*:\s|From\s*:\s|-{2,}\s*(?:Message d'origine|Original Message|Message transféré)|_{8,})/i;

function texteUtile(brut: string, max: number) {
  const coupe = brut.split(CITATION)[0] ?? brut;
  return coupe
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('>'))
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

const adresses = (l?: { name?: string; address?: string }[]) =>
  (l ?? [])
    .map((x) => (x.name ? `${x.name} <${x.address ?? ''}>` : (x.address ?? '')))
    .filter(Boolean);

/**
 * Mails reçus des `jours` derniers jours (les `max` plus récents, texte sans l'historique cité)
 * et en-têtes des mails envoyés sur la même période. Lecture seule, rien n'est marqué lu.
 */
export async function mailsPourTri(
  supabase: SupabaseClient,
  ownerId: string,
  { jours = 10, max = 60, tailleTexte = 3000 } = {}
): Promise<{ compte: CompteMail; recus: MailATrier[]; envoyes: MailEnvoye[] } | null> {
  if (!messagerieConfiguree()) return null;
  const lu = await lireAcces(supabase, ownerId);
  if (!lu) return null;
  const imap = await connecter(lu.acces);
  const depuis = new Date(Date.now() - jours * 86_400_000);
  const recus: MailATrier[] = [];
  const envoyes: MailEnvoye[] = [];
  try {
    await imap.mailboxOpen('INBOX', { readOnly: true });
    const uids = ((await imap.search({ since: depuis }, { uid: true })) || []).slice(-max);
    if (uids.length)
      for await (const m of imap.fetch(
        uids,
        {
          uid: true,
          flags: true,
          envelope: true,
          internalDate: true,
          bodyStructure: true,
          headers: ['importance', 'x-priority'],
          source: { maxLength: 60_000 }
        },
        { uid: true }
      )) {
        const p = m.source
          ? await simpleParser(m.source, { skipImageLinks: true }).catch(() => null)
          : null;
        const de = m.envelope?.from?.[0];
        const date = m.envelope?.date ?? m.internalDate;
        const entetes = m.headers?.toString('utf8').toLowerCase() ?? '';
        recus.push({
          uid: m.uid,
          de: de?.name || de?.address || 'Expéditeur inconnu',
          adresse: de?.address ?? null,
          a: adresses(m.envelope?.to),
          sujet: m.envelope?.subject ?? null,
          date: (date instanceof Date ? date : new Date(date ?? Date.now())).toISOString(),
          lu: m.flags?.has('\\Seen') ?? false,
          pieceJointe: aPieceJointe(m.bodyStructure),
          important: /importance:\s*high|x-priority:\s*[12]/.test(entetes),
          texte: texteUtile(p?.text ?? '', tailleTexte)
        });
      }

    // Mails envoyés : pour savoir à quoi Julien a déjà répondu (dossier « Sent » de BlueMind).
    const dossiers = await imap.list().catch(() => []);
    const envoi =
      dossiers.find((d) => d.specialUse === '\\Sent') ??
      dossiers.find((d) => /^(sent|envoy|éléments envoyés)/i.test(d.name));
    if (envoi) {
      await imap.mailboxOpen(envoi.path, { readOnly: true });
      const uidsEnvoyes = ((await imap.search({ since: depuis }, { uid: true })) || []).slice(-max);
      if (uidsEnvoyes.length)
        for await (const m of imap.fetch(
          uidsEnvoyes,
          { uid: true, envelope: true, internalDate: true },
          { uid: true }
        )) {
          const date = m.envelope?.date ?? m.internalDate;
          envoyes.push({
            a: adresses(m.envelope?.to),
            sujet: m.envelope?.subject ?? null,
            date: (date instanceof Date ? date : new Date(date ?? Date.now())).toISOString()
          });
        }
    }
  } catch (e) {
    if (e instanceof ErreurMail) throw e;
    console.error('mails.tri.lecture', e);
    throw new ErreurMail('serveur', 'Lecture de la boîte impossible.');
  } finally {
    await imap.logout().catch(() => {});
  }
  recus.sort((a, b) => a.date.localeCompare(b.date));
  envoyes.sort((a, b) => a.date.localeCompare(b.date));
  return { compte: lu.compte, recus, envoyes };
}
