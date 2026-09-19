import "./_env";
import { prisma } from "@/lib/prisma";
import { resolveSchoolContext } from "@/lib/schoolContext";
import { type RoleType } from "@/lib/permissions";

async function runTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("TEST SUITE — PHASE 2 : CONTEXT RESOLUTION & MULTI-SCHOOL ACCESS");
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

  // Obtenir ou créer 3 écoles pour les tests
  let schools = await prisma.school.findMany({
    take: 3,
    orderBy: { createdAt: "asc" },
  });

  while (schools.length < 3) {
    const idx = schools.length + 1;
    const newSchool = await prisma.school.create({
      data: {
        name: `TEST_PHASE2_School_${idx}_${timestamp}`,
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


  const testUserId = `test-user-${timestamp}`;
  const testEmail = `test.context.${timestamp}@educom.sn`;


  try {
    // Création de l'utilisateur de test
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        firstName: "Test",
        lastName: "Context",
        schoolId: schoolA.id,
        role: "PARENT",
        emailVerified: true,
      },
    });

    // ───────────────────────────────────────────────────────────
    // TEST 1 : Utilisateur mono-école avec adhésion primaire
    // ───────────────────────────────────────────────────────────
    console.log("TEST 1: Utilisateur mono-école");
    const m1 = await prisma.schoolMembership.create({
      data: {
        userId: user.id,
        schoolId: schoolA.id,
        role: "TEACHER",
        isPrimary: true,
        active: true,
      },
    });

    const res1 = await resolveSchoolContext({ explicitUserId: user.id });
    assert(res1.ok === true, "TEST 1.1 - Résolution réussie pour mono-école");
    if (res1.ok) {
      assert(res1.context.schoolId === schoolA.id, "TEST 1.2 - École active = École A");
      assert(res1.context.role === "TEACHER", "TEST 1.3 - Rôle actif = TEACHER");
      assert(res1.context.isFallback === false, "TEST 1.4 - Utilise SchoolMembership (pas de fallback)");
      assert(res1.context.memberships.length === 1, "TEST 1.5 - Exactement 1 adhésion listée");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 2 : Utilisateur multi-écoles (Staff avec rôles distincts)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 2: Personnel multi-écoles avec rôles distincts");
    // Rattachement à École B en tant qu'ACCOUNTANT
    const m2 = await prisma.schoolMembership.create({
      data: {
        userId: user.id,
        schoolId: schoolB.id,
        role: "ACCOUNTANT",
        isPrimary: false,
        active: true,
      },
    });

    // Demande de contexte École B
    const res2B = await resolveSchoolContext({
      explicitUserId: user.id,
      requestedSchoolId: schoolB.id,
    });
    assert(res2B.ok === true, "TEST 2.1 - Résolution réussie pour École B demandée");
    if (res2B.ok) {
      assert(res2B.context.schoolId === schoolB.id, "TEST 2.2 - École active basculée sur École B");
      assert(res2B.context.role === "ACCOUNTANT", "TEST 2.3 - Rôle actif basculé sur ACCOUNTANT");
      assert(res2B.context.memberships.length === 2, "TEST 2.4 - 2 adhésions disponibles");
    }

    // Demande de contexte École A
    const res2A = await resolveSchoolContext({
      explicitUserId: user.id,
      requestedSchoolId: schoolA.id,
    });
    assert(res2A.ok === true, "TEST 2.5 - Résolution réussie pour École A demandée");
    if (res2A.ok) {
      assert(res2A.context.schoolId === schoolA.id, "TEST 2.6 - École active rebasculée sur École A");
      assert(res2A.context.role === "TEACHER", "TEST 2.7 - Rôle actif rebasculé sur TEACHER");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 3 : Parent multi-écoles
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 3: Parent multi-écoles");
    const testParentId = `test-parent-${timestamp}`;
    const testParentEmail = `test.parent.${timestamp}@educom.sn`;

    const parentUser = await prisma.user.create({
      data: {
        id: testParentId,
        email: testParentEmail,
        firstName: "Parent",
        lastName: "Multi",
        schoolId: schoolA.id,
        role: "PARENT",
        emailVerified: true,
      },
    });

    await prisma.schoolMembership.createMany({
      data: [
        { userId: parentUser.id, schoolId: schoolA.id, role: "PARENT", isPrimary: true, active: true },
        { userId: parentUser.id, schoolId: schoolB.id, role: "PARENT", isPrimary: false, active: true },
      ],
    });

    const resParentA = await resolveSchoolContext({ explicitUserId: parentUser.id, requestedSchoolId: schoolA.id });
    const resParentB = await resolveSchoolContext({ explicitUserId: parentUser.id, requestedSchoolId: schoolB.id });
    assert(resParentA.ok && resParentA.context.schoolId === schoolA.id, "TEST 3.1 - Parent résout École A");
    assert(resParentB.ok && resParentB.context.schoolId === schoolB.id, "TEST 3.2 - Parent résout École B");

    // Nettoyage parent test
    await prisma.schoolMembership.deleteMany({ where: { userId: parentUser.id } });
    await prisma.user.delete({ where: { id: parentUser.id } });

    // ───────────────────────────────────────────────────────────
    // TEST 4 : Manipulation de cookie non autorisée (Attaque School C)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 4: Manipulation non autorisée (tentative d'accès à École C)");
    const res4 = await resolveSchoolContext({
      explicitUserId: user.id,
      requestedSchoolId: schoolC.id, // Utilisateur n'a PAS d'adhésion dans School C
    });
    assert(res4.ok === true, "TEST 4.1 - Requête ne plante pas");
    if (res4.ok) {
      assert(res4.context.schoolId !== schoolC.id, "TEST 4.2 - SÉCURITÉ : Accès à École C strictement refusé");
      assert(res4.context.schoolId === schoolA.id, "TEST 4.3 - Repli sécurisé sur l'école primaire A");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 5 : Adhésion inactive (active = false)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 5: Adhésion désactivée (active = false)");
    const mInactive = await prisma.schoolMembership.create({
      data: {
        userId: user.id,
        schoolId: schoolC.id,
        role: "TEACHER",
        isPrimary: false,
        active: false, // Désactivé
      },
    });

    const res5 = await resolveSchoolContext({
      explicitUserId: user.id,
      requestedSchoolId: schoolC.id,
    });
    assert(res5.ok === true, "TEST 5.1 - Résolution safe");
    if (res5.ok) {
      assert(res5.context.schoolId !== schoolC.id, "TEST 5.2 - Adhésion inactive ignorée");
      assert(res5.context.memberships.every((m) => m.schoolId !== schoolC.id), "TEST 5.3 - École C absente des adhésions actives");
    }
    await prisma.schoolMembership.delete({ where: { id: mInactive.id } });

    // ───────────────────────────────────────────────────────────
    // TEST 6 : Utilisateur legacy (User.schoolId sans SchoolMembership)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 6: Utilisateur Legacy sans SchoolMembership");
    const testLegacyId = `test-legacy-${timestamp}`;
    const legacyUser = await prisma.user.create({
      data: {
        id: testLegacyId,
        email: `test.legacy.${timestamp}@educom.sn`,
        firstName: "Legacy",
        lastName: "User",
        schoolId: schoolA.id,
        role: "SECRETARY",
        emailVerified: true,
      },
    });

    const res6 = await resolveSchoolContext({ explicitUserId: legacyUser.id });
    assert(res6.ok === true, "TEST 6.1 - Résolution réussie pour compte legacy");
    if (res6.ok) {
      assert(res6.context.schoolId === schoolA.id, "TEST 6.2 - Repli sur User.schoolId");
      assert(res6.context.role === "SECRETARY", "TEST 6.3 - Rôle résolu depuis User.role");
      assert(res6.context.isFallback === true, "TEST 6.4 - Indicateur isFallback = true");
    }

    await prisma.user.delete({ where: { id: legacyUser.id } });

    // ───────────────────────────────────────────────────────────
    // TEST 7 : Cookie invalide / UUID inconnu
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 7: Cookie invalide ou UUID corrompu");
    const res7 = await resolveSchoolContext({
      explicitUserId: user.id,
      requestedSchoolId: "00000000-0000-0000-0000-000000000000",
    });
    assert(res7.ok === true, "TEST 7.1 - Résolution tolérante aux UUID inexistants");
    if (res7.ok) {
      assert(res7.context.schoolId === schoolA.id, "TEST 7.2 - Repli automatique sur l'école primaire");
    }

    // ───────────────────────────────────────────────────────────
    // TEST 8 : Changement de contexte dynamique (A -> B -> A)
    // ───────────────────────────────────────────────────────────
    console.log("\nTEST 8: Changement de contexte dynamique (A -> B -> A)");
    const switchStep1 = await resolveSchoolContext({ explicitUserId: user.id, requestedSchoolId: schoolA.id });
    const switchStep2 = await resolveSchoolContext({ explicitUserId: user.id, requestedSchoolId: schoolB.id });
    const switchStep3 = await resolveSchoolContext({ explicitUserId: user.id, requestedSchoolId: schoolA.id });

    assert(
      switchStep1.ok && switchStep2.ok && switchStep3.ok,
      "TEST 8.1 - Toutes les étapes de bascule réussissent"
    );
    if (switchStep1.ok && switchStep2.ok && switchStep3.ok) {
      assert(switchStep1.context.schoolId === schoolA.id && switchStep1.context.role === "TEACHER", "TEST 8.2 - Contexte 1 = School A / TEACHER");
      assert(switchStep2.context.schoolId === schoolB.id && switchStep2.context.role === "ACCOUNTANT", "TEST 8.3 - Contexte 2 = School B / ACCOUNTANT");
      assert(switchStep3.context.schoolId === schoolA.id && switchStep3.context.role === "TEACHER", "TEST 8.4 - Contexte 3 = School A / TEACHER");
    }
  } finally {
    // Nettoyage garanti de l'utilisateur de test et des adhésions
    await prisma.schoolMembership.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    if (createdSchoolIds.length > 0) {
      await prisma.school.deleteMany({ where: { id: { in: createdSchoolIds } } });
    }
    console.log("\nNettoyage des données de test terminé.");
  }


  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`RÉSULTATS DE LA SUITE DE TESTS PHASE 2 : ${passed} PASS, ${failed} FAIL`);
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

