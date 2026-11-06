import 'server-only';

// Retouche « pro immobilier » d'une photo par un modèle multimodal (Gemini Flash Image), via Vercel AI Gateway :
// API Chat Completions avec la photo jointe et `modalities: ['image', 'text']`, image renvoyée dans `message.images`.
// Consignes strictes de fidélité : lumière, ciel, pelouse existante et petits objets mobiles uniquement.

const MODELE_RETOUCHE = 'google/gemini-3.1-flash-image';
const GATEWAY = 'https://ai-gateway.vercel.sh/v1';

const CONSIGNES = `Professional real-estate photo retouching. The result must remain a faithful, honest photograph of the SAME property.
Allowed changes only:
- correct exposure and white balance, brighten shadows, natural contrast and colours;
- replace a grey or overcast sky with a natural clear blue sky with a few light clouds;
- make the EXISTING lawn look healthy and green, keeping exactly the same lawn area and edges;
- remove fallen dead leaves and small movable clutter: garden hose, bins, tools, cables, toys, parked cars.
Strictly forbidden:
- do not add, remove, move or modify any part of the building: walls, roof, windows, shutters, doors, chimney, garage, terrace, paving, fence, gate;
- do not add, remove or change any tree, shrub, plant, flower or blossom; do not make plants bloom; keep the same species, size and season;
- do not add or remove furniture, pots, lights or decorations (except the movable clutter listed above);
- do not hide or repair cracks, stains, moss, damage or wear;
- do not change the framing, perspective, proportions or field of view.
Output one photorealistic image with exactly the same composition as the input.`;

export function retoucheIAConfiguree() {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

export async function retoucherPhotoIA(
  image: Buffer,
  type: string
): Promise<{ ok: true; data: Buffer; type: string } | { ok: false; error: string }> {
  const cle = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!cle)
    return {
      ok: false,
      error: 'Retouche IA non configurée : ajoutez la variable AI_GATEWAY_API_KEY sur Vercel.'
    };
  try {
    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELE_RETOUCHE,
        modalities: ['image', 'text'],
        stream: false,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${CONSIGNES}\nReturn only the retouched image.` },
              {
                type: 'image_url',
                image_url: { url: `data:${type};base64,${image.toString('base64')}` }
              }
            ]
          }
        ]
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('retouche.ia', res.status, detail.slice(0, 500));
      if (/free tier|RestrictedModels/i.test(detail))
        return {
          ok: false,
          error:
            'Le crédit gratuit AI Gateway ne couvre pas la retouche d’image : ajoutez du crédit payant (Vercel → AI Gateway → Buy Paid Credit).'
        };
      if (res.status === 401 || res.status === 403)
        return { ok: false, error: 'Clé AI Gateway refusée : vérifiez AI_GATEWAY_API_KEY.' };
      if (res.status === 402)
        return { ok: false, error: 'Crédits AI Gateway épuisés : rechargez-les sur Vercel.' };
      if (res.status === 429)
        return {
          ok: false,
          error:
            'Limite du crédit gratuit atteinte : réessayez plus tard ou ajoutez du crédit AI Gateway.'
        };
      return { ok: false, error: 'Le service de retouche n’a pas répondu. Réessayez.' };
    }
    const json = (await res.json()) as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[]; content?: string } }[];
    };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const b64 = url?.startsWith('data:') ? url.slice(url.indexOf(',') + 1) : undefined;
    if (!b64) {
      console.error(
        'retouche.ia sans image',
        String(json.choices?.[0]?.message?.content ?? '').slice(0, 300)
      );
      return { ok: false, error: 'Le modèle n’a pas renvoyé d’image : réessayez.' };
    }
    const data = Buffer.from(b64, 'base64');
    // Détection simple du format renvoyé (PNG ou JPEG).
    const png = data[0] === 0x89 && data[1] === 0x50;
    return { ok: true, data, type: png ? 'image/png' : 'image/jpeg' };
  } catch (error) {
    console.error('retouche.ia', error);
    return { ok: false, error: 'Le service de retouche n’a pas répondu. Réessayez.' };
  }
}
