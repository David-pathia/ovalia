import 'server-only';
import { z } from 'zod';
import { demanderTexte, extraireJson } from './client';

// Note vocale du conseiller → actions datées (rappeler, visiter, saisir un mandat…).
// Les biens et contacts sont fournis par numéro : l'IA ne renvoie que des numéros, jamais d'identifiant inventé.

export const TYPES_ACTION = [
  'appel',
  'visite',
  'estimation',
  'mandat',
  'communication',
  'autre'
] as const;

const ActionSchema = z.object({
  titre: z
    .string()
    .describe('Action courte à l’infinitif, avec le nom de la personne : « Rappeler M. Dupont »'),
  type: z.enum(TYPES_ACTION),
  date: z.string().nullable().describe('AAAA-MM-JJ, seulement si la note donne un jour'),
  heure: z.string().nullable().describe('HH:MM, seulement si la note donne une heure'),
  bien: z.number().int().nullable().describe('Numéro du bien concerné dans la liste, sinon null'),
  contact: z.number().int().nullable().describe('Numéro du contact concerné, sinon null'),
  detail: z
    .string()
    .nullable()
    .describe('Ce qu’il faut savoir pour faire l’action (objet, chiffres, contexte), une phrase')
});
export const NoteSchema = z.object({
  resume: z.string().describe('La note en une phrase'),
  actions: z.array(ActionSchema)
});
export type NoteLue = z.infer<typeof NoteSchema>;

const SYSTEM = `Tu es l'assistant d'un conseiller immobilier Laforêt à Roanne (Loire). Il vient de dicter une note
vocale (transcription automatique : quelques mots peuvent être mal reconnus, interprète-les avec bon sens).
Transforme la note en actions à faire, pour qu'il n'oublie rien.

Règles :
- Une action par chose à faire (rappeler, envoyer, visiter, estimer, saisir ou signer un mandat, relancer, publier…).
- type : appel (rappeler, téléphoner, relancer par téléphone), visite, estimation (estimer, avis de valeur),
  mandat (saisir, rédiger, signer, prolonger un mandat, baisse de prix), communication (annonce, photos, LinkedIn,
  mail ou SMS à envoyer), autre.
- Dates : calcule-les à partir d'aujourd'hui (« demain », « jeudi » = le prochain jeudi, « la semaine prochaine » = lundi
  prochain, « dans 15 jours »). Sans jour dit, date = null (l'action sera pour aujourd'hui). Heure seulement si elle est dite.
- bien / contact : le numéro dans les listes fournies, seulement si la note les désigne sans ambiguïté
  (nom, rue, commune + type…). En cas de doute, null, et garde le nom tel quel dans le titre.
- Une information sans action (prix évoqué, avis d'un client, état d'un dossier) devient une action « autre »
  dont le titre commence par « À noter : ».
- N'invente rien : ni nom, ni date, ni chiffre absent de la note. Écris en français, avec les noms bien orthographiés.

Réponds uniquement avec un objet JSON valide, sans texte autour ni bloc de code, conforme à ce schéma JSON :
${JSON.stringify(z.toJSONSchema(NoteSchema))}`;

export async function lireNoteIA(
  note: string,
  contexte: { aujourdhui: string; jourSemaine: string; biens: string[]; contacts: string[] }
): Promise<NoteLue | null> {
  const { stopReason, texte } = await demanderTexte(
    SYSTEM,
    [
      `Aujourd'hui : ${contexte.jourSemaine} ${contexte.aujourdhui}.`,
      `Biens du portefeuille :\n${contexte.biens.join('\n') || '(aucun)'}`,
      `Contacts :\n${contexte.contacts.join('\n') || '(aucun)'}`,
      `Note dictée :\n${note}`
    ].join('\n\n')
  );
  if (stopReason === 'refusal') return null;
  const parsed = NoteSchema.safeParse(extraireJson(texte));
  if (!parsed.success) {
    console.error('note.lecture', parsed.error.issues.slice(0, 5));
    return null;
  }
  return parsed.data;
}
