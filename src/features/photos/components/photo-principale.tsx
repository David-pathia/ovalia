'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { definirPhotoPrincipale, enregistrerPhotoBien, retoucherPhotoAvecIA } from '../actions';
import { preparerPhoto, retoucheFidele } from '../retouche';

export type PhotoBien = {
  id: string;
  url: string | null;
  principale: boolean;
  retouche: 'fidele' | 'ia' | null;
  originaleId: string | null;
};

const LIBELLES = { originale: 'Originale', fidele: 'Retouche fidèle', ia: 'Retouche IA' } as const;

/** Curseur avant / après : l'image « avant » est découpée au-dessus de l'image « après ». */
function Comparateur({ avant, apres }: { avant: string; apres: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className='bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-xl select-none'>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire du stockage privé */}
      <img src={apres} alt='Après retouche' className='absolute inset-0 size-full object-cover' />
      {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire du stockage privé */}
      <img
        src={avant}
        alt='Photo originale'
        className='absolute inset-0 size-full object-cover'
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <div
        className='pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow'
        style={{ left: `${pos}%` }}
      />
      <span className='bg-background/80 absolute top-2 left-2 rounded-md px-2 py-0.5 text-xs font-medium'>
        Avant
      </span>
      <span className='bg-background/80 absolute top-2 right-2 rounded-md px-2 py-0.5 text-xs font-medium'>
        Après
      </span>
      <input
        type='range'
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label='Comparer avant et après retouche'
        className='absolute inset-0 size-full cursor-ew-resize opacity-0'
      />
    </div>
  );
}

export function PhotoPrincipale({
  bienId,
  ownerId,
  photosInitiales,
  iaDisponible
}: {
  bienId: string;
  ownerId: string;
  photosInitiales: PhotoBien[];
  iaDisponible: boolean;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(photosInitiales);
  const [occupe, setOccupe] = useState<null | 'envoi' | 'ia' | 'choix'>(null);
  const principale = photos.find((p) => p.principale) ?? null;
  const origineId = principale ? (principale.originaleId ?? principale.id) : null;
  const famille = useMemo(
    () =>
      origineId ? photos.filter((p) => p.id === origineId || p.originaleId === origineId) : [],
    [photos, origineId]
  );
  const originale = famille.find((p) => p.id === origineId) ?? null;
  const [vueId, setVueId] = useState<string | null>(principale?.id ?? null);
  const vue = famille.find((p) => p.id === vueId) ?? principale;

  const deposer = async (chemin: string, blob: Blob) => {
    const { error } = await createClient()
      .storage.from('biens')
      .upload(chemin, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    const { data } = await createClient().storage.from('biens').createSignedUrl(chemin, 3600);
    return data?.signedUrl ?? null;
  };

  const choisir = async (id: string) => {
    setOccupe('choix');
    const res = await definirPhotoPrincipale(bienId, id);
    setOccupe(null);
    if (!res.ok) return toast.error(res.error);
    setPhotos((ps) => ps.map((p) => ({ ...p, principale: p.id === id })));
    setVueId(id);
    toast.success('Photo principale mise à jour');
    router.refresh();
  };

  const televerser = async (fichier: File | undefined) => {
    if (!fichier) return;
    setOccupe('envoi');
    try {
      const original = await preparerPhoto(fichier);
      const cheminO = `${ownerId}/${bienId}/${crypto.randomUUID()}.jpg`;
      const urlO = await deposer(cheminO, original);
      const o = await enregistrerPhotoBien(bienId, cheminO);
      if (!o.ok) throw new Error(o.error);
      const fidele = await retoucheFidele(original);
      const cheminF = `${ownerId}/${bienId}/${crypto.randomUUID()}.jpg`;
      const urlF = await deposer(cheminF, fidele);
      const f = await enregistrerPhotoBien(bienId, cheminF, {
        retouche: 'fidele',
        originaleId: o.id
      });
      if (!f.ok) throw new Error(f.error);
      const choix = await definirPhotoPrincipale(bienId, f.id);
      if (!choix.ok) throw new Error(choix.error);
      setPhotos((ps) => [
        ...ps.map((p) => ({ ...p, principale: false })),
        { id: o.id, url: urlO, principale: false, retouche: null, originaleId: null },
        { id: f.id, url: urlF, principale: true, retouche: 'fidele', originaleId: o.id }
      ]);
      setVueId(f.id);
      toast.success('Photo ajoutée et retouchée : comparez avec l’originale.');
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error && e.message.includes('migration')
          ? e.message
          : 'La photo n’a pas pu être ajoutée. Formats acceptés : JPEG, PNG, HEIC (iPhone).'
      );
    } finally {
      setOccupe(null);
    }
  };

  const retoucheIA = async () => {
    if (!origineId) return;
    setOccupe('ia');
    const res = await retoucherPhotoAvecIA(bienId, origineId);
    setOccupe(null);
    if (!res.ok) return toast.error(res.error);
    setPhotos((ps) => [
      ...ps,
      { id: res.id, url: res.url, principale: false, retouche: 'ia', originaleId: origineId }
    ]);
    setVueId(res.id);
    toast.success('Retouche IA prête : vérifiez qu’elle reste fidèle avant de la choisir.');
  };

  const versions = famille
    .map((p) => ({ p, cle: (p.retouche ?? 'originale') as keyof typeof LIBELLES }))
    .sort(
      (a, b) =>
        ['originale', 'fidele', 'ia'].indexOf(a.cle) - ['originale', 'fidele', 'ia'].indexOf(b.cle)
    );

  return (
    <section className='bg-card min-w-0 rounded-2xl border p-4 sm:p-5'>
      <header className='mb-3 flex flex-wrap items-start justify-between gap-2'>
        <div>
          <h2 className='font-display text-[17px] font-semibold'>Photo principale</h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            En couverture du dossier d’estimation et en tête de l’annonce. La photo originale est
            toujours conservée.
          </p>
        </div>
        <label
          htmlFor='photo-principale'
          className={cn(
            'hover:bg-muted inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium',
            occupe && 'pointer-events-none opacity-50'
          )}
        >
          {occupe === 'envoi' ? (
            <Icons.spinner className='size-4 animate-spin' />
          ) : (
            <Icons.upload className='size-4' />
          )}
          {principale ? 'Remplacer la photo' : 'Ajouter la photo'}
        </label>
        <input
          id='photo-principale'
          type='file'
          accept='image/*'
          className='sr-only'
          disabled={Boolean(occupe)}
          onChange={(e) => televerser(e.target.files?.[0])}
        />
      </header>

      {!principale || !vue ? (
        <label
          htmlFor='photo-principale'
          className='text-muted-foreground hover:text-foreground flex aspect-[16/7] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm'
        >
          {occupe === 'envoi' ? (
            <Icons.spinner className='size-6 animate-spin' />
          ) : (
            <Icons.upload className='size-6' />
          )}
          {occupe === 'envoi'
            ? 'Retouche en cours…'
            : 'Choisissez la photo la plus valorisante du bien'}
        </label>
      ) : (
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
          {originale?.url && vue.url && vue.id !== originale.id ? (
            <Comparateur avant={originale.url} apres={vue.url} />
          ) : vue.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire du stockage privé
            <img
              src={vue.url}
              alt='Photo principale'
              className='aspect-[4/3] w-full rounded-xl object-cover'
            />
          ) : null}

          <div className='flex min-w-0 flex-col gap-3'>
            <div>
              <p className='text-muted-foreground mb-1.5 text-xs'>Versions</p>
              <div className='flex flex-wrap gap-2'>
                {versions.map(({ p, cle }) => (
                  <Button
                    key={p.id}
                    size='sm'
                    variant={vue.id === p.id ? 'secondary' : 'outline'}
                    onClick={() => setVueId(p.id)}
                  >
                    {p.principale && <Icons.check />}
                    {LIBELLES[cle]}
                  </Button>
                ))}
              </div>
            </div>
            {!vue.principale && (
              <Button
                size='sm'
                className='self-start font-semibold'
                disabled={Boolean(occupe)}
                onClick={() => choisir(vue.id)}
              >
                {occupe === 'choix' ? <Icons.spinner className='animate-spin' /> : <Icons.check />}{' '}
                Utiliser cette version
              </Button>
            )}
            <div className='rounded-xl border p-3'>
              <p className='text-sm font-medium'>Retouche IA</p>
              <p className='text-muted-foreground mt-1 text-xs'>
                Ciel bleu, lumière, pelouse existante et retrait des petits objets (tuyau,
                poubelles). Le bien et la végétation ne sont pas modifiés ; la mention « Photo
                retouchée » figurera dans le dossier.
              </p>
              <Button
                size='sm'
                variant='outline'
                className='mt-2'
                disabled={!iaDisponible || Boolean(occupe)}
                onClick={retoucheIA}
              >
                {occupe === 'ia' ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
                {occupe === 'ia' ? 'Retouche en cours (≈ 30 s)…' : 'Lancer la retouche IA'}
              </Button>
              {!iaDisponible && (
                <p className='text-muted-foreground mt-1.5 text-xs'>
                  À activer : variable AI_GATEWAY_API_KEY sur Vercel.
                </p>
              )}
            </div>
            <p className='text-muted-foreground text-xs'>
              Vérifiez toujours que la version choisie reste fidèle au bien avant de l’utiliser.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
