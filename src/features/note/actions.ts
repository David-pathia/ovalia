'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { anthropicConfigured } from '@/lib/ai/client';
import { TYPES_ACTION, lireNoteIA } from '@/lib/ai/note';
import { TYPES_BIEN, libelle } from '@/lib/biens/options';
import { aujourdhui, parisVersIso } from '@/features/today/dates';
import type { ActionProposee } from './types';

// Note vocale : lecture (propositions affichées, rien d'enregistré) puis enregistrement des actions
// cochées dans la table `taches`, qui alimente la page « Aujourd'hui ».

type Resultat<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function session() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const EXPIREE = 'Session expirée : reconnectez-vous.';

type Contact = { id: string; nom: string; prenom: string | null; categories: string[] | null };
type Bien = {
  id: string;
  type: string;
  pieces: number | null;
  ville: string | null;
  adresse: string | null;
  bien_contacts: { role: string; contacts: { nom: string; prenom: string | null } | null }[] | null;
};

const nom = (c: { nom: string; prenom: string | null }) =>
  [c.prenom, c.nom].filter(Boolean).join(' ');

/** Action de repli : la note entière, pour aujourd'hui, quand l'IA ne répond pas. Rien n'est perdu. */
const repli = (note: string): ActionProposee => ({
  titre: 'Note vocale à traiter',
  type: 'autre',
  date: null,
  heure: null,
  detail: note,
  bien: null,
  contact: null
});

export async function lireNote(
  note: string
): Promise<Resultat<{ resume: string | null; actions: ActionProposee[]; repli: boolean }>> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: EXPIREE };
  const texte = note.trim();
  if (texte.length < 3) return { ok: false, error: 'La note est vide.' };
  if (texte.length > 8000) return { ok: false, error: 'La note est trop longue.' };
  if (!anthropicConfigured())
    return { ok: true, resume: null, actions: [repli(texte)], repli: true };

  const [biensR, contactsR] = await Promise.all([
    supabase
      .from('biens')
      .select('id, type, pieces, ville, adresse, bien_contacts(role, contacts(nom, prenom))')
      .neq('statut', 'suspendu')
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase
      .from('contacts')
      .select('id, nom, prenom, categories')
      .eq('archive', false)
      .order('updated_at', { ascending: false })
      .limit(800)
  ]);
  const biens = (biensR.data ?? []) as unknown as Bien[];
  const contacts = (contactsR.data ?? []) as Contact[];

  const titreBien = (b: Bien) =>
    [libelle(TYPES_BIEN, b.type), b.pieces ? `${b.pieces} p.` : null, b.ville]
      .filter(Boolean)
      .join(' · ');

  const jour = aujourdhui();
  let lue: Awaited<ReturnType<typeof lireNoteIA>> = null;
  try {
    lue = await lireNoteIA(texte, {
      aujourdhui: jour,
      jourSemaine: new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        timeZone: 'Europe/Paris'
      }).format(new Date()),
      biens: biens.map((b, i) => {
        const vendeurs = (b.bien_contacts ?? [])
          .filter((bc) => bc.role === 'vendeur' && bc.contacts)
          .map((bc) => nom(bc.contacts!));
        return `[${i}] ${titreBien(b)}${b.adresse ? `, ${b.adresse}` : ''}${vendeurs.length ? ` (vendeur : ${vendeurs.join(', ')})` : ''}`;
      }),
      contacts: contacts.map(
        (c, i) => `[${i}] ${nom(c)}${c.categories?.length ? ` (${c.categories.join(', ')})` : ''}`
      )
    });
  } catch (e) {
    console.error('note.lecture', e);
  }
  if (!lue || !lue.actions.length)
    return { ok: true, resume: lue?.resume ?? null, actions: [repli(texte)], repli: true };

  const dateOk = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  return {
    ok: true,
    resume: lue.resume,
    repli: false,
    actions: lue.actions.map((a) => {
      const b = a.bien != null ? biens[a.bien] : undefined;
      const c = a.contact != null ? contacts[a.contact] : undefined;
      return {
        titre: a.titre.slice(0, 200),
        type: a.type,
        date: dateOk(a.date),
        heure: a.heure && /^\d{2}:\d{2}$/.test(a.heure) ? a.heure : null,
        detail: a.detail?.slice(0, 1000) ?? null,
        bien: b ? { id: b.id, libelle: titreBien(b) } : null,
        contact: c ? { id: c.id, libelle: nom(c) } : null
      };
    })
  };
}

const Enregistrement = z.object({
  note: z.string().max(8000),
  actions: z
    .array(
      z.object({
        titre: z.string().trim().min(1).max(200),
        type: z.enum(TYPES_ACTION),
        date: z.iso.date().nullable(),
        heure: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable(),
        detail: z.string().max(1000).nullable(),
        bienId: z.uuid().nullable(),
        contactId: z.uuid().nullable()
      })
    )
    .min(1)
    .max(30)
});

/** Enregistre les actions validées comme tâches (avec la note d'origine en détail si besoin). */
export async function enregistrerNote(input: unknown): Promise<Resultat<{ n: number }>> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: EXPIREE };
  const p = Enregistrement.safeParse(input);
  if (!p.success) return { ok: false, error: 'Vérifiez les actions : un intitulé est vide.' };

  // Ne rattacher que des biens et contacts du conseiller (RLS).
  const bienIds = [...new Set(p.data.actions.map((a) => a.bienId).filter(Boolean))] as string[];
  const contactIds = [
    ...new Set(p.data.actions.map((a) => a.contactId).filter(Boolean))
  ] as string[];
  const [b, c] = await Promise.all([
    bienIds.length
      ? supabase.from('biens').select('id').in('id', bienIds)
      : Promise.resolve({ data: [] }),
    contactIds.length
      ? supabase.from('contacts').select('id').in('id', contactIds)
      : Promise.resolve({ data: [] })
  ]);
  const biensOk = new Set((b.data ?? []).map((x: { id: string }) => x.id));
  const contactsOk = new Set((c.data ?? []).map((x: { id: string }) => x.id));

  const { error } = await supabase.from('taches').insert(
    p.data.actions.map((a) => ({
      titre: a.titre,
      type: a.type,
      detail: a.detail,
      echeance: a.date ? parisVersIso(a.date, a.heure ?? '00:00') : null,
      bien_id: a.bienId && biensOk.has(a.bienId) ? a.bienId : null,
      contact_id: a.contactId && contactsOk.has(a.contactId) ? a.contactId : null
    }))
  );
  if (error) {
    console.error('note.enregistrement', error);
    return { ok: false, error: 'Les actions n’ont pas pu être enregistrées. Réessayez.' };
  }
  revalidatePath('/dashboard');
  return { ok: true, n: p.data.actions.length };
}
