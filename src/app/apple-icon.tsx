import { ImageResponse } from 'next/og';
import { IconeOvalia } from './icone-ovalia';

// Icône de l'écran d'accueil de l'iPhone.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<IconeOvalia taille={180} />, size);
}
