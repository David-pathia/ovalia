import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlocContenu } from '@/lib/ai/client';
import { PIECES_MAX, TOTAL_MAX, type PieceJointe } from './types';

// Prépare les pièces jointes pour l'IA : téléchargées depuis le stockage (les règles d'accès
// garantissent que ce sont celles du conseiller), puis envoyées en photos et documents PDF.

export const CONSIGNE_PIECES = `PIÈCES JOINTES
Le conseiller a pu joindre des photos du bien et des documents (DPE, taxe foncière, plans, diagnostics, titre de
propriété, règlement de copropriété, factures de travaux…). Lis-les attentivement et utilise-les pour remplir la fiche :
- Documents : reprends les valeurs écrites (classe et valeur DPE, date du DPE, taxe foncière, surfaces, année de
  construction, charges, nombre de lots, travaux et leurs dates…).
- Photos : déduis prudemment l'état général, les matériaux, les équipements visibles (menuiseries, chauffage, cuisine,
  salle de bains), les extérieurs. Toute valeur déduite d'une photo seulement doit être signalée dans les points à vérifier.
- En cas de contradiction, la note ou la dictée du conseiller prime ; signale l'écart dans les points à vérifier.
- « Points à vérifier » = le champ a_verifier ou remarques prévu par le schéma de réponse.
- N'écris jamais dans la fiche le nom, l'adresse personnelle ou les coordonnées d'une personne lus dans un document.`;

export async function blocsPieces(
  supabase: SupabaseClient,
  userId: string,
  pieces: PieceJointe[]
): Promise<{ blocs: BlocContenu[]; ignorees: string[] }> {
  const blocs: BlocContenu[] = [];
  const ignorees: string[] = [];
  let total = 0;
  for (const [i, p] of pieces.entries()) {
    if (i >= PIECES_MAX) {
      ignorees.push(p.nom);
      continue;
    }
    if (!p.chemin.startsWith(`${userId}/`)) continue;
    const { data, error } = await supabase.storage.from('biens').download(p.chemin);
    if (error || !data) {
      ignorees.push(p.nom);
      continue;
    }
    const octets = Buffer.from(await data.arrayBuffer());
    if (total + octets.length > TOTAL_MAX) {
      ignorees.push(p.nom);
      continue;
    }
    total += octets.length;
    const base64 = octets.toString('base64');
    blocs.push({ type: 'text', text: `Pièce jointe ${i + 1} : ${p.nom}` });
    blocs.push(
      p.type === 'pdf'
        ? {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            title: p.nom
          }
        : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } }
    );
  }
  return { blocs, ignorees };
}
