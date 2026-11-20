import {
  BIEN_FIELDS,
  surfacePiece,
  type BienValues,
  type PieceInput
} from '@/features/biens/fields';

// Compare la lecture de la dictée à la fiche en cours et liste les changements proposés (pur, sans IA).

export type Proposition =
  | {
      id: string;
      sorte: 'champ';
      key: string;
      libelle: string;
      avant: string | null;
      apres: string;
      valeur: unknown;
      remplace: boolean;
    }
  | {
      id: string;
      sorte: 'piece';
      libelle: string;
      avant: string | null;
      apres: string;
      piece: PieceInput;
      remplace: boolean;
    };

const vide = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function afficher(key: string, v: unknown): string {
  if (vide(v)) return '—';
  const f = BIEN_FIELDS.find((x) => x.key === key);
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (Array.isArray(v)) return v.join(', ');
  if (f?.kind === 'select') return f.options.find(([o]) => o === v)?.[1] ?? String(v);
  if (typeof v === 'number' && key.startsWith('annee')) return String(v);
  if (typeof v === 'number')
    return `${nombre.format(v)}${f && 'unit' in f && f.unit ? ` ${f.unit}` : ''}`;
  return String(v);
}

const surfaceTexte = (p: Pick<PieceInput, 'longueur' | 'largeur' | 'surface'>) => {
  const s = surfacePiece(p);
  return s ? `${nombre.format(s)} m²` : 'surface à préciser';
};

export function propositions(
  actuel: BienValues,
  piecesActuelles: PieceInput[],
  lu: { bien: Record<string, unknown>; pieces: PieceInput[] }
): Proposition[] {
  const res: Proposition[] = [];
  for (const f of BIEN_FIELDS) {
    const nouveau = lu.bien[f.key];
    if (vide(nouveau)) continue;
    const avant = actuel[f.key];
    let valeur: unknown = nouveau;
    if (f.kind === 'textarea') {
      const ajout = String(nouveau).trim();
      if (!ajout || String(avant ?? '').includes(ajout)) continue;
      valeur = vide(avant) ? ajout : `${String(avant).trim()}\n${ajout}`;
      res.push({
        id: f.key,
        sorte: 'champ',
        key: f.key,
        libelle: f.label,
        avant: vide(avant) ? null : String(avant),
        apres: `+ ${ajout}`,
        valeur,
        remplace: false
      });
      continue;
    }
    if (f.kind === 'list') {
      const existants = Array.isArray(avant) ? (avant as string[]) : [];
      const ajouts = (nouveau as string[]).filter(
        (x) => !existants.some((e) => e.toLowerCase() === x.toLowerCase())
      );
      if (!ajouts.length) continue;
      valeur = [...existants, ...ajouts];
      res.push({
        id: f.key,
        sorte: 'champ',
        key: f.key,
        libelle: f.label,
        avant: existants.length ? existants.join(', ') : null,
        apres: `+ ${ajouts.join(', ')}`,
        valeur,
        remplace: false
      });
      continue;
    }
    if (avant === nouveau) continue;
    // Le modèle peut renvoyer « 3 » pour un champ texte : on garde le type attendu par le formulaire.
    if (f.kind === 'text' && typeof nouveau !== 'string') valeur = String(nouveau);
    res.push({
      id: f.key,
      sorte: 'champ',
      key: f.key,
      libelle: f.label,
      avant: vide(avant) ? null : afficher(f.key, avant),
      apres: afficher(f.key, valeur),
      valeur,
      remplace: !vide(avant)
    });
  }

  lu.pieces.forEach((p, i) => {
    const nom = p.nom.trim();
    if (!nom) return;
    const piece: PieceInput = { ...p, nom, surface: surfacePiece(p) };
    const existante = piecesActuelles.find((x) => x.nom.trim().toLowerCase() === nom.toLowerCase());
    if (existante && surfacePiece(existante) === piece.surface) return;
    res.push({
      id: `piece-${i}`,
      sorte: 'piece',
      libelle: existante ? `Pièce : ${existante.nom.trim()}` : `Nouvelle pièce : ${nom}`,
      avant: existante ? surfaceTexte(existante) : null,
      apres: surfaceTexte(piece),
      piece,
      remplace: Boolean(existante)
    });
  });
  return res;
}

/** Applique les propositions retenues : nouvelles valeurs de la fiche et relevé des pièces mis à jour. */
export function appliquer(
  actuel: BienValues,
  piecesActuelles: PieceInput[],
  retenues: Proposition[]
): { bien: BienValues; pieces: PieceInput[] } {
  const bien = { ...actuel };
  let pieces = [...piecesActuelles];
  for (const p of retenues) {
    if (p.sorte === 'champ') bien[p.key] = p.valeur;
    else {
      const i = pieces.findIndex((x) => x.nom.trim().toLowerCase() === p.piece.nom.toLowerCase());
      if (i >= 0) pieces = pieces.map((x, j) => (j === i ? { ...x, ...p.piece, nom: x.nom } : x));
      else pieces = [...pieces.filter((x) => x.nom.trim()), p.piece];
    }
  }
  return { bien, pieces };
}
