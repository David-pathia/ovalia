'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { Panel } from '@/features/today/components/panel';
import { cn } from '@/lib/utils';
import { TONS_LINKEDIN, type IdeePost, type TonLinkedin } from '@/lib/ai/linkedin-tons';
import { envoyerVersTypefully, genererIdees, rediger } from '../actions';

const MAX = 3000;
// Au-delà, LinkedIn coupe le texte derrière « … voir plus ».
const APERCU = 210;

export type PostAModifier = {
  id: number;
  texte: string;
  premierCommentaire: string;
  programmeLe: string | null;
};

type Quand = 'brouillon' | 'prochain' | 'date' | 'maintenant';

/** Valeur pour <input type='datetime-local'> à l'heure de Paris. */
function versChampDate(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Idées (IA) → rédaction (IA ou à la main) → envoi dans Typefully (brouillon, programmation ou
 * publication immédiate). Avec aModifier : modification d'un brouillon ou d'un post programmé.
 */
export function Atelier({
  typefullyPret,
  iaPrete,
  aModifier
}: {
  typefullyPret: boolean;
  iaPrete: boolean;
  aModifier?: PostAModifier | null;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState('');
  const [idees, setIdees] = useState<IdeePost[]>([]);
  const [sujet, setSujet] = useState('');
  const [ton, setTon] = useState<TonLinkedin>('proche');
  const [texte, setTexte] = useState(aModifier?.texte ?? '');
  const [commentaire, setCommentaire] = useState(aModifier?.premierCommentaire ?? '');
  const [quand, setQuand] = useState<Quand>(aModifier?.programmeLe ? 'date' : 'brouillon');
  const [date, setDate] = useState(
    aModifier?.programmeLe ? versChampDate(aModifier.programmeLe) : ''
  );
  const [chercheIdees, demarrerIdees] = useTransition();
  const [redige, demarrerRedaction] = useTransition();
  const [envoie, demarrerEnvoi] = useTransition();

  function idees_() {
    demarrerIdees(async () => {
      const r = await genererIdees(theme);
      if (!r.ok) return void toast.error(r.error);
      setIdees(r.idees);
    });
  }

  function redigerSujet(s = sujet) {
    demarrerRedaction(async () => {
      const r = await rediger(s, ton);
      if (!r.ok) return void toast.error(r.error);
      setTexte(r.texte);
      toast.success('Post rédigé : relisez-le et modifiez-le à votre goût.');
    });
  }

  function envoyer() {
    let cible: string = quand;
    if (quand === 'date') {
      if (!date) return void toast.error('Choisissez la date et l’heure de publication.');
      cible = new Date(date).toISOString(); // heure locale du navigateur → ISO avec fuseau
    }
    if (
      quand === 'maintenant' &&
      !confirm('Publier ce post sur LinkedIn maintenant ? Il sera visible par votre réseau.')
    )
      return;
    demarrerEnvoi(async () => {
      const r = await envoyerVersTypefully(texte, cible, commentaire, aModifier?.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success(
        quand === 'maintenant'
          ? 'Publication lancée : le post apparaît sur LinkedIn d’ici une minute.'
          : quand === 'brouillon'
            ? aModifier
              ? 'Modifications enregistrées dans Typefully.'
              : 'Brouillon envoyé dans Typefully. Rien n’est publié.'
            : 'Post programmé dans Typefully.'
      );
      setTexte('');
      setCommentaire('');
      setSujet('');
      if (aModifier) router.replace('/dashboard/linkedin');
      router.refresh();
    });
  }

  const libelleEnvoi =
    quand === 'maintenant'
      ? 'Publier maintenant'
      : quand === 'brouillon'
        ? aModifier
          ? 'Enregistrer'
          : 'Envoyer en brouillon'
        : 'Programmer';

  return (
    <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
      <Panel title='Idées de posts' icon={Icons.sparkles} ia>
        <div className='flex gap-2'>
          <Input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder='Thème (facultatif) : DPE, printemps, primo-accédants…'
            aria-label='Thème des idées'
          />
          <Button onClick={idees_} disabled={!iaPrete || chercheIdees}>
            {chercheIdees ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
            Proposer
          </Button>
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          L’IA s’appuie sur vos biens récents (type, commune, surface), jamais sur les noms ou les
          adresses.
        </p>
        <ul className='mt-3 grid gap-2'>
          {idees.map((idee, i) => (
            <li key={i}>
              <button
                type='button'
                onClick={() => {
                  const s = `${idee.titre}. ${idee.angle}`;
                  setSujet(s);
                  redigerSujet(s);
                }}
                disabled={redige}
                className='hover:bg-muted/60 w-full rounded-xl border p-3 text-left transition-colors'
              >
                <span className='text-cuivre text-[11px] font-semibold tracking-wide uppercase'>
                  {idee.categorie}
                </span>
                <span className='mt-0.5 block text-sm font-semibold'>{idee.titre}</span>
                <span className='text-muted-foreground mt-0.5 block text-xs'>{idee.angle}</span>
              </button>
            </li>
          ))}
        </ul>
        {idees.length > 0 && (
          <p className='text-muted-foreground mt-2 text-xs'>
            Cliquez sur une idée pour que l’IA rédige le post.
          </p>
        )}
      </Panel>

      <Panel title={aModifier ? 'Modifier le post' : 'Rédiger un post'} icon={Icons.edit}>
        <div id='atelier' className='grid gap-3'>
          {aModifier && (
            <p className='bg-secondary flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs'>
              Vous modifiez un post déjà enregistré dans Typefully.
              <Button
                size='xs'
                variant='ghost'
                onClick={() => router.replace('/dashboard/linkedin')}
              >
                Annuler
              </Button>
            </p>
          )}
          <div className='grid gap-2 sm:grid-cols-[1fr_auto_auto]'>
            <Input
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              placeholder='Sujet : « 3 conseils avant de mettre en vente »'
              aria-label='Sujet du post'
            />
            <NativeSelect
              value={ton}
              onChange={(e) => setTon(e.target.value as TonLinkedin)}
              aria-label='Ton'
            >
              {Object.entries(TONS_LINKEDIN).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
            <Button
              variant='outline'
              onClick={() => redigerSujet()}
              disabled={!iaPrete || redige || sujet.trim().length < 3}
            >
              {redige ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
              Rédiger avec l’IA
            </Button>
          </div>

          <div>
            <Textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={14}
              maxLength={MAX}
              placeholder='Écrivez votre post ici, ou laissez l’IA le rédiger à partir du sujet.'
              aria-label='Texte du post'
            />
            <p className='text-muted-foreground mt-1 flex justify-between text-xs tabular-nums'>
              <span>
                {texte.length > APERCU
                  ? 'Les 2-3 premières lignes s’affichent avant « voir plus » : soignez-les.'
                  : ' '}
              </span>
              <span className={cn(texte.length > MAX - 100 && 'text-warn')}>
                {texte.length} / {MAX}
              </span>
            </p>
          </div>

          <div>
            <Label htmlFor='commentaire' className='mb-1.5 text-xs'>
              Premier commentaire (facultatif : un lien vers une annonce, par exemple)
            </Label>
            <Input
              id='commentaire'
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              maxLength={1250}
            />
          </div>

          <div className='flex flex-wrap items-end gap-2'>
            <div>
              <Label htmlFor='quand' className='mb-1.5 text-xs'>
                Envoyer dans Typefully
              </Label>
              <NativeSelect
                id='quand'
                value={quand}
                onChange={(e) => setQuand(e.target.value as typeof quand)}
              >
                <option value='brouillon'>
                  {aModifier
                    ? 'Enregistrer sans rien changer d’autre'
                    : 'En brouillon (rien n’est publié)'}
                </option>
                <option value='prochain'>Au prochain créneau de ma file</option>
                <option value='date'>À une date précise</option>
                <option value='maintenant'>Publier maintenant</option>
              </NativeSelect>
            </div>
            {quand === 'date' && (
              <Input
                type='datetime-local'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className='w-auto'
                aria-label='Date de publication'
              />
            )}
            <Button onClick={envoyer} disabled={!typefullyPret || envoie || !texte.trim()}>
              {envoie ? <Icons.spinner className='animate-spin' /> : <Icons.send />}
              {libelleEnvoi}
            </Button>
            <Button
              variant='ghost'
              disabled={!texte.trim()}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(texte);
                  toast.success('Texte copié.');
                } catch {
                  toast.error('Copie impossible : sélectionnez le texte à la main.');
                }
              }}
            >
              <Icons.copy /> Copier
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
