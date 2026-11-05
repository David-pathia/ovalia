'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { VenteMarche } from '../types';

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const dateFr = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

function token(nom: string, repli: string) {
  if (typeof window === 'undefined') return repli;
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || repli;
}

/** Couleur d'une vente selon sa position entre le 1er et le 3e quartile du prix au m² (sauge → cuivre). */
function couleur(prixM2: number, q1: number, q3: number, bas: string, haut: string) {
  const t = q3 > q1 ? Math.max(0, Math.min(1, (prixM2 - q1) / (q3 - q1))) : 0.5;
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [a, b] = [hex(bas), hex(haut)];
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return haut;
  return `rgb(${a.map((x, i) => Math.round(x + (b[i]! - x) * t)).join(',')})`;
}

export function MarcheMap({
  centre,
  rayonKm,
  ventes,
  q1,
  q3,
  selection,
  selectionActive,
  onToggle,
  focus
}: {
  centre: { lat: number; lon: number; libelle: string };
  rayonKm: number;
  ventes: VenteMarche[];
  q1: number;
  q3: number;
  selection: Set<string>;
  selectionActive: boolean;
  onToggle: (id: string) => void;
  focus: string | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const couche = useRef<L.LayerGroup | null>(null);
  const tuiles = useRef<L.TileLayer | null>(null);
  const marqueurs = useRef(new Map<string, L.CircleMarker>());
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true, preferCanvas: true });
    couche.current = L.layerGroup().addTo(map.current);
    map.current.on('popupopen', (e) => {
      const bouton = e.popup.getElement()?.querySelector<HTMLButtonElement>('button[data-vente]');
      bouton?.addEventListener('click', () => {
        toggleRef.current(bouton.dataset.vente!);
        map.current?.closePopup();
      });
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Fonds IGN (Géoplateforme) : gratuits, sans clé. En thème sombre, le plan est assombri par un filtre CSS.
  useEffect(() => {
    if (!map.current || tuiles.current) return;
    const ign = (couche: string, format: string) =>
      `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${couche}&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;
    tuiles.current = L.tileLayer(ign('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png'), {
      maxZoom: 19,
      className: 'ovalia-fond',
      attribution: '© IGN Géoplateforme · ventes DVF (data.gouv.fr)'
    }).addTo(map.current);
    const cadastre = L.tileLayer(ign('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'image/png'), { maxZoom: 19, minZoom: 14, opacity: 0.7 });
    L.control.layers(undefined, { 'Cadastre (zoomer)': cadastre }, { position: 'topright' }).addTo(map.current);
  }, []);

  useEffect(() => {
    el.current?.toggleAttribute('data-sombre', resolvedTheme !== 'light');
  }, [resolvedTheme]);

  useEffect(() => {
    if (!map.current || !couche.current) return;
    const bas = token('--sauge', '#a7b59f');
    const haut = token('--cuivre', '#c77f52');
    const encre = token('--foreground', '#e8dcc5');
    couche.current.clearLayers();
    marqueurs.current.clear();

    L.circle([centre.lat, centre.lon], {
      radius: rayonKm * 1000,
      color: bas,
      weight: 1,
      dashArray: '4 4',
      fill: false
    }).addTo(couche.current);

    for (const v of ventes) {
      if (v.lat === null || v.lon === null) continue;
      const choisie = selection.has(v.id);
      const m = L.circleMarker([v.lat, v.lon], {
        radius: choisie ? 7 : 5,
        color: choisie ? encre : couleur(v.prixM2, q1, q3, bas, haut),
        weight: choisie ? 2.5 : 1,
        fillColor: couleur(v.prixM2, q1, q3, bas, haut),
        fillOpacity: v.atypique ? 0.25 : 0.85
      });
      const action = selectionActive
        ? `<button data-vente="${v.id}" style="margin-top:6px;padding:3px 8px;border-radius:6px;border:1px solid currentColor;background:transparent;cursor:pointer">${choisie ? 'Retirer des comparables' : 'Ajouter aux comparables'}</button>`
        : '';
      m.bindPopup(
        `<strong>${eur.format(v.prix)}</strong> · ${v.prixM2.toLocaleString('fr-FR')} €/m²<br>` +
          `${v.type === 'maison' ? 'Maison' : 'Appartement'} ${v.surface} m²${v.pieces ? `, ${v.pieces} p.` : ''}${v.terrain ? `, terrain ${v.terrain.toLocaleString('fr-FR')} m²` : ''}<br>` +
          `${v.adresse ? `${v.adresse.toLowerCase()}, ` : ''}${v.commune} · ${dateFr.format(new Date(v.date))}` +
          (v.atypique ? '<br><em>Prix au m² atypique</em>' : '') +
          action
      );
      m.addTo(couche.current);
      marqueurs.current.set(v.id, m);
    }

    L.circleMarker([centre.lat, centre.lon], { radius: 9, color: encre, weight: 3, fillColor: haut, fillOpacity: 1 })
      .bindTooltip(centre.libelle)
      .addTo(couche.current);
  }, [centre, rayonKm, ventes, q1, q3, selection, selectionActive]);

  // La carte est montée avant que son conteneur ait sa taille définitive : on recadre à chaque redimensionnement.
  useEffect(() => {
    if (!map.current || !el.current) return;
    const cadrer = () => {
      map.current?.invalidateSize();
      map.current?.fitBounds(L.latLng(centre.lat, centre.lon).toBounds(rayonKm * 2000), { padding: [12, 12] });
    };
    cadrer();
    const obs = new ResizeObserver(() => map.current?.invalidateSize());
    obs.observe(el.current);
    const t = window.setTimeout(cadrer, 150);
    return () => {
      obs.disconnect();
      window.clearTimeout(t);
    };
  }, [centre.lat, centre.lon, rayonKm]);

  useEffect(() => {
    const m = focus ? marqueurs.current.get(focus.split('#')[0]!) : null;
    if (m && map.current) {
      map.current.setView(m.getLatLng(), Math.max(map.current.getZoom(), 15));
      m.openPopup();
    }
  }, [focus]);

  return (
    <div
      ref={el}
      className='h-[420px] w-full rounded-xl border [&[data-sombre]_.ovalia-fond]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.85)_saturate(0.6)]'
      role='region'
      aria-label='Carte des ventes'
    />
  );
}
