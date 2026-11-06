'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { analyserTableau, appliquerTableau } from '../actions';
import { resumeProjet, type AnalyseImport } from '../types';

export function ImportTableau() {
  const router = useRouter();
  const [analyse, setAnalyse] = useState<AnalyseImport | null>(null);
  const [etape, setEtape] = useState<'attente' | 'analyse' | 'import'>('attente');
  const [onglet, setOnglet] = useState<'nouveau' | 'modifie' | 'absents'>('nouveau');

  const analyser = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEtape('analyse');
    const fd = new FormData();
    fd.set('fichier', fichier);
    const res = await analyserTableau(fd);
    setEtape('attente');
    if (!res.ok) return toast.error(res.error);
    setAnalyse(res.analyse);
    setOnglet(res.analyse.items.some((i) => i.statut === 'nouveau') ? 'nouveau' : 'modifie');
  };

  const valider = async () => {
    if (!analyse) return;
    setEtape('import');
    const res = await appliquerTableau(analyse);
    setEtape('attente');
    if (!res.ok) return toast.error(res.error);
    toast.success(res.resume);
    setAnalyse(null);
    router.refresh();
  };

  const nouveaux = analyse?.items.filter((i) => i.statut === 'nouveau') ?? [];
  const modifies = analyse?.items.filter((i) => i.statut === 'modifie') ?? [];
  const inchanges = analyse?.items.filter((i) => i.statut === 'inchange') ?? [];

  return (
    <section className='bg-card rounded-2xl border p-4 sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='font-display text-[17px] font-semibold'>
            Importer le tableau de pilotage
          </h2>
          <p className='text-muted-foreground mt-1 max-w-2xl text-xs'>
            Onglet « Prospection acheteur ». L’IA lit la localisation et les informations ; vous
            vérifiez l’aperçu avant d’importer. Les prospects absents du nouveau fichier sont
            archivés, jamais supprimés. Aucun envoi vers Laforêt.
          </p>
        </div>
        <label
          htmlFor='fichier-pilotage'
          className={cn(
            'bg-primary text-primary-foreground inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold',
            etape !== 'attente' && 'pointer-events-none opacity-60'
          )}
        >
          {etape === 'analyse' ? (
            <Icons.spinner className='size-4 animate-spin' />
          ) : (
            <Icons.upload className='size-4' />
          )}
          {etape === 'analyse' ? 'Lecture du fichier (≈ 1 min)…' : 'Choisir le fichier Excel'}
        </label>
        <input
          id='fichier-pilotage'
          type='file'
          accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          className='sr-only'
          disabled={etape !== 'attente'}
          onChange={(e) => {
            void analyser(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {analyse && (
        <div className='mt-4 space-y-3'>
          <div className='flex flex-wrap gap-2'>
            {(
              [
                ['nouveau', `${nouveaux.length} nouveau(x)`],
                ['modifie', `${modifies.length} modifié(s)`],
                ['absents', `${analyse.absents.length} à archiver`]
              ] as const
            ).map(([k, l]) => (
              <Button
                key={k}
                size='sm'
                variant={onglet === k ? 'secondary' : 'outline'}
                onClick={() => setOnglet(k)}
              >
                {l}
              </Button>
            ))}
            <span className='text-muted-foreground self-center text-xs'>
              {inchanges.length} inchangé(s)
            </span>
          </div>
          {analyse.doublons.length > 0 && (
            <p className='text-warn text-xs'>
              Lignes en double ignorées : {analyse.doublons.join(', ')}.
            </p>
          )}
          <ul className='max-h-96 divide-y overflow-y-auto rounded-xl border text-sm'>
            {onglet === 'absents'
              ? analyse.absents.map((a) => (
                  <li key={a.contactId} className='px-3 py-2'>
                    {a.nom}{' '}
                    <span className='text-muted-foreground text-xs'>
                      · absent du fichier, sera archivé
                    </span>
                  </li>
                ))
              : (onglet === 'nouveau' ? nouveaux : modifies).map((i) => (
                  <li key={i.cle} className='px-3 py-2'>
                    <p className='font-medium'>
                      {i.nom}
                      {i.telephone && (
                        <span className='text-muted-foreground ml-2 text-xs font-normal tabular-nums'>
                          {i.telephone}
                        </span>
                      )}
                    </p>
                    {i.projet && (
                      <p className='text-muted-foreground text-xs'>{resumeProjet(i.projet)}</p>
                    )}
                    {i.changements.map((c) => (
                      <p key={c} className='text-cuivre text-xs'>
                        {c}
                      </p>
                    ))}
                  </li>
                ))}
            {(onglet === 'absents'
              ? analyse.absents.length
              : onglet === 'nouveau'
                ? nouveaux.length
                : modifies.length) === 0 && (
              <li className='text-muted-foreground px-3 py-2 text-xs'>Aucun.</li>
            )}
          </ul>
          <div className='flex flex-wrap gap-2'>
            <Button className='font-semibold' disabled={etape !== 'attente'} onClick={valider}>
              {etape === 'import' ? <Icons.spinner className='animate-spin' /> : <Icons.check />}{' '}
              Valider l’import et calculer les rapprochements
            </Button>
            <Button variant='ghost' disabled={etape !== 'attente'} onClick={() => setAnalyse(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
