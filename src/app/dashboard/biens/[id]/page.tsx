import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { STATUTS_BIEN, TYPES_BIEN, libelle } from '@/lib/biens/options';
import { BIEN_FIELDS, type AVerifier, type BienValues, type PieceInput, type VendeurInput } from '@/features/biens/fields';
import { BienForm, type Analyse } from '@/features/biens/components/bien-form';
import { EstimationPanel, type EstimationView } from '@/features/biens/components/estimation-panel';
import type { EstimationDetails } from '@/lib/estimation/estimer';
import { FinancementPanel } from '@/features/credit/components/financement-panel';
import { lireParametresCredit } from '@/features/credit/data';

export const metadata: Metadata = { title: 'Fiche bien' };
// Le calcul de l'estimation (DVF + IA) peut prendre jusqu'à une minute.
export const maxDuration = 120;

type Props = { params: Promise<{ id: string }> };

export default async function BienPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: bien }, { data: pieces }, { data: liens }, { data: analyses }, { data: estimations }] = await Promise.all([
    supabase.from('biens').select('*').eq('id', id).maybeSingle(),
    supabase.from('bien_pieces').select('nom, longueur, largeur, surface, niveau').eq('bien_id', id).order('ordre'),
    supabase
      .from('bien_contacts')
      .select('role, contacts(id, civilite, nom, prenom, email, portable, telephone_fixe)')
      .eq('bien_id', id)
      .eq('role', 'vendeur')
      .limit(1),
    supabase
      .from('bien_analyses')
      .select('id, synthese, points_forts, points_faibles, details')
      .eq('bien_id', id)
      .is('valeur_probable', null)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('bien_analyses')
      .select('id, created_at, synthese, details')
      .eq('bien_id', id)
      .not('valeur_probable', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
  ]);
  if (!bien) notFound();

  const initial: BienValues = Object.fromEntries(BIEN_FIELDS.map((f) => [f.key, bien[f.key] ?? (f.kind === 'list' ? [] : f.kind === 'bool' ? false : null)]));
  // Les colonnes numeric arrivent parfois en texte depuis PostgREST.
  for (const f of BIEN_FIELDS) {
    if ((f.kind === 'num' || f.kind === 'int') && typeof initial[f.key] === 'string') initial[f.key] = Number(initial[f.key]);
  }

  const contact = (liens?.[0]?.contacts ?? null) as unknown as (VendeurInput & { id: string }) | null;
  const a = analyses?.[0];
  const analyse: Analyse | null = a
    ? {
        id: a.id,
        synthese: a.synthese,
        points_forts: a.points_forts ?? [],
        points_faibles: a.points_faibles ?? [],
        a_verifier: ((a.details as { a_verifier?: AVerifier[] })?.a_verifier ?? []) as AVerifier[],
        laforet_extra: (bien.laforet_extra ?? {}) as Analyse['laforet_extra']
      }
    : null;

  const parametresCredit = await lireParametresCredit();
  const e = estimations?.[0];
  const estimation: EstimationView | null = e
    ? { id: e.id, createdAt: e.created_at, argumentaire: e.synthese, details: e.details as EstimationDetails }
    : null;
  const disabledReason =
    bien.type !== 'maison' && bien.type !== 'appartement'
      ? 'L’estimation DVF couvre pour l’instant les maisons et les appartements.'
      : !bien.surface
        ? 'Renseignez la surface puis enregistrez la fiche.'
        : !bien.ville && !bien.code_postal
          ? 'Renseignez la ville ou le code postal puis enregistrez la fiche : l’estimation se lancera seule.'
          : null;

  const titre = [
    libelle(TYPES_BIEN, bien.type),
    bien.pieces ? `${bien.pieces} pièces` : null,
    bien.surface ? `${Number(bien.surface).toLocaleString('fr-FR')} m²` : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-10 md:px-6 md:pt-4'>
      <header className='mb-5'>
        <Link href='/dashboard/biens' className='text-muted-foreground hover:text-foreground text-xs'>
          ← Tous les biens
        </Link>
        <h1 className='font-display mt-1 text-3xl font-extrabold'>{titre}</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          {[bien.adresse, [bien.code_postal, bien.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') ||
            'Adresse à compléter'}
          {' · '}
          <span className='text-sauge'>{libelle(STATUTS_BIEN, bien.statut)}</span>
        </p>
      </header>
      <div className='mb-5 flex flex-col gap-5'>
        <EstimationPanel key={estimation?.id ?? 'aucune'} bienId={id} estimation={estimation} disabledReason={disabledReason} />
        <FinancementPanel
          key={`fin-${estimation?.id ?? 'aucune'}`}
          parametres={parametresCredit}
          prixInitial={estimation?.details.resultat.prixConseille ?? (bien.prix_affiche ?? bien.prix_bien ?? null)}
          prixSource={estimation ? 'prix conseillé de l’estimation' : bien.prix_affiche || bien.prix_bien ? 'prix de la fiche' : 'à saisir'}
          anneeConstruction={bien.annee_construction}
        />
      </div>
      <BienForm
        bienId={id}
        initial={initial}
        initialNa={(bien.fiche_na as string[] | null) ?? []}
        initialPieces={(pieces ?? []).map((p) => ({
          ...p,
          longueur: p.longueur === null ? null : Number(p.longueur),
          largeur: p.largeur === null ? null : Number(p.largeur),
          surface: p.surface === null ? null : Number(p.surface)
        })) as PieceInput[]}
        initialVendeur={contact ? { civilite: contact.civilite, nom: contact.nom, prenom: contact.prenom, email: contact.email, portable: contact.portable, telephone_fixe: contact.telephone_fixe } : null}
        vendeurId={contact?.id ?? null}
        analyse={analyse}
      />
    </div>
  );
}
