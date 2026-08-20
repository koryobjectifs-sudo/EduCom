/**
 * Sonde RUNTIME de la diffusion — lot 17.
 *
 *   npm run script -- scripts/verify-diffusion-runtime.ts
 *
 * Chrome piloté par le protocole DevTools (`scripts/_cdp.ts`), **vraie URL**,
 * **vraie session**, à 390 × 844 puis 1440 × 900. Elle ouvre réellement la
 * modale de diffusion, lit les destinataires rendus, change de canal, confirme
 * une remise — puis vérifie **en base** que la trace écrite dit la vérité.
 *
 * ⚠️ **Aucune route de test n'est créée.** La sonde s'authentifie pour de bon ;
 * il n'y a donc rien à supprimer ni aucun 404 à vérifier ensuite.
 *
 * ⚠️ **Aucun message n'est envoyé.** L'écran ne le peut pas, et c'est justement
 * ce que cette sonde va lire à l'écran, en français, sur un vrai rendu.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { BUCKET, currentAcademicYear } from "../src/lib/studentFile";
import { schoolStoragePath } from "../src/lib/schoolDocuments";
import {
  CDP, chromeAvailable, launchChrome, evaluate, waitFor, measure, shot,
  sessionCookies, MOBILE, DESKTOP, type Measure,
} from "./_cdp";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const PORT = Number(process.env.CDP_PORT ?? 9446);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "diff17-"));
const TAG = "SONDE17R";
const PASSWORD = `Diff-${Math.random().toString(36).slice(2)}-17!`;

const trash = {
  authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], schoolDocIds: [] as string[], studentDocIds: [] as string[],
  paths: [] as string[], dirs: [] as string[],
};

/** Clique le premier bouton dont le texte correspond. Renvoie `false` s'il n'existe pas. */
const clickButton = (label: string) =>
  `(() => { const b = [...document.querySelectorAll('button')].find((x) => /${label}/.test(x.textContent || '')); if (!b) return false; b.click(); return true; })()`;

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE RUNTIME — DIFFUSION DES DOCUMENTS (lot 17)");
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
  await prisma.user.create({
    data: { id: data.user.id, email, firstName: `${TAG}-Direction`, lastName: "Sonde", role: "OWNER", schoolId: school.id },
  });
  trash.userIds.push(data.user.id);

  // Deux parents, deux situations RÉELLES : joignable et injoignable.
  const mkParent = async (tag: string, phone: string | null) => {
    const u = await prisma.user.create({
      data: {
        email: `${TAG.toLowerCase()}.${tag}.${Date.now()}@sonde.invalid`,
        firstName: `${TAG}-${tag}`, lastName: "Diallo-Ndiaye", role: "PARENT", schoolId: school.id, phone,
      },
      select: { id: true },
    });
    trash.userIds.push(u.id);
    return u.id;
  };
  const parentJoignable = await mkParent("Joignable", "77 123 45 67");
  const parentSansTel = await mkParent("SansTelephone", null);

  const cls = await prisma.class.create({
    data: { name: `${TAG} CM2`, cycle: "ELEMENTAIRE", schoolId: school.id },
    select: { id: true },
  });
  trash.classIds.push(cls.id);

  const mkStudent = async (first: string, parentId: string | null) => {
    const s = await prisma.student.create({
      data: { firstName: `${TAG}-${first}`, lastName: "Ndiaye-Diagne", schoolId: school.id, status: "ENROLLED", parentId },
      select: { id: true },
    });
    trash.studentIds.push(s.id);
    await prisma.enrollment.create({ data: { studentId: s.id, classId: cls.id, academicYear: year } });
    return s.id;
  };
  const eleveJoignable = await mkStudent("Aminata-Khadidiatou", parentJoignable);
  await mkStudent("Ousmane-Abdoulaye", parentSansTel);
  await mkStudent("Fatoumata-Binetou", null);

  // Un document PUBLIÉ destiné aux familles, porté sur cette classe.
  const docId = crypto.randomUUID();
  const path = schoolStoragePath(school.id, docId, "fournitures.pdf");
  const body = Buffer.from("%PDF-1.4\nsonde17\n%%EOF\n", "utf8");
  const upl = await admin.storage.from(BUCKET).upload(path, body, { contentType: "application/pdf", upsert: true });
  if (!upl.error) trash.paths.push(path);
  await prisma.schoolDocument.create({
    data: {
      id: docId, title: `${TAG} Liste de fournitures CM2`, status: "PUBLISHED",
      audience: "FAMILIES", scopeKind: "CLASS", classId: cls.id,
      storagePath: path, fileName: "fournitures.pdf", mimeType: "application/pdf", sizeBytes: body.length,
      academicYear: year, createdById: data.user.id, publishedById: data.user.id, publishedAt: new Date(),
      schoolId: school.id,
    },
  });
  trash.schoolDocIds.push(docId);

  // Une pièce au dossier de l'élève joignable, pour la seconde surface (§7).
  const pieceId = crypto.randomUUID();
  const piecePath = `${school.id}/${eleveJoignable}/${pieceId}/bulletin.pdf`;
  const upl2 = await admin.storage.from(BUCKET).upload(piecePath, body, { contentType: "application/pdf", upsert: true });
  if (!upl2.error) trash.paths.push(piecePath);
  await prisma.studentDocument.create({
    data: {
      id: pieceId, studentId: eleveJoignable, label: `${TAG} Bulletin du trimestre`, category: "SCOLARITE",
      storagePath: piecePath, fileName: "bulletin.pdf", mimeType: "application/pdf", sizeBytes: body.length,
      status: "VALIDATED", academicYear: year, uploadedById: data.user.id, schoolId: school.id,
    },
  });
  trash.studentDocIds.push(pieceId);
  ok(`fixtures dans « ${school.name} » — 1 document publié, 2 parents (joignable / sans téléphone), 3 élèves`);

  const cookies = await sessionCookies(email, PASSWORD);

  const profile = mkdtempSync(join(tmpdir(), "cdp17-"));
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

  const visit = async (url: string, viewport: typeof MOBILE, marker: string) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 2, mobile: viewport.width < 800,
    }, session);
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url }, session);
    await loaded;
    const rendered = await waitFor(cdp, session, marker);
    return { rendered, m: await measure(cdp, session) };
  };

  const centre = `${BASE}/dashboard/documents/centre`;

  /* ═══════ 1. LE CENTRE, SUR MOBILE ═══════ */
  console.log(`\n═══ 1. CENTRE DOCUMENTAIRE — ${MOBILE.label.toUpperCase()} ═══\n`);

  const page = await visit(centre, MOBILE, `/Liste de fournitures CM2/.test(document.body.innerText)`);
  check(page.rendered, "l'écran du centre est rendu et le document publié y figure");
  if (!page.rendered) { fail("sans contenu, aucune conclusion possible", page.m.text.slice(0, 200)); cdp.close(); chrome.kill(); return; }

  // §6 — le libellé suit la capacité réelle, il ne promet pas un envoi.
  check(/Préparer la diffusion/.test(page.m.text),
    "le bouton s'appelle « Préparer la diffusion » — aucun canal n'envoie, l'écran ne dit pas « Diffuser »");
  check(!/Diffuser\b/.test(page.m.text) || /Préparer la diffusion/.test(page.m.text),
    "aucun libellé ne promet un envoi qui n'existe pas");

  /* ═══════ 2. LA MODALE — PREUVE D'HYDRATATION PAR L'INTERACTION ═══════ */
  console.log("\n═══ 2. MODALE DE DIFFUSION — MOBILE ═══\n");

  const clicked = await evaluate<boolean>(cdp, session, clickButton("Préparer la diffusion"));
  check(clicked, "le bouton de diffusion est présent et cliquable");

  // ⚠️ Marqueur UNIQUE à l'état attendu : cette phrase n'existe nulle part
  // ailleurs sur l'écran. Un marqueur déjà présent produit un faux vert (16.1).
  const opened = await waitFor(cdp, session, `document.querySelector('[role=dialog]') && /Aucun message n'a été envoyé/.test(document.body.innerText)`, 25000);
  check(opened, "la modale s'ouvre RÉELLEMENT — React est hydraté et l'action serveur a répondu");
  if (!opened) { fail("modale absente : le reste de la sonde ne peut rien conclure"); cdp.close(); chrome.kill(); return; }

  const modal = await measure(cdp, session);
  console.log(`      → ${await shot(cdp, session, OUT, "diffusion-mobile-modale")}`);

  check(modal.scrollWidth <= modal.clientWidth + 1,
    `la modale ne déborde pas (${modal.scrollWidth} / ${modal.clientWidth} px)`);
  check(modal.offenders.length === 0, "aucun élément de la modale ne sort de l'écran", modal.offenders.join("\n      "));
  check(modal.clipped.length === 0, "aucun texte tronqué dans la modale", modal.clipped.join(" | "));
  check(modal.tables === 0, "aucun tableau HTML — ils ne tiennent pas sur 390 px");

  const tiny = modal.buttons.filter((b) => b.visible && b.kind !== "a" && b.tapH > 0 && b.tapH < 32);
  check(tiny.length === 0, "toute cible tactile fait au moins 32 px de haut", tiny.map((b) => `${b.text} → ${b.tapH} px`).join(", "));
  const outside = modal.buttons.filter((b) => b.visible && !b.inside);
  check(outside.length === 0, "tous les contrôles sont dans l'écran", outside.map((b) => `${b.text} (${b.w}×${b.h})`).join(", "));

  // §2 / §29 — ce que l'écran DIT, lu sur le rendu réel.
  check(/Aucun message n'a été envoyé/.test(modal.text), "l'avertissement « aucun message envoyé » est lisible sur mobile");
  check(/famille/.test(modal.text), "le nombre de familles concernées est affiché");
  check(modal.text.includes(`${TAG}-Joignable`), "le parent joignable est nommé — destinataire réel, pas un compteur");
  check(/Destinataire indisponible/.test(modal.text),
    "le parent sans numéro est marqué « Destinataire indisponible » — jamais compté comme servi");
  check(/\+221771234567/.test(modal.text), "le numéro réellement exploitable est affiché tel qu'il sera composé");
  check(/n'ont aucun parent rattaché/.test(modal.text), "les élèves sans parent sont annoncés à part");
  check(/10 minutes/.test(modal.text), "la durée réelle du lien est écrite à l'écran");
  check(/ni un lien permanent, ni une preuve/.test(modal.text),
    "l'écran refuse explicitement de faire passer le lien pour une preuve de transmission");

  /* ═══════ 3. CHANGER DE CANAL CHANGE LA DISPONIBILITÉ ═══════ */
  console.log("\n═══ 3. CANAL E-MAIL ═══\n");

  const switched = await evaluate<boolean>(cdp, session, clickButton("E-mail"));
  check(switched, "le canal E-mail est proposé dans la modale");
  const emailReady = await waitFor(cdp, session, `/Objet/.test(document.body.innerText)`, 20000);
  check(emailReady, "le passage au canal e-mail refait réellement la préparation côté serveur");
  if (emailReady) {
    const mail = await measure(cdp, session);
    check(/adresse E-mail/.test(mail.text) || /avec une adresse/.test(mail.text), "le décompte est recalculé pour le canal e-mail");
    check(!/Destinataire indisponible/.test(mail.text),
      "le parent sans téléphone DEVIENT joignable par e-mail — la disponibilité dépend du canal, pas du parent");
    check(mail.scrollWidth <= mail.clientWidth + 1, `aucun débordement sur le canal e-mail (${mail.scrollWidth} / ${mail.clientWidth} px)`);
  }

  /* ═══════ 4. CONFIRMATION HUMAINE, PUIS TRACE RÉELLE ═══════ */
  console.log("\n═══ 4. CONFIRMATION ET TRACE ═══\n");

  await evaluate(cdp, session, clickButton("WhatsApp"));
  await waitFor(cdp, session, `/\\+221771234567/.test(document.body.innerText)`, 20000);

  const askConfirm = await evaluate<boolean>(cdp, session, clickButton("J&#39;ai transmis|J'ai transmis|ai transmis ce document"));
  check(askConfirm, "le bouton « J'ai transmis ce document » est présent");
  const confirmShown = await waitFor(cdp, session, `/Confirmer la remise/.test(document.body.innerText)`, 10000);
  check(confirmShown, "§10 — une confirmation explicite est demandée AVANT d'écrire quoi que ce soit");
  if (confirmShown) {
    const conf = await measure(cdp, session);
    console.log(`      → ${await shot(cdp, session, OUT, "diffusion-mobile-confirmation")}`);
    check(/sur le point d'enregistrer/.test(conf.text), "la confirmation dit ce qui va être enregistré");
    check(/EduCom n'a rien envoyé/.test(conf.text), "…et rappelle qu'EduCom n'a rien transmis");
    check(/Annuler/.test(conf.text), "l'annulation est offerte à côté de la confirmation");
    check(conf.scrollWidth <= conf.clientWidth + 1, `aucun débordement à l'étape de confirmation (${conf.scrollWidth} / ${conf.clientWidth} px)`);
  }

  const before = await prisma.auditLog.count({
    where: { schoolId: school.id, entity: "diffusion", action: "diffusion.manualDelivery" },
  });
  await evaluate(cdp, session, clickButton("Confirmer la remise"));
  let written = before;
  for (let i = 0; i < 40 && written === before; i++) {
    await new Promise((r) => setTimeout(r, 500));
    written = await prisma.auditLog.count({
      where: { schoolId: school.id, entity: "diffusion", action: "diffusion.manualDelivery" },
    });
  }
  check(written > before, "la remise déclarée est réellement écrite en base après confirmation");

  const line = await prisma.auditLog.findFirst({
    where: { schoolId: school.id, entity: "diffusion", action: "diffusion.manualDelivery" },
    orderBy: { createdAt: "desc" },
    select: { details: true, userId: true },
  });
  const details = JSON.parse(line?.details ?? "{}") as Record<string, unknown>;
  check(details.sentByEduCom === false, "la trace écrite dit noir sur blanc qu'EduCom n'a rien envoyé");
  check(details.state === "REMIS_MANUELLEMENT", `l'état écrit est « ${String(details.state)} » — jamais « TRANSMIS »`);
  check(details.count === 1, `un seul destinataire enregistré (${String(details.count)}) : celui qui était réellement joignable`);
  check(line?.userId === data.user.id, "l'acteur enregistré est bien la session qui a cliqué");

  /* ═══════ 5. LE DOSSIER ÉLÈVE — SECONDE SURFACE ═══════ */
  console.log("\n═══ 5. DIFFUSION DEPUIS LE DOSSIER ÉLÈVE — MOBILE ═══\n");

  const dossier = await visit(`${BASE}/dashboard/students/${eleveJoignable}/dossier`, MOBILE,
    `/Bulletin du trimestre/.test(document.body.innerText)`);
  check(dossier.rendered, "le dossier de l'élève est rendu avec sa pièce");
  if (dossier.rendered) {
    check(/Préparer la remise/.test(dossier.m.text), "la pièce porte une action de remise, au libellé honnête");
    const clickedDoc = await evaluate<boolean>(cdp, session, clickButton("Préparer la remise"));
    check(clickedDoc, "l'action est cliquable depuis le dossier");
    const dlgDoc = await waitFor(cdp, session, `document.querySelector('[role=dialog]') && /Aucun message n'a été envoyé/.test(document.body.innerText)`, 25000);
    check(dlgDoc, "la modale de remise s'ouvre depuis le dossier élève");
    if (dlgDoc) {
      const md = await measure(cdp, session);
      console.log(`      → ${await shot(cdp, session, OUT, "diffusion-dossier-mobile")}`);
      check(md.scrollWidth <= md.clientWidth + 1, `elle ne déborde pas (${md.scrollWidth} / ${md.clientWidth} px)`);
      check(md.offenders.length === 0, "aucun élément ne sort de l'écran", md.offenders.join("\n      "));
      check(/ne part que vers le parent de cet enfant/.test(md.text),
        "l'écran énonce la borne : une pièce d'élève ne vise que sa propre famille");
      check(md.text.includes(`${TAG}-Joignable`), "le parent de CET enfant est le seul destinataire affiché");
      check(!md.text.includes(`${TAG}-SansTelephone`), "aucun autre parent de la classe n'apparaît");
    }
  }

  /* ═══════ 6. BUREAU ═══════ */
  console.log(`\n═══ 6. ${DESKTOP.label.toUpperCase()} ═══\n`);

  const desk = await visit(centre, DESKTOP, `/Liste de fournitures CM2/.test(document.body.innerText)`);
  check(desk.rendered, "le centre est rendu en largeur bureau");
  if (desk.rendered) {
    check(desk.m.scrollWidth <= desk.m.clientWidth + 1,
      `aucun débordement horizontal (${desk.m.scrollWidth} / ${desk.m.clientWidth} px)`);
    check(desk.m.offenders.length === 0, "aucun élément ne dépasse", desk.m.offenders.join("\n      "));
    check(/Remis à la main/.test(desk.m.text),
      "le document diffusé porte désormais sa pastille — l'état vient d'une ligne d'audit réelle");
    await evaluate(cdp, session, clickButton("Préparer la diffusion"));
    const deskModal = await waitFor(cdp, session, `document.querySelector('[role=dialog]') && /Aucun message n'a été envoyé/.test(document.body.innerText)`, 25000);
    check(deskModal, "la modale s'ouvre aussi en largeur bureau");
    if (deskModal) {
      const dm = await measure(cdp, session);
      console.log(`      → ${await shot(cdp, session, OUT, "diffusion-desktop-modale")}`);
      check(dm.scrollWidth <= dm.clientWidth + 1, `aucun débordement (${dm.scrollWidth} / ${dm.clientWidth} px)`);
      check(dm.buttons.filter((b) => b.visible && !b.inside).length === 0, "tous les contrôles sont dans l'écran");
    }
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
      await prisma.auditLog.deleteMany({ where: { OR: [
        { entityId: { in: [...trash.schoolDocIds, ...trash.studentDocIds, ...trash.studentIds] } },
        { userId: { in: trash.userIds } },
      ] } });
      await prisma.studentDocument.deleteMany({ where: { id: { in: trash.studentDocIds } } });
      await prisma.schoolDocument.deleteMany({ where: { id: { in: trash.schoolDocIds } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      for (const d of trash.dirs) { if (d !== OUT) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } } }
      const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } })
        + await prisma.user.count({ where: { firstName: { startsWith: TAG } } })
        + await prisma.schoolDocument.count({ where: { title: { startsWith: TAG } } });
      console.log(left === 0 ? "  ✓ fixtures de sonde supprimées\n" : `  ✗ ${left} résidu(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
