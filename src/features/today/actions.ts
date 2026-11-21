'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { aujourdhui, parisVersIso, plusJours } from './dates';
import { TYPES_TACHE } from './types';

type Resultat = { ok: true } | { ok: false; error: string };

async function session() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const EXPIREE = 'Session expirée : reconnectez-vous.';

const NouvelleTache = z.object({
  titre: z.string().trim().min(1).max(200),
  type: z.enum(TYPES_TACHE.map(([v]) => v) as [string, ...string[]]),
  date: z.iso.date().nullable(),
  heure: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
});

/** Ajoute une tâche (date et heure de Paris ; sans heure, la tâche vaut pour la journée). */
export async function ajouterTache(input: unknown): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: EXPIREE };
  const p = NouvelleTache.safeParse(input);
  if (!p.success) return { ok: false, error: 'Indiquez au moins un intitulé.' };
  const { titre, type, date, heure } = p.data;
  const { error } = await supabase.from('taches').insert({
    titre,
    type,
    echeance: date ? parisVersIso(date, heure ?? '00:00') : null
  });
  if (error) {
    console.error('taches.ajout', error);
    return { ok: false, error: 'La tâche n’a pas pu être ajoutée.' };
  }
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Coche ou décoche une tâche. */
export async function cocherTache(id: string, faite: boolean): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: EXPIREE };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Tâche introuvable.' };
  const { error } = await supabase
    .from('taches')
    .update({ faite_at: faite ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return { ok: false, error: 'La tâche n’a pas pu être mise à jour.' };
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Reporte une tâche à demain (même heure). */
export async function reporterTache(id: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: EXPIREE };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Tâche introuvable.' };
  const { data } = await supabase.from('taches').select('echeance').eq('id', id).single();
  const heure = data?.echeance
    ? new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Europe/Paris'
      }).format(new Date(data.echeance))
    : '00:00';
  const { error } = await supabase
    .from('taches')
    .update({ echeance: parisVersIso(plusJours(aujourdhui(), 1), heure) })
    .eq('id', id);
  if (error) return { ok: false, error: 'La tâche n’a pas pu être reportée.' };
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function supprimerTache(id: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: EXPIREE };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Tâche introuvable.' };
  const { error } = await supabase.from('taches').delete().eq('id', id);
  if (error) return { ok: false, error: 'La tâche n’a pas pu être supprimée.' };
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Vendeur rappelé : fixe le prochain contact de la fiche bien dans N jours. */
export async function prochainContact(bienId: string, jours: number): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: EXPIREE };
  if (!z.uuid().safeParse(bienId).success || ![7, 15, 30].includes(jours))
    return { ok: false, error: 'Demande invalide.' };
  const { error } = await supabase
    .from('biens')
    .update({ prochain_contact: plusJours(aujourdhui(), jours) })
    .eq('id', bienId);
  if (error) return { ok: false, error: 'Le prochain contact n’a pas pu être enregistré.' };
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/biens/${bienId}`);
  return { ok: true };
}
