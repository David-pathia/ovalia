'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import { ajouterTache } from '../actions';
import { aujourdhui } from '../dates';
import { TYPES_TACHE, type TypeTache } from '../types';

/** Ajout rapide d'une tâche : intitulé, type, jour (aujourd'hui par défaut) et heure facultative. */
export function AjoutTache() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [titre, setTitre] = useState('');
  const [type, setType] = useState<TypeTache>('appel');
  const [date, setDate] = useState(aujourdhui);
  const [heure, setHeure] = useState('');

  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    demarrer(async () => {
      const r = await ajouterTache({ titre, type, date: date || null, heure: heure || null });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setTitre('');
      setHeure('');
      router.refresh();
    });
  };

  return (
    <form onSubmit={envoyer} className='mb-4 flex flex-wrap items-center gap-2'>
      <Input
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder='Nouvelle tâche : rappeler, visiter, envoyer…'
        aria-label='Intitulé de la tâche'
        maxLength={200}
        className='min-w-48 flex-1'
      />
      <NativeSelect
        value={type}
        onChange={(e) => setType(e.target.value as TypeTache)}
        aria-label='Type'
      >
        {TYPES_TACHE.map(([v, l]) => (
          <NativeSelectOption key={v} value={v}>
            {l}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        type='date'
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label='Jour'
        className='w-36'
      />
      <Input
        type='time'
        value={heure}
        onChange={(e) => setHeure(e.target.value)}
        aria-label='Heure (facultative)'
        className='w-26'
      />
      <Button type='submit' disabled={enCours || !titre.trim()} className='font-semibold'>
        {enCours ? <Icons.spinner className='animate-spin' /> : <Icons.add />} Ajouter
      </Button>
    </form>
  );
}
