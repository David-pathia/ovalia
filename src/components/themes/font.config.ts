import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';

import { cn } from '@/lib/utils';

// Inter pour les données et les menus, Bricolage Grotesque pour les grands titres.
const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
});

const fontBricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-bricolage'
});

const fontJetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains'
});

export const fontVariables = cn(fontInter.variable, fontBricolage.variable, fontJetbrains.variable);
