'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { Section } from '@/features/biens/components/fiche-fields';
import type { BienValues, PieceInput } from '@/features/biens/fields';
import { cn } from '@/lib/utils';
import { lireDictee } from '../actions';
import { appliquer, propositions, type Proposition } from '../propositions';
import { BoutonDictee } from './bouton-dictee';

/**
 * « Dicter des informations » sur la fiche d'un bien : dictée → transcription → l'IA range chaque
 * information dans le bon champ → le conseiller coche ce qu'il garde → la fiche est complétée
 * (il reste à cliquer sur Enregistrer, comme pour une saisie à la main).
 */
export function DicteeFiche({
  valeurs,
  pieces,
  onAppliquer
}: {
  valeurs: BienValues;
  pieces: PieceInput[];
  onAppliquer: (bien: BienValues, pieces: PieceInput[]) => void;
}) {
  const [dictee, setDictee] = useState('');
  const [props, setProps] = useState<Proposition[] | null>(null);
  const [retenues, setRetenues] = useState<Set<string>>(new Set());
  const [remarques, setRemarques] = useState<string[]>([]);
  const [lecture, demarrer] = useTransition();

  function lire(texte: string) {
    demarrer(async () => {
      const r = await lireDictee(texte, valeurs);
      if (!r.ok) return void toast.error(r.error);
      const liste = propositions(valeurs, pieces, {
        bien: r.data.bien as Record<string, unknown>,
        pieces: r.data.pieces
      });
      setProps(liste);
      setRetenues(new Set(liste.map((p) => p.id)));
      setRemarques(r.data.remarques);
      if (!liste.length) toast.info('Rien de nouveau à ajouter à la fiche dans cette dictée.');
    });
  }

  function recevoir(texte: string) {
    const complet = dictee.trim() ? `${dictee.trim()}\n${texte}` : texte;
    setDictee(complet);
    lire(complet);
  }

  function annuler() {
    setDictee('');
    setProps(null);
    setRemarques([]);
  }

  function valider() {
    if (!props) return;
    const choix = props.filter((p) => retenues.has(p.id));
    const r = appliquer(valeurs, pieces, choix);
    onAppliquer(r.bien, r.pieces);
    toast.success(
      `${choix.length} information${choix.length > 1 ? 's' : ''} ajoutée${choix.length > 1 ? 's' : ''} à la fiche : vérifiez puis enregistrez.`
    );
    annuler();
  }

  const basculer = (id: string) =>
    setRetenues((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Section
      title='Dicter des informations'
      className='border-cuivre/30'
      aside={
        <BoutonDictee
          onTexte={recevoir}
          libelle={dictee ? 'Dicter la suite' : 'Dicter'}
          disabled={lecture}
        />
      }
    >
      {!dictee ? (
        <p className='text-muted-foreground text-sm'>
          Appuyez sur « Dicter » et parlez librement : « chaudière gaz changée en 2019, combles
          isolés, fosse septique non conforme, taxe foncière 1 200 euros… ». Ovalia range chaque
          information dans le bon champ et vous montre ce qui change avant de toucher à la fiche.
          Évitez de dicter les noms et numéros des propriétaires.
        </p>
      ) : (
        <div className='grid gap-3'>
          <div>
            <p className='text-muted-foreground mb-1 text-xs'>
              Ce qu’Ovalia a entendu (vous pouvez corriger le texte puis relire) :
            </p>
            <Textarea value={dictee} onChange={(e) => setDictee(e.target.value)} rows={3} />
          </div>

          {lecture ? (
            <p className='text-muted-foreground flex items-center gap-2 text-sm'>
              <Icons.spinner className='size-4 animate-spin' /> Lecture de la dictée…
            </p>
          ) : (
            props &&
            props.length > 0 && (
              <div>
                <p className='mb-2 text-sm font-semibold'>Voici ce que j’ai compris :</p>
                <ul className='divide-y rounded-xl border'>
                  {props.map((p) => (
                    <li key={p.id}>
                      <label className='hover:bg-muted/50 flex cursor-pointer items-start gap-3 px-3 py-2 text-sm'>
                        <input
                          type='checkbox'
                          checked={retenues.has(p.id)}
                          onChange={() => basculer(p.id)}
                          className='accent-primary mt-1 size-4 shrink-0'
                        />
                        <span className='min-w-0 flex-1'>
                          <span className='text-muted-foreground block text-xs'>{p.libelle}</span>
                          <span className='block whitespace-pre-line'>
                            {p.remplace && (
                              <>
                                <span className='text-muted-foreground line-through'>
                                  {p.avant}
                                </span>
                                {' → '}
                              </>
                            )}
                            <span className={cn('font-medium', p.remplace && 'text-warn')}>
                              {p.apres}
                            </span>
                          </span>
                          {p.remplace && (
                            <span className='text-warn text-xs'>Remplace la valeur actuelle</span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {!lecture && remarques.length > 0 && (
            <div className='bg-secondary rounded-xl px-3 py-2 text-xs'>
              <p className='font-semibold'>Non rangé dans la fiche :</p>
              <ul className='mt-1 list-disc pl-4'>
                {remarques.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className='flex flex-wrap gap-2'>
            <Button
              onClick={valider}
              disabled={lecture || !props || retenues.size === 0}
              className='font-semibold'
            >
              <Icons.check /> Ajouter à la fiche{retenues.size ? ` (${retenues.size})` : ''}
            </Button>
            <Button variant='outline' onClick={() => lire(dictee)} disabled={lecture}>
              <Icons.sparkles /> Relire le texte
            </Button>
            <Button variant='ghost' onClick={annuler} disabled={lecture}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
