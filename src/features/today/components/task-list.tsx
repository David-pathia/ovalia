'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { tasks, type TaskKind } from '../data';

const chip: Record<TaskKind, string> = {
  Appel: 'bg-ok/15 text-ok border-ok/30',
  Visite: 'bg-sauge/15 text-sauge border-sauge/30',
  Estimation: 'bg-cuivre/15 text-cuivre border-cuivre/35',
  Mandat: 'bg-foreground/10 text-foreground border-border',
  'Comm.': 'bg-sauge/15 text-sauge border-sauge/30'
};

export function TaskList() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs' aria-live='polite'>
        {done.size} / {tasks.length} faites
      </p>
      <ul className='divide-border divide-y'>
        {tasks.map((t) => {
          const isDone = done.has(t.id);
          return (
            <li key={t.id} className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:grid-cols-[auto_3.25rem_minmax(0,1fr)_auto]'>
              <input
                type='checkbox'
                id={`task-${t.id}`}
                checked={isDone}
                onChange={() => toggle(t.id)}
                className='accent-sauge size-4 cursor-pointer'
              />
              <span className='text-muted-foreground hidden font-mono text-xs sm:block'>{t.time}</span>
              <label htmlFor={`task-${t.id}`} className='min-w-0 cursor-pointer'>
                <span className={cn('block font-medium', isDone && 'line-through opacity-55')}>{t.title}</span>
                <span className='text-muted-foreground block truncate text-[12.5px]'>{t.detail}</span>
              </label>
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', chip[t.kind])}>
                {t.kind}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
