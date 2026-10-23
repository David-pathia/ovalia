import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5-5';

export function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function anthropicClient() {
  // Une clé non rattachée à un espace de travail (sk-ant-usr-…) exige l'en-tête anthropic-workspace-id.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY?.trim(), // une espace collée avec la clé la rend invalide
    ...(workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {})
  });
}

/** Extrait le premier objet JSON d'une réponse texte. */
export function extraireJson(texte: string): unknown {
  const debut = texte.indexOf('{');
  const fin = texte.lastIndexOf('}');
  if (debut === -1 || fin <= debut) return null;
  try {
    return JSON.parse(texte.slice(debut, fin + 1));
  } catch {
    return null;
  }
}

/** Appel Claude qui renvoie du texte, avec repli serveur si le modèle refuse. */
export async function demanderTexte(system: string, contenu: string) {
  const response = await anthropicClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system,
    messages: [{ role: 'user', content: contenu }]
  });
  return {
    stopReason: response.stop_reason,
    texte: response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  };
}
