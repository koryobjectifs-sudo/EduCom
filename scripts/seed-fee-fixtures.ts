/**
 * Fixtures du référentiel tarifaire — lot 12.1.
 *
 *   npm run script -- scripts/seed-fee-fixtures.ts          # essai à blanc
 *   APPLY=1 npm run script -- scripts/seed-fee-fixtures.ts  # écrit réellement
 *
 * ═══ POURQUOI DEUX ÉCOLES ═══
 *
 * L'isolation ne se prouve pas sur un établissement unique : il faut deux
 * grilles distinctes, deux populations d'élèves, et vérifier que chaque forecast
 * ne voit que le sien. Les écoles « Kory » et « Senghor » sont vides en base et
 * servent de témoins.
 *
 * ⚠️ **Essai à blanc par défaut**, conformément à la règle du projet sur les
 * écritures de masse. Idempotent : relancer ne duplique rien (les grilles sont
 * repérées par `academicYear` + `label`).
 *
 * ⚠️ N'écrit QUE dans les nouvelles tables du lot 12.1 et n'ajoute des élèves
 * que si l'école témoin en est dépourvue. Aucune donnée existante n'est modifiée.
 */
import { prisma } from "../src/lib/prisma";

const APPLY = process.env.APPLY === "1";
const say = (s: string) => console.log(`${APPLY ? "  " : "  [à blanc] "}${s}`);

/** Grille A — établissement principal, tarifs par classe. */
const GRID_A = [
  { kind: "REGISTRATION", label: "Inscription", amount: 50_000, cadence: "ONE_OFF", cycle: null },
  { kind: "TUITION", label: "Scolarité élémentaire", amount: 900_000, cadence: "ANNUAL", cycle: "ELEMENTAIRE" },
  { kind: "TUITION", label: "Scolarité collège", amount: 1_200_000, cadence: "ANNUAL", cycle: "COLLEGE" },
  { kind: "INSURANCE", label: "Assurance", amount: 10_000, cadence: "ANNUAL", cycle: null },
  // Facultatif : volontairement HORS forecast — rien ne dit qui y souscrit.
  { kind: "CANTEEN", label: "Cantine", amount: 35_000, cadence: "MONTHLY", cycle: null, mandatory: false },
] as const;

/** Grille B — école témoin, tarifs délibérément DIFFÉRENTS de A. */
const GRID_B = [
  { kind: "REGISTRATION", label: "Inscription", amount: 25_000, cadence: "ONE_OFF", cycle: null },
  { kind: "TUITION", label: "Scolarité", amount: 400_000, cadence: "ANNUAL", cycle: null },
] as const;

async function seedSchool(
  schoolId: string,
  schoolName: string,
  year: string,
  label: string,
  grid: readonly { kind: string; label: string; amount: number; cadence: string; cycle: string | null; mandatory?: boolean }[],
) {
  console.log(`\n── ${schoolName} (${schoolId.slice(0, 8)}) ──`);

  const owner = await prisma.user.findFirst({
    where: { schoolId, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true, email: true },
  });
  if (!owner) {
    console.log("  ⚠️  aucun OWNER/ADMIN — grille non créée (createdById est obligatoire)");
    return;
  }

  const existing = await prisma.feeSchedule.findFirst({ where: { schoolId, academicYear: year, label } });
  if (existing) {
    say(`grille « ${label} » déjà présente (${existing.status}) — rien à faire`);
    return;
  }

  say(`créer la grille « ${label} » (${year}), ${grid.length} lignes, par ${owner.email}`);
  if (!APPLY) {
    for (const g of grid) {
      say(`   · ${g.label} ${g.amount.toLocaleString("fr-FR")} FCFA ${g.cadence}${g.cycle ? ` [${g.cycle}]` : ""}${g.mandatory === false ? " (facultatif)" : ""}`);
    }
    return;
  }

  const schedule = await prisma.feeSchedule.create({
    data: { academicYear: year, label, schoolId, createdById: owner.id, status: "DRAFT" },
  });

  for (const g of grid) {
    await prisma.feeItem.create({
      data: {
        scheduleId: schedule.id,
        schoolId,
        kind: g.kind as never,
        label: g.label,
        amount: g.amount,
        cadence: g.cadence as never,
        cycle: (g.cycle ?? null) as never,
        mandatory: g.mandatory ?? true,
      },
    });
  }

  await prisma.feeSchedule.update({
    where: { id: schedule.id },
    data: { status: "ACTIVE", activatedAt: new Date(), activatedById: owner.id },
  });
  say(`grille activée (${grid.length} lignes)`);
}

async function main() {
  console.log(APPLY ? "\n═══ ÉCRITURE RÉELLE ═══" : "\n═══ ESSAI À BLANC — APPLY=1 pour écrire ═══");

  const schools = await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true, classes: true } } },
    orderBy: { name: "asc" },
  });

  // L'école la plus peuplée reçoit la grille A ; une école témoin reçoit B.
  const sorted = [...schools].sort((a, b) => b._count.students - a._count.students);
  const main_ = sorted[0];

  // ⚠️ L'école témoin doit avoir un OWNER/ADMIN : `FeeSchedule.createdById` est
  // obligatoire, et une grille sans auteur n'aurait aucun sens — la direction
  // EST la source de vérité. Une école sans responsable est donc écartée.
  const candidates = sorted.filter((s) => s.id !== main_.id && s._count.students === 0);
  let witness: (typeof sorted)[number] | undefined;
  for (const c of candidates) {
    const hasOwner = await prisma.user.count({
      where: { schoolId: c.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (hasOwner > 0) { witness = c; break; }
  }
  if (!witness && candidates.length > 0) {
    console.log(`\n⚠️  Aucune école témoin ne possède de OWNER/ADMIN (candidates : ${candidates.map((c) => c.name).join(", ")}).`);
    console.log("   L'isolation sera testée avec un forecast témoin nul — moins probant.");
  }

  if (main_) await seedSchool(main_.id, main_.name, "2025-2026", "Grille officielle 2025-2026", GRID_A);
  if (witness) {
    // L'école témoin a besoin d'une classe + d'élèves pour que son forecast soit
    // NON NUL — sinon « A ne voit pas B » se vérifierait trivialement.
    console.log(`\n── ${witness.name} : population témoin ──`);
    if (witness._count.classes === 0) {
      say("créer 1 classe « CE1 témoin » (ELEMENTAIRE) + 3 élèves inscrits");
      if (APPLY) {
        const cls = await prisma.class.create({
          data: { name: "CE1 témoin", cycle: "ELEMENTAIRE", schoolId: witness.id },
        });
        for (let i = 1; i <= 3; i++) {
          const st = await prisma.student.create({
            data: { firstName: `Témoin${i}`, lastName: witness.name, status: "ENROLLED", schoolId: witness.id },
          });
          await prisma.enrollment.create({
            data: { studentId: st.id, classId: cls.id, academicYear: "2025-2026" },
          });
        }
      }
    } else {
      say("classes déjà présentes — population témoin inchangée");
    }
    await seedSchool(witness.id, witness.name, "2025-2026", "Grille témoin 2025-2026", GRID_B);
  }

  console.log("\n── état après ──");
  for (const s of await prisma.school.findMany({ select: { id: true, name: true } })) {
    const sched = await prisma.feeSchedule.count({ where: { schoolId: s.id } });
    const items = await prisma.feeItem.count({ where: { schoolId: s.id } });
    const active = await prisma.feeSchedule.count({ where: { schoolId: s.id, status: "ACTIVE" } });
    console.log(`  ${s.name.padEnd(18)} grilles=${sched} (actives=${active}) lignes=${items}`);
  }
  if (!APPLY) console.log("\nAucune écriture. Relancer avec APPLY=1.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
