import { ImageResponse } from 'next/og';
import { IconeOvalia } from './icone-ovalia';

// Icône de l'application installée (Android, Chrome) ; l'onglet du navigateur garde favicon.ico.
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<IconeOvalia taille={512} />, size);
}
