'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { ComparableResume } from '@/lib/estimation/estimer';
import { ajouterPhoto, enregistrerAvis, supprimerPhoto } from '../actions';
import { MAX_COMPARABLES_AVIS, PAGES_AVIS, cleComparable, type AvisDetails } from '../types';

export type PhotoEditeur = { id: string; url: string | null };

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;
const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

function Bloc({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className='bg-card min-w-0 rounded-2xl border p-4 sm:p-5'>
      <h2 className='font-display text-[17px] font-semibold'>{titre}</h2>
      {aide && <p className='text-muted-foreground mt-1 text-xs'>{aide}</p>}
      <div className='mt-4'>{children}</div>
    </section>
  );
}

function Champ({ id, label, children, className }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id} className='text-muted-foreground text-xs'>
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Réduit la photo (2 000 px max) et la convertit en JPEG : le PDF n'accepte que JPEG et PNG, et les photos de téléphone sont lourdes. */
async function preparerPhoto(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const echelle = Math.min(1, 2000 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('conversion'))), 'image/jpeg', 0.85));
}

export function AvisEditor({
  bienId,
  ownerId,
  initial,
  comparables,
  photosInitiales,
  suggestion
}: {
  bienId: string;
  ownerId: string;
  initial: AvisDetails;
  comparables: ComparableResume[];
  photosInitiales: PhotoEditeur[];
  suggestion: { basse: number; haute: number; conseille: number };
}) {
  const router = useRouter();
  const [avis, setAvis] = useState(initial);
  const [photos, setPhotos] = useState(photosInitiales);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const maj = <K extends keyof AvisDetails>(k: K, v: AvisDetails[K]) => setAvis((a) => ({ ...a, [k]: v }));
  const majObj = <K extends 'destinataire' | 'conseiller' | 'agence' | 'textes'>(k: K, champ: keyof AvisDetails[K], v: string) =>
    setAvis((a) => ({ ...a, [k]: { ...a[k], [champ]: v } }));
  const majPrix = (champ: 'basse' | 'haute' | 'conseille', v: string) => {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(n)) setAvis((a) => ({ ...a, prix: { ...a.prix, [champ]: Math.round(n) } }));
  };

  const triees = [...comparables].sort((a, b) => b.poids - a.poids);
  const honoraires = Math.round(avis.prix.conseille * avis.prix.tauxHonoraires);

  const enregistrer = (puisPdf: boolean) => {
    setErreur(null);
    // L'onglet est ouvert tout de suite (dans le clic) pour ne pas être bloqué par le navigateur.
    const onglet = puisPdf ? window.open('', '_blank') : null;
    startSave(async () => {
      const res = await enregistrerAvis(bienId, avis);
      if (!res.ok) {
        onglet?.close();
        setErreur(res.error);
        return;
      }
      if (puisPdf) {
        const url = `/dashboard/biens/${bienId}/avis/pdf?v=${Date.now()}`;
        if (onglet) onglet.location.href = url;
        else window.location.href = url;
        toast.success('Avis enregistré, génération du PDF…');
      } else toast.success('Avis enregistré');
      router.refresh();
    });
  };

  const televerser = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    setEnvoi(true);
    const supabase = createClient();
    try {
      for (const f of Array.from(fichiers).slice(0, 10)) {
        const blob = await preparerPhoto(f);
        const chemin = `${ownerId}/${bienId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from('biens').upload(chemin, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        const res = await ajouterPhoto(bienId, chemin);
        if (!res.ok) throw new Error(res.error);
        const { data } = await supabase.storage.from('biens').createSignedUrl(chemin, 3600);
        setPhotos((p) => [...p, { id: res.id, url: data?.signedUrl ?? null }]);
        setAvis((a) =>
          !a.photos.couverture
            ? { ...a, photos: { ...a.photos, couverture: res.id } }
            : a.photos.bien.length < 4
              ? { ...a, photos: { ...a.photos, bien: [...a.photos.bien, res.id] } }
              : a
        );
      }
      toast.success('Photos ajoutées');
    } catch (e) {
      console.error(e);
      toast.error('Une photo n’a pas pu être envoyée. Formats acceptés : JPEG, PNG, HEIC (iPhone).');
    } finally {
      setEnvoi(false);
    }
  };

  const retirerPhoto = async (id: string) => {
    const res = await supprimerPhoto(id);
    if (!res.ok) return toast.error(res.error);
    setPhotos((p) => p.filter((x) => x.id !== id));
    setAvis((a) => ({
      ...a,
      photos: { couverture: a.photos.couverture === id ? null : a.photos.couverture, bien: a.photos.bien.filter((x) => x !== id) }
    }));
  };

  const basculerPhotoBien = (id: string) =>
    setAvis((a) => {
      const dedans = a.photos.bien.includes(id);
      if (!dedans && a.photos.bien.length >= 4) {
        toast.info('4 photos au maximum dans la page « Votre bien ».');
        return a;
      }
      return { ...a, photos: { ...a.photos, bien: dedans ? a.photos.bien.filter((x) => x !== id) : [...a.photos.bien, id] } };
    });

  const basculerComparable = (cle: string) =>
    setAvis((a) => {
      const dedans = a.comparables.includes(cle);
      if (!dedans && a.comparables.length >= MAX_COMPARABLES_AVIS) {
        toast.info(`${MAX_COMPARABLES_AVIS} ventes au maximum dans le dossier.`);
        return a;
      }
      return { ...a, comparables: dedans ? a.comparables.filter((x) => x !== cle) : [...a.comparables, cle] };
    });

  return (
    <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'>
      <div className='flex min-w-0 flex-col gap-5'>
        <Bloc titre='Prix présentés au client' aide='Fourchette arrondie et prix de présentation : ce sont les chiffres qui figureront en page « Notre estimation ».'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            <Champ id='a-basse' label='Fourchette basse (€)'>
              <Input id='a-basse' inputMode='numeric' className='tabular-nums' value={avis.prix.basse} onChange={(e) => majPrix('basse', e.target.value)} />
            </Champ>
            <Champ id='a-haute' label='Fourchette haute (€)'>
              <Input id='a-haute' inputMode='numeric' className='tabular-nums' value={avis.prix.haute} onChange={(e) => majPrix('haute', e.target.value)} />
            </Champ>
            <Champ id='a-conseille' label='Prix de présentation, honoraires inclus (€)' className='col-span-2 sm:col-span-1'>
              <Input id='a-conseille' inputMode='numeric' className='tabular-nums' value={avis.prix.conseille} onChange={(e) => majPrix('conseille', e.target.value)} />
            </Champ>
          </div>
          <p className='text-muted-foreground mt-3 text-xs tabular-nums'>
            Estimation DVF : {eur(suggestion.basse)} à {eur(suggestion.haute)}, prix conseillé {eur(suggestion.conseille)}. Honoraires{' '}
            {(avis.prix.tauxHonoraires * 100).toLocaleString('fr-FR')} % : {eur(honoraires)} · net vendeur{' '}
            <span className='text-foreground font-semibold'>{eur(avis.prix.conseille - honoraires)}</span>.
          </p>
        </Bloc>

        <Bloc titre='Textes du dossier' aide='Le texte « Notre regard sur votre bien » est repris de l’argumentaire de l’estimation : relisez-le avant envoi.'>
          <div className='space-y-3'>
            <Champ id='a-intro' label='Introduction'>
              <Textarea id='a-intro' rows={4} value={avis.textes.introduction} onChange={(e) => majObj('textes', 'introduction', e.target.value)} />
            </Champ>
            <Champ id='a-bien' label='Notre regard sur votre bien'>
              <Textarea id='a-bien' rows={6} value={avis.textes.bien} onChange={(e) => majObj('textes', 'bien', e.target.value)} />
            </Champ>
            <Champ id='a-conclu' label='Conclusion (page « Notre estimation »)'>
              <Textarea id='a-conclu' rows={3} value={avis.textes.conclusion} onChange={(e) => majObj('textes', 'conclusion', e.target.value)} />
            </Champ>
          </div>
        </Bloc>

        <Bloc
          titre={`Ventes comparables présentées (${avis.comparables.length} / ${MAX_COMPARABLES_AVIS})`}
          aide='Elles apparaissent numérotées sur la carte et dans le tableau du dossier. Pour changer les ventes étudiées, utilisez « Choisir les comparables » dans la fiche, puis revenez ici.'
        >
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[620px] text-sm'>
              <thead>
                <tr className='text-muted-foreground text-left text-xs'>
                  <th className='w-8 pb-2' />
                  <th className='pb-2 font-medium'>Vente</th>
                  <th className='pb-2 font-medium'>Adresse</th>
                  <th className='pb-2 text-right font-medium'>Surface</th>
                  <th className='pb-2 text-right font-medium'>Prix</th>
                  <th className='pb-2 text-right font-medium'>€/m²</th>
                  <th className='pb-2 text-right font-medium'>Distance</th>
                </tr>
              </thead>
              <tbody className='divide-border divide-y'>
                {triees.map((c) => {
                  const cle = cleComparable(c);
                  const coche = avis.comparables.includes(cle);
                  return (
                    <tr key={cle} className={cn('tabular-nums', coche && 'bg-cuivre/10')}>
                      <td className='py-1.5'>
                        <input
                          type='checkbox'
                          className='accent-cuivre size-4 cursor-pointer'
                          checked={coche}
                          onChange={() => basculerComparable(cle)}
                          aria-label={`Présenter la vente ${c.adresse || c.commune}`}
                        />
                      </td>
                      <td className='py-1.5 pr-2 whitespace-nowrap'>{dateFr(c.date)}</td>
                      <td className='py-1.5 pr-2'>{`${c.adresse ? `${c.adresse.toLowerCase()}, ` : ''}${c.commune}`}</td>
                      <td className='py-1.5 pr-2 text-right'>{c.surface} m²</td>
                      <td className='py-1.5 pr-2 text-right'>{eur(c.prix)}</td>
                      <td className='py-1.5 pr-2 text-right font-mono'>{Math.round(c.prixM2).toLocaleString('fr-FR')}</td>
                      <td className='py-1.5 text-right'>{c.distanceKm === null ? '—' : `${c.distanceKm.toLocaleString('fr-FR')} km`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Bloc>

        <Bloc titre='Photos' aide='La photo marquée « Couverture » ouvre le dossier ; jusqu’à 4 autres illustrent la page « Votre bien ».'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {photos.map((p) => {
              const couverture = avis.photos.couverture === p.id;
              const dansBien = avis.photos.bien.includes(p.id);
              return (
                <figure key={p.id} className={cn('bg-muted overflow-hidden rounded-xl border', couverture && 'ring-cuivre ring-2')}>
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire du stockage privé
                    <img src={p.url} alt='' className='aspect-[4/3] w-full object-cover' />
                  ) : (
                    <div className='aspect-[4/3]' />
                  )}
                  <figcaption className='flex flex-wrap gap-1 p-2'>
                    <Button
                      size='xs'
                      variant={couverture ? 'default' : 'outline'}
                      onClick={() =>
                        setAvis((a) => ({
                          ...a,
                          photos: { couverture: p.id, bien: a.photos.bien.filter((x) => x !== p.id) }
                        }))
                      }
                    >
                      Couverture
                    </Button>
                    <Button size='xs' variant={dansBien ? 'secondary' : 'outline'} disabled={couverture} onClick={() => basculerPhotoBien(p.id)}>
                      {dansBien ? 'Dans le dossier' : 'Ajouter'}
                    </Button>
                    <Button size='icon-xs' variant='ghost' aria-label='Supprimer la photo' onClick={() => retirerPhoto(p.id)}>
                      <Icons.trash />
                    </Button>
                  </figcaption>
                </figure>
              );
            })}
            <label
              htmlFor='a-photos'
              className='text-muted-foreground hover:text-foreground flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs'
            >
              {envoi ? <Icons.spinner className='size-5 animate-spin' /> : <Icons.upload className='size-5' />}
              {envoi ? 'Envoi…' : 'Ajouter des photos'}
            </label>
            <input id='a-photos' type='file' accept='image/*' multiple className='sr-only' disabled={envoi} onChange={(e) => televerser(e.target.files)} />
          </div>
        </Bloc>
      </div>

      <aside className='flex min-w-0 flex-col gap-5 xl:sticky xl:top-20'>
        <div className='bg-card space-y-3 rounded-2xl border p-4 sm:p-5'>
          {erreur && (
            <p role='alert' className='text-crit text-sm'>
              {erreur}
            </p>
          )}
          <Button className='h-10 w-full font-semibold' disabled={saving} onClick={() => enregistrer(true)}>
            {saving ? (
              <>
                <Icons.spinner className='animate-spin' /> Préparation…
              </>
            ) : (
              <>
                <Icons.fileTypePdf /> Générer le PDF
              </>
            )}
          </Button>
          <Button variant='outline' className='w-full' disabled={saving} onClick={() => enregistrer(false)}>
            Enregistrer sans générer
          </Button>
          <p className='text-muted-foreground text-xs'>La génération prend 10 à 20 secondes : cartes, ventes du secteur et photos sont assemblées à la volée.</p>
        </div>

        <Bloc titre='Pages du dossier'>
          <ul className='space-y-2.5'>
            {PAGES_AVIS.map(([k, l]) => (
              <li key={k} className='flex items-center justify-between gap-3'>
                <Label htmlFor={`p-${k}`} className='text-sm font-normal'>
                  {l}
                </Label>
                <Switch id={`p-${k}`} checked={avis.pages[k]} onCheckedChange={(v) => maj('pages', { ...avis.pages, [k]: v })} />
              </li>
            ))}
          </ul>
          <p className='text-muted-foreground mt-3 text-xs'>Couverture, sommaire, introduction et estimation sont toujours inclus.</p>
        </Bloc>

        <Bloc titre='Destinataire'>
          <div className='grid grid-cols-3 gap-3'>
            <Champ id='d-civ' label='Civilité'>
              <Input id='d-civ' value={avis.destinataire.civilite} onChange={(e) => majObj('destinataire', 'civilite', e.target.value)} />
            </Champ>
            <Champ id='d-prenom' label='Prénom'>
              <Input id='d-prenom' value={avis.destinataire.prenom} onChange={(e) => majObj('destinataire', 'prenom', e.target.value)} />
            </Champ>
            <Champ id='d-nom' label='Nom'>
              <Input id='d-nom' value={avis.destinataire.nom} onChange={(e) => majObj('destinataire', 'nom', e.target.value)} />
            </Champ>
            <Champ id='d-date' label='Date de l’avis' className='col-span-3'>
              <Input id='d-date' type='date' value={avis.dateAvis} onChange={(e) => maj('dateAvis', e.target.value)} />
            </Champ>
          </div>
        </Bloc>

        <Bloc titre='Conseiller'>
          <div className='grid grid-cols-2 gap-3'>
            {(
              [
                ['nom', 'Nom'],
                ['titre', 'Fonction'],
                ['telephone', 'Téléphone'],
                ['email', 'E-mail']
              ] as const
            ).map(([k, l]) => (
              <Champ key={k} id={`c-${k}`} label={l}>
                <Input id={`c-${k}`} value={avis.conseiller[k]} onChange={(e) => majObj('conseiller', k, e.target.value)} />
              </Champ>
            ))}
          </div>
        </Bloc>

        <Bloc titre='Agence' aide='Repris d’un avis à l’autre.'>
          <div className='grid grid-cols-2 gap-3'>
            {(
              [
                ['nom', 'Nom', 'col-span-2'],
                ['adresse', 'Adresse', 'col-span-2'],
                ['codePostal', 'Code postal', ''],
                ['ville', 'Ville', ''],
                ['telephone', 'Téléphone', ''],
                ['email', 'E-mail', ''],
                ['site', 'Site', 'col-span-2'],
                ['horaires', 'Horaires', 'col-span-2']
              ] as const
            ).map(([k, l, cls]) => (
              <Champ key={k} id={`g-${k}`} label={l} className={cls}>
                <Input id={`g-${k}`} value={avis.agence[k]} onChange={(e) => majObj('agence', k, e.target.value)} />
              </Champ>
            ))}
            <Champ id='g-mentions' label='Mentions légales' className='col-span-2'>
              <Textarea id='g-mentions' rows={4} value={avis.agence.mentions} onChange={(e) => majObj('agence', 'mentions', e.target.value)} />
            </Champ>
          </div>
        </Bloc>
      </aside>
    </div>
  );
}
