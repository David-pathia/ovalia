'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { envoyerAvis } from '../actions-public';
import { QUESTIONS_AVIS } from '../questions';

function Etoiles({
  valeur,
  onChange,
  libelle
}: {
  valeur: number;
  onChange: (n: number) => void;
  libelle: string;
}) {
  return (
    <div className='flex gap-1' role='radiogroup' aria-label={libelle}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type='button'
          role='radio'
          aria-checked={valeur === n}
          aria-label={`${n} étoile${n > 1 ? 's' : ''} sur 5`}
          onClick={() => onChange(n)}
          className={cn(
            'text-4xl leading-none transition-transform active:scale-90',
            n <= valeur ? 'text-ciel' : 'text-border'
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const CHAMP =
  'border-input focus:ring-ring mt-1 w-full rounded-xl border bg-white p-3 outline-none focus:ring-2';

/**
 * Trois étapes : 1. prénom et nom (obligatoires) ; 2. les 5 questions ; 3. commentaire, autorisation
 * de publication et envoi.
 */
export function QuestionnaireAvis({
  jeton,
  prenom: prenomInvitation
}: {
  jeton: string | null;
  prenom: string | null;
}) {
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [prenom, setPrenom] = useState(prenomInvitation ?? '');
  const [nom, setNom] = useState('');
  const [notes, setNotes] = useState<number[]>([0, 0, 0, 0, 0]);
  const [commentaire, setCommentaire] = useState('');
  const [publication, setPublication] = useState(false);
  const [piege, setPiege] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'merci'>('saisie');
  const [erreur, setErreur] = useState<string | null>(null);
  const identite = prenom.trim().length > 0 && nom.trim().length > 0;
  const complet = notes.every((n) => n > 0);
  const signature = identite ? `${prenom.trim()} ${nom.trim().charAt(0).toUpperCase()}.` : '';

  const aller = (e: 1 | 2 | 3) => {
    setErreur(null);
    setEtape(e);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const envoyer = async () => {
    if (!identite) return aller(1);
    if (!complet) return aller(2);
    setErreur(null);
    setEtat('envoi');
    const res = await envoyerAvis({ jeton, prenom, nom, notes, commentaire, publication, piege });
    if (res.ok) setEtat('merci');
    else {
      setEtat('saisie');
      setErreur(res.error);
    }
  };

  if (etat === 'merci') {
    return (
      <div className='bg-pale rounded-2xl p-8 text-center'>
        <Icons.circleCheck className='text-bleu mx-auto size-14' />
        <h2 className='font-display text-marine mt-3 text-2xl font-bold'>
          Merci {prenom.trim()} !
        </h2>
        <p className='text-foreground/80 mt-2'>
          Votre avis m’aide à progresser et à mieux accompagner chaque projet.
        </p>
        <p className='text-bleu mt-4 font-semibold'>Julien Ossedat</p>
      </div>
    );
  }

  const bouton = (actif: boolean) =>
    cn(
      'bg-bleu w-full rounded-xl px-5 py-4 text-lg font-semibold text-white shadow-sm',
      !actif && 'opacity-60'
    );

  return (
    <form
      className='space-y-6'
      onSubmit={(e) => {
        e.preventDefault();
        if (etape === 1) {
          if (!identite) return setErreur('Merci d’indiquer votre prénom et votre nom.');
          return aller(2);
        }
        if (etape === 2) {
          if (!complet) return setErreur('Merci de noter chacune des 5 questions.');
          return aller(3);
        }
        void envoyer();
      }}
    >
      <p className='text-bleu text-xs font-semibold tracking-[0.14em] uppercase'>
        Étape {etape} sur 3
      </p>

      {etape === 1 && (
        <fieldset className='border-border space-y-4 rounded-2xl border p-5'>
          <legend className='text-bleu px-1 text-xs font-semibold tracking-[0.14em] uppercase'>
            Vous
          </legend>
          <p className='text-marine font-medium'>
            Pour commencer, merci d’indiquer votre prénom et votre nom.
          </p>
          <div>
            <label htmlFor='avis-prenom' className='text-sm font-medium'>
              Prénom
            </label>
            <input
              id='avis-prenom'
              required
              autoComplete='given-name'
              maxLength={60}
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className={CHAMP}
            />
          </div>
          <div>
            <label htmlFor='avis-nom' className='text-sm font-medium'>
              Nom
            </label>
            <input
              id='avis-nom'
              required
              autoComplete='family-name'
              maxLength={80}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className={CHAMP}
            />
          </div>
        </fieldset>
      )}

      {etape === 2 &&
        QUESTIONS_AVIS.map((q, i) => (
          <fieldset key={q.cle} className='border-border rounded-2xl border p-5'>
            <legend className='text-bleu px-1 text-xs font-semibold tracking-[0.14em] uppercase'>
              {i + 1}. {q.critere}
            </legend>
            <p className='text-marine mb-3 font-medium'>{q.question}</p>
            <Etoiles
              valeur={notes[i]!}
              libelle={q.critere}
              onChange={(n) => setNotes((x) => x.map((v, j) => (j === i ? n : v)))}
            />
          </fieldset>
        ))}

      {etape === 3 && (
        <>
          <div>
            <label htmlFor='avis-commentaire' className='text-marine font-medium'>
              Pour finir, un commentaire ?{' '}
              <span className='text-muted-foreground font-normal'>(facultatif)</span>
            </label>
            <textarea
              id='avis-commentaire'
              rows={5}
              maxLength={2000}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder='Ce qui vous a plu, ce que je pourrais améliorer…'
              className={CHAMP}
            />
          </div>

          <div className='bg-pale rounded-2xl p-5'>
            <label className='flex cursor-pointer gap-3'>
              <input
                type='checkbox'
                checked={publication}
                onChange={(e) => setPublication(e.target.checked)}
                className='accent-bleu mt-1 size-5 shrink-0'
              />
              <span className='text-sm'>
                J’accepte que mon avis et mon commentaire soient publiés comme témoignage sur le
                site de Julien Ossedat, signés « {signature} » (prénom et initiale du nom). Aucune
                publication n’a lieu sans cette autorisation.
              </span>
            </label>
          </div>
        </>
      )}

      {/* Champ invisible anti-robots. */}
      <input
        type='text'
        tabIndex={-1}
        autoComplete='off'
        aria-hidden='true'
        value={piege}
        onChange={(e) => setPiege(e.target.value)}
        className='hidden'
      />

      {erreur && (
        <p role='alert' className='text-destructive font-medium'>
          {erreur}
        </p>
      )}

      {etape === 1 && (
        <button type='submit' className={bouton(identite)}>
          Commencer le questionnaire
        </button>
      )}
      {etape === 2 && (
        <button type='submit' className={bouton(complet)}>
          Continuer
        </button>
      )}
      {etape === 3 && (
        <button type='submit' disabled={etat === 'envoi'} className={bouton(etat !== 'envoi')}>
          {etat === 'envoi' ? 'Envoi…' : 'Envoyer mon avis'}
        </button>
      )}
      {etape > 1 && (
        <button
          type='button'
          onClick={() => aller(etape === 3 ? 2 : 1)}
          className='text-bleu w-full text-sm font-medium underline underline-offset-4'
        >
          Revenir à l’étape précédente
        </button>
      )}

      <p className='text-muted-foreground text-xs'>
        Vos réponses sont conservées par Julien Ossedat (Laforêt Roanne) pour améliorer la qualité
        de son accompagnement. Votre nom n’est jamais publié en entier. Vous pouvez demander la
        suppression de vos réponses à roanne@laforet.com.
      </p>
    </form>
  );
}
