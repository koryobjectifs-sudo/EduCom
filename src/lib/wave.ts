import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Client Wave Business — Checkout API. 25 sept. 2026.
 *
 * ⚠️ PÉRIMÈTRE : abonnement de l'école à EduCom UNIQUEMENT (compte Wave
 * d'EduCom). Jamais utilisé pour les paiements des familles.
 *
 * Références (docs.wave.com) :
 *  - POST /v1/checkout/sessions : amount (chaîne, XOF entier), currency,
 *    success_url, error_url, client_reference → `wave_launch_url` à ouvrir
 *    dans le navigateur (jamais dans une webview). Expire en 30 minutes.
 *  - GET  /v1/checkout/sessions/:id : relecture de la session.
 *  - Webhooks signés : en-tête `Wave-Signature: t=<horodatage>,v1=<hmac>…`,
 *    HMAC-SHA256(secret, horodatage + corps brut). Refuser au-delà de 5 min.
 *
 * Variables : `WAVE_API_KEY` (clé limitée à Checkout), `WAVE_WEBHOOK_SECRET`
 * (secret de signature du webhook). Sans elles, tout échoue fermé.
 */

const API = "https://api.wave.com";

export function waveConfigure(): boolean {
  return Boolean(process.env.WAVE_API_KEY?.trim());
}

export type SessionWave = {
  id: string;
  amount: string;
  currency: string;
  client_reference: string | null;
  checkout_status: string;
  payment_status: string;
  transaction_id?: string | null;
  wave_launch_url: string;
  when_expires?: string;
};

async function appelWave<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const cle = process.env.WAVE_API_KEY?.trim();
  if (!cle) throw new Error("WAVE_API_KEY absente : paiement Wave non configuré.");
  const res = await fetch(`${API}${chemin}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    // Le corps d'erreur de Wave ne contient pas la clé ; on le journalise tronqué.
    const texte = (await res.text()).slice(0, 300);
    throw new Error(`Wave ${res.status} sur ${chemin} : ${texte}`);
  }
  return (await res.json()) as T;
}

export function creerSessionWave(p: {
  montantXof: number;
  reference: string;
  urlSucces: string;
  urlEchec: string;
}): Promise<SessionWave> {
  if (!Number.isInteger(p.montantXof) || p.montantXof <= 0) throw new Error("Montant invalide.");
  return appelWave<SessionWave>("/v1/checkout/sessions", {
    method: "POST",
    body: JSON.stringify({
      amount: String(p.montantXof), // XOF : entier, envoyé en chaîne
      currency: "XOF",
      client_reference: p.reference,
      success_url: p.urlSucces,
      error_url: p.urlEchec,
    }),
  });
}

export function lireSessionWave(id: string): Promise<SessionWave> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error("Identifiant de session invalide.");
  return appelWave<SessionWave>(`/v1/checkout/sessions/${id}`);
}

/**
 * Vérifie la signature d'un webhook Wave sur le CORPS BRUT (avant tout
 * `JSON.parse`). Renvoie un motif de refus, ou `null` si la signature est bonne.
 */
export function verifierSignatureWave(
  corpsBrut: string,
  entete: string | null,
  secret: string,
  maintenantSec = Math.floor(Date.now() / 1000),
): string | null {
  if (!entete) return "en-tête Wave-Signature absent";
  const parties = entete.split(",").map((x) => x.trim());
  const t = parties.find((x) => x.startsWith("t="))?.slice(2);
  const signatures = parties.filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  if (!t || !/^\d+$/.test(t) || signatures.length === 0) return "en-tête Wave-Signature mal formé";
  if (Math.abs(maintenantSec - Number(t)) > 300) return "horodatage hors délai (plus de 5 minutes)";

  const attendu = createHmac("sha256", secret).update(t + corpsBrut).digest();
  const ok = signatures.some((sig) => {
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const recu = Buffer.from(sig, "hex");
    return recu.length === attendu.length && timingSafeEqual(recu, attendu);
  });
  return ok ? null : "signature invalide";
}
