'use server';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ExtractionSchema, type Extraction } from './schema';
import { SYSTEM_PROMPT } from './prompt';

const MODEL = 'claude-opus-5-5';

// Le schéma est donné dans la consigne et la réponse validée ici avec Zod :
// le format imposé par l'API refusait ce schéma (trop de champs « valeur ou vide »).
const FORMAT_REPONSE = `Réponds uniquement avec un objet JSON valide, sans texte autour ni bloc de code, conforme à ce schéma JSON :
${JSON.stringify(z.toJSONSchema(ExtractionSchema))}`;

function extraireJson(texte: string): unknown {
  const debut = texte.indexOf('{');
  const fin = texte.lastIndexOf('}');
  if (debut === -1 || fin <= debut) return null;
  try {
    return JSON.parse(texte.slice(debut, fin + 1));
  } catch {
    return null;
  }
}

export type AnalyseResult = { ok: true; data: Extraction } | { ok: false; error: string };
export type SaveResult = { ok: true; bienId: string } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function analyserNote(note: string): Promise<AnalyseResult> {
  const { user } = await requireUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const texte = note.trim();
  if (texte.length < 10) return { ok: false, error: 'La note est trop courte pour être analysée.' };
  if (texte.length > 20000) return { ok: false, error: 'La note dépasse 20 000 caractères.' };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'La clé ANTHROPIC_API_KEY n’est pas configurée sur le serveur.' };
  }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: `${SYSTEM_PROMPT}\n\n${FORMAT_REPONSE}`,
      messages: [{ role: 'user', content: `Note du conseiller :\n\n${texte}` }]
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'L’IA a refusé d’analyser cette note. Reformulez-la puis réessayez.' };
    }
    if (response.stop_reason === 'max_tokens') {
      return { ok: false, error: 'La réponse de l’IA est incomplète. Réessayez.' };
    }
    const texteReponse = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');
    const parsed = ExtractionSchema.safeParse(extraireJson(texteReponse));
    if (!parsed.success) {
      console.error('Réponse IA non conforme', parsed.error.issues.slice(0, 5), texteReponse.slice(0, 500));
      return { ok: false, error: 'La réponse de l’IA n’a pas le bon format. Réessayez.' };
    }
    return { ok: true, data: parsed.data };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'La clé Anthropic est invalide.' };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Trop de demandes en même temps. Réessayez dans une minute.' };
    }
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic', error.status, error.message);
      return { ok: false, error: `Le service IA a répondu une erreur (${error.status}) : ${error.message}` };
    }
    throw error;
  }
}

export async function enregistrerBien(payload: Extraction, note: string): Promise<SaveResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const parsed = ExtractionSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Certaines valeurs sont invalides. Vérifiez la fiche.' };
  const { bien, pieces, vendeur, analyse } = parsed.data;
  if (!bien.type) return { ok: false, error: 'Choisissez le type de bien avant d’enregistrer.' };

  const { data: created, error: bienError } = await supabase
    .from('biens')
    .insert({
      type: bien.type,
      transaction: bien.transaction,
      statut: 'estimation',
      adresse: bien.adresse,
      code_postal: bien.code_postal,
      ville: bien.ville?.toUpperCase() ?? null,
      surface: bien.surface,
      surface_terrain: bien.surface_terrain,
      pieces: bien.pieces,
      chambres: bien.chambres,
      etage: bien.etage,
      nb_etages: bien.nb_etages,
      annee_construction: bien.annee_construction,
      prix_bien: bien.prix_bien,
      dpe_classe: bien.dpe_classe,
      taxe_fonciere: bien.taxe_fonciere,
      charges_copro_mensuelles: bien.charges_copro_mensuelles,
      exterieurs: bien.exterieurs,
      etat_general: bien.etat_general,
      suivi_par: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? null,
      notes: bien.description_courte,
      laforet_extra: {
        chauffage: bien.chauffage,
        equipements: bien.equipements,
        loyer_potentiel: bien.loyer_potentiel,
        source: 'saisie_rapide'
      }
    })
    .select('id')
    .single();

  if (bienError || !created) {
    console.error('biens.insert', bienError);
    return { ok: false, error: 'Le bien n’a pas pu être enregistré.' };
  }
  const bienId = created.id as string;

  // Pas de transaction côté client Supabase : en cas d'échec, on supprime le bien (cascade sur le reste).
  const rollback = async (message: string, detail: unknown) => {
    console.error(message, detail);
    await supabase.from('biens').delete().eq('id', bienId);
    return { ok: false as const, error: 'L’enregistrement a échoué, rien n’a été conservé. Réessayez.' };
  };

  if (pieces.length > 0) {
    const { error } = await supabase.from('bien_pieces').insert(
      pieces.map((p, i) => ({ bien_id: bienId, ordre: i, nom: p.nom, surface: p.surface, niveau: p.niveau }))
    );
    if (error) return rollback('bien_pieces.insert', error);
  }

  if (vendeur?.nom) {
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        civilite: vendeur.civilite,
        nom: vendeur.nom.toUpperCase(),
        prenom: vendeur.prenom,
        email: vendeur.email?.toLowerCase() ?? null,
        portable: vendeur.portable,
        telephone_fixe: vendeur.telephone_fixe,
        categories: ['vendeur']
      })
      .select('id')
      .single();
    if (error || !contact) return rollback('contacts.insert', error);

    const { error: linkError } = await supabase
      .from('bien_contacts')
      .insert({ bien_id: bienId, contact_id: contact.id, role: 'vendeur' });
    if (linkError) return rollback('bien_contacts.insert', linkError);
  }

  const { error: analyseError } = await supabase.from('bien_analyses').insert({
    bien_id: bienId,
    type: 'estimation',
    note_source: note,
    points_forts: analyse.points_forts,
    points_faibles: analyse.points_faibles,
    synthese: analyse.synthese,
    details: { a_verifier: analyse.a_verifier, loyer_potentiel: bien.loyer_potentiel },
    modele: MODEL
  });
  if (analyseError) return rollback('bien_analyses.insert', analyseError);

  revalidatePath('/dashboard/biens');
  return { ok: true, bienId };
}
