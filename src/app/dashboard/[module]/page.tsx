import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { TopoLines } from '@/components/brand/logo';
import { moduleDescriptions, navGroups } from '@/config/nav-config';

const modules = navGroups
  .flatMap((g) => g.items)
  .filter((item) => item.url.startsWith('/dashboard/'))
  .map((item) => ({ ...item, slug: item.url.replace('/dashboard/', '') }));

export function generateStaticParams() {
  return modules.map((m) => ({ module: m.slug }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { module } = await params;
  return { title: modules.find((m) => m.slug === module)?.title };
}

export default async function ModulePage({ params }: Props) {
  const { module } = await params;
  const mod = modules.find((m) => m.slug === module);
  if (!mod) notFound();
  const Icon = mod.icon ? Icons[mod.icon] : Icons.logo;

  return (
    <div className='relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16'>
      <TopoLines className='absolute inset-x-0 top-0 h-72 w-full opacity-[0.13]' />
      <div className='bg-card relative w-full max-w-lg rounded-2xl border p-8 text-center'>
        <span className='bg-secondary mx-auto mb-4 grid size-12 place-items-center rounded-full'>
          <Icon className='text-sauge size-6' aria-hidden='true' />
        </span>
        <p className='text-cuivre text-[11px] font-semibold tracking-[0.16em] uppercase'>Prochaine étape</p>
        <h1 className='font-display mt-2 text-2xl font-extrabold'>{mod.title}</h1>
        <p className='text-muted-foreground mx-auto mt-2 max-w-sm text-sm'>{moduleDescriptions[mod.slug]}</p>
        <Link
          href='/dashboard'
          className='text-foreground mt-6 inline-block text-sm underline underline-offset-4'
        >
          Retour à Aujourd’hui
        </Link>
      </div>
    </div>
  );
}
