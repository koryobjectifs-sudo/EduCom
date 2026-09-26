/** Web Push natif : vecteur de test RFC 8291 + aller-retour + JWT VAPID.  npx tsx scripts/verify-webpush.ts */
import { createECDH, createDecipheriv, hkdfSync, randomBytes, createPublicKey, verify } from "node:crypto";
import { chiffrerPush, genererClesVapid } from "../src/lib/webpush";

let e = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) e++; };
const d = (s: string) => Buffer.from(s, "base64url");

// 1. Vecteur officiel de la RFC 8291 (annexe A).
const as = createECDH("prime256v1");
as.setPrivateKey(d("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw"));
const attendu = "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";
const obtenu = chiffrerPush(
  Buffer.from("When I grow up, I want to be a watermelon"),
  "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  "BTBZMqHH6r4Tts7J_aSIgg",
  { sel: d("DGv6ra1nlYgDCS1FRnbzlw"), ecdh: as },
).toString("base64url");
ok(obtenu === attendu, "vecteur de test RFC 8291 reproduit à l'octet près");

// 2. Aller-retour : un « navigateur » déchiffre ce que le serveur chiffre.
const ua = createECDH("prime256v1"); ua.generateKeys();
const auth = randomBytes(16);
const msg = JSON.stringify({ title: "Nouvelle annonce", body: "Réunion samedi 9 h ✅" });
const c = chiffrerPush(Buffer.from(msg), ua.getPublicKey().toString("base64url"), auth.toString("base64url"));
const sel = c.subarray(0, 16), idlen = c[20], asPub = c.subarray(21, 21 + idlen), corps = c.subarray(21 + idlen);
const secret = ua.computeSecret(asPub);
const ikm = Buffer.from(hkdfSync("sha256", secret, auth, Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPub]), 32));
const cek = Buffer.from(hkdfSync("sha256", ikm, sel, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
const nonce = Buffer.from(hkdfSync("sha256", ikm, sel, Buffer.from("Content-Encoding: nonce\0"), 12));
const dec = createDecipheriv("aes-128-gcm", cek, nonce); dec.setAuthTag(corps.subarray(-16));
const clair = Buffer.concat([dec.update(corps.subarray(0, -16)), dec.final()]);
ok(clair.subarray(0, -1).toString() === msg && clair.at(-1) === 2, "aller-retour : le navigateur relit le message exact");

// 3. Clés VAPID générées : formats attendus.
const k = genererClesVapid();
ok(d(k.publicKey).length === 65 && d(k.publicKey)[0] === 4 && d(k.privateKey).length === 32, "clés VAPID au bon format");

console.log(e ? `\n${e} échec(s)` : "\nTout est bon."); process.exit(e ? 1 : 0);
