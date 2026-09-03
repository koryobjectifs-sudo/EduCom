/**
 * OUTIL DE CAPTURE — le parcours « Élèves & dossiers → Annuaire », rendu.
 *
 *   SHOT_DIR=/chemin npm run script -- scripts/shot-annuaire.ts
 *
 * Ce script ne vérifie presque rien : il PHOTOGRAPHIE les trois onglets de
 * l'annuaire, plus le regroupement des dossiers, parce qu'une description
 * textuelle ne prouve pas ce que l'utilisateur voit.
 *
 * Une école jetable est créée, photographiée, puis supprimée. Les
 * établissements réels ne sont ni lus ni écrits.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, shot, sessionCookies } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

const PORT = Number(process.env.CDP_PORT ?? 9473);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "annuaire-"));
const TAG = "SHOTANNUAIRE";
const PASSWORD = `Shot-${Math.random().toString(36).slice(2)}-2026!`;

const trash = {
  authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[],
  classIds: [] as string[], studentIds: [] as string[], dirs: [] as string[],
};

/**
 * ⚠️ Le squelette de `students/loading.tsx` a un nombre d'éléments stable :
 * un simple critère de comptage le prendrait pour la page. On exige le `<h1>`
 * réel — aucun squelette ne le produit.
 */
const STABLE = `(() => {
  const h1 = document.querySelector("h1");
  const titre = h1 ? (h1.textContent || "").trim() : "";
  if (!titre) return false;
  const n = document.querySelectorAll("button, a, td, li, h2, h3").length;
  const s = (window.__st = window.__st || { n: -1, fois: 0 });
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 5 && n > 0;
})()`;

/** Clique un onglet par son libellé, puis rend l'état de la barre. */
const CLIC = (libelle: string) => `(() => {
  const b = [...document.querySelectorAll("button")]
    .find((x) => (x.textContent || "").trim().startsWith(${JSON.stringify(libelle)}));
  if (!b) return "onglet introuvable";
  b.click();
  return "ok";
})()`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`\n  Captures → ${OUT}\n`);

  if (!chromeAvailable()) throw new Error("Google Chrome introuvable");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) throw new Error(`application injoignable sur ${BASE}`);

  const admin = createAdminClient();
  const stamp = Date.now();

  const school = await prisma.school.create({
    data: { name: `${TAG} Institution Bilingue Les Palmiers`, onboardingCompleted: true },
    select: { id: true },
  });
  trash.schoolIds.push(school.id);

  const email = `${TAG.toLowerCase()}.${stamp}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`compte de sonde : ${error?.message}`);
  trash.authIds.push(data.user.id);
  await prisma.user.create({
    data: { id: data.user.id, email, firstName: "Aïssatou", lastName: "Diop", role: "OWNER", schoolId: school.id },
  });
  trash.userIds.push(data.user.id);

  const classes = await prisma.class.createManyAndReturn({
    data: [
      { name: "CM2 A", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "CE1 B", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "6ème A", cycle: "COLLEGE", schoolId: school.id },
    ],
    select: { id: true, name: true },
  });
  for (const c of classes) trash.classIds.push(c.id);

  const noms: [string, string, number | null][] = [
    ["Moussa", "Cissé", 0], ["Dieynaba", "Ba", 0], ["Pape", "Mbaye", 0],
    ["Adama", "Sow", 1], ["Fatou", "Diallo", 1],
    ["Ousmane", "Fall", 2],
    ["Awa", "Gueye", null], ["Cheikh", "Sarr", null],
  ];
  const an = new Date().getFullYear();
  for (const [prenom, nom, idx] of noms) {
    const s = await prisma.student.create({
      data: {
        firstName: prenom, lastName: nom, schoolId: school.id,
        status: "ENROLLED", dateOfBirth: new Date("2015-05-14"),
      },
      select: { id: true },
    });
    trash.studentIds.push(s.id);
    if (idx !== null) {
      await prisma.enrollment.create({
        data: { studentId: s.id, classId: classes[idx].id, academicYear: `${an}-${an + 1}` },
      });
    }
  }
  console.log(`  fixture : ${noms.length} élèves · 3 classes · 2 sans classe\n`);

  const cookies = await sessionCookies(email, PASSWORD);
  const profile = mkdtempSync(join(tmpdir(), "cdp-annuaire-"));
  trash.dirs.push(profile);
  const launched = await launchChrome(PORT, profile);
  if (!launched) throw new Error("Chrome n'a pas ouvert son point DevTools");
  const { chrome, wsUrl } = launched;

  const cdp = await CDP.open(wsUrl);
  const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const session = attached.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);
  for (const c of cookies) {
    await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  }

  const url = `${BASE}/dashboard/students`;
  // ⚠️ `maxTouchPoints` doit rester entre 1 et 16 MÊME quand on désactive le
  // tactile : CDP rejette 0 et la capture s'arrête net.
  const formats = [
    { nom: "bureau", width: 1440, height: 900, tactile: false },
    { nom: "mobile", width: 390, height: 844, tactile: true },
  ];

  for (const f of formats) {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: f.tactile, maxTouchPoints: f.tactile ? 5 : 1 }, session);
    await cdp.send("Emulation.setEmitTouchEventsForMouse",
      { enabled: f.tactile, configuration: f.tactile ? "mobile" : "desktop" }, session);
    await cdp.send("Emulation.setDeviceMetricsOverride",
      { width: f.width, height: f.height, deviceScaleFactor: 1, mobile: f.tactile }, session);
    await cdp.send("Page.navigate", { url }, session);
    const rendu = await waitFor(cdp, session, STABLE, 40_000);

    for (const [cle, libelle] of [["eleves", "Élèves"], ["classes", "Classes"], ["dossiers", "Dossiers élèves"]] as const) {
      if (cle !== "eleves") {
        const r = await evaluate<string>(cdp, session, CLIC(libelle));
        if (r !== "ok") { console.log(`  ✗ ${f.nom} · ${libelle} : ${r}`); continue; }
        await new Promise((r) => setTimeout(r, 450));
      }

      // ⚠️ La coquille est en `h-screen` et c'est <main> qui défile : se fier à
      // `documentElement.scrollHeight` ne photographierait que le haut de page.
      const m = await evaluate<{ sw: number; cw: number; h1: string; fil: string; hauteur: number }>(cdp, session,
        `(() => {
          let hauteur = document.documentElement.scrollHeight;
          for (const el of document.querySelectorAll("main, div")) {
            if (el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 200) {
              hauteur = Math.max(hauteur, el.scrollHeight + (el.getBoundingClientRect().top || 0));
            }
          }
          return {
            sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
            h1: ((document.querySelector("h1")||{}).textContent || "").trim(),
            fil: [...document.querySelectorAll('nav[aria-label="Fil d\\'Ariane"] li')].map(x => x.textContent.trim()).join(" › "),
            hauteur: Math.ceil(hauteur),
          };
        })()`);

      await cdp.send("Emulation.setDeviceMetricsOverride",
        { width: f.width, height: Math.min(m.hauteur, 6000), deviceScaleFactor: 1, mobile: f.tactile }, session);
      await new Promise((r) => setTimeout(r, 350));
      await shot(cdp, session, OUT, `${f.nom}-${cle}`);
      await cdp.send("Emulation.setDeviceMetricsOverride",
        { width: f.width, height: f.height, deviceScaleFactor: 1, mobile: f.tactile }, session);

      const deborde = m.sw > m.cw + 1 ? `  ⚠️ DÉBORDE ${m.sw}>${m.cw}` : "";
      console.log(`  ${rendu ? "✓" : "✗"} ${f.nom.padEnd(7)} ${cle.padEnd(9)} h1 « ${m.h1} » · fil « ${m.fil} »${deborde}`);
    }
  }

  cdp.close();
  chrome.kill();
  console.log(`\n  6 captures dans ${OUT}\n`);
}

main()
  .catch((e) => { console.error("  ERREUR", e.message ?? e); })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      await prisma.school.deleteMany({ where: { id: { in: trash.schoolIds } } });
      for (const d of trash.dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } }
      const reste = await prisma.school.count({ where: { name: { startsWith: TAG } } });
      console.log(reste === 0 ? "  ✓ fixture supprimée\n" : `  ✗ ${reste} résidu(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
  });
