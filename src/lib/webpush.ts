import { createECDH, createPrivateKey, createCipheriv, hkdfSync, randomBytes, sign, generateKeyPairSync } from "node:crypto";

/**
 * Web Push natif (sans dépendance) — 25 sept. 2026.
 *
 * Kory veut tout tester en local sans installer de paquet : l'envoi de
 * notifications est donc implémenté directement avec `node:crypto`, selon les
 * standards :
 *   - RFC 8292 (VAPID) : jeton JWT ES256 signé par la clé privée du serveur ;
 *   - RFC 8291 / 8188 (chiffrement « aes128gcm ») : le contenu est chiffré
 *     pour l'appareil destinataire ; le service push (Google, Apple, Mozilla)
 *     ne peut pas le lire.
 * Vérifié par `scripts/verify-webpush.ts` (chiffrement → déchiffrement).
 */

const b64u = (b: Buffer) => b.toString("base64url");
const deb64u = (s: string) => Buffer.from(s, "base64url");

/** Génère une paire de clés VAPID (publique 65 octets non compressée, privée 32 octets). */
export function genererClesVapid(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const priv = privateKey.export({ format: "jwk" });
  const brut = Buffer.concat([Buffer.from([4]), deb64u(pub.x!), deb64u(pub.y!)]);
  return { publicKey: b64u(brut), privateKey: priv.d! };
}

function jetonVapid(audience: string, sujet: string, clePublique: string, clePrivee: string): string {
  const pub = deb64u(clePublique);
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: clePrivee, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk",
  });
  const entete = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const charge = b64u(
    Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: sujet })),
  );
  const signature = sign("sha256", Buffer.from(`${entete}.${charge}`), { key, dsaEncoding: "ieee-p1363" });
  return `${entete}.${charge}.${b64u(signature)}`;
}

/** Chiffre un contenu pour un abonnement (aes128gcm, un seul enregistrement). */
export function chiffrerPush(
  contenu: Buffer,
  p256dh: string,
  auth: string,
  // Paramètres injectables pour les tests uniquement.
  _test?: { sel?: Buffer; ecdh?: ReturnType<typeof createECDH> },
): Buffer {
  const uaPublic = deb64u(p256dh);
  const secretAuth = deb64u(auth);
  const ecdh = _test?.ecdh ?? createECDH("prime256v1");
  if (!_test?.ecdh) ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const secretEcdh = ecdh.computeSecret(uaPublic);

  const infoCle = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", secretEcdh, secretAuth, infoCle, 32));
  const sel = _test?.sel ?? randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, sel, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, sel, Buffer.from("Content-Encoding: nonce\0"), 12));

  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const chiffre = Buffer.concat([cipher.update(Buffer.concat([contenu, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([sel, rs, Buffer.from([asPublic.length]), asPublic, chiffre]);
}

export class ErreurPush extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

/** Envoie une notification chiffrée à un abonnement. Lève `ErreurPush` (404/410 = abonnement expiré). */
export async function envoyerNotificationPush(
  abonnement: { endpoint: string; keys: { p256dh: string; auth: string } },
  charge: string,
  vapid: { sujet: string; clePublique: string; clePrivee: string },
  ttl = 24 * 3600,
): Promise<void> {
  const url = new URL(abonnement.endpoint);
  const jwt = jetonVapid(url.origin, vapid.sujet, vapid.clePublique, vapid.clePrivee);
  const corps = chiffrerPush(Buffer.from(charge, "utf8"), abonnement.keys.p256dh, abonnement.keys.auth);
  const res = await fetch(abonnement.endpoint, {
    method: "POST",
    headers: {
      TTL: String(ttl),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Urgency: "normal",
      Authorization: `vapid t=${jwt}, k=${vapid.clePublique}`,
    },
    body: new Uint8Array(corps),
  });
  if (!res.ok) throw new ErreurPush(res.status, `Service push : ${res.status}`);
}
