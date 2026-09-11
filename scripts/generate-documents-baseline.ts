/**
 * Baseline PDF du chantier « Générateur de documents » — phase 0 (v17).
 *
 *   npm run script -- scripts/generate-documents-baseline.ts
 *
 * PHOTOGRAPHIE l'existant, ne le modifie pas. Rendu serveur (Chromium
 * headless piloté par CDP, `Page.printToPDF` — le même moteur que
 * `window.print()`) des 7 générateurs de documents actuels, avec des
 * données RÉELLES du locataire de travail SENG.CO ACADEMY.
 *
 * Sert de référence de comparaison pour tout le chantier v17 : avant/après
 * à chaque phase, et matière au test de non-régression visuelle du jalon B.
 * Aucune brique de fidélité (millimètres, éditeur) n'est posée ici — voir
 * `context.md`, chantier « Générateur de documents », pour la frontière
 * exacte entre le jalon A et le jalon B.
 *
 * ⚠️ Lecture seule sur les données métier : aucune école, élève, facture ou
 * note n'est créée, modifiée ou supprimée. Seule l'authentification
 * (`sessionCookiesForExistingUser`) sollicite Supabase Auth — sans mot de
 * passe, sans e-mail envoyé, sans nouveau compte.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, sessionCookiesForExistingUser, printPDF } from "./_cdp";

const PORT = Number(process.env.CDP_PORT ?? 9491);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "docs", "documents-reference");

/** Vrai une fois la page chargée et son DOM stable — même principe que les autres sondes CDP du dépôt. */
const STABLE = `(() => {
  if (document.readyState !== "complete") return false;
  const n = document.querySelectorAll("body *").length;
  const s = (window.__baseline = window.__baseline || { n: -1, fois: 0 });
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 4 && n > 0;
})()`;

async function nav(cdp: CDP, session: string, url: string): Promise<boolean> {
  await cdp.send("Page.navigate", { url }, session);
  const ok = await waitFor(cdp, session, STABLE, 25_000);
  // Laisse les polices web finir de charger avant la capture — sinon la
  // première page imprimée peut figer une police de repli.
  await evaluate(cdp, session, `(document.fonts ? document.fonts.ready.then(() => true) : true)`);
  return ok;
}

async function setCookies(cdp: CDP, session: string, cookies: { name: string; value: string }[]) {
  for (const c of cookies) {
    await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);
  }
}

/** Pilote un `<select>` React comme le ferait un utilisateur — pour les écrans sans paramètre d'URL. */
async function selectNth(cdp: CDP, session: string, selectIndex: number, value: string) {
  await evaluate(
    cdp,
    session,
    `(() => {
      const el = document.querySelectorAll("select")[${selectIndex}];
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`,
  );
  await new Promise((r) => setTimeout(r, 500));
}

type Cible = {
  slug: string;
  title: string;
  url: string;
  landscape?: boolean;
  afterNav?: (cdp: CDP, session: string) => Promise<void>;
  note: string;
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  if (!chromeAvailable()) throw new Error("Chrome introuvable — voir CHROME dans scripts/_cdp.ts.");

  // ── Résolution des cibles réelles sur SENG.CO ACADEMY (lecture seule) ──
  const school = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!school) throw new Error("SENG.CO ACADEMY introuvable — baseline annulée, aucune capture n'a de sens sans elle.");

  const owner = await prisma.user.findFirst({ where: { schoolId: school.id, role: "OWNER" }, select: { email: true } });
  if (!owner) throw new Error("Aucun OWNER sur SENG.CO ACADEMY — impossible de se connecter pour la capture.");

  const firstStudent = await prisma.student.findFirst({
    where: { schoolId: school.id }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true },
  });
  if (!firstStudent) throw new Error("Aucun élève sur SENG.CO ACADEMY — baseline annulée.");

  const gradeTop = await prisma.grade.groupBy({
    by: ["studentId"],
    where: { class: { schoolId: school.id } },
    _count: { _all: true },
    orderBy: { _count: { studentId: "desc" } },
    take: 1,
  });
  const bulletinStudentId = gradeTop[0]?.studentId ?? firstStudent.id;

  const invoice = await prisma.invoice.findFirst({ where: { schoolId: school.id }, select: { studentId: true } });
  const billingStudentId = invoice?.studentId ?? firstStudent.id;

  const firstClass = await prisma.class.findFirst({ where: { schoolId: school.id }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const overdueCount = await prisma.invoice.count({ where: { schoolId: school.id, status: "OVERDUE" } });

  console.log(`École     : ${school.name} (${school.id})`);
  console.log(`Connexion : ${owner.email} (OWNER)`);
  console.log(`Élève « certificat/fiche »  : ${firstStudent.firstName} ${firstStudent.lastName}`);
  console.log(`Élève « bulletin » (le plus de notes) : ${bulletinStudentId}`);
  console.log(`Élève « facturation »       : ${billingStudentId}`);
  console.log(`Classe « emploi du temps »  : ${firstClass?.name ?? "aucune"}`);
  console.log(`Factures en retard          : ${overdueCount}`);

  const CIBLES: Cible[] = [
    {
      slug: "certificat-de-scolarite",
      title: "Certificat de scolarité",
      url: `${BASE}/dashboard/documents/certificate?studentId=${firstStudent.id}`,
      note: "Élève : premier par ordre alphabétique sur SENG.CO ACADEMY.",
    },
    {
      slug: "fiche-de-renseignements",
      title: "Fiche de renseignements",
      url: `${BASE}/dashboard/documents/info-sheet?studentId=${firstStudent.id}`,
      note: "Élève : premier par ordre alphabétique sur SENG.CO ACADEMY.",
    },
    {
      slug: "facture",
      title: "Facture",
      url: `${BASE}/dashboard/payments/invoice?studentId=${billingStudentId}`,
      note: "⚠️ Ce générateur compose un brouillon (numéro et lignes par défaut, stockage `localStorage`) — il ne lit pas un `Invoice` déjà émis. Détail dans l'audit phase 1.",
    },
    {
      slug: "recu-de-paiement",
      title: "Reçu de paiement",
      url: `${BASE}/dashboard/payments/receipt?studentId=${billingStudentId}`,
      note: "⚠️ Même limite que la facture : composeur de brouillon, pas une vue d'un `Payment` réel.",
    },
    {
      slug: "bulletin-de-notes",
      title: "Bulletin de notes",
      url: `${BASE}/dashboard/grades/report-card?studentId=${bulletinStudentId}&embed=1`,
      note: "Élève avec le plus de notes enregistrées sur SENG.CO ACADEMY — le cas le plus chargé, comme demandé.",
    },
    {
      slug: "emploi-du-temps",
      title: "Emploi du temps",
      url: `${BASE}/dashboard/documents/timetable`,
      landscape: true,
      afterNav: async (cdp, session) => { if (firstClass) await selectNth(cdp, session, 0, firstClass.id); },
      note: "Classe sélectionnée en pilotant le menu déroulant : cet écran n'accepte aucun paramètre d'URL.",
    },
  ];

  /**
   * ⚠️ Décision de Kory (phase 0) : une baseline sur l'état vide ne sert à
   * rien pour comparer avant/après, et fabriquer un impayé pour en produire
   * une serait une donnée de test injectée en base — interdit ici. Le
   * document est donc SKIPPÉ tant qu'aucune facture en retard n'existe
   * réellement sur SENG.CO ACADEMY ; relancer ce script plus tard, quand
   * `overdueCount` sera positif, le capturera automatiquement.
   */
  const skipped: Record<string, unknown>[] = [];
  if (overdueCount > 0) {
    CIBLES.push({
      slug: "lettre-de-relance",
      title: "Lettre de relance",
      url: `${BASE}/dashboard/documents/reminder`,
      note: "Première facture en retard du menu déroulant.",
    });
  } else {
    console.log("\n⚠️ Lettre de relance SKIPPÉE : 0 facture en retard sur SENG.CO ACADEMY.");
    skipped.push({
      slug: "lettre-de-relance",
      title: "Lettre de relance",
      reason: "0 facture en retard au moment de la capture. Baseline sur écran vide jugée inutile à la comparaison (décision Kory, phase 0). Aucune facture fabriquée pour combler le trou.",
      todo: "Relancer scripts/generate-documents-baseline.ts dès qu'une vraie facture OVERDUE existera sur SENG.CO ACADEMY.",
    });
  }

  const profile = mkdtempSync(join(tmpdir(), "cdp-baseline-"));
  const launched = await launchChrome(PORT, profile);
  if (!launched) { rmSync(profile, { recursive: true, force: true }); throw new Error("Chrome n'a pas ouvert son point DevTools."); }
  const { chrome, wsUrl } = launched;

  try {
    const cdp = await CDP.open(wsUrl);
    const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const session = attached.sessionId;
    await cdp.send("Page.enable", {}, session);
    await cdp.send("Network.enable", {}, session);

    const cookies = await sessionCookiesForExistingUser(owner.email);
    await setCookies(cdp, session, cookies);

    const manifest: Record<string, unknown>[] = [];
    for (const cible of CIBLES) {
      console.log(`\n→ ${cible.title}`);
      const ok = await nav(cdp, session, cible.url);
      if (!ok) console.warn(`  ⚠️ page pas stabilisée avant capture — vérifier ${cible.url} à l'œil.`);
      if (cible.afterNav) await cible.afterNav(cdp, session);
      const file = await printPDF(cdp, session, OUT_DIR, cible.slug, { landscape: cible.landscape });
      console.log(`  ✓ ${file}`);
      console.log(`  ${cible.note}`);
      manifest.push({ slug: cible.slug, title: cible.title, url: cible.url, note: cible.note, capturedAt: new Date().toISOString() });
    }

    writeFileSync(
      join(OUT_DIR, "manifest.json"),
      JSON.stringify(
        {
          tag: "v17-documents-baseline",
          school: school.name,
          schoolId: school.id,
          capturedWith: owner.email,
          generatedAt: new Date().toISOString(),
          items: manifest,
          skipped,
        },
        null,
        2,
      ),
    );
    cdp.close();
  } finally {
    chrome.kill();
    rmSync(profile, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
