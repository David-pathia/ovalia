import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Chiffrement des secrets de messagerie avant stockage (AES-256-GCM).
// Clé : variable JETONS_CHIFFREMENT_CLE (au moins 32 caractères aléatoires), jamais dans le code.

function cle() {
  const brute = process.env.JETONS_CHIFFREMENT_CLE;
  if (!brute || brute.length < 32)
    throw new Error('JETONS_CHIFFREMENT_CLE absente ou trop courte (32 caractères minimum).');
  return createHash('sha256').update(brute).digest();
}

/** Texte chiffré au format « v1.iv.tag.données » (base64url). */
export function chiffrer(texte: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cle(), iv);
  const donnees = Buffer.concat([cipher.update(texte, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv, tag, donnees]
    .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
    .join('.');
}

export function dechiffrer(chiffre: string) {
  const [version, iv, tag, donnees] = chiffre.split('.');
  if (version !== 'v1' || !iv || !tag || !donnees) throw new Error('Jeton chiffré illisible.');
  const decipher = createDecipheriv('aes-256-gcm', cle(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(donnees, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}
