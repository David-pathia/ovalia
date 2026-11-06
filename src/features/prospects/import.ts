import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { structurerProspects, type ProspectStructure } from '@/lib/ai/prospects';
import { lireAcheteurs, type LigneAcheteur } from './excel';
import { resoudreCommune, resoudreCommunes } from './geo';
import type { AnalyseImport, ItemImport, ProjetImport } from './types';

// Import du tableau de pilotage : rapprochement avec les prospects déjà connus (nom normalisé, puis téléphone),
// lecture par l'IA des seules lignes nouvelles ou modifiées, aperçu avant validation.

export const SOURCE_IMPORT = 'tableau_pilotage';

/** Nom normalisé, mots triés : « DUPONT Jean » et « jean dupont » donnent la même clé. */
export function cleNom(nom: string) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

const brut = (l: LigneAcheteur) => ({
  telephone: l.telephone,
  budget: l.budget,
  chambres: l.chambres,
  surface: l.surface,
  type: l.type,
  localisation: l.localisation,
  informations: l.informations,
  date: l.date
});
const empreinte = (l: LigneAcheteur) =>
  createHash('sha1')
    .update(JSON.stringify(brut(l)))
    .digest('hex');
const entier = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const LIBELLES: Record<string, string> = {
  telephone: 'Téléphone',
  budget: 'Budget',
  chambres: 'Chambres',
  surface: 'Surface',
  type: 'Type',
  localisation: 'Localisation',
  informations: 'Informations',
  date: 'Date'
};

type Existant = {
  id: string;
  nom: string;
  portable: string | null;
  cle_import: string | null;
  archive: boolean;
  projets: {
    id: string;
    import_hash: string | null;
    import_brut: Record<string, unknown> | null;
  }[];
};

async function versProjet(
  l: LigneAcheteur,
  s: ProspectStructure | undefined
): Promise<ProjetImport> {
  const [communes, centre] = await Promise.all([
    resoudreCommunes(s?.communes ?? []),
    s?.zone ? resoudreCommune(s.zone.ville) : Promise.resolve(null)
  ]);
  return {
    types_bien: s?.types ?? [],
    budget_min: s?.budget_min ?? null,
    budget_max: s?.budget_max ?? entier(l.budget),
    chambres_min: entier(l.chambres),
    surface_min: entier(l.surface),
    communes,
    zone:
      s?.zone && centre
        ? {
            ville: centre.nom,
            lat: centre.lat,
            lon: centre.lon,
            rayon_km: Math.max(1, Math.round(s.zone.rayon_km))
          }
        : null,
    criteres: s?.criteres ?? {},
    localisation_texte: l.localisation || null,
    informations: l.informations || null,
    date_contact: l.date,
    import_brut: brut(l),
    import_hash: empreinte(l)
  };
}

export async function analyserImport(
  supabase: SupabaseClient,
  fichier: ArrayBuffer
): Promise<{ ok: true; analyse: AnalyseImport } | { ok: false; error: string }> {
  const lecture = await lireAcheteurs(fichier);
  if (!lecture.ok) return lecture;
  const { data: existants, error } = await supabase
    .from('contacts')
    .select('id, nom, portable, cle_import, archive, projets(id, import_hash, import_brut)')
    .eq('source', SOURCE_IMPORT);
  if (error) {
    console.error('prospects.existants', error);
    return {
      ok: false,
      error:
        error.code === '42703'
          ? 'Exécutez d’abord la migration « prospects » dans Supabase (SQL Editor).'
          : 'Lecture des prospects impossible.'
    };
  }
  const parCle = new Map<string, Existant>();
  const parTel = new Map<string, Existant>();
  for (const e of (existants ?? []) as Existant[]) {
    if (e.cle_import) parCle.set(e.cle_import, e);
    if (e.portable) parTel.set(e.portable.replace(/\D/g, ''), e);
  }

  const vus = new Set<string>();
  const enAttente: {
    l: LigneAcheteur;
    cle: string;
    existant: Existant | null;
    doublon: boolean;
  }[] = [];
  for (const l of lecture.lignes) {
    const cle = cleNom(l.nom);
    if (!cle) continue;
    const existant =
      parCle.get(cle) ??
      (l.telephone ? (parTel.get(l.telephone.replace(/\D/g, '')) ?? null) : null);
    enAttente.push({ l, cle, existant, doublon: vus.has(cle) });
    vus.add(cle);
  }

  // Seules les lignes nouvelles ou modifiées passent par l'IA.
  const aLire = enAttente.filter(
    (x) => !x.doublon && (!x.existant || x.existant.projets[0]?.import_hash !== empreinte(x.l))
  );
  const structure = await structurerProspects(
    aLire.map((x, i) => ({
      i,
      type: x.l.type,
      budget: x.l.budget,
      localisation: x.l.localisation,
      informations: x.l.informations
    }))
  );
  if (!structure.ok) return structure;
  const structureDe = new Map(aLire.map((x, i) => [x.l.ligne, structure.resultats.get(i)]));

  const items: ItemImport[] = await Promise.all(
    enAttente
      .filter((x) => !x.doublon)
      .map(async ({ l, cle, existant }) => {
        const projetExistant = existant?.projets[0];
        const inchange = Boolean(existant && projetExistant?.import_hash === empreinte(l));
        const changements =
          existant && !inchange
            ? Object.entries(brut(l))
                .filter(
                  ([k, v]) => String(projetExistant?.import_brut?.[k] ?? '') !== String(v ?? '')
                )
                .map(
                  ([k, v]) =>
                    `${LIBELLES[k]} : ${String(projetExistant?.import_brut?.[k] ?? '—') || '—'} → ${String(v ?? '—') || '—'}`
                )
            : [];
        return {
          cle,
          nom: l.nom,
          telephone: l.telephone,
          statut: !existant
            ? 'nouveau'
            : inchange
              ? existant.archive
                ? 'modifie'
                : 'inchange'
              : 'modifie',
          contactId: existant?.id ?? null,
          projetId: projetExistant?.id ?? null,
          changements: existant?.archive
            ? ['De retour dans le tableau (était archivé)', ...changements]
            : changements,
          projet: inchange ? null : await versProjet(l, structureDe.get(l.ligne))
        } satisfies ItemImport;
      })
  );
  const absents = ((existants ?? []) as Existant[])
    .filter((e) => !e.archive && e.cle_import && !vus.has(e.cle_import))
    .map((e) => ({ contactId: e.id, nom: e.nom }));
  return {
    ok: true,
    analyse: { items, absents, doublons: enAttente.filter((x) => x.doublon).map((x) => x.l.nom) }
  };
}

/** Applique l'import validé : création, mise à jour, archivage ; aucun envoi vers Laforêt (synchro_laforet = false). */
export async function appliquerImport(
  supabase: SupabaseClient,
  analyse: AnalyseImport
): Promise<{ ok: true; resume: string } | { ok: false; error: string }> {
  const maintenant = new Date().toISOString();
  const nouveaux = analyse.items.filter((i) => i.statut === 'nouveau' && i.projet);
  if (nouveaux.length) {
    const { data: crees, error } = await supabase
      .from('contacts')
      .insert(
        nouveaux.map((i) => ({
          nom: i.nom,
          portable: i.telephone,
          categories: ['acquereur'],
          source: SOURCE_IMPORT,
          cle_import: i.cle,
          synchro_laforet: false,
          importe_le: maintenant
        }))
      )
      .select('id, cle_import');
    if (error || !crees) {
      console.error('prospects.contacts', error);
      return { ok: false, error: 'Les nouveaux prospects n’ont pas pu être enregistrés.' };
    }
    const idDe = new Map(crees.map((c) => [c.cle_import as string, c.id as string]));
    const { error: e2 } = await supabase.from('projets').insert(
      nouveaux.map((i) => ({
        ...i.projet!,
        contact_id: idDe.get(i.cle),
        nature: 'recherche',
        transaction: 'achat',
        titre: 'Tableau de pilotage',
        synchro_laforet: false,
        actif: true
      }))
    );
    if (e2) {
      console.error('prospects.projets', e2);
      return {
        ok: false,
        error: 'Les critères des nouveaux prospects n’ont pas pu être enregistrés.'
      };
    }
  }

  for (const i of analyse.items.filter((x) => x.statut === 'modifie' && x.contactId)) {
    await supabase
      .from('contacts')
      .update({
        archive: false,
        importe_le: maintenant,
        ...(i.telephone ? { portable: i.telephone } : {})
      })
      .eq('id', i.contactId!);
    if (i.projet) {
      if (i.projetId)
        await supabase
          .from('projets')
          .update({ ...i.projet, actif: true })
          .eq('id', i.projetId);
      else
        await supabase.from('projets').insert({
          ...i.projet,
          contact_id: i.contactId,
          nature: 'recherche',
          transaction: 'achat',
          titre: 'Tableau de pilotage',
          synchro_laforet: false
        });
    } else if (i.projetId)
      await supabase.from('projets').update({ actif: true }).eq('id', i.projetId);
  }
  const inchanges = analyse.items
    .filter((x) => x.statut === 'inchange' && x.contactId)
    .map((x) => x.contactId!);
  if (inchanges.length)
    await supabase.from('contacts').update({ importe_le: maintenant }).in('id', inchanges);

  const absents = analyse.absents.map((a) => a.contactId);
  if (absents.length) {
    await supabase.from('contacts').update({ archive: true }).in('id', absents);
    await supabase.from('projets').update({ actif: false }).in('contact_id', absents);
  }
  const n = (s: ItemImport['statut']) => analyse.items.filter((x) => x.statut === s).length;
  return {
    ok: true,
    resume: `${n('nouveau')} nouveau(x), ${n('modifie')} mis à jour, ${n('inchange')} inchangé(s), ${absents.length} archivé(s).`
  };
}
