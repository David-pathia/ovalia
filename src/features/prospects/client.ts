'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resoudreCommunes } from './geo';
import { recalculerRapprochements } from './rapprochements';
import { SOURCE_MANUELLE } from './types';

// Création d'un client à la main (bouton « Client » du tableau de bord) :
// contact + projet de recherche facultatif, puis recalcul des rapprochements.

const texte = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const nombre = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s  €]/g, '').replace(',', '.'))
  .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'Nombre invalide')
  .transform((v) => (v === '' ? null : Number(v)));

const TYPES = ['maison', 'appartement', 'immeuble', 'terrain', 'garage', 'local'] as const;
const CRITERES = ['garage', 'exterieur', 'piscine', 'plain_pied', 'sans_travaux', 'calme', 'vue'];

const Client = z.object({
  prenom: texte(100),
  nom: z.string().trim().min(1, 'Indiquez le nom du client.').max(200),
  portable: texte(30),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || z.email().safeParse(v).success, 'Adresse e-mail invalide.')
    .transform((v) => v || null),
  recherche: z.boolean(),
  types_bien: z.array(z.enum(TYPES)),
  budget_max: nombre,
  chambres_min: nombre,
  surface_min: nombre,
  communes: texte(500),
  rayon_km: nombre,
  criteres: z.array(z.string()),
  informations: texte(2000)
});

export async function creerClient(
  formData: FormData
): Promise<{ ok: true; id: string; resume: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée : reconnectez-vous.' };

  const brut = (k: string) => String(formData.get(k) ?? '');
  const parsed = Client.safeParse({
    prenom: brut('prenom'),
    nom: brut('nom'),
    portable: brut('portable'),
    email: brut('email'),
    recherche: formData.get('recherche') === 'on',
    types_bien: formData.getAll('types_bien').map(String),
    budget_max: brut('budget_max'),
    chambres_min: brut('chambres_min'),
    surface_min: brut('surface_min'),
    communes: brut('communes'),
    rayon_km: brut('rayon_km'),
    criteres: formData.getAll('criteres').map(String),
    informations: brut('informations')
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' };
  const c = parsed.data;
  if (!c.portable && !c.email)
    return { ok: false, error: 'Indiquez au moins un portable ou un e-mail.' };

  // Secteur : communes résolues (code INSEE + centre) ; avec un rayon, zone autour de la première.
  const nomsCommunes = (c.communes ?? '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const communes = c.recherche && nomsCommunes.length ? await resoudreCommunes(nomsCommunes) : [];
  if (c.recherche && nomsCommunes.length && !communes.length)
    return { ok: false, error: 'Commune introuvable : vérifiez l’orthographe.' };
  const zone =
    c.rayon_km && communes[0]
      ? { ville: communes[0].nom, lat: communes[0].lat, lon: communes[0].lon, rayon_km: c.rayon_km }
      : null;

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      prenom: c.prenom,
      nom: c.nom,
      portable: c.portable,
      email: c.email,
      categories: c.recherche ? ['acquereur'] : [],
      source: SOURCE_MANUELLE
    })
    .select('id')
    .single();
  if (error || !contact) {
    console.error('client.contact', error);
    return { ok: false, error: 'Le client n’a pas pu être enregistré.' };
  }

  let n = 0;
  if (c.recherche) {
    const { error: e2 } = await supabase.from('projets').insert({
      contact_id: contact.id,
      nature: 'recherche',
      transaction: 'achat',
      titre: 'Saisie manuelle',
      types_bien: c.types_bien,
      budget_max: c.budget_max === null ? null : Math.round(c.budget_max),
      chambres_min: c.chambres_min === null ? null : Math.round(c.chambres_min),
      surface_min: c.surface_min,
      communes: zone ? [] : communes,
      zone,
      localisation_texte: c.communes,
      criteres: Object.fromEntries(
        c.criteres.filter((k) => CRITERES.includes(k)).map((k) => [k, true])
      ),
      informations: c.informations,
      date_contact: new Date().toISOString().slice(0, 10),
      actif: true
    });
    if (e2) {
      console.error('client.projet', e2);
      return {
        ok: false,
        error: 'Le client est enregistré, mais pas sa recherche : complétez-la plus tard.'
      };
    }
    await recalculerRapprochements(supabase);
    const { count } = await supabase
      .from('rapprochements')
      .select('id, projets!inner(contact_id)', { count: 'exact', head: true })
      .eq('projets.contact_id', contact.id);
    n = count ?? 0;
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/prospects');
  revalidatePath('/dashboard/rapprochements');
  const nom = [c.prenom, c.nom].filter(Boolean).join(' ');
  return {
    ok: true,
    id: contact.id as string,
    resume: c.recherche
      ? `${nom} est enregistré(e). ${n} bien(s) correspondant(s).`
      : `${nom} est enregistré(e).`
  };
}
