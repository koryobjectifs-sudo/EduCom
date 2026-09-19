import "./_env";
import { prisma } from "@/lib/prisma";
import { resolveSchoolContext } from "@/lib/schoolContext";
import { canSeeStudent } from "@/lib/studentScope";
import { studentFile } from "@/lib/studentFile";

async function runTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("TEST SUITE — PHASE 3 : FAMILY SPACE & PARENT SCOPE INTEGRITY");
  console.log("════════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const createdSchoolIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdStudentIds: string[] = [];

  // Obtenir ou créer 3 écoles pour les tests
  let schools = await prisma.school.findMany({
    take: 3,
    orderBy: { createdAt: "asc" },
  });

  while (schools.length < 3) {
    const idx = schools.length + 1;
    const newSchool = await prisma.school.create({
      data: {
        name: `TEST_PHASE3_School_${idx}_${timestamp}`,
        onboardingCompleted: true,
      },
    });
    createdSchoolIds.push(newSchool.id);
    schools.push(newSchool);
  }

  const [schoolA, schoolB, schoolC] = schools;
  console.log(`Écoles de test :`);
  console.log(`  - École A : ${schoolA.name} (${schoolA.id})`);
  console.log(`  - École B : ${schoolB.name} (${schoolB.id})`);
  console.log(`  - École C (non autorisée) : ${schoolC.name} (${schoolC.id})\n`);

  try {
    // ───────────────────────────────────────────────────────────
    // TEST 1 : Parent mono-école
    // ───────────────────────────────────────────────────────────
    console.log("TEST 1: Parent mono-école");
    const parent1 = await prisma.user.create({
      data: {
        id: `p1-${timestamp}`,
        email: `p1.${timestamp}@educom.sn`,
        firstName: "Parent1",
        lastName: "Mono",
        schoolId: schoolA.id,
        role: "PARENT",
        emailVerified: true,
      },
    });
    createdUserIds.push(parent1.id);

    await prisma.schoolMembership.create({
      data: {
        userId: parent1.id,
        schoolId: schoolA.id,
        role: "PARENT",
        isPrimary: true,
        active: true,
      },
    });

    const res1 = await resolveSchoolContext({ explicitUserId: parent1.id });
    assert(res1.ok === true, "TEST 1.1 - Résolution réussie pour parent mono-école");
    if (res1.ok) {
      assert(res1.context.schoolId === schoolA.id, "TEST 1.2 - École active = École A");
      assert(res1.context.role === "PARENT", "TEST 1.3 - Rôle actif = PARENT");
      assert(res1.context.memberships.length === 1, "TEST 1.4 - Exactement 1 école rattachée (pas de sélecteur requis)");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 2 : Parent multi-écoles (Bascule sans déconnexion)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 2: Parent multi-écoles avec bascule de contexte");
    await prisma.schoolMembership.create({
      data: {
        userId: parent1.id,
        schoolId: schoolB.id,
        role: "PARENT",
        isPrimary: false,
        active: true,
      },
    });

    const res2A = await resolveSchoolContext({ explicitUserId: parent1.id, requestedSchoolId: schoolA.id });
    const res2B = await resolveSchoolContext({ explicitUserId: parent1.id, requestedSchoolId: schoolB.id });

    assert(res2A.ok && res2B.ok, "TEST 2.1 - Résolution des deux contextes d'écoles réussie");
    if (res2A.ok && res2B.ok) {
      assert(res2A.context.schoolId === schoolA.id, "TEST 2.2 - Contexte École A actif");
      assert(res2B.context.schoolId === schoolB.id, "TEST 2.3 - Contexte École B actif après bascule");
      assert(res2A.context.memberships.length === 2, "TEST 2.4 - Les 2 écoles sont listées dans les adhésions");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 3 : Parent avec plusieurs enfants dans une même école
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 3: Parent avec plusieurs enfants dans une même école");
    const childA1 = await prisma.student.create({
      data: {
        firstName: "Amina",
        lastName: "Mono",
        schoolId: schoolA.id,
        parentId: parent1.id,
      },
    });
    const childA2 = await prisma.student.create({
      data: {
        firstName: "Babacar",
        lastName: "Mono",
        schoolId: schoolA.id,
        parentId: parent1.id,
      },
    });
    createdStudentIds.push(childA1.id, childA2.id);

    const schoolAChildren = await prisma.student.findMany({
      where: { parentId: parent1.id, schoolId: schoolA.id },
    });
    assert(schoolAChildren.length === 2, "TEST 3.1 - Les deux enfants sont visibles dans l'école A");
    assert(schoolAChildren.some((c) => c.id === childA1.id) && schoolAChildren.some((c) => c.id === childA2.id), "TEST 3.2 - Aucun enfant n'est omis");

    // ───────────────────────────────────────────────────────────
    // TEST 4 : Parent avec des enfants dans des écoles distinctes (Multi-School Isolation)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 4: Isolation stricte des enfants entre écoles distinctes");
    const childB1 = await prisma.student.create({
      data: {
        firstName: "Cheikh",
        lastName: "Mono",
        schoolId: schoolB.id,
        parentId: parent1.id,
      },
    });
    createdStudentIds.push(childB1.id);

    // Requête dans le contexte École A
    const scopedInSchoolA = await prisma.student.findMany({
      where: { parentId: parent1.id, schoolId: schoolA.id },
    });
    assert(scopedInSchoolA.length === 2, "TEST 4.1 - Dans l'école A, seuls les 2 enfants de l'école A sont renvoyés");
    assert(!scopedInSchoolA.some((c) => c.id === childB1.id), "TEST 4.2 - L'enfant de l'école B n'apparaît JAMAIS dans l'école A");

    // Requête dans le contexte École B
    const scopedInSchoolB = await prisma.student.findMany({
      where: { parentId: parent1.id, schoolId: schoolB.id },
    });
    assert(scopedInSchoolB.length === 1, "TEST 4.3 - Dans l'école B, seul l'enfant de l'école B est renvoyé");
    assert(scopedInSchoolB[0].id === childB1.id, "TEST 4.4 - C'est bien Cheikh à l'école B");

    // ───────────────────────────────────────────────────────────
    // TEST 5 : Élève non autorisé (enfant d'un autre parent)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 5: Tentative d'accès à un élève non autorisé");
    const strangerChild = await prisma.student.create({
      data: {
        firstName: "Inconnu",
        lastName: "Autre",
        schoolId: schoolA.id,
        parentId: null, // Pas son parent
      },
    });
    createdStudentIds.push(strangerChild.id);

    const actorParent1 = { userId: parent1.id, schoolId: schoolA.id, role: "PARENT" as const };
    const canSeeStranger = await canSeeStudent(actorParent1, strangerChild.id);
    assert(canSeeStranger === false, "TEST 5.1 - canSeeStudent refuse formellement l'accès à un élève tiers");

    const fileStranger = await studentFile(actorParent1, strangerChild.id);
    assert(fileStranger === null, "TEST 5.2 - studentFile renvoie null pour un élève tiers");

    // ───────────────────────────────────────────────────────────
    // TEST 6 : Tentative d'accès à une école non autorisée (School C)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 6: Tentative d'accès à une école non autorisée");
    const res6 = await resolveSchoolContext({
      explicitUserId: parent1.id,
      requestedSchoolId: schoolC.id,
    });
    assert(res6.ok === true, "TEST 6.1 - Résolution sécurisée sans crash");
    if (res6.ok) {
      assert(res6.context.schoolId !== schoolC.id, "TEST 6.2 - L'accès à École C est strictement refusé");
      assert(res6.context.schoolId === schoolA.id, "TEST 6.3 - Repli automatique sur l'école autorisée primaire");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 7 : Manipulation de cookie non autorisé
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 7: Manipulation de cookie de contexte actif");
    const res7 = await resolveSchoolContext({
      explicitUserId: parent1.id,
      requestedSchoolId: "forged-fake-school-id",
    });
    assert(res7.ok === true, "TEST 7.1 - Résolution robuste");
    if (res7.ok) {
      assert(res7.context.schoolId === schoolA.id, "TEST 7.2 - Repli automatique sur l'école primaire sans fuite");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 8 : Adhésion inactive
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 8: Adhésion désactivée (active = false)");
    const mInactive = await prisma.schoolMembership.create({
      data: {
        userId: parent1.id,
        schoolId: schoolC.id,
        role: "PARENT",
        isPrimary: false,
        active: false,
      },
    });

    const res8 = await resolveSchoolContext({
      explicitUserId: parent1.id,
      requestedSchoolId: schoolC.id,
    });
    assert(res8.ok === true && res8.context.schoolId !== schoolC.id, "TEST 8.1 - Adhésion inactive ignorée");
    await prisma.schoolMembership.delete({ where: { id: mInactive.id } });

    // ───────────────────────────────────────────────────────────
    // TEST 9 : Parent legacy sans SchoolMembership
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 9: Parent legacy sans SchoolMembership");
    const legacyParent = await prisma.user.create({
      data: {
        id: `p-legacy-${timestamp}`,
        email: `p.legacy.${timestamp}@educom.sn`,
        firstName: "Parent",
        lastName: "Legacy",
        schoolId: schoolA.id,
        role: "PARENT",
        emailVerified: true,
      },
    });
    createdUserIds.push(legacyParent.id);

    const res9 = await resolveSchoolContext({ explicitUserId: legacyParent.id });
    assert(res9.ok === true, "TEST 9.1 - Résolution réussie pour parent legacy");
    if (res9.ok) {
      assert(res9.context.schoolId === schoolA.id, "TEST 9.2 - Repli sur User.schoolId");
      assert(res9.context.role === "PARENT", "TEST 9.3 - Rôle résolu PARENT");
      assert(res9.context.isFallback === true, "TEST 9.4 - Indicateur isFallback = true");
    }
  } finally {
    // Nettoyage complet des données de test
    if (createdStudentIds.length > 0) {
      await prisma.student.deleteMany({ where: { id: { in: createdStudentIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.schoolMembership.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdSchoolIds.length > 0) {
      await prisma.school.deleteMany({ where: { id: { in: createdSchoolIds } } });
    }
    console.log("\nNettoyage des données de test terminé.");
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`RÉSULTATS DE LA SUITE DE TESTS PHASE 3 : ${passed} PASS, ${failed} FAIL`);
  console.log("════════════════════════════════════════════════════════════════");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error("Erreur fatale durant l'exécution des tests :", e);
    process.exit(1);
  });

