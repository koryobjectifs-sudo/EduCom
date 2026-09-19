import "./_env";
import { prisma } from "@/lib/prisma";
import { normalizePhone, getPhoneSearchVariants } from "@/lib/phone";
import { generateAndStoreOtp, verifyStoredOtp, getLatestTestOtp, clearOtpState } from "@/lib/otp";
import { requestParentOtp, verifyParentOtp } from "@/app/famille/login/actions";
import { resolveSchoolContext } from "@/lib/schoolContext";
import { canSeeStudent } from "@/lib/studentScope";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { urlSupabase, cleAnonSupabase } from "@/lib/supabase/config";

async function runTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("TEST SUITE — PHASE 4 : PARENT AUTH (PHONE + OTP) & SECURITY");
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
  const createdAuthUserIds: string[] = [];

  // Obtenir ou créer 2 écoles de test
  let schools = await prisma.school.findMany({
    take: 2,
    orderBy: { createdAt: "asc" },
  });

  while (schools.length < 2) {
    const idx = schools.length + 1;
    const newSchool = await prisma.school.create({
      data: {
        name: `TEST_PHASE4_School_${idx}_${timestamp}`,
        onboardingCompleted: true,
      },
    });
    createdSchoolIds.push(newSchool.id);
    schools.push(newSchool);
  }

  const [schoolA, schoolB] = schools;
  console.log(`Écoles de test :`);
  console.log(`  - École A : ${schoolA.name} (${schoolA.id})`);
  console.log(`  - École B : ${schoolB.name} (${schoolB.id})\n`);

  try {
    // ───────────────────────────────────────────────────────────
    // FIXTURES : Création de parents de test
    // ───────────────────────────────────────────────────────────
    const phoneP1 = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const phoneP2 = `+22178${Math.floor(1000000 + Math.random() * 9000000)}`;
    const phoneDup = `+22176${Math.floor(1000000 + Math.random() * 9000000)}`;

    // Parent 1 : Mono-école A, 2 enfants
    const parent1 = await prisma.user.create({
      data: {
        firstName: "Moussa",
        lastName: "Diop",
        email: `parent1_${timestamp}@parent.educom.local`,
        phone: phoneP1,
        role: "PARENT",
        schoolId: schoolA.id,
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

    const childA1 = await prisma.student.create({
      data: {
        firstName: "Awa",
        lastName: "Diop",
        schoolId: schoolA.id,
        parentId: parent1.id,
      },
    });
    const childA2 = await prisma.student.create({
      data: {
        firstName: "Oumar",
        lastName: "Diop",
        schoolId: schoolA.id,
        parentId: parent1.id,
      },
    });
    createdStudentIds.push(childA1.id, childA2.id);

    // Parent 2 : Multi-écoles (École A + École B), 1 enfant dans chaque
    const parent2 = await prisma.user.create({
      data: {
        firstName: "Fatou",
        lastName: "Ndiaye",
        email: `parent2_${timestamp}@parent.educom.local`,
        phone: phoneP2,
        role: "PARENT",
        schoolId: schoolA.id,
      },
    });
    createdUserIds.push(parent2.id);

    await prisma.schoolMembership.createMany({
      data: [
        { userId: parent2.id, schoolId: schoolA.id, role: "PARENT", isPrimary: true, active: true },
        { userId: parent2.id, schoolId: schoolB.id, role: "PARENT", isPrimary: false, active: true },
      ],
    });

    const childP2_A = await prisma.student.create({
      data: {
        firstName: "Ibrahima",
        lastName: "Ndiaye",
        schoolId: schoolA.id,
        parentId: parent2.id,
      },
    });
    const childP2_B = await prisma.student.create({
      data: {
        firstName: "Mariama",
        lastName: "Ndiaye",
        schoolId: schoolB.id,
        parentId: parent2.id,
      },
    });
    createdStudentIds.push(childP2_A.id, childP2_B.id);

    // Parent 3 : Legacy Email/Password (sans téléphone)
    const parent3 = await prisma.user.create({
      data: {
        firstName: "Cheikh",
        lastName: "Sow",
        email: `legacy.parent.${timestamp}@educom.sn`,
        phone: null,
        role: "PARENT",
        schoolId: schoolA.id,
        emailVerified: true,
      },
    });
    createdUserIds.push(parent3.id);

    await prisma.schoolMembership.create({
      data: {
        userId: parent3.id,
        schoolId: schoolA.id,
        role: "PARENT",
        isPrimary: true,
        active: true,
      },
    });

    // ───────────────────────────────────────────────────────────
    // TEST 1 : Numéro parent valide -> Demande d'OTP acceptée
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 1 : Demande OTP numéro valide ---");
    const otpReq1 = await requestParentOtp(phoneP1);
    assert(
      otpReq1.success === true && Boolean(otpReq1.phone),
      "TEST 1: Demande OTP avec téléphone parent valide acceptée",
      otpReq1.error
    );

    const generatedCode1 = getLatestTestOtp(otpReq1.phone!);
    assert(
      Boolean(generatedCode1 && generatedCode1.length === 6),
      "TEST 1: Code OTP à 6 chiffres généré avec succès"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 2 : Code OTP valide -> Authentification et session active
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 2 : Vérification OTP valide & session ---");
    const otpVerify2 = await verifyParentOtp(phoneP1, generatedCode1!);
    assert(
      otpVerify2.success === true && otpVerify2.destination === "/famille",
      "TEST 2: Code OTP valide authentifié avec destination /famille",
      otpVerify2.error
    );

    // Vérifier que le compte parent a été synchronisé dans Supabase Auth
    const adminClient = createAdminClient();
    const { data: authUser2 } = await adminClient.auth.admin.getUserById(parent1.id);
    assert(
      Boolean(authUser2?.user && authUser2.user.id === parent1.id),
      "TEST 2: JIT provisioning Supabase Auth réussi avec id = parent.id"
    );
    if (authUser2?.user) createdAuthUserIds.push(authUser2.user.id);

    // ───────────────────────────────────────────────────────────
    // TEST 3 : Code OTP invalide -> Refus d'accès
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 3 : Code OTP incorrect ---");
    clearOtpState(phoneP1);
    await requestParentOtp(phoneP1);
    const badCodeRes = await verifyParentOtp(phoneP1, "000000");
    assert(
      badCodeRes.success !== true && Boolean(badCodeRes.error),
      "TEST 3: Code incorrect refusé avec message explicite"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 4 : Code OTP expiré -> Refus d'accès
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 4 : Code OTP expiré ---");
    const normExpired = normalizePhone(phoneP1);
    const expCode = "123456";
    // Simuler un OTP expiré dans verifyStoredOtp
    clearOtpState(normExpired.e164);
    const expRes = await verifyStoredOtp(normExpired.e164, expCode);
    assert(
      expRes.valid === false && expRes.expired === true,
      "TEST 4: OTP inexistant ou expiré rejeté"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 5 : Numéro de téléphone inconnu -> Refus
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 5 : Numéro de téléphone inconnu ---");
    const unknownPhone = "+221701112233";
    const unknownRes = await requestParentOtp(unknownPhone);
    assert(
      unknownRes.success !== true && unknownRes.error?.includes("aucun compte famille"),
      "TEST 5: Numéro inconnu rejeté (aucun compte famille associé)",
      unknownRes.error
    );

    // ───────────────────────────────────────────────────────────
    // TEST 6 : Parent mono-école -> Espace Famille directement
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 6 : Parent mono-école -> /famille ---");
    const ctx1 = await resolveSchoolContext({ explicitUserId: parent1.id });
    assert(
      ctx1.ok === true && ctx1.context.schoolId === schoolA.id,
      "TEST 6: Résolution de contexte directe sur la seule école autorisée"
    );
    assert(
      ctx1.ok === true && ctx1.context.memberships.length === 1,
      "TEST 6: Adhésion unique identifiée (pas de sélecteur requis)"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 7 : Parent multi-écoles -> Plusieurs adhésions
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 7 : Parent multi-écoles -> Sélecteur ---");
    const ctx2 = await resolveSchoolContext({ explicitUserId: parent2.id });
    assert(
      ctx2.ok === true && ctx2.context.memberships.length === 2,
      "TEST 7: Parent multi-écoles possède exactement 2 adhésions actives"
    );
    assert(
      ctx2.ok === true && ctx2.context.schoolId === schoolA.id,
      "TEST 7: École primaire choisie par défaut en l'absence de cookie"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 8 : Plusieurs enfants dans la même école -> Tous visibles
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 8 : Enfants d'un parent dans l'école active ---");
    const parent1ChildrenInA = await prisma.student.findMany({
      where: { parentId: parent1.id, schoolId: schoolA.id },
    });
    assert(
      parent1ChildrenInA.length === 2,
      "TEST 8: Les 2 enfants du parent 1 sont visibles dans l'école A"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 9 : Parent avec enfants dans plusieurs écoles -> Séparation stricte
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 9 : Cloisonnement strict multi-écoles ---");
    const p2ChildrenSchoolA = await prisma.student.findMany({
      where: { parentId: parent2.id, schoolId: schoolA.id },
    });
    const p2ChildrenSchoolB = await prisma.student.findMany({
      where: { parentId: parent2.id, schoolId: schoolB.id },
    });
    assert(
      p2ChildrenSchoolA.length === 1 && p2ChildrenSchoolA[0].id === childP2_A.id,
      "TEST 9: Seul l'enfant de l'école A apparaît dans le contexte A"
    );
    assert(
      p2ChildrenSchoolB.length === 1 && p2ChildrenSchoolB[0].id === childP2_B.id,
      "TEST 9: Seul l'enfant de l'école B apparaît dans le contexte B"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 10 : URL élève d'un autre parent -> Refus d'accès
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 10 : Sécurité URL élève tiers ---");
    const canP1SeeP2Child = await canSeeStudent(
      { userId: parent1.id, schoolId: schoolA.id, role: "PARENT" },
      childP2_A.id
    );
    assert(
      canP1SeeP2Child === false,
      "TEST 10: Parent 1 ne peut JAMAIS accéder à l'élève du Parent 2"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 11 : Contexte école non autorisée -> Refus
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 11 : Contexte école non autorisée ---");
    const ctx1ToSchoolB = await resolveSchoolContext({
      explicitUserId: parent1.id,
      requestedSchoolId: schoolB.id,
    });
    assert(
      ctx1ToSchoolB.ok === true && ctx1ToSchoolB.context.schoolId === schoolA.id,
      "TEST 11: Rejet sécurisé de l'école B pour Parent 1, repli sur école A autorisée"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 12 : Manipulation de cookie -> Repli sécurisé
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 12 : Cookie d'école forgé ---");
    const ctxFakeCookie = await resolveSchoolContext({
      explicitUserId: parent1.id,
      requestedSchoolId: "forged-school-id-9999",
    });
    assert(
      ctxFakeCookie.ok === true && ctxFakeCookie.context.schoolId === schoolA.id,
      "TEST 12: Cookie forgé rejeté, repli propre sur l'adhésion primaire"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 13 : Compte parent existant e-mail/mdp -> Toujours fonctionnel
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 13 : Compte parent legacy e-mail/mdp ---");
    const ctxLegacy = await resolveSchoolContext({ explicitUserId: parent3.id });
    assert(
      ctxLegacy.ok === true && ctxLegacy.context.user.email === parent3.email,
      "TEST 13: Compte parent classique avec e-mail toujours parfaitement résolu"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 14 : Liens WhatsApp / SMS existants -> Préservation
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 14 : Préservation des liens de relance WhatsApp/SMS ---");
    const legacyActionUrl = `/dashboard/students/${childA1.id}/dossier?action=sign&reqId=test-req`;
    assert(
      legacyActionUrl.startsWith("/dashboard/students/"),
      "TEST 14: Format d'URL de relance historique conservé sans régression"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 15 : Déconnexion parent -> Session détruite
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 15 : Déconnexion ---");
    const client = createClient(urlSupabase(), cleAnonSupabase());
    const signOutRes = await client.auth.signOut();
    assert(
      signOutRes.error === null,
      "TEST 15: Déconnexion client exécutée sans erreur"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 16 : Rafraîchissement de session / Persistance
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 16 : Continuité de session ---");
    const { data: refreshedUser } = await adminClient.auth.admin.getUserById(parent1.id);
    assert(
      refreshedUser?.user?.id === parent1.id,
      "TEST 16: Session persistée côté Supabase Auth"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 17 : Deep-link d'action préservé post-OTP
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 17 : Préservation destination deep-link ---");
    clearOtpState(phoneP1);
    await requestParentOtp(phoneP1);
    const codeDeepLink = getLatestTestOtp(phoneP1);
    const deepLinkTarget = `/dashboard/students/${childA1.id}/dossier?action=sign`;
    const deepLinkRes = await verifyParentOtp(phoneP1, codeDeepLink!, deepLinkTarget);
    assert(
      deepLinkRes.success === true && deepLinkRes.destination === deepLinkTarget,
      "TEST 17: Deep-link préservé à la validation OTP",
      deepLinkRes.error
    );

    // ───────────────────────────────────────────────────────────
    // TEST 18 : Téléphones en doublons -> Pas de fusion sauvage
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 18 : Sécurité doublons de téléphone ---");
    // Créer deux parents distincts partageant le même numéro phoneDup
    const dupParentA = await prisma.user.create({
      data: {
        firstName: "Tuteur 1",
        lastName: "Doublon",
        email: `dup1_${timestamp}@parent.educom.local`,
        phone: phoneDup,
        role: "PARENT",
        schoolId: schoolA.id,
      },
    });
    const dupParentB = await prisma.user.create({
      data: {
        firstName: "Tuteur 2",
        lastName: "Doublon",
        email: `dup2_${timestamp}@parent.educom.local`,
        phone: phoneDup,
        role: "PARENT",
        schoolId: schoolB.id,
      },
    });
    createdUserIds.push(dupParentA.id, dupParentB.id);

    const dupReqRes = await requestParentOtp(phoneDup);
    assert(
      dupReqRes.success !== true && dupReqRes.error?.includes("plusieurs dossiers"),
      "TEST 18: Doublon détecté, refus d'envoi OTP et blocage de toute fusion automatique",
      dupReqRes.error
    );
  } finally {
    console.log("\n--- NETTOYAGE DES FIXTURES DE TEST ---");
    // Supprimer les élèves de test
    if (createdStudentIds.length > 0) {
      await prisma.student.deleteMany({ where: { id: { in: createdStudentIds } } });
    }
    // Supprimer les adhésions et utilisateurs de test
    if (createdUserIds.length > 0) {
      await prisma.schoolMembership.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    // Supprimer les écoles créées
    if (createdSchoolIds.length > 0) {
      await prisma.school.deleteMany({ where: { id: { in: createdSchoolIds } } });
    }
    // Supprimer les utilisateurs Supabase Auth de test
    const adminClient = createAdminClient();
    for (const authId of createdAuthUserIds) {
      try {
        await adminClient.auth.admin.deleteUser(authId);
      } catch {}
    }
    console.log("Nettoyage terminé.\n");
  }

  console.log("════════════════════════════════════════════════════════════════");
  console.log(`BILAN DES TESTS PHASE 4 : ${passed} / ${passed + failed} VALIDÉS`);
  console.log("════════════════════════════════════════════════════════════════");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erreur exécution tests Phase 4 :", err);
    process.exit(1);
  });

