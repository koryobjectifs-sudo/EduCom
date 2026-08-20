/**
 * Sonde RESPONSIVE de l'écran d'exports — lot 16.1.
 *
 *   npm run script -- scripts/verify-responsive-export.ts
 *
 * ═══ POURQUOI CETTE SONDE REMPLACE L'ANCIENNE TECHNIQUE ═══
 *
 * ⚠️ La sonde du lot 14 enregistrait le HTML dans un fichier et demandait à
 * Chrome de le photographier. Deux défauts, tous deux fatals :
 *
 *   1. **Le contenu n'était jamais rendu.** Chargé depuis `file://`, le
 *      JavaScript de Next ne s'exécute pas : React n'hydrate rien, et le corps
 *      de la page reste vide. On photographiait une coquille.
 *   2. **Chrome ne rendait jamais la main.** `--screenshot` attend une page « au
 *      repos » ; le client de rechargement à chaud ouvre une WebSocket qui ne se
 *      tait jamais. Chrome écrivait l'image puis restait vivant — l'appel
 *      expirait, et en enchaînant six pages les instances s'accumulaient jusqu'à
 *      bloquer la sonde. **Ce n'était donc pas un délai trop court : augmenter le
 *      timeout n'aurait produit qu'un vert mensonger.**
 *
 * ⚠️ Ici, Chrome est **piloté** par le protocole DevTools (`WebSocket` natif de
 * Node, aucune dépendance ajoutée). On ouvre la **vraie URL** avec le **vrai
 * cookie de session** : le JavaScript s'exécute, React hydrate, les actions
 * serveur répondent. On mesure ensuite le DOM réellement peint — largeur de
 * défilement, éléments qui débordent, boutons atteignables — et on interagit
 * pour éprouver les états qui n'existent qu'après un clic.
 *
 * ⚠️ **La sonde refuse de conclure** si le contenu React n'est pas apparu :
 * sans marqueur d'hydratation, elle échoue au lieu d'annoncer « responsive OK ».
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
// ⚠️ Le pilotage de Chrome vit désormais dans `scripts/_cdp.ts`, partagé avec la
// sonde du lot 17. En garder deux copies les aurait fait diverger.
import {
  CDP, chromeAvailable, launchChrome, evaluate, waitFor, measure, shot,
  sessionCookies, MOBILE, DESKTOP, type Measure,
} from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";
import { BUCKET, currentAcademicYear, storagePathFor } from "../src/lib/studentFile";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const PORT = Number(process.env.CDP_PORT ?? 9444);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "resp16-"));
const TAG = "SONDER161";
const PASSWORD = `Resp-${Math.random().toString(36).slice(2)}-161!`;


const trash = {
  authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], reqIds: [] as string[], paths: [] as string[], dirs: [] as string[],
};

/* ═══════════════════ scénario ═══════════════════ */

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE RESPONSIVE — ÉCRAN D'EXPORTS (lot 16.1)");
  console.log("═".repeat(74) + "\n");

  if (!chromeAvailable()) { fail("Google Chrome introuvable — rendu non éprouvé"); return; }
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`application injoignable sur ${BASE}`); return; }
  ok(`Chrome présent, application joignable sur ${BASE}`);

  /* ── fixtures ── */
  const admin = createAdminClient();
  const year = currentAcademicYear();
  const school = await prisma.school.findFirst({ where: { onboardingCompleted: true }, select: { id: true, name: true } });
  if (!school) { fail("aucune école installée"); return; }

  const email = `${TAG.toLowerCase()}.${Date.now()}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) { fail(`compte de sonde : ${error?.message}`); return; }
  trash.authIds.push(data.user.id);
  await prisma.user.create({ data: { id: data.user.id, email, firstName: `${TAG}-Direction`, lastName: "Sonde", role: "OWNER", schoolId: school.id } });
  trash.userIds.push(data.user.id);

  const cls = await prisma.class.create({ data: { name: `${TAG} CM2`, cycle: "ELEMENTAIRE", schoolId: school.id }, select: { id: true } });
  trash.classIds.push(cls.id);

  const req = await prisma.documentRequirement.create({
    data: { label: `${TAG} Extrait de naissance`, category: "IDENTITE", schoolId: school.id, classId: cls.id },
    select: { id: true },
  });
  trash.reqIds.push(req.id);
  await prisma.documentRequirement.create({
    data: { label: `${TAG} Photo identite`, category: "INSCRIPTION", schoolId: school.id, classId: cls.id },
  }).then((r) => trash.reqIds.push(r.id));

  // Plusieurs élèves, aux noms longs : c'est là que le mobile casse d'habitude.
  const names = ["Aminata-Khadidiatou", "Ousmane-Abdoulaye", "Fatoumata-Binetou"];
  const studentIds: string[] = [];
  for (const n of names) {
    const s = await prisma.student.create({
      data: { firstName: `${TAG}-${n}`, lastName: "Ndiaye-Diagne", schoolId: school.id, status: "ENROLLED" },
      select: { id: true },
    });
    trash.studentIds.push(s.id); studentIds.push(s.id);
    await prisma.enrollment.create({ data: { studentId: s.id, classId: cls.id, academicYear: year } });
  }
  // Une pièce réelle sur le premier, pour que l'export ne soit pas vide.
  const docId = crypto.randomUUID();
  const path = storagePathFor(school.id, studentIds[0], docId, "extrait.pdf");
  const body = Buffer.from("%PDF-1.4\nsonde\n%%EOF\n", "utf8");
  const upl = await admin.storage.from(BUCKET).upload(path, body, { contentType: "application/pdf", upsert: true });
  if (!upl.error) trash.paths.push(path);
  await prisma.studentDocument.create({
    data: {
      id: docId, studentId: studentIds[0], requirementId: req.id, label: `${TAG} Extrait de naissance`,
      category: "IDENTITE", storagePath: path, fileName: "extrait.pdf", mimeType: "application/pdf",
      sizeBytes: body.length, status: "VALIDATED", academicYear: year, uploadedById: data.user.id, schoolId: school.id,
    },
  });
  ok(`fixtures dans « ${school.name} » — 3 élèves aux noms longs, 2 exigences, 1 pièce`);

  const cookies = await sessionCookies(email, PASSWORD);

  /* ── Chrome piloté ── */
  const profile = mkdtempSync(join(tmpdir(), "cdp-"));
  trash.dirs.push(profile, OUT);
  const launched = await launchChrome(PORT, profile);
  if (!launched) { fail("Chrome n'a pas ouvert son point DevTools"); return; }
  const { chrome, wsUrl } = launched;
  ok("Chrome démarré et piloté par le protocole DevTools");

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

  const visit = async (url: string, viewport: typeof MOBILE, marker: string, name: string) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 2,
      mobile: viewport.width < 800,
    }, session);
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url }, session);
    await loaded;
    const rendered = await waitFor(cdp, session, marker);
    const m = await measure(cdp, session);
    const file = await shot(cdp, session, OUT, name);
    return { rendered, m, file };
  };

  const exportUrl = `${BASE}/dashboard/students/export?class=${cls.id}`;

  /* ═══════ 1. MOBILE — LE CONTENU RÉACT EST-IL RÉELLEMENT RENDU ? ═══════ */
  console.log(`\n═══ 1. ${MOBILE.label.toUpperCase()} ═══\n`);

  // ⚠️ Le marqueur n'est PAS un texte du serveur : c'est une case à cocher,
  // produite par le composant client après hydratation. Sans elle, la page
  // n'est qu'une coquille — et la sonde doit refuser de conclure.
  const marker = `document.querySelectorAll('input[type=checkbox]').length >= 3`;
  const mob = await visit(exportUrl, MOBILE, marker, "export-mobile");

  check(mob.rendered, "le contenu React est réellement rendu et hydraté (cases à cocher présentes)");
  if (!mob.rendered) {
    fail("sans contenu rendu, aucune conclusion responsive n'est possible", mob.m.text.slice(0, 200));
  } else {
    console.log(`      → ${mob.file}`);
    check(mob.m.scrollWidth <= mob.m.clientWidth + 1,
      `aucun débordement horizontal (défilement ${mob.m.scrollWidth} px pour ${mob.m.clientWidth} px de viewport)`);
    check(mob.m.offenders.length === 0, "aucun élément ne dépasse la largeur de l'écran", mob.m.offenders.join("\n      "));
    check(mob.m.tables === 0, "aucun tableau HTML — ils ne tiennent pas sur 390 px");

    const visible = mob.m.buttons.filter((b) => b.visible);
    check(visible.length > 0, `${visible.length} contrôles interactifs mesurés`);
    const outside = visible.filter((b) => !b.inside);
    check(outside.length === 0, "tous les contrôles sont dans l'écran", outside.map((b) => `${b.text} (${b.w}×${b.h})`).join(", "));
    // ⚠️ Seuil sur la CIBLE tactile (le label ou le bouton englobant), pas sur
    // le dessin du contrôle : une case de 20 px dans un label de 44 px se touche
    // très bien. Les liens de fil d'Ariane sont du texte, pas des cibles.
    const tiny = visible.filter((b) => b.kind !== "a" && b.tapH > 0 && b.tapH < 32);
    check(tiny.length === 0, "toute cible tactile fait au moins 32 px de haut",
      tiny.map((b) => `${b.text} → ${b.tapH} px`).join(", "));
    check(mob.m.clipped.length === 0, "aucun texte tronqué par son conteneur", mob.m.clipped.join(" | "));

    check(/Préparation des dossiers/.test(mob.m.text), "le titre de l'écran est lisible");
    check(/Prêts|Incomplets|À vérifier/.test(mob.m.text), "les compteurs d'état sont rendus");
    check(mob.m.text.includes(`${TAG}-Aminata`), "les élèves de la classe apparaissent, noms longs compris");
  }

  /* ═══════ 2. MOBILE — LES ÉTATS QUI N'EXISTENT QU'APRÈS UN CLIC ═══════ */
  console.log("\n═══ 2. SÉLECTION, PRÉPARATION, ACTIONS — SUR MOBILE ═══\n");

  if (mob.rendered) {
    // Cocher un élève, puis préparer : deux états que seul un vrai clic produit.
    await evaluate(cdp, session, `(() => {
      const box = document.querySelectorAll('input[type=checkbox]')[0];
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked').set;
      setter.call(box, true);
      box.dispatchEvent(new Event('click', { bubbles: true }));
      return true;
    })()`);
    const selectionShown = await waitFor(cdp, session, `/dossier\\(s\\) sélectionné/.test(document.body.innerText)`, 8000);
    check(selectionShown, "cocher un élève fait apparaître le bloc d'export");

    const afterSelect = await measure(cdp, session);
    check(afterSelect.scrollWidth <= afterSelect.clientWidth + 1,
      `aucun débordement après sélection (${afterSelect.scrollWidth} / ${afterSelect.clientWidth} px)`);
    check(afterSelect.offenders.length === 0, "aucun élément ne déborde dans l'état sélectionné", afterSelect.offenders.join("\n      "));

    const clicked = await evaluate<boolean>(cdp, session, `(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /Préparer/.test(x.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    })()`);
    check(clicked, "le bouton « Préparer l'export » est présent et cliquable");

    // ⚠️ Marqueur EXACT : « pièce(s) » figure déjà dans la liste des élèves, et
    // le premier passage a cru le résumé affiché alors que le bouton tournait
    // encore. Seul « Télécharger le ZIP » n'existe qu'après la préparation.
    const prepared = await waitFor(cdp, session, `/Télécharger le ZIP/.test(document.body.innerText)`, 25000);
    check(prepared, "le résumé de préparation apparaît réellement après le clic");

    const afterPrep = await measure(cdp, session);
    const prepFile = await shot(cdp, session, OUT, "export-mobile-prepare");
    console.log(`      → ${prepFile}`);
    check(afterPrep.scrollWidth <= afterPrep.clientWidth + 1,
      `aucun débordement dans l'état préparé (${afterPrep.scrollWidth} / ${afterPrep.clientWidth} px)`);
    check(afterPrep.offenders.length === 0, "aucun élément ne déborde dans l'état préparé", afterPrep.offenders.join("\n      "));
    check(/Télécharger le ZIP/.test(afterPrep.text), "le bouton de téléchargement est atteignable");
    check(/manquante|Aucune pièce ne manque/.test(afterPrep.text),
      "l'état de complétude est annoncé avant l'export");
    const dlBtn = afterPrep.buttons.find((b) => /Télécharger/.test(b.text));
    check(Boolean(dlBtn?.inside && dlBtn.h >= 24),
      `le bouton de téléchargement tient dans l'écran (${dlBtn?.w}×${dlBtn?.h} px)`);

    // Modale de transmission : un panneau superposé est le premier à casser.
    await evaluate(cdp, session, `(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /Enregistrer une transmission/.test(x.textContent || ''));
      if (b) b.click();
      return true;
    })()`);
    const modal = await waitFor(cdp, session, `document.querySelector('[role=dialog]')`, 8000);
    check(modal, "la modale de transmission s'ouvre");
    if (modal) {
      const m = await measure(cdp, session);
      const modalFile = await shot(cdp, session, OUT, "export-mobile-modale");
      console.log(`      → ${modalFile}`);
      check(m.scrollWidth <= m.clientWidth + 1, `la modale ne déborde pas (${m.scrollWidth} / ${m.clientWidth} px)`);
      check(m.offenders.length === 0, "aucun élément de la modale ne sort de l'écran", m.offenders.join("\n      "));
      check(/EduCom n'envoie rien|aucune administration/i.test(m.text),
        "l'avertissement « EduCom n'envoie rien » reste lisible sur mobile");
    }
  }

  /* ═══════ 3. BUREAU ═══════ */
  console.log(`\n═══ 3. ${DESKTOP.label.toUpperCase()} ═══\n`);

  const desk = await visit(exportUrl, DESKTOP, marker, "export-desktop");
  check(desk.rendered, "le contenu React est rendu en largeur bureau");
  if (desk.rendered) {
    console.log(`      → ${desk.file}`);
    check(desk.m.scrollWidth <= desk.m.clientWidth + 1,
      `aucun débordement horizontal (${desk.m.scrollWidth} / ${desk.m.clientWidth} px)`);
    check(desk.m.offenders.length === 0, "aucun élément ne dépasse", desk.m.offenders.join("\n      "));
    check(desk.m.buttons.filter((b) => b.visible && !b.inside).length === 0, "tous les contrôles sont dans l'écran");
    check(/Préparation des dossiers/.test(desk.m.text) && desk.m.text.includes(`${TAG}-Aminata`),
      "titre et élèves rendus en largeur bureau");
  }

  /* ═══════ 4. ÉTAT VIDE ═══════ */
  console.log("\n═══ 4. ÉTAT VIDE, SUR MOBILE ═══\n");

  const emptyPage = await visit(`${BASE}/dashboard/students/export`, MOBILE,
    `/Choisir une classe/.test(document.body.innerText)`, "export-mobile-vide");
  check(emptyPage.rendered, "l'écran sans classe choisie est rendu");
  if (emptyPage.rendered) {
    console.log(`      → ${emptyPage.file}`);
    check(emptyPage.m.scrollWidth <= emptyPage.m.clientWidth + 1, "aucun débordement à l'état vide");
    check(/Transmissions enregistrées/.test(emptyPage.m.text), "la section d'historique reste présente");
  }

  cdp.close();
  chrome.kill();

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log(`  captures : ${OUT}`);
  console.log("═".repeat(74) + "\n");
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      if (trash.paths.length) await admin.storage.from(BUCKET).remove(trash.paths);
      await prisma.auditLog.deleteMany({ where: { OR: [{ entityId: { in: trash.studentIds } }, { userId: { in: trash.userIds } }] } });
      await prisma.studentDocument.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.documentRequirement.deleteMany({ where: { id: { in: trash.reqIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      for (const d of trash.dirs) { if (d !== OUT) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } } }
      const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } });
      console.log(left === 0 ? "  ✓ fixtures de sonde supprimées\n" : `  ✗ ${left} résidu(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
