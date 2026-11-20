import 'server-only';

// Transcription d'une dictée (WAV 16 kHz mono préparé par le navigateur) via Vercel AI Gateway,
// même clé que la retouche photo (AI_GATEWAY_API_KEY). Modèle de transcription dédié à la voix,
// robuste au bruit ambiant ; repli sur un modèle multimodal Gemini si le premier échoue.
// L'audio n'est jamais enregistré par Ovalia : il est transcrit puis oublié.

const GATEWAY = 'https://ai-gateway.vercel.sh';
const MODELE = process.env.DICTEE_MODELE?.trim() || 'openai/gpt-transcribe';
const MODELE_REPLI = 'google/gemini-3-flash';

const cleGateway = () =>
  process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim() || '';

export function dicteeConfiguree() {
  return Boolean(cleGateway());
}

async function viaTranscription(audio: Buffer, cle: string) {
  const rep = await fetch(`${GATEWAY}/v4/ai/transcription-model`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cle}`,
      'ai-gateway-protocol-version': '0.0.1',
      'ai-transcription-model-specification-version': '4',
      'ai-model-id': MODELE,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ audio: audio.toString('base64'), mediaType: 'audio/wav' }),
    signal: AbortSignal.timeout(90_000)
  });
  if (!rep.ok) throw new Error(`transcription ${rep.status} ${(await rep.text()).slice(0, 300)}`);
  const d = (await rep.json()) as { text?: string };
  return (d.text ?? '').trim();
}

async function viaGemini(audio: Buffer, cle: string) {
  const rep = await fetch(`${GATEWAY}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELE_REPLI,
      stream: false,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcris mot pour mot cette dictée en français d’un conseiller immobilier. Ignore les bruits de fond et les autres voix lointaines. Écris les nombres en chiffres. Réponds uniquement par la transcription.'
            },
            {
              type: 'file',
              file: {
                filename: 'dictee.wav',
                file_data: `data:audio/wav;base64,${audio.toString('base64')}`
              }
            }
          ]
        }
      ]
    }),
    signal: AbortSignal.timeout(90_000)
  });
  if (!rep.ok) throw new Error(`gemini ${rep.status} ${(await rep.text()).slice(0, 300)}`);
  const d = (await rep.json()) as { choices?: { message?: { content?: string | null } }[] };
  return (d.choices?.[0]?.message?.content ?? '').trim();
}

export async function transcrire(audio: Buffer): Promise<string> {
  const cle = cleGateway();
  if (!cle) throw new Error('AI_GATEWAY_API_KEY absente');
  try {
    return await viaTranscription(audio, cle);
  } catch (e) {
    console.error('dictee.transcription', e);
    return await viaGemini(audio, cle);
  }
}
