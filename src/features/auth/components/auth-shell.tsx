import { Logo, TopoLines } from '@/components/brand/logo';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className='dark bg-background text-foreground relative grid min-h-svh lg:grid-cols-[1.1fr_1fr]'>
      <section className='relative hidden overflow-hidden bg-[#0f2d23] p-10 lg:flex lg:flex-col lg:justify-between'>
        <TopoLines className='absolute inset-x-0 top-0 h-[60%] w-full opacity-25' />
        <TopoLines className='absolute inset-x-0 bottom-0 h-[45%] w-full rotate-180 opacity-15' />
        <Logo className='relative' />
        <div className='relative max-w-md space-y-4'>
          <p className='text-sauge text-xs font-semibold tracking-[0.18em] uppercase'>
            Poste de pilotage
          </p>
          <h1 className='font-display text-4xl leading-[1.05] font-extrabold xl:text-5xl'>
            Vos biens, vos clients et vos assistants IA, au même endroit.
          </h1>
          <p className='text-muted-foreground'>
            Explorer <span className='text-cuivre'>•</span> Apprendre{' '}
            <span className='text-cuivre'>•</span> Agir
          </p>
        </div>
        <p className='text-muted-foreground relative text-xs'>Espace privé · accès sur invitation</p>
      </section>

      <section className='flex items-center justify-center px-4 py-10 sm:px-8'>
        <div className='w-full max-w-sm space-y-8'>
          <Logo className='lg:hidden' />
          {children}
        </div>
      </section>
    </main>
  );
}
