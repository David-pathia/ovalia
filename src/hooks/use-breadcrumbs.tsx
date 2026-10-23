'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { navGroups } from '@/config/nav-config';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const titles: Record<string, string> = Object.fromEntries(
  navGroups.flatMap((g) => g.items).map((item) => [item.url, item.title])
);

export function useBreadcrumbs() {
  const pathname = usePathname();

  return useMemo<BreadcrumbItem[]>(() => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const link = `/${segments.slice(0, index + 1).join('/')}`;
      return { title: titles[link] ?? segment.charAt(0).toUpperCase() + segment.slice(1), link };
    });
  }, [pathname]);
}
