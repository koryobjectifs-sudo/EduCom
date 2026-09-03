/**
 * OUTIL DE CAPTURE — la fiche élève réellement rendue, aux trois largeurs.
 *
 *   SHOT_DIR=/chemin npm run script -- scripts/shot-profil-eleve.ts
 *
 * ⚠️ Ce script ne vérifie rien : il PHOTOGRAPHIE, et mesure le débordement.
 * Il existe parce qu'un avis rendu sur le code source décrit ce que le code
 * prétend faire, pas ce que l'utilisateur voit.
 *
 * ⚠️ Aucune ligne du produit n'est modifiée. Une école jetable est créée,
 * photographiée, puis supprimée. Les établissements réels ne sont ni lus ni
 * écrits.
 *
 * La fixture est volontairement COMPLÈTE — responsable légal, groupe sanguin,
 * notes médicales, contact d'urgence, trois inscriptions, trois factures aux
 * statuts différents. Une fiche vide ne montrerait que des états vides, et on
 * n'auditerait alors ni la densité, ni la hiérarchie : c'est-à-dire le sujet.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, shot, sessionCookies } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

const PORT = Number(process.env.CDP_PORT ?? 9471);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "profil-"));
const TAG = "SHOTPROFIL";
const PASSWORD = `Shot-${Math.random().toString(36).slice(2)}-2026!`;

const FORMATS = [
  { nom: "bureau", width: 1440, height: 900, tactile: false },
  { nom: "tablette", width: 768, height: 1024, tactile: true },
  { nom: "mobile", width: 390, height: 844, tactile: true },
];

const trash = {
  authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[],
  classIds: [] as string[], studentIds: [] as string[], invoiceIds: [] as string[], dirs: [] as string[],
  termIds: [] as string[], subjectIds: [] as string[],
};

/**
 * ⚠️ Compter des éléments ne suffit PAS.
 *
 * `/dashboard/students/loading.tsx` couvre aussi `[id]` : pendant que les
 * requêtes tournent, Next diffuse un SQUELETTE dont le nombre de boutons et de
 * liens est parfaitement stable. Un critère de comptage le prend pour la page,
 * et on photographie une page grise — c'est arrivé, et la capture était
 * inutilisable sans qu'aucune erreur ne soit levée.
 *
 * On exige donc le contenu réel : le titre de l'élève. Aucun squelette ne le
 * produit.
 */
const STABLE = `(() => {
  const h1 = document.querySelector("h1");
  const titre = h1 ? (h1.textContent || "").trim() : "";
  if (!titre) return false;
  const cle = location.href + "|" + titre;
  const n = document.querySelectorAll("button, a, td, li, h2, h3").length;
  const s = (window.__st = window.__st || { n: -1, fois: 0, cle: "" });
  if (s.cle !== cle) { s.cle = cle; s.n = -1; s.fois = 0; }
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 5 && n > 0;
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
    data: {
      name: `${TAG} Institution Bilingue Les Palmiers`,
      onboardingCompleted: true,
      email: "contact@palmiers.sn", phone: "+221 33 800 12 34", address: "Sacré-Cœur 3, Dakar",
    },
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

  // Le responsable légal est un User de rôle PARENT rattaché à l'école.
  const emailParent = `${TAG.toLowerCase()}.parent.${stamp}@sonde.invalid`;
  const { data: p } = await admin.auth.admin.createUser({ email: emailParent, password: PASSWORD, email_confirm: true });
  let parentId: string | null = null;
  if (p?.user) {
    trash.authIds.push(p.user.id);
    await prisma.user.create({
      data: {
        id: p.user.id, email: emailParent, firstName: "Ibrahima", lastName: "Ndiaye",
        role: "PARENT", schoolId: school.id, phone: "+221 77 512 44 08",
      },
    });
    trash.userIds.push(p.user.id);
    parentId = p.user.id;
  }

  const classes = await prisma.class.createManyAndReturn({
    data: [
      { name: "CM2 A", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "CM1 B", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "CE2 A", cycle: "ELEMENTAIRE", schoolId: school.id },
    ],
    select: { id: true },
  });
  for (const c of classes) trash.classIds.push(c.id);

  const student = await prisma.student.create({
    data: {
      firstName: "Aminata", lastName: "Ndiaye", schoolId: school.id, status: "ENROLLED",
      dateOfBirth: new Date("2014-03-12"),
      address: "Villa 42, Cité Keur Gorgui, Dakar",
      bloodGroup: "O+",
      medicalNotes: "Allergie aux arachides (PAI signé le 12/09). Porte un inhalateur en cas de crise d'asthme.",
      emergencyContact: "Ibrahima Ndiaye (père)",
      emergencyPhone: "+221 77 512 44 08",
      parentId,
    },
    select: { id: true },
  });
  trash.studentIds.push(student.id);

  const an = new Date().getFullYear();
  await prisma.enrollment.createMany({
    data: [
      { studentId: student.id, classId: classes[0].id, academicYear: `${an}-${an + 1}` },
      { studentId: student.id, classId: classes[1].id, academicYear: `${an - 1}-${an}` },
      { studentId: student.id, classId: classes[2].id, academicYear: `${an - 2}-${an - 1}` },
    ],
  });

  const jour = 86_400_000;
  const factures = await prisma.invoice.createManyAndReturn({
    data: [
      { title: "Scolarité — Décembre", totalAmount: 150_000, status: "PENDING", dueDate: new Date(Date.now() + 9 * jour), schoolId: school.id, studentId: student.id },
      { title: "Scolarité — Novembre", totalAmount: 150_000, status: "PAID", dueDate: new Date(Date.now() - 21 * jour), schoolId: school.id, studentId: student.id },
      { title: "Frais d'inscription", totalAmount: 75_000, status: "OVERDUE", dueDate: new Date(Date.now() - 12 * jour), schoolId: school.id, studentId: student.id },
    ],
    select: { id: true },
  });
  for (const f of factures) trash.invoiceIds.push(f.id);

  /* ── présences, matières et notes ──
     Sans elles, les sections Présence et Notes ne montreraient que des états
     vides : on photographierait une fiche qui ne prouve rien. */
  const jourMs = 86_400_000;
  const statuts = ["PRESENT", "PRESENT", "ABSENT", "PRESENT", "LATE", "PRESENT", "EXCUSED", "PRESENT", "PRESENT", "PRESENT"] as const;
  await prisma.attendance.createMany({
    data: statuts.map((st, i) => ({
      // `@db.Date` : la composante heure doit être neutralisée.
      date: new Date(new Date(Date.now() - (i + 1) * jourMs).toISOString().slice(0, 10)),
      status: st,
      reason: st === "EXCUSED" ? "Certificat médical remis" : st === "ABSENT" ? "Non justifiée" : null,
      studentId: student.id, classId: classes[0].id, schoolId: school.id,
    })),
  });

  const term = await prisma.term.create({
    data: { name: "1er Trimestre", schoolId: school.id },
    select: { id: true },
  });
  trash.termIds.push(term.id);

  const matieres = await prisma.subject.createManyAndReturn({
    data: [
      { name: "Mathématiques", schoolId: school.id },
      { name: "Français", schoolId: school.id },
      { name: "Sciences", schoolId: school.id },
    ],
    select: { id: true, name: true },
  });
  for (const m of matieres) trash.subjectIds.push(m.id);

  await prisma.classSubject.createMany({
    data: matieres.map((m) => ({ classId: classes[0].id, subjectId: m.id })),
  });

  const notes: { v: number; coef: number; m: number; type: "EXAM" | "HOMEWORK" | "QUIZ" }[] = [
    { v: 15.5, coef: 2, m: 0, type: "EXAM" }, { v: 12, coef: 1, m: 0, type: "HOMEWORK" },
    { v: 8.5, coef: 2, m: 1, type: "EXAM" }, { v: 11, coef: 1, m: 1, type: "QUIZ" },
    { v: 17, coef: 1, m: 2, type: "HOMEWORK" }, { v: 14, coef: 2, m: 2, type: "EXAM" },
  ];
  await prisma.grade.createMany({
    data: notes.map((n, i) => ({
      value: n.v, max: 20, coefficient: n.coef, type: n.type,
      comment: i === 2 ? "Doit revoir les accords du participe passé." : null,
      date: new Date(Date.now() - (i + 2) * 3 * jourMs),
      studentId: student.id, classId: classes[0].id, subjectId: matieres[n.m].id, termId: term.id,
    })),
  });

  console.log(`  fixture : 1 élève complet · responsable · 3 inscriptions · 3 factures · 10 présences · 6 notes · 3 matières\n`);

  const cookies = await sessionCookies(email, PASSWORD);
  const profile = mkdtempSync(join(tmpdir(), "cdp-profil-"));
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

  const url = `${BASE}/dashboard/students/${student.id}`;
  for (const f of FORMATS) {
    // ⚠️ Ce sont `setTouchEmulationEnabled` / `setEmitTouchEventsForMouse` qui
    // basculent RÉELLEMENT `hover` et `pointer` ; `setEmulatedMedia` ne les
    // couvre pas. Sans cela on photographie un bureau en croyant tenir un
    // téléphone, et les commandes réservées au survol paraissent atteignables.
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: f.tactile, maxTouchPoints: 5 }, session);
    await cdp.send("Emulation.setEmitTouchEventsForMouse",
      { enabled: f.tactile, configuration: f.tactile ? "mobile" : "desktop" }, session);
    await cdp.send("Emulation.setDeviceMetricsOverride",
      { width: f.width, height: f.height, deviceScaleFactor: 1, mobile: f.tactile }, session);
    await cdp.send("Page.navigate", { url }, session);
    const rendu = await waitFor(cdp, session, STABLE, 40_000);

    // ⚠️ La coquille du tableau de bord est en `h-screen` et c'est <main> qui
    // défile, pas le document. `documentElement.scrollHeight` vaut donc toujours
    // la hauteur du viewport : s'y fier ne photographie que le haut de la page.
    // On mesure le conteneur qui défile réellement.
    const m = await evaluate<{ sw: number; cw: number; h1: string; coarse: boolean; hauteur: number }>(cdp, session,
      `(() => {
        let hauteur = document.documentElement.scrollHeight;
        for (const el of document.querySelectorAll("main, div")) {
          if (el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 200) {
            hauteur = Math.max(hauteur, el.scrollHeight + (el.getBoundingClientRect().top || 0));
          }
        }
        return {
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
          h1: (document.querySelector("h1")||{}).textContent || "(pas de h1)",
          coarse: matchMedia("(pointer: coarse)").matches,
          hauteur: Math.ceil(hauteur),
        };
      })()`);

    await cdp.send("Emulation.setDeviceMetricsOverride",
      { width: f.width, height: Math.min(m.hauteur, 6000), deviceScaleFactor: 1, mobile: f.tactile }, session);
    await new Promise((r) => setTimeout(r, 350));
    await shot(cdp, session, OUT, `profil-${f.nom}`);

    const deborde = m.sw > m.cw + 1 ? `  ⚠️ DÉBORDE ${m.sw}>${m.cw}` : "";
    console.log(`  ${rendu ? "✓" : "✗"} ${f.nom.padEnd(9)} ${String(f.width).padStart(4)}px · pointer:coarse=${String(m.coarse).padEnd(5)} · h1 « ${m.h1.trim().slice(0, 30)} » · page ${m.hauteur}px${deborde}`);
  }

  /* ── les sections, en bureau ──
     Une capture de la seule vue par défaut ne prouverait pas que la navigation
     de fiche rend autre chose : chaque section est une URL, on les photographie. */
  // ⚠️ `maxTouchPoints` doit rester entre 1 et 16 MÊME quand on désactive le
  // tactile : CDP rejette 0 et la capture s'arrête net.
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false, maxTouchPoints: 1 }, session);
  await cdp.send("Emulation.setEmitTouchEventsForMouse", { enabled: false, configuration: "desktop" }, session);
  for (const sec of ["scolarite", "presence", "notes", "finance", "famille", "documents"]) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, session);
    await cdp.send("Page.navigate", { url: `${url}?section=${sec}` }, session);
    const ok = await waitFor(cdp, session, STABLE, 40_000);
    const m = await evaluate<{ sw: number; cw: number; actif: string; blocs: number }>(cdp, session,
      `({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
          actif: (document.querySelector('[aria-current="page"][href*="section="]')||{}).textContent || "(aucun)",
          blocs: document.querySelectorAll("main h2").length })`);
    await shot(cdp, session, OUT, `section-${sec}`);
    const deborde = m.sw > m.cw + 1 ? `  ⚠️ DÉBORDE ${m.sw}>${m.cw}` : "";
    console.log(`  ${ok ? "✓" : "✗"} section ${sec.padEnd(12)} onglet actif « ${m.actif.trim()} » · ${m.blocs} blocs${deborde}`);
  }

  cdp.close();
  chrome.kill();
  console.log(`\n  ${FORMATS.length + 6} captures dans ${OUT}\n`);
}

main()
  .catch((e) => { console.error("  ERREUR", e.message ?? e); })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      await prisma.payment.deleteMany({ where: { invoiceId: { in: trash.invoiceIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: trash.invoiceIds } } });
      await prisma.grade.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.attendance.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.classSubject.deleteMany({ where: { subjectId: { in: trash.subjectIds } } });
      await prisma.subject.deleteMany({ where: { id: { in: trash.subjectIds } } });
      await prisma.term.deleteMany({ where: { id: { in: trash.termIds } } });
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
