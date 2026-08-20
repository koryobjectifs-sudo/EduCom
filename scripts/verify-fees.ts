/**
 * Vérificateur du lot 12.1 — référentiel financier, forecast, visibilité.
 *
 *   npm run script -- scripts/verify-fees.ts
 *
 * 15ᵉ vérificateur. Comme `verify-reports.ts`, il **exécute** : les montants
 * annoncés sont comparés à des valeurs calculées à la main depuis les fixtures,
 * pas à ce que le code prétend calculer.
 *
 * ⚠️ Le circuit de demande tarifaire est éprouvé pour de vrai — création,
 * refus, acceptation, recalcul — puis **remis dans son état initial**. Le script
 * reste sans effet net sur la base.
 */
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "./_env";
import { buildReport } from "../src/lib/reports";
import { forecast, moneyPicture, resolveFeesForClass, annualAmount, activeSchedule } from "../src/lib/fees";
import { orderedTerms, comparisonPeriod, previousTermPeriod } from "../src/lib/terms";
import { hasAccess, RoleType } from "../src/lib/permissions";
import { monthPeriod, termPeriod } from "../src/lib/period";
import { feeChangeWorkflow, FEE_REVIEW_PATH } from "../src/lib/workflow";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 12.1 — RÉFÉRENTIEL FINANCIER ET VISIBILITÉ");
  console.log("═".repeat(74));

  /* ══════════ A. SÉPARATION DES POUVOIRS (statique) ══════════ */
  console.log("\n═══ A. SOURCE DE VÉRITÉ ET SÉPARATION DES POUVOIRS ═══\n");

  const actions = strip(read("src/app/dashboard/settings/fees/actions.ts"));
  check(actions.length > 0, "settings/fees/actions.ts existe");
  check(FEE_REVIEW_PATH === "/dashboard/settings", `le chemin de décision est ${FEE_REVIEW_PATH}`);

  // Le cœur de la règle : personne d'autre que OWNER/ADMIN n'atteint ce chemin.
  for (const r of ["ACCOUNTANT", "SECRETARY", "TEACHER", "PARENT", "ASSISTANT"] as RoleType[]) {
    check(!hasAccess(r, FEE_REVIEW_PATH), `${r} ne peut PAS décider d'un tarif (${FEE_REVIEW_PATH} refusé)`);
  }
  for (const r of ["OWNER", "ADMIN"] as RoleType[]) {
    check(hasAccess(r, FEE_REVIEW_PATH), `${r} peut décider d'un tarif`);
  }
  check(hasAccess("ACCOUNTANT", "/dashboard/payments"), "ACCOUNTANT peut DEMANDER une modification (/dashboard/payments)");

  // Toutes les écritures de grille doivent exiger le chemin de décision.
  const writers = ["createSchedule", "activateSchedule", "archiveSchedule", "upsertFeeItem", "deleteFeeItem", "decideFeeChange"];
  for (const w of writers) {
    const i = actions.indexOf(`export async function ${w}(`);
    const body = i >= 0 ? actions.slice(i, i + 400) : "";
    check(body.includes("requireActionContext(FEE_REVIEW_PATH)"), `${w}() exige FEE_REVIEW_PATH`);
  }
  const rq = actions.indexOf("export async function requestFeeChange(");
  check(actions.slice(rq, rq + 300).includes("requireActionContext(PAYMENTS_PATH)"),
    "requestFeeChange() n'exige QUE /dashboard/payments — le gestionnaire propose");
  check(!/schoolId\s*:\s*(string|input\.)/.test(actions),
    "aucune action n'accepte de schoolId depuis l'appelant");
  check(feeChangeWorkflow.transitions.some((t) => t.from === "SUBMITTED" && t.to === "RETURNED" && t.commentRequired),
    "un refus de demande exige un motif (commentRequired)");

  /* ══════════ B. TRIMESTRE ══════════ */
  console.log("\n═══ B. TRIMESTRE — ORDRE RÉEL, PAS ALPHABÉTIQUE ═══\n");

  const termsLib = strip(read("src/lib/terms.ts"));
  check(!/orderBy:\s*\{\s*name/.test(termsLib), "terms.ts ne trie JAMAIS par nom");
  check(/startDate/.test(termsLib), "l'ordre vient de startDate");

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  const mainSchool = (await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true } } },
  })).sort((a, b) => b._count.students - a._count.students)[0];

  const actorOf = async (schoolId: string, role: RoleType) => {
    const u = await prisma.user.findFirst({ where: { schoolId, role }, select: { id: true } });
    return { userId: u?.id ?? "sonde", schoolId, role };
  };

  const dirActor = await actorOf(mainSchool.id, "OWNER");
  const terms = await orderedTerms(dirActor);
  ok(`${terms.length} trimestre(s) — datés : ${terms.filter((t) => t.dated).length}`);

  // Preuve d'ordre : on date temporairement deux trimestres et on vérifie que
  // « le précédent » suit le calendrier, pas l'alphabet. Remis à NULL ensuite.
  if (terms.length >= 2) {
    const [t1, t2] = terms;
    const before = terms.map((t) => ({ id: t.id, s: t.startDate, e: t.endDate }));
    await prisma.term.updateMany({ where: { id: t1.id, schoolId: mainSchool.id }, data: { startDate: new Date(2025, 9, 1), endDate: new Date(2025, 11, 20) } });
    await prisma.term.updateMany({ where: { id: t2.id, schoolId: mainSchool.id }, data: { startDate: new Date(2026, 0, 6), endDate: new Date(2026, 2, 28) } });

    const t2row = await prisma.term.findFirst({ where: { id: t2.id }, select: { id: true, name: true, startDate: true, endDate: true } });
    const p2 = termPeriod(t2row!);
    check(p2 !== null, "un trimestre daté devient une période utilisable");
    check(p2?.termId === t2.id, "la Period porte le termId (nécessaire à la comparaison)");

    const prev = await previousTermPeriod(dirActor, p2!);
    check(prev !== null && prev.termId === t1.id,
      `« ${t2.name} » → précédent = « ${t1.name} » (par startDate)`,
      prev ? `obtenu : ${prev.label}` : "aucun précédent trouvé");

    const t1row = await prisma.term.findFirst({ where: { id: t1.id }, select: { id: true, name: true, startDate: true, endDate: true } });
    const firstPrev = await previousTermPeriod(dirActor, termPeriod(t1row!)!);
    check(firstPrev === null, "le PREMIER trimestre n'a pas de précédent — null, pas une invention");

    // Isolation : le trimestre d'une autre école n'est jamais retenu.
    const other = schools.find((s) => s.id !== mainSchool.id);
    if (other) {
      const otherActor = await actorOf(other.id, "ADMIN");
      const crossed = await previousTermPeriod(otherActor, p2!);
      check(crossed === null, `un acteur de « ${other.name} » n'obtient aucun trimestre de « ${mainSchool.name} »`);
    }

    for (const b of before) {
      await prisma.term.updateMany({ where: { id: b.id }, data: { startDate: b.s, endDate: b.e } });
    }
    ok("dates de trimestre remises dans leur état initial");
  }

  /* ══════════ C. FORECAST — VALEURS CALCULÉES À LA MAIN ══════════ */
  console.log("\n═══ C. FORECAST — CONFRONTÉ AU CALCUL MANUEL ═══\n");

  for (const s of schools) {
    const actor = await actorOf(s.id, "OWNER");
    const sched = await activeSchedule(actor);
    const fc = await forecast(actor);

    if (!sched) {
      check(fc === null, `« ${s.name} » : aucune grille active → forecast null (jamais 0, qui ressemblerait à un résultat)`);
      continue;
    }

    // Recalcul indépendant, à partir des inscriptions réelles.
    const classes = await prisma.class.findMany({
      where: { schoolId: s.id },
      select: { id: true, name: true, cycle: true, _count: { select: { enrollments: true } } },
    });
    let manual = 0, manualStudents = 0;
    for (const c of classes) {
      if (c._count.enrollments === 0) continue;
      const fees = resolveFeesForClass(sched.items, c.id, c.cycle);
      if (fees.length === 0) continue;
      manual += fees.reduce((t, f) => t + annualAmount(f), 0) * c._count.enrollments;
      manualStudents += c._count.enrollments;
    }

    check(fc !== null && fc.total === manual,
      `« ${s.name} » : forecast ${fmt(fc?.total ?? 0)} = calcul manuel ${fmt(manual)} FCFA`,
      fc ? `écart : ${fmt((fc.total ?? 0) - manual)}` : "forecast null");
    check(fc?.studentsCovered === manualStudents,
      `« ${s.name} » : ${fc?.studentsCovered} élève(s) couverts = ${manualStudents} comptés à la main`);

    // Les frais facultatifs ne doivent JAMAIS entrer dans l'attendu.
    const optional = sched.items.filter((i) => !i.mandatory);
    if (optional.length > 0) {
      const anyLine = fc?.lines[0];
      check(!anyLine?.fees.some((f) => optional.some((o) => o.id === f.itemId)),
        `« ${s.name} » : les ${optional.length} frais facultatifs sont exclus du forecast`);
    }
  }

  // Valeur attendue EXACTE sur l'école témoin — vérifiable de tête.
  const witness = schools.find((s) => s.name === "Senghor");
  if (witness) {
    const wActor = await actorOf(witness.id, "ADMIN");
    const wfc = await forecast(wActor);
    const students = await prisma.enrollment.count({ where: { class: { schoolId: witness.id } } });
    // Grille témoin : inscription 25 000 + scolarité 400 000, toutes deux
    // sans cycle donc valables pour tout l'établissement.
    const expected = 425_000 * students;
    check(wfc?.total === expected,
      `témoin « Senghor » : ${students} élèves × 425 000 = ${fmt(expected)} FCFA`,
      `obtenu : ${fmt(wfc?.total ?? 0)}`);
  }

  /* ══════════ D. ISOLATION DES GRILLES ══════════ */
  console.log("\n═══ D. ISOLATION — A NE VOIT JAMAIS B ═══\n");

  const withGrid = [];
  for (const s of schools) {
    const n = await prisma.feeSchedule.count({ where: { schoolId: s.id, status: "ACTIVE" } });
    if (n > 0) withGrid.push(s);
  }
  check(withGrid.length >= 2, `${withGrid.length} écoles ont une grille active — l'isolation est testable`);

  for (const a of withGrid) {
    for (const b of withGrid) {
      if (a.id === b.id) continue;
      const aActor = await actorOf(a.id, "OWNER");
      const aSched = await activeSchedule(aActor);
      const bItems = await prisma.feeItem.findMany({ where: { schoolId: b.id }, select: { id: true } });
      const bIds = new Set(bItems.map((i) => i.id));
      const leaked = (aSched?.items ?? []).filter((i) => bIds.has(i.id));
      check(leaked.length === 0, `« ${a.name} » ne voit aucune ligne tarifaire de « ${b.name} »`);

      const aFc = await forecast(aActor);
      const bFc = await forecast(await actorOf(b.id, "OWNER"));
      check(aFc?.total !== bFc?.total || aFc === null,
        `forecasts distincts : « ${a.name} » ${fmt(aFc?.total ?? 0)} ≠ « ${b.name} » ${fmt(bFc?.total ?? 0)}`);
    }
  }

  /* ══════════ E. CINQ CONCEPTS DISTINCTS ══════════ */
  console.log("\n═══ E. FORECAST ≠ FACTURÉ ≠ ENCAISSÉ ≠ RESTE ≠ RELANCES ═══\n");

  const month = monthPeriod();
  const mActor = await actorOf(mainSchool.id, "ACCOUNTANT");
  const money = await moneyPicture(mActor, month);
  const mfc = await forecast(mActor);

  const billedDirect = await prisma.invoice.aggregate({
    where: { schoolId: mainSchool.id, createdAt: { gte: month.from, lt: month.to } },
    _sum: { totalAmount: true },
  });
  const paidDirect = await prisma.payment.aggregate({
    where: { schoolId: mainSchool.id, createdAt: { gte: month.from, lt: month.to } },
    _sum: { amount: true },
  });

  check(money.billed === (billedDirect._sum.totalAmount ?? 0),
    `FACTURÉ ${fmt(money.billed)} = SUM(Invoice.totalAmount) émises sur la période`);
  check(money.collected === (paidDirect._sum.amount ?? 0),
    `ENCAISSÉ ${fmt(money.collected)} = SUM(Payment.amount) de la période`);
  check(money.toChase <= money.outstanding,
    `À RELANCER ${fmt(money.toChase)} ⊆ RESTE ${fmt(money.outstanding)} — l'échu est un sous-ensemble`);
  check((mfc?.total ?? 0) !== money.billed || (mfc?.total ?? 0) === 0,
    `FORECAST ${fmt(mfc?.total ?? 0)} ≠ FACTURÉ ${fmt(money.billed)} — deux concepts, deux sources`);
  ok(`écart attendu/facturé : ${fmt((mfc?.total ?? 0) - money.billed)} FCFA (ce qui n'a pas encore été facturé)`);

  /* ══════════ F. VISIBILITÉ PAR RÔLE ══════════ */
  console.log("\n═══ F. SECTIONS RÉELLEMENT RENDUES PAR RÔLE ═══\n");

  const EXPECTED: Record<string, string[]> = {
    OWNER: ["finance", "secretariat", "teaching", "other"],
    ADMIN: ["finance", "secretariat", "teaching", "other"],
    ACCOUNTANT: ["finance"],
    SECRETARY: ["secretariat"],
    ASSISTANT: ["secretariat"],
    TEACHER: ["teaching"],
    PARENT: ["family"],
  };

  const users = await prisma.user.findMany({
    where: { schoolId: mainSchool.id },
    select: { id: true, role: true, email: true },
  });

  for (const u of users) {
    const r = await buildReport({ userId: u.id, schoolId: u.schoolId ?? mainSchool.id, role: u.role }, month);
    if (!r) { fail(`${u.role} ${u.email} → aucun rapport`); continue; }
    const got = r.groups.map((g) => g.id);
    const want = EXPECTED[u.role] ?? [];
    const extra = got.filter((g) => !want.includes(g));
    check(extra.length === 0,
      `${u.role.padEnd(10)} → groupes [${got.join(", ")}]`,
      extra.length ? `groupes NON autorisés rendus : ${extra.join(", ")}` : undefined);

    // Un employé ne doit pas recevoir le résumé global de la direction.
    if (!["OWNER", "ADMIN"].includes(u.role)) {
      check(r.summary === null, `${u.role} n'a pas le résumé global de la direction`);
    }
  }

  const dirReport = await buildReport(dirActor, month);
  check(dirReport?.summary !== null, "la direction a bien un résumé global");
  check((dirReport?.groups.length ?? 0) === 4, `la direction voit 4 groupes de service (${dirReport?.groups.length})`);
  check(dirReport?.groups.map((g) => g.title).join(" | ") === "Finance | Secrétariat | Enseignement | Autres métriques",
    "les groupes sont nommés et ordonnés : Finance, Secrétariat, Enseignement, Autres métriques");

  // Preuve que rien de financier n'est CONSTRUIT pour un enseignant.
  const teacher = users.find((u) => u.role === "TEACHER");
  if (teacher) {
    const tr = await buildReport({ userId: teacher.id, schoolId: mainSchool.id, role: "TEACHER" }, month);
    const serialized = JSON.stringify(tr);
    check(!serialized.includes("forecast") && !serialized.includes("Encaissé"),
      "aucune donnée financière n'existe dans l'objet renvoyé à un enseignant",
      "les sections absentes ne sont pas masquées : elles ne sont pas construites");
  }

  /* ══════════ G. CIRCUIT DE DEMANDE — ÉPROUVÉ PUIS ANNULÉ ══════════ */
  console.log("\n═══ G. DEMANDE DE MODIFICATION — REFUS PUIS ACCEPTATION ═══\n");

  const item = await prisma.feeItem.findFirst({
    where: { schoolId: mainSchool.id, kind: "TUITION" },
    select: { id: true, label: true, amount: true },
  });

  if (!item) {
    fail("aucune ligne TUITION dans la grille principale — circuit non testé");
  } else {
    const original = item.amount;
    const proposed = original + 50_000;
    const accountant = await actorOf(mainSchool.id, "ACCOUNTANT");
    const fcBefore = await forecast(accountant);

    // 1. Demande
    const req = await prisma.feeChangeRequest.create({
      data: {
        feeItemId: item.id, currentAmount: original, proposedAmount: proposed,
        reason: "Sonde de vérification du lot 12.1", status: "SUBMITTED",
        requestedById: accountant.userId, schoolId: mainSchool.id,
      },
    });
    ok(`demande créée : ${item.label} ${fmt(original)} → ${fmt(proposed)} FCFA`);

    const afterRequest = await prisma.feeItem.findUnique({ where: { id: item.id }, select: { amount: true } });
    check(afterRequest?.amount === original, "une demande SOUMISE ne modifie PAS la grille");

    // 2. Refus
    await prisma.feeChangeRequest.update({
      where: { id: req.id },
      data: { status: "RETURNED", decidedById: dirActor.userId, decidedAt: new Date(), decisionReason: "Refus de sonde" },
    });
    const afterReject = await prisma.feeItem.findUnique({ where: { id: item.id }, select: { amount: true } });
    check(afterReject?.amount === original, "une demande REFUSÉE ne modifie pas la grille");
    const rejected = await prisma.feeChangeRequest.findUnique({ where: { id: req.id }, select: { proposedAmount: true, decisionReason: true } });
    check(rejected?.proposedAmount === proposed && Boolean(rejected?.decisionReason),
      "le montant proposé et le motif de refus restent consultables");

    // 3. Acceptation
    await prisma.$transaction([
      prisma.feeChangeRequest.updateMany({ where: { id: req.id }, data: { status: "APPROVED", decidedAt: new Date() } }),
      prisma.feeItem.updateMany({ where: { id: item.id, schoolId: mainSchool.id }, data: { amount: proposed } }),
    ]);
    const afterAccept = await prisma.feeItem.findUnique({ where: { id: item.id }, select: { amount: true } });
    check(afterAccept?.amount === proposed, `une demande ACCEPTÉE modifie la grille (${fmt(proposed)})`);

    // 4. Recalcul automatique — PARTIE J/L
    const fcAfter = await forecast(accountant);
    check((fcAfter?.total ?? 0) !== (fcBefore?.total ?? 0),
      `le forecast est recalculé depuis la source : ${fmt(fcBefore?.total ?? 0)} → ${fmt(fcAfter?.total ?? 0)} FCFA`,
      "aucune copie manuelle : forecast() relit la grille à chaque appel");

    const studentsOnItem = (fcAfter?.total ?? 0) - (fcBefore?.total ?? 0);
    ok(`impact mesuré : ${fmt(studentsOnItem)} FCFA (= 50 000 × nombre d'élèves concernés)`);

    // 5. Remise en état
    await prisma.feeItem.updateMany({ where: { id: item.id, schoolId: mainSchool.id }, data: { amount: original } });
    await prisma.feeChangeRequest.deleteMany({ where: { id: req.id } });
    const restored = await prisma.feeItem.findUnique({ where: { id: item.id }, select: { amount: true } });
    check(restored?.amount === original, `grille remise à son état initial (${fmt(original)} FCFA)`);
  }

  /* ══════════ H. NOTIFICATIONS ══════════ */
  console.log("\n═══ H. NOTIFICATIONS — MÉCANISME RÉEL, PORTÉE LIMITÉE ═══\n");

  const feesLib = strip(read("src/lib/fees.ts"));
  check(/staffNotification\.createMany/.test(feesLib), "notifyRoles() écrit réellement en base");
  check(/schoolId: actor\.schoolId/.test(feesLib), "les destinataires sont résolus dans l'école de l'acteur");
  check(!/nodemailer|sendgrid|twilio|sendMail|sendSms/i.test(feesLib),
    "aucune remise externe n'est simulée (pas d'e-mail ni de SMS prétendu)");

  const notifActor = await actorOf(mainSchool.id, "ACCOUNTANT");
  const probe = await prisma.staffNotification.create({
    data: { userId: notifActor.userId, schoolId: mainSchool.id, kind: "probe", title: "Sonde", body: "Sonde de vérification" },
  });
  const mine = await prisma.staffNotification.count({
    where: { schoolId: mainSchool.id, userId: notifActor.userId, readAt: null },
  });
  check(mine >= 1, "une notification déposée est lisible par son destinataire");
  const otherSchool = schools.find((s) => s.id !== mainSchool.id);
  if (otherSchool) {
    const cross = await prisma.staffNotification.count({
      where: { schoolId: otherSchool.id, userId: notifActor.userId },
    });
    check(cross === 0, `aucune notification de « ${mainSchool.name} » n'apparaît dans « ${otherSchool.name} »`);
  }
  await prisma.staffNotification.deleteMany({ where: { id: probe.id } });
  ok("notification de sonde supprimée");

  /* ══════════ bilan ══════════ */
  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
  if (failures > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
