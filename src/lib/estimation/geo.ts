// Types et outils partagés entre le serveur (accès DVF) et l'interface.

export type Point = { lat: number; lon: number };

export type Vente = {
  id: string;
  date: string; // AAAA-MM-JJ
  prix: number;
  type: 'maison' | 'appartement';
  surface: number;
  pieces: number | null;
  terrain: number;
  dependances: number;
  adresse: string;
  commune: string;
  lat: number | null;
  lon: number | null;
};

export function distanceKm(a: Point, b: Point) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
