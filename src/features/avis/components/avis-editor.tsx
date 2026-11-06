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
import { TONS_ANNONCE, type TonAnnonce } from '@/lib/ai/annonce-tons';
import {
  ajouterPhoto,
  enregistrerAvis,
  redigerAnnonce,
  redigerSynthese,
  supprimerPhoto
} from '../actions';
import {
  ETAPES_DEFAUT,
  MAX_COMPARABLES_AVIS,
  MAX_ETAPES,
  PROFILS_ACQUEREUR,
  PAGES_AVIS,
  TITRE_ANNONCE_MAX,
  annonceEnTexte,
  cleComparable,
  mentionsAnnonce,
  type Annonce,
  type AvisDetails,
  type Etape,
  type InfosAnnonce
} from '../types';

export type PhotoEditeur = { id: string; url: string | null };

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;
const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric'
  });

function Bloc({
  titre,
  aide,
  children
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <section className='bg-card min-w-0 rounded-2xl border p-4 sm:p-5'>
      <h2 className='font-display text-[17px] font-semibold'>{titre}</h2>
      {aide && <p className='text-muted-foreground mt-1 text-xs'>{aide}</p>}
      <div className='mt-4'>{children}</div>
    </section>
  );
}

function Champ({
  id,
  label,
  children,
  className
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id} className='text-muted-foreground text-xs'>
        {label}
      </Label>
      {children}
    </div>
  );
}

/**
 * Retouche légère et fidèle : niveaux automatiques, contraste, couleurs un peu plus vives et verts ravivés (pelouse).
 * Aucun élément n'est ajouté ni retiré de l'image.
 */
async function ameliorerPhoto(url: string): Promise<Blob> {
  const image = await createImageBitmap(await (await fetch(url)).blob());
  const echelle = Math.min(1, 2000 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  const hist: number[] = Array.from({ length: 256 }, () => 0);
  for (let i = 0; i < px.length; i += 4)
    hist[Math.round(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!)]!++;
  const total = px.length / 4;
  const centile = (q: number) => {
    let cumul = 0;
    for (let v = 0; v < 256; v++) if ((cumul += hist[v]!) >= total * q) return v;
    return 255;
  };
  // Étirement limité pour ne pas brûler les blancs ni boucher les noirs.
  const bas = Math.min(centile(0.005), 40);
  const haut = Math.max(centile(0.995), 215);
  const etire = 255 / Math.max(1, haut - bas);
  for (let i = 0; i < px.length; i += 4) {
    let r = (px[i]! - bas) * etire;
    let g = (px[i + 1]! - bas) * etire;
    let b = (px[i + 2]! - bas) * etire;
    // Contraste doux autour du gris moyen.
    r = 128 + (r - 128) * 1.06;
    g = 128 + (g - 128) * 1.06;
    b = 128 + (b - 128) * 1.06;
    const gris = 0.299 * r + 0.587 * g + 0.114 * b;
    const vert = g > r * 1.04 && g > b * 1.04;
    const sat = vert ? 1.28 : 1.1;
    r = gris + (r - gris) * sat;
    g = gris + (g - gris) * sat * (vert ? 1.03 : 1);
    b = gris + (b - gris) * sat;
    px[i] = Math.max(0, Math.min(255, r));
    px[i + 1] = Math.max(0, Math.min(255, g));
    px[i + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((ok, ko) =>
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error('conversion'))), 'image/jpeg', 0.9)
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
  return new Promise((ok, ko) =>
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error('conversion'))), 'image/jpeg', 0.85)
  );
}

export function AvisEditor({
  bienId,
  ownerId,
  initial,
  comparables,
  photosInitiales,
  suggestion,
  infos
}: {
  bienId: string;
  ownerId: string;
  initial: AvisDetails;
  comparables: ComparableResume[];
  photosInitiales: PhotoEditeur[];
  suggestion: { basse: number; haute: number; conseille: number };
  infos: InfosAnnonce;
}) {
  const router = useRouter();
  const [avis, setAvis] = useState(initial);
  const [photos, setPhotos] = useState(photosInitiales);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [redaction, setRedaction] = useState(false);

  const maj = <K extends keyof AvisDetails>(k: K, v: AvisDetails[K]) =>
    setAvis((a) => ({ ...a, [k]: v }));
  const majObj = <K extends 'destinataire' | 'conseiller' | 'agence' | 'textes'>(
    k: K,
    champ: keyof AvisDetails[K],
    v: string
  ) => setAvis((a) => ({ ...a, [k]: { ...a[k], [champ]: v } }));
  const majPrix = (champ: 'basse' | 'haute' | 'conseille', v: string) => {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(n)) setAvis((a) => ({ ...a, prix: { ...a.prix, [champ]: Math.round(n) } }));
  };

  const majAnnonce = <K extends keyof Annonce>(k: K, v: Annonce[K]) =>
    setAvis((a) => ({ ...a, annonce: { ...a.annonce, [k]: v } }));
  const majPointFort = (i: number, v: string) =>
    setAvis((a) => {
      const pf = [...a.annonce.pointsForts];
      while (pf.length <= i) pf.push('');
      pf[i] = v;
      return { ...a, annonce: { ...a.annonce, pointsForts: pf } };
    });
  const majEtape = (i: number, k: keyof Etape, v: string) =>
    setAvis((a) => ({
      ...a,
      etapes: a.etapes.map((e, j) => (j === i ? { ...e, [k]: v } : e))
    }));

  const rediger = async (ton: TonAnnonce) => {
    if (
      avis.annonce.texte.trim() &&
      !window.confirm(
        'Remplacer le titre, le texte et les points forts actuels par une nouvelle rédaction ?'
      )
    )
      return;
    setRedaction(true);
    try {
      const res = await redigerAnnonce(bienId, ton);
      if (!res.ok) return toast.error(res.error);
      setAvis((a) => ({
        ...a,
        annonce: { ...a.annonce, ton, ...res.annonce }
      }));
      toast.success('Annonce rédigée : relisez-la avant d’enregistrer.');
    } finally {
      setRedaction(false);
    }
  };

  const copierAnnonce = async () => {
    try {
      await navigator.clipboard.writeText(annonceEnTexte(avis.annonce, avis.prix, infos));
      toast.success('Annonce copiée : collez-la dans Laforêt Business.');
    } catch {
      toast.error('Copie impossible dans ce navigateur.');
    }
  };

  const mentions = mentionsAnnonce(avis.annonce, avis.prix, infos);
  const longueurTitre = avis.annonce.titre.length;

  const triees = [...comparables].sort((a, b) => b.poids - a.poids);
  const honoraires = Math.round(avis.prix.conseille * avis.prix.tauxHonoraires);

  const enregistrer = (puisPdf: boolean) => {
    setErreur(null);
    // L'onglet est ouvert tout de suite (dans le clic) pour ne pas être bloqué par le navigateur.
    const onglet = puisPdf ? window.open('', '_blank') : null;
    startSave(async () => {
      const propre = (l: string[]) => l.map((x) => x.trim()).filter(Boolean);
      const res = await enregistrerAvis(bienId, {
        ...avis,
        analyse: {
          pointsForts: propre(avis.analyse.pointsForts),
          vigilance: propre(avis.analyse.vigilance),
          cibles: avis.analyse.cibles.filter((c) => c.profil.trim())
        }
      });
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
        const { error } = await supabase.storage
          .from('biens')
          .upload(chemin, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        const res = await ajouterPhoto(bienId, chemin);
        if (!res.ok) throw new Error(res.error);
        const { data } = await supabase.storage.from('biens').createSignedUrl(chemin, 3600);
        setPhotos((p) => [...p, { id: res.id, url: data?.signedUrl ?? null }]);
        setAvis((a) =>
          !a.photos.couverture
            ? { ...a, photos: { ...a.photos, couverture: res.id } }
            : a.photos.bien.length < 4
              ? {
                  ...a,
                  photos: { ...a.photos, bien: [...a.photos.bien, res.id] }
                }
              : a
        );
      }
      toast.success('Photos ajoutées');
    } catch (e) {
      console.error(e);
      toast.error(
        'Une photo n’a pas pu être envoyée. Formats acceptés : JPEG, PNG, HEIC (iPhone).'
      );
    } finally {
      setEnvoi(false);
    }
  };

  const [retouche, setRetouche] = useState<string | null>(null);
  const ameliorer = async (photo: PhotoEditeur) => {
    if (!photo.url) return;
    setRetouche(photo.id);
    const supabase = createClient();
    try {
      const blob = await ameliorerPhoto(photo.url);
      const chemin = `${ownerId}/${bienId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from('biens')
        .upload(chemin, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const res = await ajouterPhoto(bienId, chemin);
      if (!res.ok) throw new Error(res.error);
      const { data } = await supabase.storage.from('biens').createSignedUrl(chemin, 3600);
      setPhotos((p) => {
        const i = p.findIndex((x) => x.id === photo.id);
        const copie = [...p];
        copie.splice(i + 1, 0, { id: res.id, url: data?.signedUrl ?? null });
        return copie;
      });
      // La version retouchée remplace l'originale dans le dossier ; l'originale reste disponible.
      setAvis((a) => ({
        ...a,
        photos: {
          couverture: a.photos.couverture === photo.id ? res.id : a.photos.couverture,
          bien: a.photos.bien.map((x) => (x === photo.id ? res.id : x))
        }
      }));
      toast.success('Photo améliorée ajoutée : l’originale est conservée.');
    } catch (e) {
      console.error(e);
      toast.error('La photo n’a pas pu être retouchée.');
    } finally {
      setRetouche(null);
    }
  };

  const [syntheseEnCours, setSyntheseEnCours] = useState(false);
  const redigerAnalyse = async () => {
    const plein =
      avis.analyse.pointsForts.length ||
      avis.analyse.vigilance.length ||
      avis.analyse.cibles.length;
    if (
      plein &&
      !window.confirm(
        'Remplacer les points forts, points de vigilance et la cible acquéreur actuels ?'
      )
    )
      return;
    setSyntheseEnCours(true);
    try {
      const res = await redigerSynthese(bienId);
      if (!res.ok) return toast.error(res.error);
      setAvis((a) => ({ ...a, analyse: res.synthese }));
      toast.success('Synthèse rédigée : relisez-la avant d’enregistrer.');
    } finally {
      setSyntheseEnCours(false);
    }
  };
  const lignes = (v: string) =>
    v
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);

  const retirerPhoto = async (id: string) => {
    const res = await supprimerPhoto(id);
    if (!res.ok) return toast.error(res.error);
    setPhotos((p) => p.filter((x) => x.id !== id));
    setAvis((a) => ({
      ...a,
      photos: {
        couverture: a.photos.couverture === id ? null : a.photos.couverture,
        bien: a.photos.bien.filter((x) => x !== id)
      }
    }));
  };

  const basculerPhotoBien = (id: string) =>
    setAvis((a) => {
      const dedans = a.photos.bien.includes(id);
      if (!dedans && a.photos.bien.length >= 4) {
        toast.info('4 photos au maximum dans la page « Votre bien ».');
        return a;
      }
      return {
        ...a,
        photos: {
          ...a.photos,
          bien: dedans ? a.photos.bien.filter((x) => x !== id) : [...a.photos.bien, id]
        }
      };
    });

  const basculerComparable = (cle: string) =>
    setAvis((a) => {
      const dedans = a.comparables.includes(cle);
      if (!dedans && a.comparables.length >= MAX_COMPARABLES_AVIS) {
        toast.info(`${MAX_COMPARABLES_AVIS} ventes au maximum dans le dossier.`);
        return a;
      }
      return {
        ...a,
        comparables: dedans ? a.comparables.filter((x) => x !== cle) : [...a.comparables, cle]
      };
    });

  return (
    <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'>
      <div className='flex min-w-0 flex-col gap-5'>
        <Bloc
          titre='Prix présentés au client'
          aide='Fourchette arrondie et prix de présentation : ce sont les chiffres qui figureront en page « Notre estimation ».'
        >
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            <Champ id='a-basse' label='Fourchette basse (€)'>
              <Input
                id='a-basse'
                inputMode='numeric'
                className='tabular-nums'
                value={avis.prix.basse}
                onChange={(e) => majPrix('basse', e.target.value)}
              />
            </Champ>
            <Champ id='a-haute' label='Fourchette haute (€)'>
              <Input
                id='a-haute'
                inputMode='numeric'
                className='tabular-nums'
                value={avis.prix.haute}
                onChange={(e) => majPrix('haute', e.target.value)}
              />
            </Champ>
            <Champ
              id='a-conseille'
              label='Prix de présentation, honoraires inclus (€)'
              className='col-span-2 sm:col-span-1'
            >
              <Input
                id='a-conseille'
                inputMode='numeric'
                className='tabular-nums'
                value={avis.prix.conseille}
                onChange={(e) => majPrix('conseille', e.target.value)}
              />
            </Champ>
          </div>
          <p className='text-muted-foreground mt-3 text-xs tabular-nums'>
            Estimation DVF : {eur(suggestion.basse)} à {eur(suggestion.haute)}, prix conseillé{' '}
            {eur(suggestion.conseille)}. Honoraires{' '}
            {(avis.prix.tauxHonoraires * 100).toLocaleString('fr-FR')} % : {eur(honoraires)} · net
            vendeur{' '}
            <span className='text-foreground font-semibold'>
              {eur(avis.prix.conseille - honoraires)}
            </span>
            .
          </p>
        </Bloc>

        <Bloc
          titre='Textes du dossier'
          aide='« Notre regard sur votre bien » (page « Le prix de marché ») reprend l’argumentaire de l’estimation : relisez-le avant envoi.'
        >
          <div className='space-y-3'>
            <Champ id='a-bien' label='Notre regard sur votre bien'>
              <Textarea
                id='a-bien'
                rows={6}
                value={avis.textes.bien}
                onChange={(e) => majObj('textes', 'bien', e.target.value)}
              />
            </Champ>
            <Champ
              id='a-conclu'
              label='Message de conclusion (dernière page « Notre avis de valeur »)'
            >
              <Textarea
                id='a-conclu'
                rows={3}
                value={avis.textes.conclusion}
                onChange={(e) => majObj('textes', 'conclusion', e.target.value)}
              />
            </Champ>
          </div>
        </Bloc>

        <Bloc
          titre='Votre bien : points forts, vigilance et cible'
          aide='Page « Votre bien » (points forts et points de vigilance) et page « Cible acquéreur et financement ». Une ligne par élément.'
        >
          <div className='mb-3 flex justify-end'>
            <Button size='sm' onClick={redigerAnalyse} disabled={syntheseEnCours}>
              {syntheseEnCours ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
              {syntheseEnCours ? 'Rédaction…' : 'Rédiger avec l’IA'}
            </Button>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Champ id='an-forts' label='Points forts'>
              <Textarea
                id='an-forts'
                rows={6}
                value={avis.analyse.pointsForts.join('\n')}
                onChange={(e) =>
                  setAvis((a) => ({
                    ...a,
                    analyse: { ...a.analyse, pointsForts: e.target.value.split('\n') }
                  }))
                }
                onBlur={(e) =>
                  setAvis((a) => ({
                    ...a,
                    analyse: { ...a.analyse, pointsForts: lignes(e.target.value) }
                  }))
                }
              />
            </Champ>
            <Champ id='an-vigilance' label='Points de vigilance'>
              <Textarea
                id='an-vigilance'
                rows={6}
                value={avis.analyse.vigilance.join('\n')}
                onChange={(e) =>
                  setAvis((a) => ({
                    ...a,
                    analyse: { ...a.analyse, vigilance: e.target.value.split('\n') }
                  }))
                }
                onBlur={(e) =>
                  setAvis((a) => ({
                    ...a,
                    analyse: { ...a.analyse, vigilance: lignes(e.target.value) }
                  }))
                }
              />
            </Champ>
          </div>
          <p className='text-muted-foreground mt-4 mb-1.5 text-xs'>
            Cible acquéreur (profil et raison)
          </p>
          <div className='space-y-2'>
            {avis.analyse.cibles.map((c, i) => (
              <div key={i} className='flex gap-2'>
                <Input
                  aria-label={`Profil ${i + 1}`}
                  className='w-44 shrink-0'
                  list='profils-acquereur'
                  value={c.profil}
                  onChange={(e) =>
                    setAvis((a) => ({
                      ...a,
                      analyse: {
                        ...a.analyse,
                        cibles: a.analyse.cibles.map((x, j) =>
                          j === i ? { ...x, profil: e.target.value } : x
                        )
                      }
                    }))
                  }
                />
                <Input
                  aria-label={`Raison ${i + 1}`}
                  value={c.raison}
                  onChange={(e) =>
                    setAvis((a) => ({
                      ...a,
                      analyse: {
                        ...a.analyse,
                        cibles: a.analyse.cibles.map((x, j) =>
                          j === i ? { ...x, raison: e.target.value } : x
                        )
                      }
                    }))
                  }
                />
                <Button
                  size='icon'
                  variant='ghost'
                  aria-label={`Retirer le profil ${i + 1}`}
                  onClick={() =>
                    setAvis((a) => ({
                      ...a,
                      analyse: { ...a.analyse, cibles: a.analyse.cibles.filter((_, j) => j !== i) }
                    }))
                  }
                >
                  <Icons.trash />
                </Button>
              </div>
            ))}
            <datalist id='profils-acquereur'>
              {PROFILS_ACQUEREUR.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </datalist>
            <Button
              size='sm'
              variant='outline'
              disabled={avis.analyse.cibles.length >= 4}
              onClick={() =>
                setAvis((a) => ({
                  ...a,
                  analyse: {
                    ...a.analyse,
                    cibles: [...a.analyse.cibles, { profil: '', raison: '' }]
                  }
                }))
              }
            >
              <Icons.add /> Ajouter un profil
            </Button>
          </div>
        </Bloc>

        <Bloc
          titre='Votre annonce (projet)'
          aide='Avant-dernière page du dossier : le vendeur découvre son bien tel qu’il sera présenté aux acquéreurs. Prix et mentions légales sont ajoutés automatiquement.'
        >
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-muted-foreground text-xs'>Ton</span>
            {TONS_ANNONCE.map(([t, l]) => (
              <Button
                key={t}
                size='sm'
                variant={avis.annonce.ton === t ? 'secondary' : 'outline'}
                onClick={() => majAnnonce('ton', t)}
                disabled={redaction}
              >
                {l}
              </Button>
            ))}
            <Button size='sm' onClick={() => rediger(avis.annonce.ton)} disabled={redaction}>
              {redaction ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
              {redaction
                ? 'Rédaction…'
                : avis.annonce.texte.trim()
                  ? 'Réécrire avec l’IA'
                  : 'Rédiger avec l’IA'}
            </Button>
            <Button size='sm' variant='ghost' onClick={copierAnnonce} className='sm:ml-auto'>
              <Icons.copy /> Copier l’annonce
            </Button>
          </div>

          <div className='mt-4 space-y-3'>
            <Champ id='an-titre' label='Titre'>
              <Input
                id='an-titre'
                value={avis.annonce.titre}
                onChange={(e) => majAnnonce('titre', e.target.value)}
              />
              <p
                className={cn(
                  'text-xs tabular-nums',
                  longueurTitre > TITRE_ANNONCE_MAX ? 'text-crit' : 'text-muted-foreground'
                )}
              >
                {longueurTitre} / {TITRE_ANNONCE_MAX} caractères
                {longueurTitre > TITRE_ANNONCE_MAX ? ' : trop long pour les portails' : ''}
              </p>
            </Champ>
            <Champ id='an-texte' label='Texte de l’annonce'>
              <Textarea
                id='an-texte'
                rows={11}
                value={avis.annonce.texte}
                onChange={(e) => majAnnonce('texte', e.target.value)}
              />
              <p className='text-muted-foreground text-xs tabular-nums'>
                {avis.annonce.texte.length.toLocaleString('fr-FR')} caractères · conseillé : 900 à 1
                400
              </p>
            </Champ>
            <div>
              <p className='text-muted-foreground mb-1.5 text-xs'>Points forts (5 au plus)</p>
              <div className='grid gap-2 sm:grid-cols-2'>
                {Array.from({ length: 5 }, (_, i) => (
                  <Input
                    key={i}
                    aria-label={`Point fort ${i + 1}`}
                    placeholder={`Point fort ${i + 1}`}
                    value={avis.annonce.pointsForts[i] ?? ''}
                    onChange={(e) => majPointFort(i, e.target.value)}
                  />
                ))}
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <p className='text-muted-foreground text-xs'>Honoraires</p>
                <div className='flex gap-2'>
                  {(
                    [
                      ['vendeur', 'Charge vendeur'],
                      ['acquereur', 'Charge acquéreur']
                    ] as const
                  ).map(([k, l]) => (
                    <Button
                      key={k}
                      size='sm'
                      variant={avis.annonce.honoraires === k ? 'secondary' : 'outline'}
                      onClick={() => majAnnonce('honoraires', k)}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
              <Champ id='an-energie' label='Dépenses annuelles d’énergie (DPE)'>
                <Input
                  id='an-energie'
                  placeholder='entre 1 870 € et 2 570 € par an (prix 2021)'
                  value={avis.annonce.depensesEnergie}
                  onChange={(e) => majAnnonce('depensesEnergie', e.target.value)}
                />
              </Champ>
            </div>
            <div className='bg-muted/50 rounded-xl p-3'>
              <p className='text-muted-foreground mb-1 text-xs font-medium'>
                Mentions légales ajoutées à l’annonce
              </p>
              <ul className='text-muted-foreground space-y-0.5 text-xs'>
                {mentions.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              {infos.dpe && !avis.annonce.depensesEnergie.trim() && (
                <p className='text-cuivre mt-2 text-xs'>
                  Le montant des dépenses d’énergie est obligatoire dans une annonce publiée :
                  reprenez la fourchette indiquée sur le DPE.
                </p>
              )}
            </div>
          </div>
        </Bloc>

        <Bloc
          titre='Les prochaines étapes'
          aide='Frise en tête de la page « Votre accompagnement », au-dessus des 7 engagements de l’agence.'
        >
          <ol className='space-y-3'>
            {avis.etapes.map((e, i) => (
              <li key={i} className='grid grid-cols-[auto_minmax(0,1fr)] gap-3'>
                <span className='bg-cuivre/15 text-cuivre mt-1 flex size-7 items-center justify-center rounded-full font-mono text-xs font-semibold'>
                  {i + 1}
                </span>
                <div className='space-y-2'>
                  <div className='flex gap-2'>
                    <Input
                      aria-label={`Étape ${i + 1} : titre`}
                      value={e.titre}
                      onChange={(ev) => majEtape(i, 'titre', ev.target.value)}
                      className='font-medium'
                    />
                    <Input
                      aria-label={`Étape ${i + 1} : délai`}
                      value={e.delai}
                      onChange={(ev) => majEtape(i, 'delai', ev.target.value)}
                      className='w-40 shrink-0'
                    />
                    <Button
                      size='icon'
                      variant='ghost'
                      aria-label={`Retirer l’étape ${i + 1}`}
                      onClick={() =>
                        setAvis((a) => ({
                          ...a,
                          etapes: a.etapes.filter((_, j) => j !== i)
                        }))
                      }
                    >
                      <Icons.trash />
                    </Button>
                  </div>
                  <Textarea
                    aria-label={`Étape ${i + 1} : description`}
                    rows={2}
                    value={e.texte}
                    onChange={(ev) => majEtape(i, 'texte', ev.target.value)}
                  />
                </div>
              </li>
            ))}
          </ol>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={avis.etapes.length >= MAX_ETAPES}
              onClick={() =>
                setAvis((a) => ({
                  ...a,
                  etapes: [...a.etapes, { titre: '', delai: '', texte: '' }]
                }))
              }
            >
              <Icons.add /> Ajouter une étape
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setAvis((a) => ({ ...a, etapes: ETAPES_DEFAUT }))}
            >
              Rétablir les étapes par défaut
            </Button>
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
                      <td className='py-1.5 pr-2 text-right font-mono'>
                        {Math.round(c.prixM2).toLocaleString('fr-FR')}
                      </td>
                      <td className='py-1.5 text-right'>
                        {c.distanceKm === null ? '—' : `${c.distanceKm.toLocaleString('fr-FR')} km`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Bloc>

        <Bloc
          titre='Photos'
          aide='La photo marquée « Couverture » ouvre le dossier ; jusqu’à 4 autres illustrent la page « Votre bien ».'
        >
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {photos.map((p) => {
              const couverture = avis.photos.couverture === p.id;
              const dansBien = avis.photos.bien.includes(p.id);
              return (
                <figure
                  key={p.id}
                  className={cn(
                    'bg-muted overflow-hidden rounded-xl border',
                    couverture && 'ring-cuivre ring-2'
                  )}
                >
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
                          photos: {
                            couverture: p.id,
                            bien: a.photos.bien.filter((x) => x !== p.id)
                          }
                        }))
                      }
                    >
                      Couverture
                    </Button>
                    <Button
                      size='xs'
                      variant={dansBien ? 'secondary' : 'outline'}
                      disabled={couverture}
                      onClick={() => basculerPhotoBien(p.id)}
                    >
                      {dansBien ? 'Dans le dossier' : 'Ajouter'}
                    </Button>
                    <Button
                      size='xs'
                      variant='ghost'
                      disabled={!p.url || retouche !== null}
                      onClick={() => ameliorer(p)}
                      title='Lumière, contraste et couleurs, sans modifier le contenu de la photo'
                    >
                      {retouche === p.id ? (
                        <Icons.spinner className='animate-spin' />
                      ) : (
                        <Icons.sparkles />
                      )}
                      Améliorer
                    </Button>
                    <Button
                      size='icon-xs'
                      variant='ghost'
                      aria-label='Supprimer la photo'
                      onClick={() => retirerPhoto(p.id)}
                    >
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
              {envoi ? (
                <Icons.spinner className='size-5 animate-spin' />
              ) : (
                <Icons.upload className='size-5' />
              )}
              {envoi ? 'Envoi…' : 'Ajouter des photos'}
            </label>
            <input
              id='a-photos'
              type='file'
              accept='image/*'
              multiple
              className='sr-only'
              disabled={envoi}
              onChange={(e) => televerser(e.target.files)}
            />
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
          <Button
            className='h-10 w-full font-semibold'
            disabled={saving}
            onClick={() => enregistrer(true)}
          >
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
          <Button
            variant='outline'
            className='w-full'
            disabled={saving}
            onClick={() => enregistrer(false)}
          >
            Enregistrer sans générer
          </Button>
          <p className='text-muted-foreground text-xs'>
            La génération prend 10 à 20 secondes : cartes, ventes du secteur et photos sont
            assemblées à la volée.
          </p>
        </div>

        <Bloc titre='Pages du dossier'>
          <ul className='space-y-2.5'>
            {PAGES_AVIS.map(([k, l]) => (
              <li key={k} className='flex items-center justify-between gap-3'>
                <Label htmlFor={`p-${k}`} className='text-sm font-normal'>
                  {l}
                </Label>
                <Switch
                  id={`p-${k}`}
                  checked={avis.pages[k]}
                  onCheckedChange={(v) => maj('pages', { ...avis.pages, [k]: v })}
                />
              </li>
            ))}
          </ul>
          <p className='text-muted-foreground mt-3 text-xs'>
            Couverture, sommaire, introduction et estimation sont toujours inclus. Annonce, étapes
            et méthode viennent après l’estimation.
          </p>
        </Bloc>

        <Bloc titre='Destinataire'>
          <div className='grid grid-cols-3 gap-3'>
            <Champ id='d-civ' label='Civilité'>
              <Input
                id='d-civ'
                value={avis.destinataire.civilite}
                onChange={(e) => majObj('destinataire', 'civilite', e.target.value)}
              />
            </Champ>
            <Champ id='d-prenom' label='Prénom'>
              <Input
                id='d-prenom'
                value={avis.destinataire.prenom}
                onChange={(e) => majObj('destinataire', 'prenom', e.target.value)}
              />
            </Champ>
            <Champ id='d-nom' label='Nom'>
              <Input
                id='d-nom'
                value={avis.destinataire.nom}
                onChange={(e) => majObj('destinataire', 'nom', e.target.value)}
              />
            </Champ>
            <Champ id='d-date' label='Date de l’avis' className='col-span-3'>
              <Input
                id='d-date'
                type='date'
                value={avis.dateAvis}
                onChange={(e) => maj('dateAvis', e.target.value)}
              />
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
                <Input
                  id={`c-${k}`}
                  value={avis.conseiller[k]}
                  onChange={(e) => majObj('conseiller', k, e.target.value)}
                />
              </Champ>
            ))}
            <Champ
              id='c-accroche'
              label='Présentation (couverture, sous la photo)'
              className='col-span-2'
            >
              <Textarea
                id='c-accroche'
                rows={2}
                value={avis.conseiller.accroche}
                onChange={(e) => majObj('conseiller', 'accroche', e.target.value)}
              />
            </Champ>
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
                ['horaires', 'Horaires', 'col-span-2'],
                ['portails', 'Nombre de portails', ''],
                ['reseauxSociaux', 'Réseaux sociaux', ''],
                ['arbres', 'Engagement environnemental (modalités exactes)', 'col-span-2'],
                [
                  'avisClients',
                  'Avis clients (ex. « 4,8/5 sur 120 avis Google »), vide = masqué',
                  'col-span-2'
                ]
              ] as const
            ).map(([k, l, cls]) => (
              <Champ key={k} id={`g-${k}`} label={l} className={cls}>
                <Input
                  id={`g-${k}`}
                  value={avis.agence[k]}
                  onChange={(e) => majObj('agence', k, e.target.value)}
                />
              </Champ>
            ))}
            <Champ id='g-mentions' label='Mentions légales' className='col-span-2'>
              <Textarea
                id='g-mentions'
                rows={4}
                value={avis.agence.mentions}
                onChange={(e) => majObj('agence', 'mentions', e.target.value)}
              />
            </Champ>
          </div>
        </Bloc>
      </aside>
    </div>
  );
}
