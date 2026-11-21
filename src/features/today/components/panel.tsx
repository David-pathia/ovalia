import { cn } from '@/lib/utils';
import type { Icon } from '@/components/icons';

export function Panel({
  title,
  icon: IconCmp,
  meta,
  ia,
  className,
  children
}: {
  title: string;
  icon: Icon;
  meta?: React.ReactNode;
  ia?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'bg-card text-card-foreground min-w-0 rounded-2xl border p-4 sm:p-5',
        className
      )}
    >
      <header className='mb-3 flex items-center justify-between gap-3'>
        <h2 className='font-display flex items-center gap-2 text-[17px] font-semibold'>
          <IconCmp className='text-sauge size-[18px]' aria-hidden='true' />
          {title}
          {ia && (
            <span className='bg-sauge rounded-[5px] px-1.5 font-mono text-[10.5px] tracking-wide text-[#1b1b1b]'>
              IA
            </span>
          )}
        </h2>
        {meta && <div className='text-muted-foreground text-xs'>{meta}</div>}
      </header>
      {children}
    </section>
  );
}
