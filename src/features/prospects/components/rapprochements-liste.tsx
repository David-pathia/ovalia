'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DetailCritere } from '@/lib/rapprochement/score';
import { changerStatutRapprochement } from '../actions';

export type RapprochementVue = {
  id: string;
  score: number;
  statut: 'nouveau' | 'envoye' | 'ecarte' | 'visite';
  details: DetailCritere[];
  prixCompare: number | null;
  prospect: {
    nom: string;
    telephone: string | null;
    budgetMax: number | null;
    informations: string | null;
  };
  bien?: { id: string; titre: string; ville: string | null };
};

type Statut = RapprochementVue['statut'];

const STATUTS: [Statut, string][] = [
  ['nouveau', 'À contacter'],
  ['envoye', 'Contacté'],
  ['visite', 'Visite'],
  ['ecarte', 'Écarté']
];

const couleurEtat = {
  ok: 'bg-ok/15 text-ok',
  partiel: 'bg-warn/15 text-warn',
  ko: 'bg-crit/15 text-crit',
  inconnu: 'bg-muted text-muted-foreground'
} as const;

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;

function Score({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold',
        score >= 85
          ? 'bg-ok/15 text-ok'
          : score >= 70
            ? 'bg-cuivre/15 text-cuivre'
            : 'bg-muted text-muted-foreground'
      )}
      title='Score de correspondance'
    >
      {score}
    </span>
  );
}

/** Une ligne compacte : seuls les écarts sont visibles ; le détail complet s'ouvre au clic. */
function Ligne({
  r,
  statut,
  onStatut
}: {
  r: RapprochementVue;
  statut: Statut;
  onStatut: (s: Statut) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [pending, start] = useTransition();
  const ecarts = r.details.filter((d) => d.etat === 'partiel' || d.etat === 'ko');
  const changer = (s: Statut) =>
    start(async () => {
      const res = await changerStatutRapprochement(r.id, s);
      if (res.ok) onStatut(s);
      else toast.error(res.error);
    });
  return (
    <li className={cn('px-3 py-2', statut === 'ecarte' && 'opacity-55')}>
      <div className='flex items-center gap-3'>
        <Score score={r.score} />
        <button
          type='button'
          onClick={() => setOuvert((o) => !o)}
          className='min-w-0 flex-1 text-left'
          aria-expanded={ouvert}
        >
          <span className='flex flex-wrap items-baseline gap-x-2'>
            <span className='truncate text-sm font-medium'>
              {r.bien
                ? `${r.bien.titre}${r.bien.ville ? ` · ${r.bien.ville}` : ''}`
                : r.prospect.nom}
            </span>
            <span className='text-muted-foreground text-xs tabular-nums'>
              {r.bien ? `${r.prospect.nom} · ` : ''}
              {r.prospect.telephone ? `${r.prospect.telephone} · ` : ''}
              {r.prospect.budgetMax ? `budget ${eur(r.prospect.budgetMax)}` : 'budget ?'}
            </span>
          </span>
          {ecarts.length > 0 ? (
            <span className='mt-0.5 flex flex-wrap gap-1'>
              {ecarts.slice(0, 3).map((d) => (
                <span
                  key={d.critere}
                  className={cn('rounded px-1 text-[11px]', couleurEtat[d.etat])}
                >
                  {d.critere}
                </span>
              ))}
              {ecarts.length > 3 && (
                <span className='text-muted-foreground text-[11px]'>+{ecarts.length - 3}</span>
              )}
            </span>
          ) : (
            <span className='text-ok mt-0.5 block text-[11px]'>
              Tous les critères connus sont respectés
            </span>
          )}
        </button>
        <select
          aria-label={`Statut du rapprochement avec ${r.prospect.nom}`}
          value={statut}
          disabled={pending}
          onChange={(e) => changer(e.target.value as Statut)}
          className={cn(
            'bg-background h-7 shrink-0 rounded-md border px-1.5 text-xs',
            statut === 'nouveau'
              ? 'border-cuivre text-cuivre font-semibold'
              : 'text-muted-foreground'
          )}
        >
          {STATUTS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <button
          type='button'
          onClick={() => setOuvert((o) => !o)}
          className='text-muted-foreground hover:text-foreground shrink-0'
          aria-label={ouvert ? 'Masquer le détail' : 'Voir le détail'}
        >
          {ouvert ? (
            <Icons.chevronUp className='size-4' />
          ) : (
            <Icons.chevronDown className='size-4' />
          )}
        </button>
      </div>
      {ouvert && (
        <div className='mt-2 pl-11'>
          {r.prixCompare && (
            <p className='text-muted-foreground mb-1 text-xs tabular-nums'>
              Bien à {eur(r.prixCompare)} frais d’agence inclus
            </p>
          )}
          <ul className='flex flex-wrap gap-1.5'>
            {r.details.map((d) => (
              <li
                key={d.critere}
                className={cn('rounded-md px-1.5 py-0.5 text-[11px]', couleurEtat[d.etat])}
              >
                <span className='font-semibold'>{d.critere}</span> · {d.texte}
              </li>
            ))}
          </ul>
          {r.prospect.informations && (
            <p className='text-muted-foreground mt-1.5 text-xs italic'>
              « {r.prospect.informations} »
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function useStatuts(rapprochements: RapprochementVue[]) {
  const [statuts, setStatuts] = useState<Record<string, Statut>>(() =>
    Object.fromEntries(rapprochements.map((r) => [r.id, r.statut]))
  );
  return {
    statut: (r: RapprochementVue) => statuts[r.id] ?? r.statut,
    set: (id: string, s: Statut) => setStatuts((x) => ({ ...x, [id]: s }))
  };
}

/** Liste compacte (fiche du bien) : les 8 meilleurs, puis « voir les autres ». */
export function RapprochementsListe({
  rapprochements,
  vide
}: {
  rapprochements: RapprochementVue[];
  vide: string;
}) {
  const { statut, set } = useStatuts(rapprochements);
  const [tout, setTout] = useState(false);
  if (!rapprochements.length) return <p className='text-muted-foreground text-sm'>{vide}</p>;
  const visibles = tout ? rapprochements : rapprochements.slice(0, 8);
  return (
    <div>
      <ul className='divide-y rounded-xl border'>
        {visibles.map((r) => (
          <Ligne key={r.id} r={r} statut={statut(r)} onStatut={(s) => set(r.id, s)} />
        ))}
      </ul>
      {rapprochements.length > 8 && (
        <button
          type='button'
          onClick={() => setTout((t) => !t)}
          className='text-cuivre mt-2 text-xs font-medium hover:underline'
        >
          {tout ? 'Réduire' : `Voir les ${rapprochements.length - 8} autres`}
        </button>
      )}
    </div>
  );
}

type Groupe = { bien: NonNullable<RapprochementVue['bien']>; rapprochements: RapprochementVue[] };

/** Page Rapprochements : filtres, puis un bien par ligne, replié par défaut. */
export function RapprochementsParBien({ groupes }: { groupes: Groupe[] }) {
  const tous = useMemo(() => groupes.flatMap((g) => g.rapprochements), [groupes]);
  const { statut, set } = useStatuts(tous);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Statut | 'tous'>('nouveau');
  const [scoreMin, setScoreMin] = useState(50);
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());

  const q = recherche.trim().toLowerCase();
  const filtres = groupes
    .map((g) => {
      const bienCorrespond = q && `${g.bien.titre} ${g.bien.ville ?? ''}`.toLowerCase().includes(q);
      const rs = g.rapprochements.filter(
        (r) =>
          r.score >= scoreMin &&
          (filtre === 'tous' || statut(r) === filtre) &&
          (!q ||
            bienCorrespond ||
            `${r.prospect.nom} ${r.prospect.telephone ?? ''}`.toLowerCase().includes(q))
      );
      return { ...g, rapprochements: rs };
    })
    .filter((g) => g.rapprochements.length > 0);
  const total = filtres.reduce((n, g) => n + g.rapprochements.length, 0);
  const basculer = (id: string) =>
    setOuverts((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className='flex flex-col gap-3'>
      <div className='bg-card flex flex-wrap items-center gap-2 rounded-2xl border p-3'>
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder='Rechercher un acquéreur, un bien, une commune…'
          aria-label='Rechercher'
          className='h-8 w-full sm:w-72'
        />
        <div className='flex flex-wrap gap-1'>
          {([['tous', 'Tous'], ...STATUTS] as [Statut | 'tous', string][]).map(([k, l]) => (
            <button
              key={k}
              type='button'
              onClick={() => setFiltre(k)}
              className={cn(
                'rounded-md border px-2 py-1 text-xs',
                filtre === k
                  ? 'border-cuivre bg-cuivre/15 text-cuivre font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <label className='text-muted-foreground flex items-center gap-1.5 text-xs'>
          Score min.
          <select
            value={scoreMin}
            onChange={(e) => setScoreMin(Number(e.target.value))}
            className='bg-background h-7 rounded-md border px-1.5 text-xs'
          >
            {[50, 70, 85, 100].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <span className='text-muted-foreground ml-auto text-xs'>
          {total} rapprochement(s) · {filtres.length} bien(s)
        </span>
        <button
          type='button'
          className='text-cuivre text-xs font-medium hover:underline'
          onClick={() =>
            setOuverts(ouverts.size ? new Set() : new Set(filtres.map((g) => g.bien.id)))
          }
        >
          {ouverts.size ? 'Tout replier' : 'Tout déplier'}
        </button>
      </div>

      {filtres.length === 0 ? (
        <p className='text-muted-foreground text-sm'>Aucun rapprochement pour ces filtres.</p>
      ) : (
        <ul className='bg-card divide-y rounded-2xl border'>
          {filtres.map((g) => {
            const ouvert = ouverts.has(g.bien.id);
            const aContacter = g.rapprochements.filter((r) => statut(r) === 'nouveau').length;
            const meilleur = Math.max(...g.rapprochements.map((r) => r.score));
            return (
              <li key={g.bien.id}>
                <div className='flex items-center gap-3 px-4 py-2.5'>
                  <button
                    type='button'
                    onClick={() => basculer(g.bien.id)}
                    className='flex min-w-0 flex-1 items-center gap-3 text-left'
                    aria-expanded={ouvert}
                  >
                    {ouvert ? (
                      <Icons.chevronDown className='size-4 shrink-0' />
                    ) : (
                      <Icons.chevronRight className='size-4 shrink-0' />
                    )}
                    <span className='min-w-0'>
                      <span className='block truncate font-medium'>
                        {g.bien.titre}
                        {g.bien.ville ? ` · ${g.bien.ville}` : ''}
                      </span>
                      <span className='text-muted-foreground text-xs'>
                        {g.rapprochements.length} acquéreur(s)
                        {aContacter ? ` · ${aContacter} à contacter` : ''} · meilleur score{' '}
                        {meilleur}
                      </span>
                    </span>
                  </button>
                  <Link
                    href={`/dashboard/biens/${g.bien.id}`}
                    className='text-muted-foreground hover:text-foreground shrink-0 text-xs underline-offset-4 hover:underline'
                  >
                    Fiche
                  </Link>
                </div>
                {ouvert && (
                  <ul className='bg-background/40 mx-3 mb-3 divide-y rounded-xl border'>
                    {g.rapprochements.map((r) => (
                      <Ligne
                        key={r.id}
                        r={{ ...r, bien: undefined }}
                        statut={statut(r)}
                        onStatut={(s) => set(r.id, s)}
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
