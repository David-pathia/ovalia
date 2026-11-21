// Dates de la journée, toujours à l'heure de Paris (le serveur Vercel tourne en UTC).

const ZONE = 'Europe/Paris';

const morceaux = (d: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
};

/** Jour de Paris (AAAA-MM-JJ) et heure (HH:MM) d'un instant. */
export const enParis = (d: Date | string) => morceaux(typeof d === 'string' ? new Date(d) : d);

export const aujourdhui = () => enParis(new Date()).date;

/** Ajoute des jours à une date AAAA-MM-JJ. */
export function plusJours(date: string, jours: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours de `de` à `a` (dates AAAA-MM-JJ). */
export const ecartJours = (de: string, a: string) =>
  Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);

/** Instant (ISO) correspondant à une date et une heure de Paris. */
export function parisVersIso(date: string, heure: string) {
  const [y, m, j] = date.split('-').map(Number);
  const [h, mi] = heure.split(':').map(Number);
  const suppose = Date.UTC(y!, m! - 1, j!, h!, mi!);
  const lu = enParis(new Date(suppose));
  const [ly, lm, lj] = lu.date.split('-').map(Number);
  const [lh, lmi] = lu.heure.split(':').map(Number);
  const decalage = Date.UTC(ly!, lm! - 1, lj!, lh!, lmi!) - suppose;
  return new Date(suppose - decalage).toISOString();
}

/** « lundi 24 novembre », « demain », « hier »… */
export function dateLisible(date: string, reference = aujourdhui()) {
  const e = ecartJours(reference, date);
  if (e === 0) return 'aujourd’hui';
  if (e === 1) return 'demain';
  if (e === -1) return 'hier';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: Math.abs(e) < 7 ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(`${date}T12:00:00Z`));
}
