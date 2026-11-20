import 'server-only';

// Typefully (typefully.com) : outil de rédaction et de programmation de posts LinkedIn.
// Typefully publie sur LinkedIn par la connexion que Julien a autorisée depuis LinkedIn :
// Ovalia ne touche jamais au compte LinkedIn directement (pas de robot ni de mot de passe).
// API v2 : https://typefully.com/docs/api — clé personnelle créée dans Typefully, Réglages → API,
// rangée dans la variable Vercel TYPEFULLY_API_KEY (jamais dans le code).

const BASE = 'https://api.typefully.com/v2';

export const TYPEFULLY_APP = 'https://typefully.com';

export type StatutPost = 'draft' | 'scheduled' | 'planned' | 'publishing' | 'published' | 'error';

export type PostTypefully = {
  id: number;
  statut: StatutPost;
  texte: string;
  programmeLe: string | null;
  publieLe: string | null;
  lienTypefully: string | null;
  lienLinkedin: string | null;
  majLe: string | null;
};

export class ErreurTypefully extends Error {
  constructor(
    message: string,
    public code: 'cle' | 'linkedin' | 'abonnement' | 'limite' | 'reseau' = 'reseau'
  ) {
    super(message);
  }
}

export function typefullyConfigure() {
  return Boolean(process.env.TYPEFULLY_API_KEY?.trim());
}

async function appel<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const cle = process.env.TYPEFULLY_API_KEY?.trim();
  if (!cle) throw new ErreurTypefully('Clé Typefully absente.', 'cle');
  let rep: Response;
  try {
    rep = await fetch(`${BASE}${chemin}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${cle}`,
        'Content-Type': 'application/json',
        ...init.headers
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000)
    });
  } catch {
    throw new ErreurTypefully('Typefully ne répond pas. Réessayez dans quelques minutes.');
  }
  if (rep.status === 401 || rep.status === 403)
    throw new ErreurTypefully(
      'Typefully refuse la clé : vérifiez la variable TYPEFULLY_API_KEY dans Vercel.',
      'cle'
    );
  if (rep.status === 402)
    throw new ErreurTypefully(
      'Typefully demande un abonnement payant pour cette action (ou le compte est en pause).',
      'abonnement'
    );
  if (rep.status === 429)
    throw new ErreurTypefully(
      'Trop de demandes envoyées à Typefully : réessayez dans une minute.',
      'limite'
    );
  if (!rep.ok) {
    const detail = await rep.text().catch(() => '');
    console.error('typefully', chemin, rep.status, detail.slice(0, 500));
    throw new ErreurTypefully(`Typefully a renvoyé une erreur (${rep.status}).`);
  }
  if (rep.status === 204) return undefined as T;
  return (await rep.json()) as T;
}

type Liste<T> = { results: T[] };
type SocialSet = { id: number; name?: string | null; username?: string | null };
type DetailSocialSet = SocialSet & {
  platforms?: { linkedin?: { name?: string | null; username?: string | null } | null };
};

export type CompteLinkedin = { socialSetId: number; nom: string };

/**
 * Compte Typefully relié à LinkedIn. TYPEFULLY_SOCIAL_SET_ID force le choix si Julien en a plusieurs ;
 * sinon on prend le premier qui a LinkedIn de connecté.
 */
export async function compteLinkedin(): Promise<CompteLinkedin> {
  const impose = Number(process.env.TYPEFULLY_SOCIAL_SET_ID?.trim());
  const ids = impose
    ? [impose]
    : (await appel<Liste<SocialSet>>('/social-sets?limit=50')).results.map((s) => s.id);
  for (const id of ids) {
    const d = await appel<DetailSocialSet>(`/social-sets/${id}/`);
    const li = d.platforms?.linkedin;
    if (li) return { socialSetId: id, nom: li.name || li.username || d.name || 'LinkedIn' };
  }
  throw new ErreurTypefully(
    'Aucun compte LinkedIn n’est relié à Typefully : dans Typefully, ajoutez votre compte LinkedIn.',
    'linkedin'
  );
}

type DraftBrut = {
  id: number;
  status: StatutPost;
  scheduled_date?: string | null;
  linkedin_post_published_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  private_url?: string | null;
  linkedin_published_url?: string | null;
  preview?: string | null;
  platforms?: { linkedin?: { enabled?: boolean; posts?: { text?: string }[] } | null };
};

function versPost(d: DraftBrut): PostTypefully {
  const texte =
    d.platforms?.linkedin?.posts
      ?.map((p) => p.text ?? '')
      .join('\n\n')
      .trim() ||
    d.preview ||
    '';
  return {
    id: d.id,
    statut: d.status,
    texte,
    programmeLe: d.scheduled_date ?? null,
    publieLe: d.linkedin_post_published_at ?? d.published_at ?? null,
    lienTypefully: d.private_url ?? null,
    lienLinkedin: d.linkedin_published_url ?? null,
    majLe: d.updated_at ?? null
  };
}

/** Posts du compte LinkedIn, par statut (brouillons, programmés, publiés). */
export async function listerPosts(socialSetId: number, statut: StatutPost, limite = 20) {
  const ordre =
    statut === 'published'
      ? '-published_at'
      : statut === 'scheduled'
        ? 'scheduled_date'
        : '-updated_at';
  const r = await appel<Liste<DraftBrut>>(
    `/social-sets/${socialSetId}/drafts?status=${statut}&order_by=${ordre}&limit=${limite}`
  );
  return r.results.map(versPost).filter((p) => p.texte);
}

/** Un post complet (la liste de Typefully ne donne qu'un aperçu tronqué). */
export async function lirePost(socialSetId: number, id: number) {
  const d = await appel<
    DraftBrut & {
      platforms?: { linkedin?: { settings?: { first_comment?: string | null } | null } | null };
    }
  >(`/social-sets/${socialSetId}/drafts/${id}`);
  return {
    ...versPost(d),
    premierCommentaire: d.platforms?.linkedin?.settings?.first_comment ?? ''
  };
}

/**
 * Envoie un post LinkedIn dans Typefully (nouveau, ou modification si id est fourni).
 * quand = 'brouillon' (rien n'est publié ; en modification, la date éventuelle est gardée),
 * 'prochain' (prochain créneau de la file Typefully), 'maintenant' (publication immédiate)
 * ou une date ISO avec fuseau (publication programmée).
 */
export async function enregistrerPost(
  socialSetId: number,
  texte: string,
  quand: 'brouillon' | 'prochain' | 'maintenant' | string,
  premierCommentaire?: string,
  id?: number
) {
  const corps: Record<string, unknown> = {
    platforms: {
      linkedin: {
        enabled: true,
        posts: [{ text: texte }],
        settings: { first_comment: premierCommentaire || null }
      }
    }
  };
  if (quand === 'prochain') corps.publish_at = 'next-free-slot';
  else if (quand === 'maintenant') corps.publish_at = 'now';
  else if (quand !== 'brouillon') corps.publish_at = quand;
  const d = await appel<DraftBrut>(
    id ? `/social-sets/${socialSetId}/drafts/${id}` : `/social-sets/${socialSetId}/drafts`,
    { method: id ? 'PATCH' : 'POST', body: JSON.stringify(corps) }
  );
  return versPost(d);
}

/** Supprime un brouillon ou un post programmé (un post déjà publié reste sur LinkedIn). */
export async function supprimerPost(socialSetId: number, id: number) {
  await appel<void>(`/social-sets/${socialSetId}/drafts/${id}`, { method: 'DELETE' });
}
