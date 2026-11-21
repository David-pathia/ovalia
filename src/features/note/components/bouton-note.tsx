'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { NoteVocale } from './note-vocale';

/** Bouton « Note » de l'en-tête : disponible sur toutes les pages du tableau de bord. */
export function BoutonNote() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger
        render={<Button className='h-8 gap-1.5 font-semibold' aria-label='Note vocale' />}
      >
        <Icons.mic /> <span className='hidden sm:inline'>Note</span>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='font-display'>Note vocale</DialogTitle>
          <DialogDescription>
            Dites ce qu’il ne faut pas oublier : chaque chose à faire devient une action dans «
            Aujourd’hui », à la bonne date.
          </DialogDescription>
        </DialogHeader>
        <NoteVocale onTermine={() => setOuvert(false)} />
      </DialogContent>
    </Dialog>
  );
}
