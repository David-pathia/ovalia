'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { BienUpdateSchema, PieceInputSchema, VendeurInputSchema, type AVerifier } from './fields';
import { estimerBien, recalculer, type EstimationDetails } from '@/lib/estimation/estimer';

export type ActionResult = { ok: true } | { ok: false; error: string };

const SaveSchema = z.object({
  bien: BienUpdateSchema,
  pieces: z.array(PieceInputSchema),
  vendeur: VendeurInputSchema.nullable(),
  vendeurId: z.uuid().nullable()
});

async function session() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function mettreAJourBien(bienId: string, input: unknown): Promise<ActionResult> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) {
    const champ = parsed.error.issues[0]?.path.join(' › ');
    return { ok: false, error: `Valeur invalide${champ ? ` : ${champ}` : ''}.` };
  }
  const { bien, pieces, vendeur, vendeurId } = parsed.data;

  const ville = typeof bien.ville === 'string' ? bien.ville.toUpperCase() : bien.ville;
  const { error } = await supabase
    .from('biens')
    .update({ ...bien, ville })
    .eq('id', bienId);
  if (error) {
    console.error('biens.update', error);
    return { ok: false, error: 'La fiche n’a pas pu être enregistrée.' };
  }

  // Pièces : on remplace la liste entière (quelques lignes, ordre conservé).
  const { error: delError } = await supabase.from('bien_pieces').delete().eq('bien_id', bienId);
  if (delError) {
    console.error('bien_pieces.delete', delError);
    return { ok: false, error: 'Les pièces n’ont pas pu être enregistrées.' };
  }
  if (pieces.length > 0) {
    const { error: insError } = await supabase
      .from('bien_pieces')
      .insert(pieces.map((p, i) => ({ ...p, bien_id: bienId, ordre: i })));
    if (insError) {
      console.error('bien_pieces.insert', insError);
      return { ok: false, error: 'Les pièces n’ont pas pu être enregistrées.' };
    }
  }

  if (vendeur && vendeur.nom.trim()) {
    const values = {
      ...vendeur,
      nom: vendeur.nom.trim().toUpperCase(),
      email: vendeur.email?.trim().toLowerCase() || null
    };
    if (vendeurId) {
      const { error: cError } = await supabase.from('contacts').update(values).eq('id', vendeurId);
      if (cError) {
        console.error('contacts.update', cError);
        return { ok: false, error: 'Le vendeur n’a pas pu être enregistré.' };
      }
    } else {
      const { data: contact, error: cError } = await supabase
        .from('contacts')
        .insert({ ...values, categories: ['vendeur'] })
        .select('id')
        .single();
      if (cError || !contact) {
        console.error('contacts.insert', cError);
        return { ok: false, error: 'Le vendeur n’a pas pu être enregistré.' };
      }
      await supabase.from('bien_contacts').insert({ bien_id: bienId, contact_id: contact.id, role: 'vendeur' });
    }
  }

  // Première estimation automatique dès que la fiche contient de quoi localiser le bien.
  if (bien.ville || bien.code_postal) {
    const { count } = await supabase
      .from('bien_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('bien_id', bienId)
      .not('valeur_probable', 'is', null);
    if (!count) {
      after(async () => {
        const res = await estimerBien(supabase, bienId);
        if (!res.ok) console.warn('estimation automatique', bienId, res.error);
      });
    }
  }

  revalidatePath('/dashboard/biens');
  revalidatePath(`/dashboard/biens/${bienId}`);
  return { ok: true };
}

export async function relancerEstimation(bienId: string): Promise<ActionResult> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const res = await estimerBien(supabase, bienId);
  if (!res.ok) return res;
  revalidatePath('/dashboard/biens');
  revalidatePath(`/dashboard/biens/${bienId}`);
  return { ok: true };
}

const AjustementsInput = z.array(
  z.object({
    libelle: z.string().trim().min(1),
    pourcentage: z.number().min(-30).max(30),
    justification: z.string()
  })
);

export async function modifierAjustements(analyseId: string, input: unknown): Promise<ActionResult> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };
  const parsed = AjustementsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Chaque ajustement doit avoir un libellé et un pourcentage entre -30 et +30.' };

  const { data, error } = await supabase.from('bien_analyses').select('details, bien_id').eq('id', analyseId).single();
  if (error || !data) return { ok: false, error: 'Estimation introuvable.' };
  const details = recalculer(data.details as EstimationDetails, parsed.data);
  const r = details.resultat;
  const { error: upError } = await supabase
    .from('bien_analyses')
    .update({ details, valeur_basse: r.valeurBasse, valeur_probable: r.valeurProbable, valeur_haute: r.valeurHaute, prix_m2: r.prixM2 })
    .eq('id', analyseId);
  if (upError) return { ok: false, error: 'Les ajustements n’ont pas pu être enregistrés.' };

  revalidatePath('/dashboard/biens');
  revalidatePath(`/dashboard/biens/${data.bien_id}`);
  return { ok: true };
}

export async function marquerPointVerifie(analyseId: string, index: number, traite: boolean): Promise<ActionResult> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const { data, error } = await supabase.from('bien_analyses').select('details, bien_id').eq('id', analyseId).single();
  if (error || !data) return { ok: false, error: 'Analyse introuvable.' };

  const details = (data.details ?? {}) as { a_verifier?: AVerifier[] };
  const liste = [...(details.a_verifier ?? [])];
  if (!liste[index]) return { ok: false, error: 'Point introuvable.' };
  liste[index] = { ...liste[index], traite };

  const { error: upError } = await supabase
    .from('bien_analyses')
    .update({ details: { ...details, a_verifier: liste } })
    .eq('id', analyseId);
  if (upError) return { ok: false, error: 'Le point n’a pas pu être mis à jour.' };

  revalidatePath('/dashboard/biens');
  revalidatePath(`/dashboard/biens/${data.bien_id}`);
  return { ok: true };
}

export async function supprimerBien(bienId: string): Promise<ActionResult> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const { error } = await supabase.from('biens').delete().eq('id', bienId);
  if (error) {
    console.error('biens.delete', error);
    return { ok: false, error: 'Le bien n’a pas pu être supprimé.' };
  }
  revalidatePath('/dashboard/biens');
  redirect('/dashboard/biens');
}
