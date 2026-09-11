/**
 * Vérification visuelle rapide — palette "EduCom Aurora" (17 sept.).
 *
 *   npm run script -- scripts/verify-aurora-palette.ts
 *
 * Capture le Shell réel (Rail + TopBar) et l'aperçu Réglages sous Aurora,
 * puis restaure exactement la couleur d'origine de SENG.CO ACADEMY.
 * Lecture/écriture bornée à UN champ (`School.primaryColor`), valeur
 * d'origine relue et réécrite à l'identique en fin de script.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, waitFor, shot, sessionCookiesForExistingUser } from "./_cdp";
import { AURORA_HEX } from "../src/lib/theme";

const PORT = Number(process.env.CDP_PORT ?? 9492);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "aurora-verification");

const STABLE = `(() => {
  if (document.readyState !== "complete") return false;
  const n = document.querySelectorAll("body *").length;
  const s = (window.__aur = window.__aur || { n: -1, fois: 0 });
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 4 && n > 0;
})()`;

async function nav(cdp: CDP, session: string, url: string) {
  await cdp.send("Page.navigate", { url }, session);
  return waitFor(cdp, session, STABLE, 25_000);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!chromeAvailable()) throw new Error("Chrome introuvable.");

  const school = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO", mode: "insensitive" } },
    select: { id: true, primaryColor: true },
  });
  if (!school) throw new Error("SENG.CO ACADEMY introuvable.");
  const owner = await prisma.user.findFirst({ where: { schoolId: school.id, role: "OWNER" }, select: { email: true } });
  if (!owner) throw new Error("Aucun OWNER sur SENG.CO ACADEMY.");

  const original = school.primaryColor;
  console.log(`Couleur d'origine SENG.CO : ${original ?? "(aucune)"}`);

  const profile = mkdtempSync(join(tmpdir(), "cdp-aurora-"));
  const launched = await launchChrome(PORT, profile);
  if (!launched) { rmSync(profile, { recursive: true, force: true }); throw new Error("Chrome n'a pas démarré."); }
  const { chrome, wsUrl } = launched;

  try {
    const cdp = await CDP.open(wsUrl);
    const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const session = attached.sessionId;
    await cdp.send("Page.enable", {}, session);
    await cdp.send("Network.enable", {}, session);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, session);

    const cookies = await sessionCookiesForExistingUser(owner.email);
    for (const c of cookies) await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);

    // 1. Shell AVANT (couleur actuelle) — référence de non-régression.
    await nav(cdp, session, `${BASE}/dashboard`);
    await shot(cdp, session, OUT, "01-shell-avant");
    console.log("✓ 01-shell-avant.png (couleur actuelle, non modifiée)");

    // 2. Réglages : la vignette "EduCom Aurora" est-elle sélectionnable ? (aucune écriture : sélection client-side)
    await nav(cdp, session, `${BASE}/dashboard/settings`);
    await shot(cdp, session, OUT, "02-settings-avant-clic");

    // 3. Bascule Prisma directe sur Aurora (équivalent du clic + enregistrement), pour photographier le VRAI Shell.
    await prisma.school.update({ where: { id: school.id }, data: { primaryColor: AURORA_HEX } });
    await nav(cdp, session, `${BASE}/dashboard`);
    await shot(cdp, session, OUT, "03-shell-aurora");
    console.log("✓ 03-shell-aurora.png (Rail/TopBar navy + accent cyan attendus)");

    // Viewport agrandi : la grille de couleurs et l'aperçu du Shell sont loin
    // sous la ligne de flottaison, et le scroll ne porte pas sur `<body>`
    // (conteneur interne) — plus simple d'agrandir la fenêtre que de deviner
    // le bon sélecteur à faire défiler.
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 2700, deviceScaleFactor: 1, mobile: false }, session);
    await nav(cdp, session, `${BASE}/dashboard/settings`);
    await shot(cdp, session, OUT, "04-settings-aurora-persisted");
    console.log("✓ 04-settings-aurora-persisted.png (aperçu Shell + grille avec Aurora sélectionnée)");

    cdp.close();
  } finally {
    // ⚠️ ORDRE CRITIQUE : la restauration de la couleur passe EN PREMIER, et
    // dans son propre try/catch. Le 11 sept., `rmSync` du profil Chrome a levé
    // ENOTEMPTY et coupé le `finally` avant la ligne de restauration : la
    // couleur d'origine de SENG.CO est restée sur Aurora jusqu'à correction
    // manuelle. Le nettoyage du profil temporaire n'a plus jamais le dernier mot.
    try {
      await prisma.school.update({ where: { id: school.id }, data: { primaryColor: original } });
      const check = await prisma.school.findUnique({ where: { id: school.id }, select: { primaryColor: true } });
      console.log(`Couleur restaurée : ${check?.primaryColor ?? "(aucune)"} ${check?.primaryColor === original ? "✓" : "⚠️ MISMATCH"}`);
    } catch (e) {
      console.error("⚠️⚠️ ÉCHEC DE LA RESTAURATION — intervenir manuellement :", e);
    }
    try { chrome.kill(); } catch { /* déjà arrêté */ }
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* non bloquant */ }
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
