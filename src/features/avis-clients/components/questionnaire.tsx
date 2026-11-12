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

export function QuestionnaireAvis({
  jeton,
  prenom
}: {
  jeton: string | null;
  prenom: string | null;
}) {
  const [notes, setNotes] = useState<number[]>([0, 0, 0, 0, 0]);
  const [commentaire, setCommentaire] = useState('');
  const [publication, setPublication] = useState(false);
  const [nom, setNom] = useState('');
  const [piege, setPiege] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'merci'>('saisie');
  const [erreur, setErreur] = useState<string | null>(null);
  const complet = notes.every((n) => n > 0);

  const envoyer = async () => {
    if (!complet) return setErreur('Merci de noter chacune des 5 questions.');
    setErreur(null);
    setEtat('envoi');
    const res = await envoyerAvis({ jeton, notes, commentaire, publication, nom, piege });
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
          Merci{prenom ? ` ${prenom}` : ''} !
        </h2>
        <p className='text-foreground/80 mt-2'>
          Votre avis m’aide à progresser et à mieux accompagner chaque projet.
        </p>
        <p className='text-bleu mt-4 font-semibold'>Julien Ossedat</p>
      </div>
    );
  }

  return (
    <form
      className='space-y-6'
      onSubmit={(e) => {
        e.preventDefault();
        void envoyer();
      }}
    >
      {QUESTIONS_AVIS.map((q, i) => (
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

      <div>
        <label htmlFor='avis-commentaire' className='text-marine font-medium'>
          Un commentaire ? <span className='text-muted-foreground font-normal'>(facultatif)</span>
        </label>
        <textarea
          id='avis-commentaire'
          rows={4}
          maxLength={2000}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          className='border-input focus:ring-ring mt-2 w-full rounded-xl border bg-white p-3 outline-none focus:ring-2'
        />
      </div>

      <div className='bg-pale space-y-3 rounded-2xl p-5'>
        <label className='flex cursor-pointer gap-3'>
          <input
            type='checkbox'
            checked={publication}
            onChange={(e) => setPublication(e.target.checked)}
            className='accent-bleu mt-1 size-5 shrink-0'
          />
          <span className='text-sm'>
            J’accepte que mon avis et mon commentaire soient publiés comme témoignage sur le site de
            Julien Ossedat. Aucune publication n’a lieu sans cette autorisation.
          </span>
        </label>
        {publication && (
          <div>
            <label htmlFor='avis-nom' className='text-sm font-medium'>
              Signature affichée{' '}
              <span className='text-muted-foreground font-normal'>
                (par exemple : Marie, Mably)
              </span>
            </label>
            <input
              id='avis-nom'
              value={nom}
              maxLength={80}
              onChange={(e) => setNom(e.target.value)}
              className='border-input focus:ring-ring mt-1 w-full rounded-xl border bg-white p-3 outline-none focus:ring-2'
            />
          </div>
        )}
      </div>

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
      <button
        type='submit'
        disabled={etat === 'envoi'}
        className={cn(
          'bg-bleu w-full rounded-xl px-5 py-4 text-lg font-semibold text-white shadow-sm',
          (!complet || etat === 'envoi') && 'opacity-60'
        )}
      >
        {etat === 'envoi' ? 'Envoi…' : 'Envoyer mon avis'}
      </button>
      <p className='text-muted-foreground text-xs'>
        Vos réponses sont conservées par Julien Ossedat (Laforêt Roanne) pour améliorer la qualité
        de son accompagnement. Vous pouvez en demander la suppression à roanne@laforet.com.
      </p>
    </form>
  );
}
