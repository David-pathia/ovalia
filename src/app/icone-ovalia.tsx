// Dessin de l'icône Ovalia (fond forêt, micro cuivre) pour les icônes générées par ImageResponse.
// Couleurs en dur : ImageResponse ne lit pas les variables CSS du thème (mêmes valeurs que forest-mind.css).

export function IconeOvalia({ taille }: { taille: number }) {
  const u = taille / 100;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f2d23'
      }}
    >
      <div
        style={{
          width: 66 * u,
          height: 66 * u,
          borderRadius: 33 * u,
          background: '#c77f52',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width={34 * u} height={34 * u} viewBox='0 0 24 24' fill='none'>
          <rect x='9' y='2' width='6' height='12' rx='3' fill='#1b1b1b' />
          <path
            d='M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8'
            stroke='#1b1b1b'
            strokeWidth='2'
            strokeLinecap='round'
          />
        </svg>
      </div>
    </div>
  );
}
