import { cn } from '@/lib/utils';

/** Symbole Forest Mind : montagne, sapin et chemin ascendant cuivré. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 34 34' aria-hidden='true' className={cn('size-8 shrink-0', className)}>
      <circle cx='17' cy='17' r='16' fill='#2F5D50' stroke='#A7B59F' strokeWidth='1' />
      <path d='M5 25 L13 13 L17 18 L21 11 L29 25 Z' fill='#0F2D23' />
      <path d='M21 11 L18 16 L24 16 Z M21 14 L17 20 L25 20 Z' fill='#A7B59F' />
      <path
        d='M9 27 C13 24 15 26 18 22 S23 19 25 15'
        fill='none'
        stroke='#C77F52'
        strokeWidth='1.6'
        strokeLinecap='round'
        strokeDasharray='2 2.4'
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className='grid leading-tight group-data-[collapsible=icon]:hidden'>
        <span className='font-display text-lg font-extrabold tracking-tight'>Ovalia</span>
        <span className='text-sauge text-[10px] font-semibold tracking-[0.16em] uppercase'>
          Forest Mind
        </span>
      </div>
    </div>
  );
}

/** Courbes topographiques décoratives (signature de la charte). */
export function TopoLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 1200 320'
      preserveAspectRatio='none'
      aria-hidden='true'
      className={cn('pointer-events-none', className)}
    >
      <g fill='none' stroke='#A7B59F' strokeWidth='1'>
        <path d='M0 60 C200 20 340 110 520 70 S860 10 1200 60' />
        <path d='M0 95 C210 55 330 150 540 105 S870 45 1200 98' />
        <path d='M0 130 C220 92 320 185 560 140 S880 82 1200 136' />
        <path d='M0 168 C230 130 330 220 580 176 S890 120 1200 174' />
        <path d='M0 206 C240 170 340 255 600 212 S900 160 1200 212' />
        <path d='M720 40 C780 20 860 30 880 60 S820 100 760 85 S690 55 720 40Z' />
        <path d='M745 50 C790 38 840 45 850 62 S815 82 775 75 S725 58 745 50Z' />
      </g>
    </svg>
  );
}
