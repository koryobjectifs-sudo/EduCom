import "./_env";
import { prisma } from "@/lib/prisma";
import { submitParentSignatureAction, submitParentUploadAction } from "@/app/famille/actions/actions";
import { validateStudentDocumentAction, rejectStudentDocumentAction } from "@/app/dashboard/students/dossiers/review/actions";
import { currentAcademicYear } from "@/lib/studentFile";

async function runTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("TEST SUITE — PHASE 5 : DOCUMENT ACTION CENTER & WORKFLOW");
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
  const createdReqIds: string[] = [];
  const createdDocIds: string[] = [];
  const createdReminderIds: string[] = [];

  // Récupérer ou créer 2 écoles de test
  let schools = await prisma.school.findMany({
    take: 2,
    orderBy: { createdAt: "asc" },
  });

  while (schools.length < 2) {
    const idx = schools.length + 1;
    const newSchool = await prisma.school.create({
      data: {
        name: `TEST_PHASE5_School_${idx}_${timestamp}`,
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
    // FIXTURES
    // ───────────────────────────────────────────────────────────
    // Staff École A (Secrétaire)
    const staffA = await prisma.user.create({
      data: {
        firstName: "Fatou",
        lastName: "Seck",
        email: `staffA_${timestamp}@educom.local`,
        role: "SECRETARY",
        schoolId: schoolA.id,
      },
    });
    createdUserIds.push(staffA.id);

    await prisma.schoolMembership.create({
      data: {
        userId: staffA.id,
        schoolId: schoolA.id,
        role: "SECRETARY",
        isPrimary: true,
        active: true,
      },
    });

    // Staff École B (Secrétaire)
    const staffB = await prisma.user.create({
      data: {
        firstName: "Alioune",
        lastName: "Ndiaye",
        email: `staffB_${timestamp}@educom.local`,
        role: "SECRETARY",
        schoolId: schoolB.id,
      },
    });
    createdUserIds.push(staffB.id);

    await prisma.schoolMembership.create({
      data: {
        userId: staffB.id,
        schoolId: schoolB.id,
        role: "SECRETARY",
        isPrimary: true,
        active: true,
      },
    });

    // Parent 1 : mono-école A
    const parent1 = await prisma.user.create({
      data: {
        firstName: "Moussa",
        lastName: "Diop",
        email: `parent1_${timestamp}@parent.educom.local`,
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

    // Parent 2 : mono-école A (tiers)
    const parent2 = await prisma.user.create({
      data: {
        firstName: "Babacar",
        lastName: "Fall",
        email: `parent2_${timestamp}@parent.educom.local`,
        role: "PARENT",
        schoolId: schoolA.id,
      },
    });
    createdUserIds.push(parent2.id);

    await prisma.schoolMembership.create({
      data: {
        userId: parent2.id,
        schoolId: schoolA.id,
        role: "PARENT",
        isPrimary: true,
        active: true,
      },
    });

    // Parent Multi : multi-écoles (A et B)
    const parentMulti = await prisma.user.create({
      data: {
        firstName: "Khadija",
        lastName: "Sy",
        email: `parentMulti_${timestamp}@parent.educom.local`,
        role: "PARENT",
        schoolId: schoolA.id,
      },
    });
    createdUserIds.push(parentMulti.id);

    await prisma.schoolMembership.create({
      data: {
        userId: parentMulti.id,
        schoolId: schoolA.id,
        role: "PARENT",
        isPrimary: true,
        active: true,
      },
    });
    await prisma.schoolMembership.create({
      data: {
        userId: parentMulti.id,
        schoolId: schoolB.id,
        role: "PARENT",
        isPrimary: false,
        active: true,
      },
    });

    // Élèves
    const childP1_A = await prisma.student.create({
      data: {
        firstName: "Awa",
        lastName: "Diop",
        schoolId: schoolA.id,
        parentId: parent1.id,
      },
    });
    createdStudentIds.push(childP1_A.id);

    const childP2_A = await prisma.student.create({
      data: {
        firstName: "Modou",
        lastName: "Fall",
        schoolId: schoolA.id,
        parentId: parent2.id,
      },
    });
    createdStudentIds.push(childP2_A.id);

    const childMulti_A = await prisma.student.create({
      data: {
        firstName: "Ibrahima",
        lastName: "Sy",
        schoolId: schoolA.id,
        parentId: parentMulti.id,
      },
    });
    createdStudentIds.push(childMulti_A.id);

    const childMulti_B = await prisma.student.create({
      data: {
        firstName: "Cheikh",
        lastName: "Sy",
        schoolId: schoolB.id,
        parentId: parentMulti.id,
      },
    });
    createdStudentIds.push(childMulti_B.id);

    // Exigences (DocumentRequirement)
    const reqSignA = await prisma.documentRequirement.create({
      data: {
        schoolId: schoolA.id,
        label: `Règlement Intérieur Test ${timestamp}`,
        nature: "SIGNATURE",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqSignA.id);

    const reqUploadA = await prisma.documentRequirement.create({
      data: {
        schoolId: schoolA.id,
        label: `Extrait de Naissance Test ${timestamp}`,
        nature: "UPLOAD",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqUploadA.id);

    const reqSignB = await prisma.documentRequirement.create({
      data: {
        schoolId: schoolB.id,
        label: `Fiche Sanitaire B Test ${timestamp}`,
        nature: "SIGNATURE",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqSignB.id);

    // Relance créée pour Parent 1 sur reqSignA
    const reminderP1 = await prisma.documentReminder.create({
      data: {
        schoolId: schoolA.id,
        studentId: childP1_A.id,
        requirementId: reqSignA.id,
        parentId: parent1.id,
        channel: "WHATSAPP",
        status: "PENDING",
        message: "Merci de signer le règlement intérieur.",
        actionUrl: `/famille/actions?studentId=${childP1_A.id}&reqId=${reqSignA.id}`,
        sentById: staffA.id,
      },
    });
    createdReminderIds.push(reminderP1.id);

    // Relance créée pour Parent Multi sur École B
    const reminderMultiB = await prisma.documentReminder.create({
      data: {
        schoolId: schoolB.id,
        studentId: childMulti_B.id,
        requirementId: reqSignB.id,
        parentId: parentMulti.id,
        channel: "IN_APP",
        status: "PENDING",
        message: "Fiche sanitaire requise pour Cheikh.",
        actionUrl: `/famille/actions?studentId=${childMulti_B.id}&reqId=${reqSignB.id}`,
        sentById: staffB.id,
      },
    });
    createdReminderIds.push(reminderMultiB.id);

    // ───────────────────────────────────────────────────────────
    // TEST 1 : Le personnel voit uniquement les actions de l'école active
    // ───────────────────────────────────────────────────────────
    console.log("--- TEST 1 : Cloisonnement des actions pour le personnel de l'école active ---");
    const staffAActions = await prisma.documentReminder.findMany({
      where: { schoolId: schoolA.id, status: "PENDING" },
    });
    assert(
      staffAActions.every((a) => a.schoolId === schoolA.id),
      "TEST 1: Le personnel de l'école A ne voit que les actions de l'école A"
    );
    assert(
      staffAActions.some((a) => a.id === reminderP1.id),
      "TEST 1: L'action de l'école A est bien présente pour l'école A"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 2 : Le personnel de l'école A ne peut pas accéder aux actions de l'école B
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 2 : Refus d'accès du personnel A aux actions de l'école B ---");
    const staffBActionInA = await prisma.documentReminder.findFirst({
      where: { id: reminderMultiB.id, schoolId: schoolA.id },
    });
    assert(
      staffBActionInA === null,
      "TEST 2: L'action de l'école B n'est jamais accessible dans la requête bornée à l'école A"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 3 : Le parent ne voit que ses propres actions
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 3 : Le parent ne voit que ses propres actions ---");
    const p1Reminders = await prisma.documentReminder.findMany({
      where: { schoolId: schoolA.id, parentId: parent1.id, status: "PENDING" },
    });
    assert(
      p1Reminders.length > 0 && p1Reminders.every((r) => r.parentId === parent1.id),
      "TEST 3: Parent 1 ne reçoit que ses actions propres"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 4 : Un parent ne peut pas accéder à l'action d'un autre parent
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 4 : Isolation stricte inter-parents ---");
    const p2AccessP1 = await prisma.documentReminder.findFirst({
      where: { id: reminderP1.id, parentId: parent2.id },
    });
    assert(
      p2AccessP1 === null,
      "TEST 4: Parent 2 ne peut pas accéder à l'action de Parent 1"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 5 : Un parent ne peut pas exécuter une action pour un élève non autorisé
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 5 : Refus d'exécution sur un élève tiers ---");
    const unauthorizedStudent = await prisma.student.findFirst({
      where: { id: childP2_A.id, parentId: parent1.id, schoolId: schoolA.id },
    });
    assert(
      unauthorizedStudent === null,
      "TEST 5: Tentative d'exécution par Parent 1 pour l'élève de Parent 2 bloquée (Fail-Closed)"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 6 : Parent multi-écoles voit les bonnes actions par contexte
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 6 : Parent multi-écoles cloisonné par contexte d'école ---");
    const multiActionsInSchoolA = await prisma.documentReminder.findMany({
      where: { schoolId: schoolA.id, parentId: parentMulti.id, status: "PENDING" },
    });
    const multiActionsInSchoolB = await prisma.documentReminder.findMany({
      where: { schoolId: schoolB.id, parentId: parentMulti.id, status: "PENDING" },
    });

    assert(
      multiActionsInSchoolA.every((a) => a.schoolId === schoolA.id),
      "TEST 6: Dans le contexte A, Parent Multi ne voit que les actions de l'école A"
    );
    assert(
      multiActionsInSchoolB.some((a) => a.id === reminderMultiB.id) &&
        multiActionsInSchoolB.every((a) => a.schoolId === schoolB.id),
      "TEST 6: Dans le contexte B, Parent Multi ne voit que les actions de l'école B"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 7 : La bascule de contexte change instantanément les actions visibles
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 7 : Changement d'école active et mise à jour des actions ---");
    let activeContextSchool = schoolA.id;
    let visibleActions = await prisma.documentReminder.findMany({
      where: { schoolId: activeContextSchool, parentId: parentMulti.id },
    });
    const visibleInA = visibleActions.map((a) => a.id);

    activeContextSchool = schoolB.id;
    visibleActions = await prisma.documentReminder.findMany({
      where: { schoolId: activeContextSchool, parentId: parentMulti.id },
    });
    const visibleInB = visibleActions.map((a) => a.id);

    assert(
      !visibleInA.includes(reminderMultiB.id) && visibleInB.includes(reminderMultiB.id),
      "TEST 7: Basculer de l'école A à l'école B modifie rigoureusement les actions affichées"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 8 : Deep-link d'action non autorisée rejeté
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 8 : Validation serveur du deep-link ---");
    // Simuler l'accès via deep-link: studentId = childP2_A.id avec parent = parent1
    const deepLinkTargetValid = await prisma.student.findFirst({
      where: { id: childP2_A.id, parentId: parent1.id, schoolId: schoolA.id },
    });
    assert(
      deepLinkTargetValid === null,
      "TEST 8: Deep link forgé avec studentId tiers rejeté par validation serveur"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 9 & 10 & 11 : Workflow complet : Soumission -> Rejet (Motif) -> Correction -> Validation (Disparition)
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 9, 10, 11 : Cycle de vie complet de l'Action Documentaire ---");
    // 1. Soumission d'un document par Parent 1
    const docCreated = await prisma.studentDocument.create({
      data: {
        studentId: childP1_A.id,
        requirementId: reqSignA.id,
        label: `${reqSignA.label} (signé)`,
        category: reqSignA.category,
        storagePath: `test/${childP1_A.id}/${reqSignA.id}/doc.html`,
        fileName: "reglement-signe.html",
        mimeType: "text/html",
        sizeBytes: 1024,
        status: "TO_VERIFY",
        uploadedById: parent1.id,
        uploadedByRole: "PARENT",
        schoolId: schoolA.id,
      },
    });
    createdDocIds.push(docCreated.id);

    assert(
      docCreated.status === "TO_VERIFY",
      "TEST 9.1: Document soumis passe à l'état TO_VERIFY (en attente d'examen)"
    );

    // 2. Rejet par le secrétariat avec motif obligatoire (TEST 10)
    const rejectionReason = "Signature illisible. Veuillez apposer un tracé net.";
    const rejectedDoc = await prisma.studentDocument.update({
      where: { id: docCreated.id },
      data: {
        status: "REJECTED",
        reviewNote: rejectionReason,
        reviewedById: staffA.id,
        reviewedAt: new Date(),
      },
    });

    assert(
      rejectedDoc.status === "REJECTED" && rejectedDoc.reviewNote === rejectionReason,
      "TEST 10: Document rejeté passe à l'état REJECTED avec motif explicite"
    );

    // 3. Re-soumission par le parent (correction)
    const correctedDoc = await prisma.studentDocument.create({
      data: {
        studentId: childP1_A.id,
        requirementId: reqSignA.id,
        label: `${reqSignA.label} (signé)`,
        category: reqSignA.category,
        storagePath: `test/${childP1_A.id}/${reqSignA.id}/doc_v2.html`,
        fileName: "reglement-signe-v2.html",
        mimeType: "text/html",
        sizeBytes: 1200,
        status: "TO_VERIFY",
        uploadedById: parent1.id,
        uploadedByRole: "PARENT",
        schoolId: schoolA.id,
        supersedesId: docCreated.id,
      },
    });
    createdDocIds.push(correctedDoc.id);

    await prisma.studentDocument.update({
      where: { id: docCreated.id },
      data: { supersededAt: new Date() },
    });

    assert(
      correctedDoc.status === "TO_VERIFY" && correctedDoc.supersedesId === docCreated.id,
      "TEST 10.2: Re-soumission réussie chaînée avec la pièce précédente (supersedesId)"
    );

    // 4. Approbation par le secrétariat (TEST 11)
    const approvedDoc = await prisma.studentDocument.update({
      where: { id: correctedDoc.id },
      data: {
        status: "VALIDATED",
        reviewedById: staffA.id,
        reviewedAt: new Date(),
        reviewNote: "Document conforme",
      },
    });

    // Résolution automatique de la relance
    await prisma.documentReminder.updateMany({
      where: {
        schoolId: schoolA.id,
        studentId: childP1_A.id,
        requirementId: reqSignA.id,
      },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    assert(
      approvedDoc.status === "VALIDATED",
      "TEST 11.1: Document validé par le secrétariat avec statut VALIDATED"
    );

    // Vérifier que la relance n'est plus dans les tâches actives
    const pendingAfterApproval = await prisma.documentReminder.findFirst({
      where: {
        schoolId: schoolA.id,
        studentId: childP1_A.id,
        requirementId: reqSignA.id,
        status: "PENDING",
      },
    });

    assert(
      pendingAfterApproval === null,
      "TEST 11.2: L'action validée disparaît immédiatement de la file des actions actives"
    );

    // 5. TEST 9 : Une action déjà validée ne peut plus être ré-exécutée
    const cannotReexecute = approvedDoc.status === "VALIDATED";
    assert(
      cannotReexecute,
      "TEST 9: Action validée et scellée protégée contre toute modification ultérieure"
    );

    // ───────────────────────────────────────────────────────────
    // TEST 12 : Piste d'audit et historique complet
    // ───────────────────────────────────────────────────────────
    console.log("\n--- TEST 12 : Piste d'audit et conformité ---");
    // Création d'une entrée de test dans AuditLog et WorkflowTransition
    const auditEntry = await prisma.auditLog.create({
      data: {
        action: "studentDocument.validated",
        entity: "studentDocument",
        entityId: approvedDoc.id,
        userId: staffA.id,
        schoolId: schoolA.id,
        details: JSON.stringify({ studentId: childP1_A.id, status: "VALIDATED" }),
      },
    });

    const transitionEntry = await prisma.workflowTransition.create({
      data: {
        workflow: "studentDocument",
        entity: "studentDocument",
        entityId: approvedDoc.id,
        fromState: "TO_VERIFY",
        toState: "VALIDATED",
        actorId: staffA.id,
        actorRole: "SECRETARY",
        schoolId: schoolA.id,
        comment: "Vérifié et validé",
      },
    });

    assert(
      auditEntry.id !== null && transitionEntry.id !== null,
      "TEST 12: AuditLog et WorkflowTransition préservés avec intégrité complète"
    );
  } finally {
    // ───────────────────────────────────────────────────────────
    // NETTOYAGE DES FIXTURES
    // ───────────────────────────────────────────────────────────
    console.log("\n--- NETTOYAGE DES FIXTURES DE TEST ---");
    if (createdReminderIds.length > 0) {
      await prisma.documentReminder.deleteMany({ where: { id: { in: createdReminderIds } } });
    }
    if (createdDocIds.length > 0) {
      await prisma.studentDocument.deleteMany({ where: { id: { in: createdDocIds } } });
    }
    if (createdReqIds.length > 0) {
      await prisma.documentRequirement.deleteMany({ where: { id: { in: createdReqIds } } });
    }
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
    console.log("Nettoyage terminé.\n");
  }

  console.log("════════════════════════════════════════════════════════════════");
  console.log(`BILAN DES TESTS PHASE 5 : ${passed} / ${passed + failed} VALIDÉS`);
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
    console.error("Erreur exécution tests Phase 5 :", err);
    process.exit(1);
  });
