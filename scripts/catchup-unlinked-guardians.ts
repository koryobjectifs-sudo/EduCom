import { prisma } from "./_env";
import { normalizePhone } from "../src/lib/phone";

/**
 * Script de rattrapage haute performance (batching) des tuteurs pour SENG.CO.
 * Usage:
 *   npx tsx --env-file=.env scripts/catchup-unlinked-guardians.ts          (Simulation / Essai à blanc)
 *   APPLY=1 npx tsx --env-file=.env scripts/catchup-unlinked-guardians.ts  (Application réelle)
 */

async function main() {
  const isApply = process.env.APPLY === "1";

  console.log(`\n=== RATTRAPAGE DES TUTEURS SENG.CO [${isApply ? "ÉCRITURE RÉELLE (APPLY=1)" : "SIMULATION (ESSAI À BLANC)"}] ===\n`);

  const school = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO" } },
  });

  if (!school) {
    console.error("Établissement SENG.CO introuvable.");
    process.exit(1);
  }

  const unlinkedStudents = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      parentId: null,
      emergencyPhone: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      emergencyPhone: true,
      emergencyContact: true,
    },
    orderBy: { lastName: "asc" },
  });

  console.log(`Élèves sans parentId avec numéro de contact : ${unlinkedStudents.length}`);

  // Regroupement en mémoire par numéro normalisé E.164
  const phoneGroups = new Map<string, typeof unlinkedStudents>();

  for (const s of unlinkedStudents) {
    const raw = s.emergencyPhone?.trim() || "";
    const norm = normalizePhone(raw)?.e164 || raw;
    if (!phoneGroups.has(norm)) {
      phoneGroups.set(norm, []);
    }
    phoneGroups.get(norm)!.push(s);
  }

  console.log(`Numéros de téléphone distincts : ${phoneGroups.size}`);

  // Récupération en 1 seule requête de tous les parents existants de l'école (Batching Rule 10)
  const existingParents = await prisma.user.findMany({
    where: { schoolId: school.id, role: "PARENT" },
    select: { id: true, phone: true },
  });

  const parentByPhone = new Map<string, string>();
  for (const p of existingParents) {
    if (p.phone) {
      const norm = normalizePhone(p.phone)?.e164 || p.phone;
      parentByPhone.set(norm, p.id);
    }
  }

  const safeGroups: { phone: string; students: typeof unlinkedStudents; pFirst: string; pLast: string; phoneFormatted: string; phoneDigits: string }[] = [];
  const excludedGroups: { phone: string; lastNames: string[] }[] = [];

  for (const [phoneE164, students] of phoneGroups.entries()) {
    const lastNames = [...new Set(students.map((s) => s.lastName.trim().toUpperCase()))];

    // Contrôle d'homogénéité : alerte et exclusion si discordance
    if (students.length >= 2 && lastNames.length > 2) {
      excludedGroups.push({ phone: phoneE164, lastNames });
      continue;
    }

    const rawContact = students[0].emergencyContact?.trim() || "";
    const names = rawContact ? rawContact.split(/\s+/) : [];
    const pFirst = names.length > 1 ? names.slice(0, -1).join(" ") : names[0] || "Tuteur";
    const pLast = names.length > 1 ? names[names.length - 1] : students[0].lastName;

    const phoneNorm = normalizePhone(phoneE164);
    const phoneFormatted = phoneNorm?.formatted || phoneE164;
    const phoneDigits = phoneNorm?.normalizedDigits || phoneE164.replace(/\D/g, "");

    safeGroups.push({
      phone: phoneE164,
      students,
      pFirst,
      pLast,
      phoneFormatted,
      phoneDigits,
    });
  }

  console.log(`\nGroupes sûrs validés : ${safeGroups.length} / ${phoneGroups.size}`);
  console.log(`Groupes exclus pour doute : ${excludedGroups.length}`);

  let studentsLinkedCount = 0;
  let parentsCreatedCount = 0;
  let parentsReusedCount = 0;

  if (isApply) {
    // Identifier les parents à créer vs réutiliser
    const toCreate: { firstName: string; lastName: string; phone: string; email: string; role: "PARENT"; schoolId: string }[] = [];
    const phoneToParentId = new Map<string, string>();

    for (const g of safeGroups) {
      const existingId = parentByPhone.get(g.phone);
      if (existingId) {
        phoneToParentId.set(g.phone, existingId);
        parentsReusedCount++;
      } else {
        const placeholderEmail = `${g.phoneDigits}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}@parent.educom.local`;
        toCreate.push({
          firstName: g.pFirst,
          lastName: g.pLast,
          phone: g.phoneFormatted,
          email: placeholderEmail,
          role: "PARENT",
          schoolId: school.id,
        });
      }
    }

    // Création en lot des comptes parents
    if (toCreate.length > 0) {
      const createdParents = await prisma.user.createManyAndReturn({
        data: toCreate,
        select: { id: true, phone: true },
      });
      parentsCreatedCount = createdParents.length;

      for (const cp of createdParents) {
        if (cp.phone) {
          const norm = normalizePhone(cp.phone)?.e164 || cp.phone;
          phoneToParentId.set(norm, cp.id);
        }
      }

      // Création en lot des adhésions SchoolMembership
      const membershipsData = createdParents.map((cp) => ({
        userId: cp.id,
        schoolId: school.id,
        role: "PARENT" as const,
        isPrimary: true,
        active: true,
      }));

      await prisma.schoolMembership.createMany({
        data: membershipsData,
        skipDuplicates: true,
      });
    }

    // Mise à jour groupée des élèves (Student.parentId)
    const updateBatches: Promise<any>[] = [];
    for (const g of safeGroups) {
      const parentId = phoneToParentId.get(g.phone);
      if (parentId) {
        const studentIds = g.students.map((s) => s.id);
        updateBatches.push(
          prisma.student.updateMany({
            where: { id: { in: studentIds } },
            data: { parentId },
          })
        );
        studentsLinkedCount += studentIds.length;
      }
    }

    await prisma.$transaction(updateBatches, { timeout: 60000, maxWait: 15000 });
  } else {
    studentsLinkedCount = safeGroups.reduce((acc, g) => acc + g.students.length, 0);
  }

  console.log("\n=== RÉSULTAT FINAL ===");
  console.log(`Statut : ${isApply ? "ÉCRITURE RÉELLE TERMINÉE" : "SIMULATION VALIDE"}`);
  console.log(`Élèves rattachés : ${studentsLinkedCount} / ${unlinkedStudents.length}`);
  if (isApply) {
    console.log(`Nouveaux comptes parents créés : ${parentsCreatedCount}`);
    console.log(`Comptes parents existants réutilisés : ${parentsReusedCount}`);
  }
}

main()
  .catch((err) => {
    console.error("Erreur fatale :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
