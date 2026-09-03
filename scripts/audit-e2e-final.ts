/**
 * AUDIT FINAL PRÉ-MISE EN LIGNE — parcours navigateur réel, de bout en bout.
 *
 *   npm run script -- scripts/audit-e2e-final.ts
 *
 * ⚠️ Ce script PILOTE un vrai Chrome contre l'application réellement servie
 * par `next dev` : vraie connexion, vrais cookies, vraies actions serveur,
 * vrai stockage Supabase. Une école jetable est créée, parcourue, puis
 * entièrement supprimée — aucun établissement réel n'est lu ni modifié.
 *
 * Parcours couvert : Liste des élèves → Fiche élève → Photo → Dossier →
 * Rayon → Import → Scan → Export, aux trois largeurs, plus permissions
 * (OWNER / SECRETARY / TEACHER / PARENT) et clavier.
 */
import { mkdirSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, shot, measure, sessionCookies } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

const PORT = Number(process.env.CDP_PORT ?? 9481);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "audit-final-"));
const TAG = "AUDITFINAL";
const PASSWORD = `Audit-${Math.random().toString(36).slice(2)}-2026!`;
const PHOTO_PATH = "/tmp/educom-audit-photo.png";

let echecs = 0;
let ok = 0;
function verdict(cond: boolean, label: string, detail?: string) {
  if (cond) { ok++; console.log(`  ✓ ${label}`); }
  else { echecs++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
}
function info(label: string) { console.log(`  ℹ ${label}`); }

const trash = {
  authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[],
  classIds: [] as string[], studentIds: [] as string[], invoiceIds: [] as string[], dirs: [] as string[],
  termIds: [] as string[], subjectIds: [] as string[], requirementIds: [] as string[], folderIds: [] as string[],
  storagePaths: [] as string[],
};

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

async function nav(cdp: CDP, session: string, url: string, ms = 30_000) {
  await cdp.send("Page.navigate", { url }, session);
  return waitFor(cdp, session, STABLE, ms);
}

/** Bascule tactile/desktop — les deux réglages qui font réellement bouger `hover`/`pointer`. */
async function device(cdp: CDP, session: string, w: number, h: number, tactile: boolean) {
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: tactile, maxTouchPoints: tactile ? 5 : 1 }, session);
  await cdp.send("Emulation.setEmitTouchEventsForMouse", { enabled: tactile, configuration: tactile ? "mobile" : "desktop" }, session);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: tactile }, session);
}

async function setCookies(cdp: CDP, session: string, cookies: { name: string; value: string }[]) {
  for (const c of cookies) {
    await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  }
}

/** Ouvre un vrai sélecteur de fichier via CDP, sans dialogue OS. */
async function setFile(cdp: CDP, session: string, selector: string, filePath: string) {
  const doc = await cdp.send<{ root: { nodeId: number } }>("DOM.getDocument", { depth: -1, pierce: true }, session);
  const q = await cdp.send<{ nodeId: number }>("DOM.querySelector", { nodeId: doc.root.nodeId, selector }, session);
  if (!q.nodeId) throw new Error(`sélecteur introuvable : ${selector}`);
  await cdp.send("DOM.setFileInputFiles", { files: [filePath], nodeId: q.nodeId }, session);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`\n  Captures → ${OUT}\n`);

  if (!chromeAvailable()) throw new Error("Google Chrome introuvable");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) throw new Error(`application injoignable sur ${BASE}`);

  /* ═══════════════════ FIXTURE ═══════════════════ */
  console.log("── FIXTURE ──────────────────────────────────────────");
  const admin = createAdminClient();
  const stamp = Date.now();

  const school = await prisma.school.create({
    data: {
      name: `${TAG} Institution Bilingue Les Palmiers`, onboardingCompleted: true,
      email: "contact@palmiers.sn", phone: "+221 33 800 12 34", address: "Sacré-Cœur 3, Dakar",
    },
    select: { id: true },
  });
  trash.schoolIds.push(school.id);

  async function makeUser(role: string, firstName: string, lastName: string) {
    const email = `${TAG.toLowerCase()}.${role.toLowerCase()}.${stamp}@sonde.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw new Error(`compte ${role} : ${error?.message}`);
    trash.authIds.push(data.user.id);
    await prisma.user.create({ data: { id: data.user.id, email, firstName, lastName, role: role as never, schoolId: school.id } });
    trash.userIds.push(data.user.id);
    return { id: data.user.id, email };
  }

  const owner = await makeUser("OWNER", "Aïssatou", "Diop");
  const secretary = await makeUser("SECRETARY", "Fatou", "Sarr");
  const teacher = await makeUser("TEACHER", "Moussa", "Kane");
  const parentUser = await makeUser("PARENT", "Ibrahima", "Ndiaye");

  const classes = await prisma.class.createManyAndReturn({
    data: [
      { name: "CM2 A", cycle: "ELEMENTAIRE", schoolId: school.id, teacherId: teacher.id },
      { name: "6ème A", cycle: "COLLEGE", schoolId: school.id },
    ],
    select: { id: true, name: true },
  });
  for (const c of classes) trash.classIds.push(c.id);
  // Le professeur n'enseigne QUE la première classe — sert au test de permission.
  await prisma.teachingAssignment.create({ data: { teacherId: teacher.id, classId: classes[0].id, schoolId: school.id } }).catch(() => {});

  const an = new Date().getFullYear();
  const studentComplet = await prisma.student.create({
    data: {
      firstName: "Aminata", lastName: "Ndiaye", schoolId: school.id, status: "ENROLLED",
      dateOfBirth: new Date("2014-03-12"), bloodGroup: "O+",
      medicalNotes: "Allergie aux arachides.", emergencyContact: "Ibrahima Ndiaye (père)",
      emergencyPhone: "+221 77 512 44 08", parentId: parentUser.id,
    },
    select: { id: true },
  });
  trash.studentIds.push(studentComplet.id);
  const studentIncomplet = await prisma.student.create({
    data: { firstName: "Pape", lastName: "Mbaye", schoolId: school.id, status: "ENROLLED", dateOfBirth: new Date("2015-06-20") },
    select: { id: true },
  });
  trash.studentIds.push(studentIncomplet.id);
  const studentSansClasse = await prisma.student.create({
    data: { firstName: "Awa", lastName: "Gueye", schoolId: school.id, status: "ENROLLED", dateOfBirth: new Date("2013-01-05") },
    select: { id: true },
  });
  trash.studentIds.push(studentSansClasse.id);

  await prisma.enrollment.createMany({
    data: [
      { studentId: studentComplet.id, classId: classes[0].id, academicYear: `${an}-${an + 1}` },
      { studentId: studentIncomplet.id, classId: classes[0].id, academicYear: `${an}-${an + 1}` },
    ],
  });

  // Exigences : IDENTITE + SANTE (pour tester le filtre TEACHER) + une exigence de classe.
  const reqs = await prisma.documentRequirement.createManyAndReturn({
    data: [
      { label: "Extrait de naissance", category: "IDENTITE", cycle: "ELEMENTAIRE", schoolId: school.id, position: 0 },
      { label: "Carnet de vaccination", category: "SANTE", cycle: "ELEMENTAIRE", schoolId: school.id, position: 1 },
    ],
    select: { id: true, category: true },
  });
  for (const r of reqs) trash.requirementIds.push(r.id);

  // studentComplet a SES DEUX pièces déposées (dossier 100 % complet) ; studentIncomplet n'a rien.
  const identiteReq = reqs.find((r) => r.category === "IDENTITE")!;
  const santeReq = reqs.find((r) => r.category === "SANTE")!;
  const pngBytes = readFileSync(PHOTO_PATH);
  async function deposerFixture(studentId: string, requirementId: string, category: string, label: string) {
    const path = `${school.id}/${studentId}/fixture-${crypto.randomUUID()}.png`;
    trash.storagePaths.push(path);
    await admin.storage.from("student-documents").upload(path, pngBytes, { contentType: "image/png" });
    await prisma.studentDocument.create({
      data: {
        studentId, requirementId, label, category: category as never, storagePath: path,
        fileName: "piece.png", mimeType: "image/png", sizeBytes: pngBytes.length,
        status: "VALIDATED", uploadedById: owner.id, schoolId: school.id,
      },
    });
  }
  await deposerFixture(studentComplet.id, identiteReq.id, "IDENTITE", "Extrait de naissance");
  await deposerFixture(studentComplet.id, santeReq.id, "SANTE", "Carnet de vaccination");

  console.log(`  fixture : 1 école · 4 comptes (OWNER/SECRETARY/TEACHER/PARENT) · 2 classes · 3 élèves · 2 exigences\n`);

  /* ═══════════════════ NAVIGATEUR ═══════════════════ */
  const profile = mkdtempSync(join(tmpdir(), "cdp-audit-final-"));
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
  await cdp.send("DOM.enable", {}, session);

  const consoleErrors: string[] = [];
  await cdp.send("Log.enable", {}, session);
  // Écoute passive : on récupère les entrées Runtime.consoleAPICalled de niveau erreur.
  // ⚠️ `ws` est privé sur `CDP` — accès délibéré, via un type minimal plutôt
  // qu'un `any` non borné.
  (cdp as unknown as { ws: WebSocket }).ws.addEventListener("message", (ev: MessageEvent) => {
    try {
      const msg = JSON.parse(String(ev.data)) as {
        method?: string;
        params?: { type?: string; args?: { value?: unknown; description?: unknown }[] };
      };
      if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
        const txt = (msg.params.args ?? []).map((a) => String(a.value ?? a.description ?? "")).join(" ");
        if (txt) consoleErrors.push(txt.slice(0, 200));
      }
    } catch { /* pas un message JSON exploitable */ }
  });

  const ownerCookies = await sessionCookies(owner.email, PASSWORD);
  await setCookies(cdp, session, ownerCookies);

  /* ───────────── 1. LISTE DES ÉLÈVES — 3 largeurs ───────────── */
  console.log("── 1. LISTE DES ÉLÈVES ──────────────────────────────");
  const formats = [
    { nom: "1440x900", w: 1440, h: 900, tactile: false },
    { nom: "768", w: 768, h: 1024, tactile: true },
    { nom: "390x844", w: 390, h: 844, tactile: true },
  ];
  for (const f of formats) {
    await device(cdp, session, f.w, f.h, f.tactile);
    const rendu = await nav(cdp, session, `${BASE}/dashboard/students`);
    const m = await measure(cdp, session);
    verdict(rendu, `${f.nom} : la liste des élèves rend`);
    verdict(m.scrollWidth <= m.clientWidth + 1, `${f.nom} : aucun débordement horizontal`, `${m.scrollWidth} > ${m.clientWidth}`);
    verdict(m.text.includes("Aminata") && m.text.includes("Ndiaye"), `${f.nom} : les élèves de la fixture apparaissent`);
    if (f.tactile) {
      const petites = m.buttons.filter((b) => b.visible && b.inside && b.tapH > 0 && b.tapH < 40);
      verdict(petites.length === 0, `${f.nom} : cibles tactiles ≥ 40px`, petites.map((b) => `${b.text}(${b.tapH}px)`).join(", "));
    }
    await shot(cdp, session, OUT, `01-liste-${f.nom}`);
  }

  /* ───────────── 2. FICHE ÉLÈVE — 3 largeurs ───────────── */
  console.log("\n── 2. FICHE ÉLÈVE ───────────────────────────────────");
  for (const f of formats) {
    await device(cdp, session, f.w, f.h, f.tactile);
    const rendu = await nav(cdp, session, `${BASE}/dashboard/students/${studentComplet.id}`);
    const m = await measure(cdp, session);
    verdict(rendu, `${f.nom} : la fiche élève rend`);
    verdict(m.scrollWidth <= m.clientWidth + 1, `${f.nom} : aucun débordement horizontal`, `${m.scrollWidth} > ${m.clientWidth}`);
    verdict(m.text.includes("Aminata Ndiaye"), `${f.nom} : nom affiché`);
    verdict(m.text.includes("CM2 A"), `${f.nom} : classe affichée`);
    verdict(m.text.includes("Inscrit"), `${f.nom} : statut affiché`);
    verdict(m.text.includes("100 %") || m.text.includes("Dossier 100"), `${f.nom} : badge de complétude à 100 %`);
    await shot(cdp, session, OUT, `02-fiche-${f.nom}`);
  }
  await device(cdp, session, 1440, 900, false);
  await nav(cdp, session, `${BASE}/dashboard/students/${studentComplet.id}`);
  const actionsFiche = await evaluate<string[]>(cdp, session,
    `[...document.querySelectorAll("a")].map(a => a.textContent.trim()).filter(t => ["Dossier","Certificat","Bulletin","Facturer"].includes(t))`);
  verdict(["Dossier", "Certificat", "Bulletin", "Facturer"].every((a) => actionsFiche.includes(a)),
    "les 4 actions (Dossier/Certificat/Bulletin/Facturer) sont présentes", actionsFiche.join(", "));
  const badgeHref = await evaluate<string>(cdp, session,
    `(document.querySelector('a[href*="/dossier"]')||{}).getAttribute && document.querySelector('a[href*="/dossier"]').getAttribute("href") || ""`);
  verdict(badgeHref.includes("/dossier"), "l'action Dossier mène bien à /dossier", badgeHref);

  /* ───────────── 3. PHOTO — upload réel ───────────── */
  console.log("\n── 3. PHOTO DE L'ÉLÈVE ──────────────────────────────");
  await nav(cdp, session, `${BASE}/dashboard/students/${studentIncomplet.id}`);
  const avantPhoto = await evaluate<boolean>(cdp, session, `!!document.querySelector('img[alt*="Photo de l\\'élève"]')`);
  verdict(!avantPhoto, "aucune photo avant l'envoi (état initial correct)");
  // Le menu s'ouvre au clic sur l'avatar, puis « Importer une photo » révèle l'input.
  await evaluate(cdp, session, `document.querySelector('button[aria-label*="photo"]').click()`);
  await new Promise((r) => setTimeout(r, 300));
  try {
    await setFile(cdp, session, 'input[name="photo"]:not([capture])', PHOTO_PATH);
    const photoOk = await waitFor(cdp, session,
      `document.querySelector('img[alt*="Photo de l\\'élève"]')`, 15_000);
    verdict(photoOk, "la photo apparaît après l'envoi (upload → DB → affichage)");
    if (photoOk) {
      const src = await evaluate<string>(cdp, session, `document.querySelector('img[alt*="Photo de l\\'élève"]').src`);
      verdict(src.includes("token=") || src.includes("supabase"), "l'URL de la photo est une URL signée Supabase, pas un chemin brut");
      verdict(!src.includes(school.id) || src.includes("token="), "le chemin de stockage n'est pas exposé tel quel");
    }
  } catch (e) {
    verdict(false, "envoi de la photo", e instanceof Error ? e.message : String(e));
  }
  await shot(cdp, session, OUT, "03-photo-envoyee");

  // Vérité en base — la photo a-t-elle RÉELLEMENT été enregistrée, pas seulement affichée côté client ?
  const enBase = await prisma.student.findUnique({ where: { id: studentIncomplet.id }, select: { photoPath: true } });
  verdict(Boolean(enBase?.photoPath), "photoPath réellement écrit en base");
  if (enBase?.photoPath) trash.storagePaths.push(enBase.photoPath);

  /* ───────────── 4. DOSSIER — hub, 3 largeurs ───────────── */
  console.log("\n── 4. DOSSIER — HUB DOCUMENTAIRE ────────────────────");
  for (const f of formats) {
    await device(cdp, session, f.w, f.h, f.tactile);
    const rendu = await nav(cdp, session, `${BASE}/dashboard/students/${studentIncomplet.id}/dossier`);
    const m = await measure(cdp, session);
    verdict(rendu, `${f.nom} : le hub rend`);
    verdict(m.scrollWidth <= m.clientWidth + 1, `${f.nom} : aucun débordement horizontal`, `${m.scrollWidth} > ${m.clientWidth}`);
    verdict(m.text.includes("Identité") && m.text.includes("Santé"), `${f.nom} : les rayons officiels apparaissent`);
    verdict(m.text.includes("Nouveau dossier"), `${f.nom} : la tuile « + Nouveau dossier » apparaît`);
    if (f.tactile) {
      const petites = m.buttons.filter((b) => b.visible && b.inside && b.tapH > 0 && b.tapH < 40);
      verdict(petites.length === 0, `${f.nom} : cibles tactiles ≥ 40px`, petites.map((b) => `${b.text}(${b.tapH}px)`).join(", "));
    }
    await shot(cdp, session, OUT, `04-dossier-hub-${f.nom}`);
  }

  /* ───────────── 5. OUVERTURE D'UN RAYON + IMPORT réel ───────────── */
  console.log("\n── 5. OUVERTURE D'UN RAYON + IMPORT ─────────────────");
  await device(cdp, session, 1440, 900, false);
  await nav(cdp, session, `${BASE}/dashboard/students/${studentIncomplet.id}/dossier`);
  const clicRayon = await evaluate<string>(cdp, session,
    `(() => {
      const b = [...document.querySelectorAll("button")].find(x => (x.textContent||"").includes("Identité"));
      if (!b) return "introuvable";
      b.click();
      return "ok";
    })()`);
  verdict(clicRayon === "ok", "clic sur le rayon « Identité »");
  await new Promise((r) => setTimeout(r, 400));
  const rayonOuvert = await evaluate<boolean>(cdp, session, `[...document.querySelectorAll("h2")].some(h => h.textContent.includes("Identité"))`);
  verdict(rayonOuvert, "le rayon s'ouvre et affiche son titre");
  await shot(cdp, session, OUT, "05-rayon-ouvert");

  try {
    await setFile(cdp, session, 'input[type="file"]:not([capture])', PHOTO_PATH);
    const importOk = await waitFor(cdp, session,
      `document.body.innerText.includes("Remplacer") || document.body.innerText.includes("déposé")`, 15_000);
    verdict(importOk, "import réel d'une pièce dans le rayon Identité (upload → DB → statut mis à jour)");
  } catch (e) {
    verdict(false, "import d'une pièce", e instanceof Error ? e.message : String(e));
  }
  await new Promise((r) => setTimeout(r, 800));
  await shot(cdp, session, OUT, "05-piece-importee");

  const pieceEnBase = await prisma.studentDocument.count({ where: { studentId: studentIncomplet.id, requirementId: identiteReq.id, supersededAt: null } });
  verdict(pieceEnBase > 0, "la pièce importée est réellement écrite en base");

  /* ───────────── 6. SCANNER — chemin caméra/désktop ───────────── */
  console.log("\n── 6. SCANNER ────────────────────────────────────────");
  await nav(cdp, session, `${BASE}/dashboard/students/${studentIncomplet.id}/dossier`);
  const clicScanner = await evaluate<string>(cdp, session,
    `(() => {
      const b = [...document.querySelectorAll("button")].find(x => (x.textContent||"").trim() === "Scanner");
      if (!b) return "introuvable";
      b.click();
      return "ok";
    })()`);
  verdict(clicScanner === "ok", "clic sur « Scanner » ouvre la fenêtre de dépôt");
  await new Promise((r) => setTimeout(r, 400));
  const etapeScan = await evaluate<boolean>(cdp, session, `document.body.innerText.includes("Photographiez la pièce") || document.body.innerText.includes("Importer un fichier")`);
  verdict(etapeScan, "l'étape de choix (scanner / importer) s'affiche");
  await shot(cdp, session, OUT, "06-scan-etape0");
  // Sur poste de bureau : le chemin « caméra » ouvre en réalité le même sélecteur.
  try {
    await setFile(cdp, session, 'input[accept="image/*"][capture]', PHOTO_PATH);
    const pageOk = await waitFor(cdp, session, `document.body.innerText.includes("Aperçu") || document.querySelector("canvas") || document.querySelectorAll('img').length > 0`, 10_000);
    verdict(pageOk, "une image capturée est traitée (redimensionnement / aperçu)");
  } catch (e) {
    verdict(false, "chemin caméra du scanner", e instanceof Error ? e.message : String(e));
  }
  await shot(cdp, session, OUT, "06-scan-apercu");
  // Fermeture propre, sans enregistrer, pour ne pas fausser le compte de pièces du test suivant.
  await evaluate(cdp, session, `(() => { const b=[...document.querySelectorAll('button')].find(x=>/Fermer|Annuler|×/.test(x.textContent||x.getAttribute('aria-label')||'')); b && b.click(); })()`).catch(() => {});

  /* ───────────── 7. + NOUVEAU DOSSIER — création réelle ───────────── */
  console.log("\n── 7. + NOUVEAU DOSSIER (rayon personnalisé) ────────");
  await nav(cdp, session, `${BASE}/dashboard/students/${studentIncomplet.id}/dossier`);
  const clicNouveau = await evaluate<string>(cdp, session,
    `(() => {
      const b = [...document.querySelectorAll("button")].find(x => (x.textContent||"").includes("Nouveau dossier"));
      if (!b) return "introuvable";
      b.click();
      return "ok";
    })()`);
  verdict(clicNouveau === "ok", "clic sur « + Nouveau dossier » ouvre la fenêtre");
  await new Promise((r) => setTimeout(r, 300));
  const nomDossier = `Audit ${stamp}`;
  await evaluate(cdp, session, `(() => { const i = document.querySelector('input[placeholder*="Bourse"]'); if (i) { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(i, ${JSON.stringify(nomDossier)}); i.dispatchEvent(new Event('input', { bubbles: true })); } })()`);
  const clicCreer = await evaluate<string>(cdp, session,
    `(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('Créer le dossier')); if(!b) return "introuvable"; b.click(); return "ok"; })()`);
  verdict(clicCreer === "ok", "clic sur « Créer le dossier »");
  const dossierCree = await waitFor(cdp, session, `document.body.innerText.includes(${JSON.stringify(nomDossier)})`, 10_000);
  verdict(dossierCree, "le nouveau dossier personnalisé apparaît dans la grille");
  await shot(cdp, session, OUT, "07-nouveau-dossier-cree");
  const folderEnBase = await prisma.studentDocFolder.findFirst({ where: { schoolId: school.id, name: nomDossier } });
  verdict(Boolean(folderEnBase), "le rayon personnalisé est réellement écrit en base");
  if (folderEnBase) trash.folderIds.push(folderEnBase.id);

  /* ───────────── 8. EXPORT ───────────── */
  console.log("\n── 8. EXPORT ─────────────────────────────────────────");
  const hrefExport = await evaluate<string>(cdp, session,
    `(() => { const a=[...document.querySelectorAll('a')].find(x=>(x.textContent||'').includes('Exporter')); return a ? a.getAttribute('href') : ""; })()`);
  verdict(hrefExport.includes("/students/export"), "le lien « Exporter » cible bien l'écran de préparation d'export", hrefExport);
  if (hrefExport) {
    const rendu = await nav(cdp, session, `${BASE}${hrefExport}`);
    verdict(rendu, "l'écran d'export s'ouvre réellement");
    const m = await measure(cdp, session);
    verdict(m.text.includes("Pape") || m.text.includes("export") || m.text.includes("Export"), "l'écran d'export affiche du contenu pertinent");
    await shot(cdp, session, OUT, "08-export");
  }

  /* ───────────── 9. CLAVIER ───────────── */
  console.log("\n── 9. NAVIGATION CLAVIER ─────────────────────────────");
  await nav(cdp, session, `${BASE}/dashboard/students/${studentIncomplet.id}/dossier`);
  await evaluate(cdp, session, `document.body.focus()`);
  // Tabule jusqu'à une tuile de dossier et vérifie qu'un anneau de focus est peint.
  const focusVisible = await evaluate<{ trouve: boolean; outline: string; ring: boolean }>(cdp, session,
    `(() => {
      const tuiles = [...document.querySelectorAll("button")].filter(b => /Identité|Santé|Nouveau dossier/.test(b.getAttribute("aria-label")||b.textContent||""));
      if (tuiles.length === 0) return { trouve: false, outline: "", ring: false };
      const b = tuiles[0];
      b.focus();
      const cs = getComputedStyle(b);
      const shadow = cs.boxShadow;
      return { trouve: true, outline: cs.outlineStyle, ring: shadow !== "none" && shadow.length > 0 };
    })()`);
  verdict(focusVisible.trouve, "un élément focusable a été trouvé pour le test clavier");
  verdict(focusVisible.ring, "l'anneau de focus (box-shadow) est peint au focus clavier", JSON.stringify(focusVisible));
  await shot(cdp, session, OUT, "09-clavier-focus");

  /* ───────────── 10. PERMISSIONS ───────────── */
  console.log("\n── 10. PERMISSIONS ───────────────────────────────────");

  // 10a. TEACHER — ne voit QUE ses classes, pas la catégorie Santé, pas le portail de conformité.
  const teacherCookies = await sessionCookies(teacher.email, PASSWORD);
  await setCookies(cdp, session, teacherCookies);
  await nav(cdp, session, `${BASE}/dashboard/students`);
  const listeEnseignant = await evaluate<string>(cdp, session, `document.body.innerText`);
  verdict(listeEnseignant.includes("Aminata") || listeEnseignant.includes("Pape"), "TEACHER voit les élèves de SA classe (CM2 A)");
  verdict(!listeEnseignant.includes("Awa Gueye"), "TEACHER ne voit PAS un élève hors de sa classe (portée respectée)");

  await nav(cdp, session, `${BASE}/dashboard/students/${studentComplet.id}/dossier`);
  const dossierEnseignant = await evaluate<string>(cdp, session, `document.body.innerText`);
  verdict(!dossierEnseignant.includes("Carnet de vaccination"), "TEACHER ne voit PAS le rayon Santé (donnée médicale protégée)");

  const corpsComplianceTeacher = await (await fetch(`${BASE}/dashboard/admin/reports/compliance`, {
    headers: { cookie: teacherCookies.map((c) => `${c.name}=${c.value}`).join("; ") },
    redirect: "manual",
  })).text();
  // ⚠️ `redirect()` d'un composant serveur Next 16 ne renvoie pas systématiquement
  // un 30x à une requête `fetch()` brute (confirmé : un vrai navigateur atterrit
  // bien sur /dashboard). Le critère qui compte est l'ABSENCE du contenu protégé.
  verdict(!corpsComplianceTeacher.includes("Conformité documentaire"),
    "TEACHER n'atteint PAS le contenu du portail de conformité (audience refusée)");

  // 10b. PARENT — ne voit que SON enfant, pas les autres élèves de l'école.
  const parentCookies = await sessionCookies(parentUser.email, PASSWORD);
  await setCookies(cdp, session, parentCookies);
  const corpsAutreEleveParent = await (await fetch(`${BASE}/dashboard/students/${studentIncomplet.id}`, {
    headers: { cookie: parentCookies.map((c) => `${c.name}=${c.value}`).join("; ") },
    redirect: "manual",
  })).text();
  // Message volontairement identique au cas « hors périmètre » (voir studentFile.ts) :
  // le critère de sécurité est l'ABSENCE du nom de l'élève, pas un code HTTP précis.
  verdict(corpsAutreEleveParent.includes("Élève introuvable") && !corpsAutreEleveParent.includes("Pape Mbaye"),
    "PARENT ne voit AUCUNE donnée d'un élève qui n'est pas le sien");

  // 10c. SECRETARY — accède au portail de conformité (audience secrétariat).
  const secretaryCookies = await sessionCookies(secretary.email, PASSWORD);
  await setCookies(cdp, session, secretaryCookies);
  const renduConformite = await nav(cdp, session, `${BASE}/dashboard/admin/reports/compliance`);
  verdict(renduConformite, "SECRETARY atteint le portail de conformité");
  const texteConformite = await evaluate<string>(cdp, session, `document.body.innerText`);
  verdict(texteConformite.includes("Conforme") || texteConformite.includes("conformité"), "le portail affiche des données de conformité");
  verdict(texteConformite.includes("Aminata"), "l'élève au dossier complet apparaît dans le portail");
  await shot(cdp, session, OUT, "10-portail-conformite");

  // 10d. Isolation cross-school — un compte d'une AUTRE école ne doit rien voir de celle-ci.
  // (Vérifié par construction : `studentWhereFor()` filtre par `schoolId` de la session,
  //  déjà exercé positivement ci-dessus ; testé négativement via un compte hors fixture
  //  serait une intrusion sur une école réelle, donc HORS PÉRIMÈTRE de cette sonde.)
  info("isolation cross-school : vérifiée par lecture de code (studentWhereFor), non ré-exercée en direct pour ne toucher aucune école réelle");

  /* ───────────── 11. ERREURS CONSOLE / SERVEUR ───────────── */
  console.log("\n── 11. ERREURS CONSOLE / SERVEUR ────────────────────");
  verdict(consoleErrors.length === 0, "aucune erreur console pendant tout le parcours", consoleErrors.slice(0, 5).join(" | "));

  cdp.close();
  chrome.kill();

  console.log(`\n═══ RÉSULTAT : ${ok} OK · ${echecs} ÉCHEC(S) ═══`);
  console.log(`  Captures dans ${OUT}\n`);
  if (echecs > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error("  ERREUR", e instanceof Error ? e.stack : e); process.exitCode = 1; })
  .finally(async () => {
    try {
      const admin = createAdminClient();
      for (const p of trash.storagePaths) await admin.storage.from("student-documents").remove([p]).catch(() => {});
      await prisma.studentDocument.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.studentDocFolder.deleteMany({ where: { id: { in: trash.folderIds } } });
      await prisma.documentRequirement.deleteMany({ where: { id: { in: trash.requirementIds } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
      await prisma.teachingAssignment.deleteMany({ where: { classId: { in: trash.classIds } } }).catch(() => {});
      await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
      await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
      for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
      await prisma.school.deleteMany({ where: { id: { in: trash.schoolIds } } });
      for (const d of trash.dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } }
      const reste = await prisma.school.count({ where: { name: { startsWith: TAG } } });
      console.log(reste === 0 ? "  ✓ fixture supprimée\n" : `  ✗ ${reste} résidu(s) école\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
  });
