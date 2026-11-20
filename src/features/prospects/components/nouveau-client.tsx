'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { creerClient } from '../client';

const TYPES = [
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'immeuble', label: 'Immeuble' }
];
const CRITERES = [
  { value: 'garage', label: 'Garage' },
  { value: 'exterieur', label: 'Extérieur' },
  { value: 'plain_pied', label: 'Plain-pied' },
  { value: 'sans_travaux', label: 'Sans travaux' },
  { value: 'piscine', label: 'Piscine' },
  { value: 'calme', label: 'Calme' }
];

function Champ({
  id,
  label,
  className,
  ...props
}: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className={className}>
      <Label htmlFor={id} className='mb-1.5 text-xs'>
        {label}
      </Label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}

function Cases({ name, options }: { name: string; options: { value: string; label: string }[] }) {
  return (
    <div className='flex flex-wrap gap-x-4 gap-y-2'>
      {options.map((o) => (
        <Label key={o.value} className='text-sm font-normal'>
          <Checkbox name={name} value={o.value} /> {o.label}
        </Label>
      ))}
    </div>
  );
}

/** Bouton « Client » + fenêtre de création d'un client (et de sa recherche). */
export function NouveauClient() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState(true);
  const [enCours, demarrer] = useTransition();

  function envoyer(formData: FormData) {
    if (recherche) formData.set('recherche', 'on');
    demarrer(async () => {
      const res = await creerClient(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.resume, {
        action: { label: 'Voir', onClick: () => router.push('/dashboard/prospects') }
      });
      setOuvert(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger render={<Button variant='outline' className='h-9' />}>
        <Icons.add /> Client
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='font-display text-lg'>Nouveau client</DialogTitle>
          <DialogDescription>
            Coordonnées et, s’il achète, ses critères : les biens correspondants sont recherchés
            aussitôt.
          </DialogDescription>
        </DialogHeader>

        <form action={envoyer} className='flex flex-col gap-4'>
          <div className='grid grid-cols-2 gap-3'>
            <Champ id='prenom' label='Prénom' autoComplete='off' />
            <Champ id='nom' label='Nom *' required autoComplete='off' />
            <Champ id='portable' label='Portable' type='tel' inputMode='tel' />
            <Champ id='email' label='E-mail' type='email' />
          </div>

          <Label className='text-sm'>
            <Switch checked={recherche} onCheckedChange={setRecherche} /> Recherche un bien à
            acheter
          </Label>

          {recherche && (
            <div className='bg-secondary/40 flex flex-col gap-3 rounded-xl border p-3'>
              <div>
                <p className='mb-2 text-xs font-medium'>Type de bien</p>
                <Cases name='types_bien' options={TYPES} />
              </div>
              <div className='grid grid-cols-3 gap-3'>
                <Champ
                  id='budget_max'
                  label='Budget max (FAI, €)'
                  inputMode='numeric'
                  className='col-span-3 sm:col-span-1'
                />
                <Champ id='chambres_min' label='Chambres min.' inputMode='numeric' />
                <Champ id='surface_min' label='Surface min. (m²)' inputMode='numeric' />
              </div>
              <div className='grid grid-cols-3 gap-3'>
                <Champ
                  id='communes'
                  label='Communes (séparées par des virgules)'
                  placeholder='Roanne, Riorges, Mably'
                  className='col-span-2'
                />
                <Champ id='rayon_km' label='Rayon autour (km)' inputMode='numeric' />
              </div>
              <div>
                <p className='mb-2 text-xs font-medium'>Critères</p>
                <Cases name='criteres' options={CRITERES} />
              </div>
              <div>
                <Label htmlFor='informations' className='mb-1.5 text-xs'>
                  Informations
                </Label>
                <Textarea id='informations' name='informations' rows={2} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type='submit' className='font-semibold' disabled={enCours}>
              {enCours ? 'Enregistrement…' : 'Enregistrer le client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
