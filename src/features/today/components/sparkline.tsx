export function Sparkline({ points }: { points: number[] }) {
  const step = 100 / (points.length - 1);
  const line = points.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${y}`).join(' ');
  const last = points[points.length - 1];
  return (
    <svg viewBox='0 0 100 26' preserveAspectRatio='none' className='mt-1 h-6 w-full' aria-hidden='true'>
      <path d={`${line} L100 26 L0 26Z`} className='fill-sauge/20' />
      <path d={line} fill='none' className='stroke-sauge' strokeWidth='1.5' vectorEffect='non-scaling-stroke' />
      <circle cx='99' cy={last} r='2.2' className='fill-cuivre' />
    </svg>
  );
}
