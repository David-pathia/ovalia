'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { creerInvitation } from '../actions';
import { MESSAGE_INVITATION } from '../questions';

/** Numéro français → format international sans « + » pour wa.me (06… → 336…). */
function international(tel: string) {
  const c = tel.replace(/\D/g, '');
  return c.startsWith('0') ? `33${c.slice(1)}` : c;
}

export function CreerInvitation({
  base,
  biens
}: {
  base: string;
  biens: { id: string; titre: string }[];
}) {
  const router = useRouter();
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [bienId, setBienId] = useState('');
  const [lien, setLien] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const lienWhatsApp = (message: string) =>
    `https://wa.me/${telephone ? international(telephone) : ''}?text=${encodeURIComponent(message)}`;

  const creer = async (canal: 'whatsapp' | 'sms' | 'lien') => {
    // L'onglet WhatsApp est ouvert dès le clic : ouvert après l'enregistrement, il serait bloqué par le navigateur.
    const onglet = canal === 'whatsapp' ? window.open('', '_blank') : null;
    setEnvoi(true);
    const res = await creerInvitation({ prenom, telephone, bienId: bienId || null, canal });
    setEnvoi(false);
    if (!res.ok) {
      onglet?.close();
      toast.error(res.error);
      return;
    }
    const url = `${base}/site/avis/${res.jeton}`;
    const message = MESSAGE_INVITATION(prenom.trim() || null, url);
    setLien(url);
    setMessage(message);
    if (canal === 'whatsapp') {
      if (onglet) onglet.location.href = lienWhatsApp(message);
      else toast.info('Cliquez sur « Ouvrir WhatsApp » ci-dessous pour envoyer le message.');
    } else if (canal === 'sms')
      window.location.href = `sms:${telephone.replace(/\s/g, '')}?&body=${encodeURIComponent(message)}`;
    else {
      try {
        await navigator.clipboard.writeText(message);
        toast.success('Message et lien copiés');
      } catch {
        toast.info('Lien créé : copiez-le ci-dessous.');
      }
    }
    router.refresh();
  };

  return (
    <div className='space-y-3'>
      <div className='grid gap-3 sm:grid-cols-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='inv-prenom' className='text-muted-foreground text-xs'>
            Prénom du client (facultatif)
          </Label>
          <Input
            id='inv-prenom'
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            maxLength={60}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='inv-tel' className='text-muted-foreground text-xs'>
            Portable (pour WhatsApp / SMS)
          </Label>
          <Input
            id='inv-tel'
            inputMode='tel'
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            maxLength={20}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='inv-bien' className='text-muted-foreground text-xs'>
            Bien visité (facultatif)
          </Label>
          <select
            id='inv-bien'
            value={bienId}
            onChange={(e) => setBienId(e.target.value)}
            className='bg-background h-9 w-full rounded-lg border px-2 text-sm'
          >
            <option value=''>—</option>
            {biens.map((b) => (
              <option key={b.id} value={b.id}>
                {b.titre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button disabled={envoi} onClick={() => creer('whatsapp')} className='font-semibold'>
          <Icons.whatsapp /> Envoyer par WhatsApp
        </Button>
        <Button variant='outline' disabled={envoi} onClick={() => creer('sms')}>
          <Icons.chat /> Envoyer par SMS
        </Button>
        <Button variant='ghost' disabled={envoi} onClick={() => creer('lien')}>
          <Icons.copy /> Copier le message
        </Button>
      </div>
      {lien && (
        <div className='bg-muted/50 space-y-2 rounded-xl p-3'>
          <p className='text-muted-foreground text-xs break-all'>
            Lien créé : <span className='text-foreground font-mono'>{lien}</span>
          </p>
          <p className='text-muted-foreground text-xs'>
            WhatsApp s’ouvre avec le message prêt : il reste à appuyer sur « Envoyer ». Si rien ne
            s’est ouvert :
          </p>
          <a
            href={lienWhatsApp(message)}
            target='_blank'
            rel='noopener noreferrer'
            className='text-cuivre inline-flex items-center gap-1.5 text-sm font-semibold hover:underline'
          >
            <Icons.whatsapp className='size-4' /> Ouvrir WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
