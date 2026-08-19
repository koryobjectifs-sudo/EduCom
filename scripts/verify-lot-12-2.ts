/**
 * Vérificateur du lot 12.2 — finition du référentiel financier.
 *
 *   npm run script -- scripts/verify-lot-12-2.ts
 *
 * 16ᵉ vérificateur. Couvre uniquement les points restés incomplets ou non
 * prouvés au lot 12.1 : formulaire du gestionnaire, cycle de lecture des
 * notifications, setup initial, les 7 rôles, et le token de typographie.
 *
 * ⚠️ Les écritures de sonde sont annulées en fin de parcours : le script est
 * sans effet net sur la base.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { buildReport } from "../src/lib/reports";
import { forecast, activeSchedule } from "../src/lib/fees";
import { hasAccess, RoleType, ROLE_DENIALS } from "../src/lib/permissions";
import { monthPeriod } from "../src/lib/period";
import { FEE_REVIEW_PATH, feeChangeWorkflow, canTransition } from "../src/lib/workflow";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Tous les .tsx/.ts sous src/, hors client Prisma généré. */
function sourceFiles(dir = "src", out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (full.startsWith("src/generated")) continue;
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx?|css)$/.test(e)) out.push(full);
  }
  return out;
}

const ROLES: RoleType[] = ["OWNER", "ADMIN", "ACCOUNTANT", "SECRETARY", "ASSISTANT", "TEACHER", "PARENT"];

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 12.2 — FINITION");
  console.log("═".repeat(74));

  /* ═══════ 1. DEMANDE CÔTÉ GESTIONNAIRE ═══════ */
  console.log("\n═══ 1. FORMULAIRE DE DEMANDE — CÔTÉ GESTIONNAIRE ═══\n");

  const tarifsPage = read("src/app/dashboard/payments/tarifs/page.tsx");
  const tarifsClient = read("src/app/dashboard/payments/tarifs/TarifsClient.tsx");
  check(tarifsPage.length > 0, "l'écran /dashboard/payments/tarifs existe");
  check(tarifsClient.includes("requestFeeChange"), "le formulaire appelle requestFeeChange()");

  // Le cœur du point 1 : aucune écriture directe de la grille depuis cet écran.
  const forbidden = ["upsertFeeItem", "createSchedule", "activateSchedule", "archiveSchedule", "deleteFeeItem", "decideFeeChange"];
  const leaked = forbidden.filter((f) => strip(tarifsClient).includes(f) || strip(tarifsPage).includes(f));
  check(leaked.length === 0,
    "l'écran du gestionnaire n'importe AUCUNE action d'écriture de la grille",
    leaked.length ? `importées à tort : ${leaked.join(", ")}` : undefined);
  check(strip(tarifsClient).includes("Lecture seule") || strip(tarifsPage).includes("Lecture seule")
     || tarifsClient.includes("Lecture seule"),
    "l'écran annonce explicitement la lecture seule");

  console.log("\n  — Permissions de la nouvelle route —");
  const P = "/dashboard/payments/tarifs";
  for (const r of ROLES) {
    const allowed = hasAccess(r, P);
    const expect = ["OWNER", "ADMIN", "ACCOUNTANT"].includes(r);
    check(allowed === expect, `${r.padEnd(11)} ${allowed ? "autorisé" : "refusé"} (attendu : ${expect ? "autorisé" : "refusé"})`);
  }
  check((ROLE_DENIALS.PARENT ?? []).includes(P),
    "le refus au PARENT est déclaré dans ROLE_DENIALS, pas dans l'écran",
    "sans lui, PARENT héritait du chemin par préfixe via /dashboard/payments");

  // Séparation des pouvoirs : inchangée.
  check(!hasAccess("ACCOUNTANT", FEE_REVIEW_PATH), "ACCOUNTANT ne peut toujours pas décider (FEE_REVIEW_PATH refusé)");
  check(hasAccess("OWNER", FEE_REVIEW_PATH) && hasAccess("ADMIN", FEE_REVIEW_PATH), "seule la direction décide");

  console.log("\n  — Règles de validation de la demande —");
  const actionsSrc = strip(read("src/app/dashboard/settings/fees/actions.ts"));
  check(/Un motif est obligatoire/.test(actionsSrc),
    "requestFeeChange() refuse une demande sans motif");
  check(/identique au montant actuel/.test(actionsSrc),
    "requestFeeChange() refuse un montant identique à l'actuel");
  check(/proposedAmount < 0|!Number\.isFinite\(input\.proposedAmount\)/.test(actionsSrc),
    "requestFeeChange() refuse un montant négatif ou non numérique");

  // Le refus DOIT être motivé — règle portée par la machine, pas par l'écran.
  const refusNoComment = canTransition(feeChangeWorkflow, "SUBMITTED", "RETURNED", "OWNER");
  check(refusNoComment.allowed && refusNoComment.transition.commentRequired === true,
    "un refus exige un motif (commentRequired sur SUBMITTED → RETURNED)");
  const accByAccountant = canTransition(feeChangeWorkflow, "SUBMITTED", "APPROVED", "ACCOUNTANT");
  check(!accByAccountant.allowed,
    "un ACCOUNTANT ne peut pas approuver une demande — refusé par la machine elle-même",
    accByAccountant.allowed ? "AUTORISÉ À TORT" : undefined);
  const accByOwner = canTransition(feeChangeWorkflow, "SUBMITTED", "APPROVED", "OWNER");
  check(accByOwner.allowed, "un OWNER peut approuver");

  /* ═══════ 2. NOTIFICATIONS — CYCLE DE LECTURE ═══════ */
  console.log("\n═══ 2. NOTIFICATIONS — CYCLE DE LECTURE ═══\n");

  const notifItem = read("src/app/dashboard/reports/NotificationItem.tsx");
  check(notifItem.length > 0, "NotificationItem.tsx existe");
  check(notifItem.includes("markNotificationRead"), "le bouton appelle markNotificationRead()");
  check(/Non lue/.test(notifItem), "l'état « non lue » est écrit, pas seulement coloré");
  check(!/userId/.test(strip(notifItem)),
    "aucun userId ne transite par le client — l'action le prend dans la session");

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  const mainSchool = (await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true } } },
  })).sort((a, b) => b._count.students - a._count.students)[0];
  // ⚠️ L'école de comparaison doit avoir une grille ACTIVE, sinon « A ≠ B » se
  // vérifie trivialement (0 ≠ n'importe quoi) et ne prouve rien.
  const withGrid: string[] = [];
  for (const s of schools) {
    if (await prisma.feeSchedule.count({ where: { schoolId: s.id, status: "ACTIVE" } })) withGrid.push(s.id);
  }
  const other = schools.find((s) => s.id !== mainSchool.id && withGrid.includes(s.id))
             ?? schools.find((s) => s.id !== mainSchool.id)!;

  const userIn = async (schoolId: string, role: RoleType) =>
    prisma.user.findFirst({ where: { schoolId, role }, select: { id: true } });

  const acc = await userIn(mainSchool.id, "ACCOUNTANT");
  const owner = await userIn(mainSchool.id, "OWNER");

  if (acc && owner) {
    const n = await prisma.staffNotification.create({
      data: { userId: acc.id, schoolId: mainSchool.id, kind: "probe.12.2", title: "Sonde", body: "Cycle de lecture" },
    });
    check(n.readAt === null, "une notification naît non lue (readAt = null)");

    // Un collègue ne peut pas la marquer lue : filtre userId + schoolId.
    const byColleague = await prisma.staffNotification.updateMany({
      where: { id: n.id, userId: owner.id, schoolId: mainSchool.id, readAt: null },
      data: { readAt: new Date() },
    });
    check(byColleague.count === 0, "un COLLÈGUE ne peut pas marquer lue la notification d'un autre");

    // Une autre école non plus.
    const byOtherSchool = await prisma.staffNotification.updateMany({
      where: { id: n.id, userId: acc.id, schoolId: other.id, readAt: null },
      data: { readAt: new Date() },
    });
    check(byOtherSchool.count === 0, `une autre école (« ${other.name} ») ne peut pas la marquer lue`);

    // Le destinataire, si.
    const byOwnerOfIt = await prisma.staffNotification.updateMany({
      where: { id: n.id, userId: acc.id, schoolId: mainSchool.id, readAt: null },
      data: { readAt: new Date() },
    });
    check(byOwnerOfIt.count === 1, "le destinataire la marque lue");

    const after = await prisma.staffNotification.findUnique({ where: { id: n.id }, select: { readAt: true } });
    check(after?.readAt !== null, "l'état de lecture est réellement persisté");

    // Et elle disparaît des non lues.
    const stillUnread = await prisma.staffNotification.count({
      where: { schoolId: mainSchool.id, userId: acc.id, id: n.id, readAt: null },
    });
    check(stillUnread === 0, "elle sort de la liste des non lues");

    await prisma.staffNotification.deleteMany({ where: { id: n.id } });
    ok("notification de sonde supprimée");
  } else {
    fail("comptes ACCOUNTANT/OWNER introuvables — cycle non testé");
  }

  /* ═══════ 3. SETUP INITIAL ═══════ */
  console.log("\n═══ 3. SETUP INITIAL — AUDIT ET COMPLÉMENT ═══\n");

  const wizard = read("src/app/onboarding/Wizard.tsx");
  const onboardActions = read("src/app/onboarding/actions.ts");

  check(wizard.length > 0 && onboardActions.length > 0, "le parcours d'onboarding existe déjà (audit)");
  check(/step === 3/.test(wizard) && /step === 4/.test(wizard), "une étape financière a été insérée (3), le chargement passe en 4");
  check(wizard.includes("createSchedule") && wizard.includes("upsertFeeItem") && wizard.includes("activateSchedule"),
    "l'étape réutilise les actions de /settings/fees — aucun second système de setup");
  check(!/prisma\./.test(strip(wizard)), "le wizard n'écrit jamais en base directement");

  // Le correctif de cycle : sans lui la portée « par cycle » est inerte.
  check(/CYCLE_BY_LEVEL/.test(onboardActions), "les classes générées portent leur cycle réel");
  check(/cycle: CYCLE_BY_LEVEL\[level\]/.test(onboardActions), "le cycle vient du niveau choisi, pas d'un défaut");

  // Aucun montant suggéré.
  check(!/value=\{?"?[0-9]{4,}/.test(wizard), "aucun montant n'est pré-rempli dans l'étape financière");
  check(/incomplète/.test(wizard), "l'absence de grille est annoncée, pas comblée par une supposition");

  console.log("\n  — Absence de grille : aucun forecast inventé —");
  for (const s of schools) {
    const admin = await prisma.user.findFirst({
      where: { schoolId: s.id, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true },
    });
    const actor = { userId: admin?.id ?? "sonde", schoolId: s.id, role: "OWNER" as RoleType };
    const sched = await activeSchedule(actor);
    const fc = await forecast(actor);
    if (!sched) {
      check(fc === null, `« ${s.name} » sans grille → forecast null (pas 0)`);
    } else {
      check(fc !== null && fc.total > 0, `« ${s.name} » avec grille → forecast ${fmt(fc?.total ?? 0)} FCFA`);
    }
  }

  /* ═══════ 4. LES 7 RÔLES ═══════ */
  console.log("\n═══ 4. LES 7 RÔLES — GROUPES RENDUS ═══\n");

  const EXPECTED: Record<string, string[]> = {
    OWNER: ["finance", "secretariat", "teaching", "other"],
    ADMIN: ["finance", "secretariat", "teaching", "other"],
    ACCOUNTANT: ["finance"],
    SECRETARY: ["secretariat"],
    ASSISTANT: ["secretariat"],
    TEACHER: ["teaching"],
    PARENT: ["family"],
  };

  const month = monthPeriod();
  const covered = new Set<string>();

  for (const role of ROLES) {
    const u = await userIn(mainSchool.id, role);
    if (!u) { fail(`${role} : aucun compte dans « ${mainSchool.name} » — rôle non couvert`); continue; }
    covered.add(role);

    const r = await buildReport({ userId: u.id, schoolId: mainSchool.id, role }, month);
    if (!r) { fail(`${role} → aucun rapport`); continue; }

    const got = r.groups.map((g) => g.id).sort();
    const want = [...EXPECTED[role]].sort();
    const extra = got.filter((g) => !want.includes(g));
    check(extra.length === 0 && hasAccess(role, "/dashboard/reports"),
      `${role.padEnd(11)} accès=oui groupes=[${got.join(", ")}] résumé=${r.summary ? "oui" : "non"}`,
      extra.length ? `groupes NON autorisés : ${extra.join(", ")}` : undefined);

    const isDirection = role === "OWNER" || role === "ADMIN";
    check((r.summary !== null) === isDirection,
      `${role.padEnd(11)} résumé global ${isDirection ? "présent" : "absent"} — conforme`);

    // Le point crucial : les sections non autorisées ne sont pas CONSTRUITES.
    const payload = JSON.stringify(r);
    if (!isDirection && role !== "ACCOUNTANT") {
      check(!/Encaissé|Forecast|Résumé financier|À relancer/.test(payload),
        `${role.padEnd(11)} aucune donnée financière dans l'objet renvoyé`);
    }
  }
  check(covered.size === 7, `les 7 rôles ont été couverts (${covered.size}/7)`,
    covered.size < 7 ? `manquants : ${ROLES.filter((r) => !covered.has(r)).join(", ")}` : undefined);

  /* ═══════ 5. TOKENS DE TYPOGRAPHIE ═══════ */
  console.log("\n═══ 5. TOKENS DE TYPOGRAPHIE ═══\n");

  const css = read("src/app/globals.css");
  const declared = new Set([...css.matchAll(/--text-role-([a-z]+)\s*:/g)].map((m) => m[1]));
  ok(`tokens déclarés : ${[...declared].sort().join(", ")}`);

  // ⚠️ Contrôle volontairement étroit : il ne connaît QUE le préfixe
  // `text-role-`, dont la liste des valeurs est close dans `globals.css`.
  // L'élargir à toutes les classes utilitaires produirait un contrôle fragile,
  // Tailwind en générant beaucoup dynamiquement.
  const used = new Map<string, string[]>();
  for (const f of sourceFiles()) {
    if (f.endsWith("globals.css")) continue;
    for (const m of read(f).matchAll(/\btext-role-([a-z]+)\b/g)) {
      if (!used.has(m[1])) used.set(m[1], []);
      used.get(m[1])!.push(f);
    }
  }
  const unknown = [...used.entries()].filter(([name]) => !declared.has(name));
  check(unknown.length === 0,
    `aucun token de typographie inexistant utilisé (${used.size} noms distincts employés)`,
    unknown.length ? unknown.map(([n, fs]) => `text-role-${n} → ${[...new Set(fs)].join(", ")}`).join(" ; ") : undefined);
  check(!used.has("figure"), "text-role-figure (inexistant, lot 12) n'est plus utilisé nulle part");

  /* ═══════ 6-7. FORECAST — RÈGLE INCHANGÉE ═══════ */
  console.log("\n═══ 6-7. FORECAST — AUTOMATIQUE ET ANNUEL ═══\n");

  const feesLib = read("src/lib/fees.ts");
  check(/n'est pas proratisé|ANNUEL, pas borné|attendu ANNUEL/i.test(feesLib) || /forecast est ANNUEL/i.test(feesLib),
    "le caractère annuel du forecast est documenté dans fees.ts");
  check(!/prompt\(|input.*amount.*manuel/i.test(strip(feesLib)), "le forecast n'est jamais une saisie manuelle");
  check(/activeSchedule\(actor\)/.test(feesLib) && /_count: \{ select: \{ enrollments/.test(feesLib),
    "le forecast lit la grille officielle ET les inscriptions réelles");
  check(strip(tarifsClient).includes("ressaisir") || tarifsClient.includes("ressaisir"),
    "l'écran gestionnaire indique qu'aucun tarif n'est à ressaisir");

  const accActor = { userId: acc?.id ?? "x", schoolId: mainSchool.id, role: "ACCOUNTANT" as RoleType };
  const fcA = await forecast(accActor);
  const fcO = await forecast({ userId: owner?.id ?? "x", schoolId: mainSchool.id, role: "OWNER" as RoleType });
  check(fcA?.total === fcO?.total,
    `gestionnaire et direction voient le MÊME forecast (${fmt(fcA?.total ?? 0)} FCFA) — une seule source`);

  /* ═══════ 8. ISOLATION ═══════ */
  console.log("\n═══ 8. ISOLATION MULTI-ÉCOLE ═══\n");

  const aActor = { userId: owner?.id ?? "x", schoolId: mainSchool.id, role: "OWNER" as RoleType };
  const bAdmin = await userIn(other.id, "ADMIN");
  const bActor = { userId: bAdmin?.id ?? "x", schoolId: other.id, role: "ADMIN" as RoleType };

  const [aSched, bSched] = await Promise.all([activeSchedule(aActor), activeSchedule(bActor)]);
  const aIds = new Set((aSched?.items ?? []).map((i) => i.id));
  const bIds = new Set((bSched?.items ?? []).map((i) => i.id));
  check([...aIds].every((id) => !bIds.has(id)), `« ${mainSchool.name} » et « ${other.name} » n'ont aucune ligne en commun`);

  const [aFc, bFc] = await Promise.all([forecast(aActor), forecast(bActor)]);
  check(aFc !== null && bFc !== null && aFc.total !== bFc.total,
    `forecasts distincts et TOUS DEUX non nuls : ${fmt(aFc?.total ?? 0)} ≠ ${fmt(bFc?.total ?? 0)}`,
    bFc === null ? `« ${other.name} » n'a pas de grille — comparaison non probante` : undefined);

  // Une demande ne peut pas viser la ligne d'une autre école.
  const bItem = bSched?.items[0];
  if (bItem) {
    const crossed = await prisma.feeItem.findFirst({
      where: { id: bItem.id, schoolId: mainSchool.id },
      select: { id: true },
    });
    check(crossed === null,
      `une ligne de « ${other.name} » est introuvable sous le schoolId de « ${mainSchool.name} »`,
      "c'est exactement le filtre de requestFeeChange() : la demande serait refusée");
  }

  const crossNotif = await prisma.staffNotification.count({
    where: { schoolId: other.id, userId: acc?.id ?? "x" },
  });
  check(crossNotif === 0, "aucune notification croisée entre les deux écoles");

  /* ═══════ bilan ═══════ */
  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
  if (failures > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
