'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
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

const STATUTS = [
  ['nouveau', 'À contacter'],
  ['envoye', 'Contacté'],
  ['visite', 'Visite'],
  ['ecarte', 'Écarté']
] as const;

const couleurEtat = {
  ok: 'bg-ok/15 text-ok',
  partiel: 'bg-warn/15 text-warn',
  ko: 'bg-crit/15 text-crit',
  inconnu: 'bg-muted text-muted-foreground'
} as const;

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;

function Ligne({ r }: { r: RapprochementVue }) {
  const [statut, setStatut] = useState(r.statut);
  const [pending, start] = useTransition();
  const changer = (s: RapprochementVue['statut']) =>
    start(async () => {
      const res = await changerStatutRapprochement(r.id, s);
      if (res.ok) setStatut(s);
      else toast.error(res.error);
    });
  return (
    <li className={cn('rounded-xl border p-3', statut === 'ecarte' && 'opacity-55')}>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='flex min-w-0 items-start gap-3'>
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold',
              r.score >= 85
                ? 'bg-ok/15 text-ok'
                : r.score >= 70
                  ? 'bg-cuivre/15 text-cuivre'
                  : 'bg-muted text-muted-foreground'
            )}
            title='Score de correspondance'
          >
            {r.score}
          </span>
          <div className='min-w-0'>
            {r.bien ? (
              <Link href={`/dashboard/biens/${r.bien.id}`} className='font-medium hover:underline'>
                {r.bien.titre}
                {r.bien.ville ? ` · ${r.bien.ville}` : ''}
              </Link>
            ) : (
              <p className='font-medium'>{r.prospect.nom}</p>
            )}
            <p className='text-muted-foreground text-xs tabular-nums'>
              {r.bien ? `${r.prospect.nom} · ` : ''}
              {r.prospect.telephone ? `${r.prospect.telephone} · ` : ''}
              {r.prospect.budgetMax
                ? `budget ${eur(r.prospect.budgetMax)} FAI`
                : 'budget non précisé'}
              {r.prixCompare ? ` · bien à ${eur(r.prixCompare)} FAI` : ''}
            </p>
          </div>
        </div>
        <div className='flex flex-wrap gap-1'>
          {STATUTS.map(([k, l]) => (
            <button
              key={k}
              type='button'
              disabled={pending}
              onClick={() => changer(k)}
              className={cn(
                'rounded-md border px-2 py-0.5 text-xs',
                statut === k
                  ? 'border-cuivre bg-cuivre/15 text-cuivre font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <ul className='mt-2 flex flex-wrap gap-1.5'>
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
        <p className='text-muted-foreground mt-1.5 text-xs italic'>« {r.prospect.informations} »</p>
      )}
    </li>
  );
}

export function RapprochementsListe({
  rapprochements,
  vide
}: {
  rapprochements: RapprochementVue[];
  vide: string;
}) {
  if (!rapprochements.length) return <p className='text-muted-foreground text-sm'>{vide}</p>;
  return (
    <ul className='space-y-2'>
      {rapprochements.map((r) => (
        <Ligne key={r.id} r={r} />
      ))}
    </ul>
  );
}
