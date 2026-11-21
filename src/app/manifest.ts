import type { MetadataRoute } from 'next';

// Ovalia installable sur l'écran d'accueil du téléphone (Safari → Partager → « Sur l'écran d'accueil »).
// L'icône ouvre directement la note vocale ; un appui long propose aussi la journée.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ovalia',
    short_name: 'Ovalia',
    description: 'Note vocale et journée du conseiller',
    lang: 'fr',
    start_url: '/dashboard/note',
    scope: '/',
    display: 'standalone',
    background_color: '#0f2d23',
    theme_color: '#0f2d23',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' }
    ],
    shortcuts: [
      { name: 'Note vocale', url: '/dashboard/note' },
      { name: 'Aujourd’hui', url: '/dashboard' }
    ]
  };
}
