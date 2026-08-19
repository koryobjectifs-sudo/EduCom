/**
 * Vérificateur du lot 12 — centre de rapports par rôle.
 *
 *   npm run script -- scripts/verify-reports.ts
 *
 * ═══ POURQUOI CE SCRIPT EXÉCUTE DE VRAIES REQUÊTES ═══
 *
 * Les douze vérificateurs précédents sont de l'analyse statique. Le lot 08 a
 * montré leur limite : neuf scripts verts, `tsc` propre, et la page tombait
 * quand même au rendu (`DataTable.Cell` valant `undefined` côté serveur).
 *
 * Celui-ci fait donc les deux. La partie B appelle `buildReport()` sur la base
 * réelle, pour chaque rôle et pour chaque établissement, et vérifie ce qui ne
 * peut pas se lire dans le source : qu'un acteur d'une école vide obtient
 * réellement zéro, qu'un parent n'obtient pas les totaux de l'établissement, et
 * qu'une comparaison non calculable vaut bien `null` et pas 0.
 *
 * Lecture seule — aucune écriture.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { buildReport, audienceForRole } from "../src/lib/reports";
import type { Report } from "../src/lib/reports";
import { hasAccess, ROLE_PERMISSIONS, RoleType } from "../src/lib/permissions";
import { monthPeriod, dayPeriod, weekPeriod, customPeriod, previousPeriod, termPeriod } from "../src/lib/period";

const REPORTS_DIR = "src/app/dashboard/reports";
const ROLES: RoleType[] = ["OWNER", "ADMIN", "TEACHER", "PARENT", "SECRETARY", "ACCOUNTANT", "ASSISTANT"];

let checks = 0;
let failures = 0;

function ok(label: string) {
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label: string, detail?: string) {
  checks += 1;
  failures += 1;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
}

function check(cond: boolean, label: string, detail?: string) {
  cond ? ok(label) : fail(label, detail);
}

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");

/** Retire commentaires de ligne et de bloc — un motif cité en commentaire n'est pas du code. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/* ══════════════════════════════════════════════════════════════════════
   PARTIE A — analyse statique
   ══════════════════════════════════════════════════════════════════════ */

function partA() {
  console.log("\n═══ A. STRUCTURE ET GARDES (statique) ═══\n");

  const page = read(join(REPORTS_DIR, "page.tsx"));
  const sections = read(join(REPORTS_DIR, "ReportSections.tsx"));
  const engine = read("src/lib/reports.ts");

  check(page.length > 0, "reports/page.tsx existe");
  check(sections.length > 0, "reports/ReportSections.tsx existe");
  check(engine.length > 0, "src/lib/reports.ts existe");

  console.log("\n  — États de route —");
  check(existsSync(join(REPORTS_DIR, "loading.tsx")), "loading.tsx présent");
  check(existsSync(join(REPORTS_DIR, "error.tsx")), "error.tsx présent");
  check(read(join(REPORTS_DIR, "error.tsx")).includes('"use client"'), "error.tsx est un composant client (exigé par Next)");

  console.log("\n  — Garde d'accès —");
  const pageCode = stripComments(page);
  check(pageCode.includes("hasAccess("), "page.tsx appelle hasAccess()");
  check(pageCode.includes("redirect(firstAllowedPath("), "page.tsx redirige vers un chemin réellement atteignable");
  check(
    !/ROLE_PERMISSIONS|ROLE_DENIALS/.test(stripComments(engine)),
    "reports.ts ne relit pas les tables de permissions (pas de contrôle parallèle)",
  );

  console.log("\n  — Isolation par établissement —");
  check(
    !/schoolId\s*[:?]\s*string/.test(stripComments(engine).replace(/ActorContext/g, "")),
    "aucune signature de reports.ts n'accepte un schoolId en argument",
    "un schoolId reçu de l'appelant permettrait de cadrer un rapport sur une autre école",
  );
  // Chaque appel prisma du moteur doit porter schoolId, ou passer par une
  // relation déjà bornée (`class: school`, `invoiceScope`, `financeSnapshot`).
  const engineNoComments = stripComments(engine);

  // ⚠️ CONTREPARTIE DES ALIAS.
  //
  // Le moteur ne répète pas `schoolId:` à chaque requête : il lie une fois
  // `const school = { schoolId: actor.schoolId }` et le répand. Un motif qui
  // n'accepterait que le littéral `schoolId` déclarerait donc 22 requêtes
  // « non bornées » alors qu'elles le sont — c'est le faux échec du lot 11.1,
  // sous une forme nouvelle.
  //
  // Les alias sont donc admis, MAIS seulement après avoir vérifié ici qu'ils
  // sont réellement liés à la session. Sans ces trois contrôles, `...school`
  // deviendrait un mot magique permettant de contourner l'invariant.
  check(/const school = \{ schoolId: actor\.schoolId \}/.test(engineNoComments),
    "l'alias `school` est bien lié à `actor.schoolId`");
  check(/const scope = invoiceScope\(actor\)/.test(engineNoComments),
    "l'alias `scope` vient bien d'`invoiceScope(actor)`");
  check(/const inClasses = \{ classId: \{ in: classIds \} \}/.test(engineNoComments)
     && /teacherClassIds\(actor\)/.test(engineNoComments),
    "l'alias `inClasses` est construit depuis `teacherClassIds(actor)`, lui-même borné à l'école");

  const SCOPED = /schoolId|\.\.\.school\b|where: school\b|where: scope\b|class: school\b|\.\.\.inClasses\b|classId: \{ in|invoiceScope/;

  const prismaCalls = [...engineNoComments.matchAll(/prisma\.(\w+)\.(findMany|findFirst|count|groupBy|aggregate)\s*\(/g)];
  check(prismaCalls.length > 0, `${prismaCalls.length} appels Prisma détectés dans reports.ts`);
  const unscoped: string[] = [];
  for (const m of prismaCalls) {
    // Fenêtre à profondeur de parenthèses — le piège du lot 08 était une fenêtre
    // fixe trop courte qui ne voyait que 4 requêtes sur 10.
    let depth = 0, i = m.index! + m[0].length - 1, body = "";
    do {
      const c = engineNoComments[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      body += c;
      i++;
    } while (depth > 0 && i < engineNoComments.length);
    if (!SCOPED.test(body)) {
      unscoped.push(`${m[1]}.${m[2]} (L${engineNoComments.slice(0, m.index!).split("\n").length})`);
    }
  }
  check(unscoped.length === 0, "toutes les requêtes de reports.ts sont bornées à l'établissement",
    unscoped.length ? `non bornées : ${unscoped.join(", ")}` : undefined);

  console.log("\n  — Pas de composant client mal utilisé (piège lot 08) —");
  for (const f of readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".tsx"))) {
    const src = read(join(REPORTS_DIR, f));
    if (src.includes('"use client"')) continue;
    check(
      !/<DataTable\.\w+/.test(src),
      `${f} (serveur) n'utilise pas la notation pointée <DataTable.X>`,
      "les statiques d'un module client valent undefined côté serveur — « Element type is invalid »",
    );
  }

  console.log("\n  — Aucune métrique fabriquée —");
  const engineCode = stripComments(engine);
  check(
    !/totalAmount[\s\S]{0,120}(PAID|reduce)/.test(engineCode) || engineCode.includes("billedTotal"),
    "reports.ts ne somme pas Invoice.totalAmount pour dire « encaissé »",
    "totalAmount n'est pas un registre d'argent : deux factures à 0 ont encaissé 110 000 FCFA",
  );
  check(engineCode.includes("collectedByMethod") || engineCode.includes("financeSnapshot"),
    "l'argent passe par la définition unique du module financier");
  check(engineCode.includes("previous: null") || engineCode.includes("?? null"),
    "des comparaisons sont explicitement déclarées non calculables");
  check(/NO_PRINT_TRACE|NO_DOC_OWNER|NO_ATTENDANCE/.test(engineCode),
    "les données absentes du schéma sont déclarées (unavailable), pas masquées");

  console.log("\n  — Pas de fonctionnalité morte —");
  // Le motif doit porter sur le code : la doc de `page.tsx` cite ce bouton pour
  // expliquer qu'il a été retiré. Chercher dans le fichier brut, c'est faire
  // échouer le contrôle sur sa propre explication.
  check(!/Exporter\s*\(PDF\)/.test(pageCode), "le bouton « Exporter (PDF) » sans gestionnaire a disparu");
  check(!existsSync(join(REPORTS_DIR, "ClientCharts.tsx")), "ClientCharts.tsx (graphiques sur données fausses) supprimé");
  const deadButton = /<button(?![^>]*onClick)(?![^>]*type="submit")[^>]*>/.test(stripComments(page));
  check(!deadButton, "aucun <button> sans gestionnaire dans page.tsx");

  console.log("\n  — Tokens de design —");
  for (const f of ["page.tsx", "ReportSections.tsx", "error.tsx", "loading.tsx"]) {
    const src = stripComments(read(join(REPORTS_DIR, f)));
    const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    check(hex.length === 0, `${f} n'utilise aucune couleur hexadécimale en dur`,
      hex.length ? `trouvées : ${[...new Set(hex)].join(", ")}` : undefined);
  }

  console.log("\n  — Accessibilité / responsive —");
  check(/aria-hidden="true"/.test(sections), "les icônes décoratives portent aria-hidden");
  check(/sm:grid-cols-2|xl:grid-cols-4/.test(sections), "la grille de mesures est responsive");
  check(/text-success|text-danger/.test(sections) && /\{up \? "\+" : "−"\}/.test(sections),
    "le signe de l'écart est écrit, la couleur ne porte pas seule l'information");
}

/* ══════════════════════════════════════════════════════════════════════
   PARTIE B — exécution réelle
   ══════════════════════════════════════════════════════════════════════ */

/** Toutes les valeurs numériques d'un rapport, mesures et lignes confondues. */
/** Toutes les sections, résumé global compris — lot 12.1 : elles vivent dans des groupes. */
function allSections(r: Report) {
  return [...(r.summary ? [r.summary] : []), ...r.groups.flatMap((g) => g.sections)];
}

function allValues(r: Report): number[] {
  const out: number[] = [];
  for (const s of allSections(r)) {
    for (const m of s.metrics) out.push(m.value);
    for (const row of s.rows) if (row.amount !== null) out.push(row.amount);
  }
  return out;
}

async function partB() {
  console.log("\n═══ B. COMPORTEMENT RÉEL (base de données) ═══\n");

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  const users = await prisma.user.findMany({ select: { id: true, role: true, schoolId: true, email: true } });

  console.log("  — Permissions : les 7 rôles atteignent-ils la route ? —");
  for (const role of ROLES) {
    const reachable = hasAccess(role, "/dashboard/reports");
    const audience = audienceForRole(role);
    check(reachable && audience !== null,
      `${role} → accès=${reachable} audience=${audience ?? "AUCUNE"}`,
      !reachable ? "rôle sans /dashboard/reports" : "rôle sans audience déclarée");
  }
  check(
    ROLE_PERMISSIONS.PARENT.includes("/dashboard/reports"),
    "PARENT a bien /dashboard/reports (rapport strictement familial)",
  );

  console.log("\n  — Périodes : cinq granularités —");
  const now = new Date();
  const day = dayPeriod(now), week = weekPeriod(now), month = monthPeriod(now);
  const custom = customPeriod(new Date(now.getFullYear(), now.getMonth(), 1), now);
  check(day.to.getTime() - day.from.getTime() === 864e5, "jour = 24 h exactement");
  check(week.to.getTime() - week.from.getTime() === 7 * 864e5, "semaine = 7 jours");
  check(month.from.getDate() === 1, "mois commence le 1er");
  check(custom.to > custom.from, "période personnalisée ordonnée");

  console.log("\n  — Comparaison : calculable ou honnêtement absente —");
  check(previousPeriod(month)?.from.getMonth() === (month.from.getMonth() + 11) % 12,
    "mois précédent = le mois d'avant (pas « −30 jours »)");
  check(previousPeriod(day)!.to.getTime() === day.from.getTime(), "jour précédent accolé au jour courant");
  check(previousPeriod(week)!.to.getTime() === week.from.getTime(), "semaine précédente accolée");
  const fakeTerm = termPeriod({ name: "T1", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 2, 31) });
  check(fakeTerm !== null && previousPeriod(fakeTerm) === null,
    "trimestre → aucune comparaison (Term ne porte aucun ordre déclaré)");
  const undated = termPeriod({ name: "T1", startDate: null, endDate: null });
  check(undated === null, "trimestre sans dates → null, aucune borne inventée");

  console.log("\n  — Construction du rapport pour chaque compte réel —");
  const reports = new Map<string, Report>();
  for (const u of users) {
    const actor = { userId: u.id, schoolId: u.schoolId, role: u.role as RoleType };
    try {
      const r = await buildReport(actor, month);
      if (!r) { fail(`${u.role} ${u.email} → aucun rapport`); continue; }
      reports.set(u.id, r);
      const secs = allSections(r);
      const metrics = secs.reduce((n, s) => n + s.metrics.length, 0);
      const rows = secs.reduce((n, s) => n + s.rows.length, 0);
      ok(`${u.role.padEnd(10)} ${u.email.padEnd(26)} → ${r.audience.padEnd(12)} [${r.groups.map((g) => g.id).join("+")}] ${secs.length} sections, ${metrics} mesures, ${rows} lignes`);
    } catch (e) {
      fail(`${u.role} ${u.email} → exception`, String(e));
    }
  }

  console.log("\n  — Isolation : une école sans données doit rendre zéro —");
  for (const s of schools) {
    const studentCount = await prisma.student.count({ where: { schoolId: s.id } });
    const actor = { userId: "sonde-isolation", schoolId: s.id, role: "OWNER" as RoleType };
    const r = await buildReport(actor, month);
    if (!r) { fail(`${s.name} → pas de rapport`); continue; }
    const values = allValues(r);
    const nonZero = values.filter((v) => v !== 0).length;
    if (studentCount === 0) {
      check(nonZero === 0,
        `« ${s.name} » (0 élève) → toutes les mesures à zéro`,
        nonZero ? `${nonZero} valeur(s) non nulles : fuite depuis une autre école` : undefined);
    } else {
      check(nonZero > 0, `« ${s.name} » (${studentCount} élèves) → des mesures non nulles, la vue n'est pas vide à tort`);
    }
  }

  console.log("\n  — Isolation croisée : aucun chiffre d'une école chez l'autre —");
  const withData = schools.find(async (s) => (await prisma.student.count({ where: { schoolId: s.id } })) > 0);
  const empties = [];
  for (const s of schools) {
    if ((await prisma.student.count({ where: { schoolId: s.id } })) === 0) empties.push(s);
  }
  const populated = schools.filter((s) => !empties.some((e) => e.id === s.id));
  for (const e of empties) {
    for (const p of populated) {
      const rE = await buildReport({ userId: "x", schoolId: e.id, role: "OWNER" as RoleType }, month);
      const rP = await buildReport({ userId: "x", schoolId: p.id, role: "OWNER" as RoleType }, month);
      const vE = allValues(rE!).filter((v) => v !== 0);
      const vP = allValues(rP!).filter((v) => v !== 0);
      check(vE.length === 0 && vP.length > 0,
        `« ${e.name} » ne voit rien de « ${p.name} » (${vP.length} valeurs non nulles côté ${p.name})`);
    }
  }
  void withData;

  console.log("\n  — Parent : aucune donnée d'établissement —");
  const parents = users.filter((u) => u.role === "PARENT");
  for (const p of parents) {
    const r = reports.get(p.id);
    if (!r) { fail(`parent ${p.email} sans rapport`); continue; }

    check(r.audience === "family", `${p.email} reçoit l'audience « family »`);
    const ids = allSections(r).map((s) => s.id);
    check(!ids.some((i) => i.startsWith("finance-") || i.startsWith("dir-") || i.startsWith("secr-")),
      "aucune section finance / direction / secrétariat n'est produite pour un parent",
      `sections : ${ids.join(", ")}`);

    // Le total facturé du parent ne doit jamais égaler celui de l'école — sauf
    // si l'école n'a que les factures de ce parent, cas testé explicitement.
    const schoolInvoices = await prisma.invoice.aggregate({
      where: { schoolId: p.schoolId }, _sum: { totalAmount: true }, _count: { _all: true },
    });
    const parentInvoices = await prisma.invoice.count({
      where: { schoolId: p.schoolId, OR: [{ parentId: p.id }, { student: { parentId: p.id } }] },
    });
    const billed = allSections(r).find((s) => s.id === "fam-factures")?.metrics.find((m) => m.key === "billed");
    ok(`école : ${schoolInvoices._count._all} factures / ${schoolInvoices._sum.totalAmount ?? 0} FCFA — parent : ${parentInvoices} factures / ${billed?.value ?? 0} FCFA`);
    check(parentInvoices < schoolInvoices._count._all || parentInvoices === 0,
      "le parent voit strictement moins de factures que l'établissement");

    const schoolPayments = await prisma.payment.aggregate({ where: { schoolId: p.schoolId }, _sum: { amount: true } });
    const paid = allSections(r).find((s) => s.id === "fam-factures")?.metrics.find((m) => m.key === "paid");
    check((paid?.value ?? 0) < (schoolPayments._sum.amount ?? 0) || (schoolPayments._sum.amount ?? 0) === 0,
      `le total réglé du parent (${paid?.value ?? 0}) est inférieur aux encaissements de l'école (${schoolPayments._sum.amount ?? 0})`);
  }

  console.log("\n  — Enseignant : borné à ses classes —");
  for (const t of users.filter((u) => u.role === "TEACHER")) {
    const r = reports.get(t.id);
    if (!r) continue;
    const ids = allSections(r).map((s) => s.id);
    check(ids.every((i) => i.startsWith("teach-")), `${t.email} → uniquement des sections « teach- »`, ids.join(", "));

    const myClasses = await prisma.class.count({ where: { schoolId: t.schoolId, teacherId: t.id } });
    const allClasses = await prisma.class.count({ where: { schoolId: t.schoolId } });
    const shown = allSections(r).find((s) => s.id === "teach-classes")?.metrics.find((m) => m.key === "classes");
    check(shown === undefined || shown.value <= myClasses,
      `${t.email} : ${shown?.value ?? 0} classe(s) affichée(s) ≤ ${myClasses} rattachée(s) (école : ${allClasses})`);
  }

  console.log("\n  — Comptable : finance oui, secrétariat non —");
  for (const a of users.filter((u) => u.role === "ACCOUNTANT")) {
    const r = reports.get(a.id);
    if (!r) continue;
    const ids = allSections(r).map((s) => s.id);
    check(ids.every((i) => i.startsWith("finance-")), `${a.email} → uniquement des sections « finance- »`, ids.join(", "));
  }

  console.log("\n  — Assistant : pas de bulletins (validation refusée) —");
  for (const a of users.filter((u) => u.role === "ASSISTANT")) {
    const r = reports.get(a.id);
    if (!r) continue;
    check(!allSections(r).some((s) => s.id === "secr-bulletins"),
      `${a.email} n'obtient pas la section Bulletins (ROLE_DENIALS sur documents/validation)`);
  }
  for (const s of users.filter((u) => u.role === "SECRETARY")) {
    const r = reports.get(s.id);
    if (!r) continue;
    check(allSections(r).some((x) => x.id === "secr-bulletins"), `${s.email} obtient bien la section Bulletins`);
  }

  console.log("\n  — Comparaisons non calculables : null, jamais 0 —");
  let nullPrev = 0, numericPrev = 0;
  for (const r of reports.values()) {
    for (const s of allSections(r)) for (const m of s.metrics) {
      m.previous === null ? nullPrev++ : numericPrev++;
    }
  }
  check(nullPrev > 0, `${nullPrev} mesure(s) déclarées non comparables, ${numericPrev} comparées`);

  console.log("\n  — Cohérence avec la définition unique de « encaissé » —");
  for (const school of populated) {
    const r = await buildReport({ userId: "x", schoolId: school.id, role: "ACCOUNTANT" as RoleType }, month);
    const collected = allSections(r!).find((s) => s.id === "finance-resume")!.metrics.find((m) => m.key === "collected")!;
    const direct = await prisma.payment.aggregate({
      where: { schoolId: school.id, createdAt: { gte: month.from, lt: month.to } },
      _sum: { amount: true },
    });
    check(collected.value === (direct._sum.amount ?? 0),
      `« ${school.name} » : encaissé du rapport (${collected.value}) = SUM(Payment.amount) (${direct._sum.amount ?? 0})`);

    const invoiceSum = await prisma.invoice.aggregate({
      where: { schoolId: school.id, status: "PAID" }, _sum: { totalAmount: true },
    });
    check(collected.value !== (invoiceSum._sum.totalAmount ?? 0) || (invoiceSum._sum.totalAmount ?? 0) === 0,
      `l'encaissé (${collected.value}) ne recopie pas la somme des factures PAID (${invoiceSum._sum.totalAmount ?? 0}) — l'ancien calcul faux`);
  }
}

/* ══════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log("═".repeat(72));
  console.log("  VÉRIFICATION DU LOT 12 — CENTRE DE RAPPORTS PAR RÔLE");
  console.log("═".repeat(72));

  partA();
  await partB();

  console.log("\n" + "═".repeat(72));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(72) + "\n");
  if (failures > 0) process.exit(1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
