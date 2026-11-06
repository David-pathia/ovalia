import 'server-only';
import ExcelJS from 'exceljs';

// Lecture de l'onglet « Prospection acheteur » du tableau de pilotage : la ligne d'en-tête est repérée
// automatiquement (colonnes NOM, BUDGET…), ce qui tolère les lignes de titre et les colonnes ajoutées.

export type LigneAcheteur = {
  ligne: number;
  nom: string;
  telephone: string | null;
  budget: string;
  chambres: string;
  surface: string;
  type: string;
  localisation: string;
  informations: string;
  date: string | null; // AAAA-MM-JJ
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();

function texte(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('richText' in v)
      return v.richText
        .map((r) => r.text)
        .join('')
        .trim();
    if ('result' in v) return texte(v.result as ExcelJS.CellValue);
    if ('text' in v) return String(v.text).trim();
    return '';
  }
  return String(v).trim();
}

/** Téléphone français : chiffres seuls, 0 initial rétabli (Excel le supprime sur les nombres). */
export function telephone(v: string): string | null {
  const chiffres = v.replace(/\D/g, '');
  if (chiffres.length === 9 && /^[1-9]/.test(chiffres))
    return `0${chiffres}`.replace(/(\d{2})(?=\d)/g, '$1 ');
  if (chiffres.length === 10 && chiffres.startsWith('0'))
    return chiffres.replace(/(\d{2})(?=\d)/g, '$1 ');
  if (chiffres.length === 11 && chiffres.startsWith('33'))
    return `0${chiffres.slice(2)}`.replace(/(\d{2})(?=\d)/g, '$1 ');
  return null;
}

export async function lireAcheteurs(
  fichier: ArrayBuffer
): Promise<{ ok: true; lignes: LigneAcheteur[] } | { ok: false; error: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(fichier);
  } catch {
    return {
      ok: false,
      error: 'Fichier illisible : utilisez le tableau de pilotage au format Excel (.xlsx).'
    };
  }
  const ws = wb.worksheets.find((w) => norm(w.name).includes('ACHETEUR'));
  if (!ws)
    return { ok: false, error: 'Onglet « Prospection acheteur » introuvable dans le fichier.' };

  // Ligne d'en-tête : celle qui contient NOM et BUDGET.
  let entete = 0;
  const colonnes: Record<string, number> = {};
  ws.eachRow((row, n) => {
    if (entete) return;
    const valeurs = (row.values as ExcelJS.CellValue[]).map((v) => norm(texte(v)));
    if (valeurs.some((v) => v.startsWith('NOM')) && valeurs.some((v) => v.includes('BUDGET'))) {
      entete = n;
      valeurs.forEach((v, i) => {
        if (!v) return;
        if (v.startsWith('NOM') && !colonnes.nom) colonnes.nom = i;
        else if (v.includes('BUDGET')) colonnes.budget = i;
        else if (v.includes('CHAMBRE')) colonnes.chambres = i;
        else if (v.includes('SURFACE')) colonnes.surface = i;
        else if (v.includes('TYPE')) colonnes.type = i;
        else if (v.includes('LOCALISATION') || v.includes('SECTEUR')) colonnes.localisation = i;
        else if (v.includes('INFORMATION') || v.includes('CRITERE')) colonnes.informations = i;
        else if (v.includes('DATE')) colonnes.date = i;
        else if (v.includes('TEL') || v.includes('PORTABLE')) colonnes.telephone = i;
      });
    }
  });
  if (!entete || !colonnes.nom)
    return {
      ok: false,
      error:
        'En-têtes introuvables : la colonne « NOM PRENOM » et la colonne « BUDGET » sont attendues.'
    };

  const lignes: LigneAcheteur[] = [];
  ws.eachRow((row, n) => {
    if (n <= entete) return;
    const v = row.values as ExcelJS.CellValue[];
    const nom = texte(v[colonnes.nom!]);
    // Lignes de sous-titre (« MAXIMUM », « MINIMUM ») ou vides : ignorées.
    if (!nom || /^(MAXIMUM|MINIMUM)$/i.test(nom)) return;
    const col = (k: string) => (colonnes[k] ? texte(v[colonnes[k]!]) : '');
    // Téléphone : colonne dédiée, sinon toute cellule non utilisée qui ressemble à un numéro.
    const utilisees = new Set(Object.values(colonnes));
    const tel =
      (colonnes.telephone ? telephone(col('telephone')) : null) ??
      v.map((c, i) => (utilisees.has(i) ? null : telephone(texte(c)))).find((t) => t) ??
      null;
    const dateBrute = colonnes.date ? v[colonnes.date] : null;
    lignes.push({
      ligne: n,
      nom,
      telephone: tel,
      budget: col('budget'),
      chambres: col('chambres'),
      surface: col('surface'),
      type: col('type'),
      localisation: col('localisation'),
      informations: col('informations'),
      date:
        dateBrute instanceof Date
          ? dateBrute.toISOString().slice(0, 10)
          : /^\d{4}-\d{2}-\d{2}/.test(texte(dateBrute ?? null))
            ? texte(dateBrute ?? null).slice(0, 10)
            : null
    });
  });
  return { ok: true, lignes };
}
