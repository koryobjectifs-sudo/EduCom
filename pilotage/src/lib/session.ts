import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Connexion du pilotage — PURE (testable sans base ni cookies).
 * Mot de passe : scrypt (sel aléatoire). Session : jeton signé HMAC-SHA256,
 * `id.expiration.signature`, 12 h.
 */
const scrypt = promisify(scryptCb) as (p: string, s: Buffer, n: number) => Promise<Buffer>;
export const DUREE_SESSION_MS = 12 * 3600 * 1000;

export async function hacher(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const h = await scrypt(motDePasse.normalize("NFKC"), sel, 64);
  return `scrypt$${sel.toString("base64")}$${h.toString("base64")}`;
}

export async function verifier(motDePasse: string, stocke: string): Promise<boolean> {
  const [algo, sel, h] = stocke.split("$");
  if (algo !== "scrypt" || !sel || !h) return false;
  const attendu = Buffer.from(h, "base64");
  const calcule = await scrypt(motDePasse.normalize("NFKC"), Buffer.from(sel, "base64"), attendu.length);
  return attendu.length === calcule.length && timingSafeEqual(attendu, calcule);
}

/** Secret de signature : variable dédiée, sinon dérivé de DATABASE_URL. */
export function secret(env: NodeJS.ProcessEnv = process.env): string {
  const s = env.PILOTAGE_SESSION_SECRET || (env.DATABASE_URL ? createHmac("sha256", env.DATABASE_URL).update("pilotage-session-v1").digest("hex") : "");
  if (!s) throw new Error("PILOTAGE_SESSION_SECRET ou DATABASE_URL requis.");
  return s;
}

const signer = (charge: string, cle: string) => createHmac("sha256", cle).update(charge).digest("base64url");

export function creerJeton(compteId: string, cle: string, maintenant = Date.now()): string {
  const charge = `${compteId}.${maintenant + DUREE_SESSION_MS}`;
  return `${charge}.${signer(charge, cle)}`;
}

export function lireJeton(jeton: string | undefined, cle: string, maintenant = Date.now()): string | null {
  if (!jeton) return null;
  const i = jeton.lastIndexOf(".");
  if (i < 0) return null;
  const charge = jeton.slice(0, i);
  const sig = Buffer.from(jeton.slice(i + 1));
  const attendue = Buffer.from(signer(charge, cle));
  if (sig.length !== attendue.length || !timingSafeEqual(sig, attendue)) return null;
  const [id, exp] = charge.split(".");
  if (!id || !exp || Number(exp) < maintenant) return null;
  return id;
}

/** Règle du mot de passe : 12 caractères minimum. */
export function motDePasseValide(m: string): string | null {
  if (m.length < 12) return "12 caractères minimum.";
  if (m.length > 200) return "Trop long.";
  return null;
}
