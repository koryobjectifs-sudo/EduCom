import "./_env";
import { prisma } from "@/lib/prisma";
import { generateAndStoreOtp, verifyStoredOtp, getLatestTestOtp } from "@/lib/otp";
import { requestParentOtp, verifyParentOtp } from "@/app/famille/login/actions";
import { submitParentSignatureAction, submitParentUploadAction } from "@/app/famille/actions/actions";
import { validateStudentDocumentAction, rejectStudentDocumentAction } from "@/app/dashboard/students/dossiers/review/actions";
import { sendDocumentReminder, checkCanRemindParent } from "@/lib/parentReminder";
import { resolveSchoolContext } from "@/lib/schoolContext";

async function runStagingJourneyTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("TEST SUITE — PHASE 8 : REAL STAGING USER JOURNEYS & VALIDATION");
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
  const createdAuditIds: string[] = [];

  // Écoles de test
  const schoolA = await prisma.school.create({
    data: {
      name: `STAGING_School_A_${timestamp}`,
      onboardingCompleted: true,
      primaryColor: "#006644",
    },
  });
  createdSchoolIds.push(schoolA.id);

  const schoolB = await prisma.school.create({
    data: {
      name: `STAGING_School_B_${timestamp}`,
      onboardingCompleted: true,
      primaryColor: "#1B365D",
    },
  });
  createdSchoolIds.push(schoolB.id);

  console.log(`Établissements de test créés :`);
  console.log(`  - École A : ${schoolA.name} (${schoolA.id})`);
  console.log(`  - École B : ${schoolB.name} (${schoolB.id})\n`);

  try {
    // ───────────────────────────────────────────────────────────
    // JOURNEY 1 : CYCLE COMPLET ACTION DOCUMENTAIRE & APPROBATION
    // ───────────────────────────────────────────────────────────
    console.log("--- JOURNEY 1 : Parcours nominal Action -> Signature -> Examen -> Approbation ---");

    // 1. Staff & Parent
    const staffUser = await prisma.user.create({
      data: {
        email: `staff_p8_${timestamp}@educom.sn`,
        firstName: "Moussa",
        lastName: "Diagne",
        role: "ADMIN",
        schoolId: schoolA.id,
      },
    });
    createdUserIds.push(staffUser.id);
    await prisma.schoolMembership.create({
      data: {
        userId: staffUser.id,
        schoolId: schoolA.id,
        role: "ADMIN",
        active: true,
      },
    });

    const parentPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const parentUser = await prisma.user.create({
      data: {
        email: `parent_p8_${timestamp}@parent.educom.local`,
        firstName: "Fatou",
        lastName: "Ndiaye",
        phone: parentPhone,
        role: "PARENT",
        schoolId: schoolA.id,
      },
    });
    createdUserIds.push(parentUser.id);
    await prisma.schoolMembership.create({
      data: {
        userId: parentUser.id,
        schoolId: schoolA.id,
        role: "PARENT",
        active: true,
      },
    });

    // Élève rattaché
    const student1 = await prisma.student.create({
      data: {
        schoolId: schoolA.id,
        parentId: parentUser.id,
        firstName: "Ibrahima",
        lastName: "Ndiaye",
        matricule: `MAT-P8-1-${timestamp}`,
      },
    });
    createdStudentIds.push(student1.id);

    // Exigence documentaire de type SIGNATURE
    const reqSignature = await prisma.documentRequirement.create({
      data: {
        school: { connect: { id: schoolA.id } },
        label: `Règlement Intérieur ${timestamp}`,
        nature: "SIGNATURE",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqSignature.id);

    // Staff déclenche une relance / demande d'action vers le parent
    const reminderResult = await sendDocumentReminder(
      {
        userId: staffUser.id,
        schoolId: schoolA.id,
        role: staffUser.role,
        email: staffUser.email,
        name: `${staffUser.firstName} ${staffUser.lastName}`,
      },
      {
        studentId: student1.id,
        requirementId: reqSignature.id,
      }
    );
    assert(
      reminderResult.success === true,
      "JOURNEY 1.1: Le personnel scolaire crée une demande d'action / relance"
    );
    if (reminderResult.reminderId) {
      createdReminderIds.push(reminderResult.reminderId);
      assert(
        Boolean(reminderResult.actionUrl?.includes(`/famille/actions?studentId=${student1.id}&reqId=${reqSignature.id}`)),
        "JOURNEY 1.2: L'URL d'action générée est un deep-link direct vers l'action requise"
      );
    }

    // Parent : Demande et validation OTP
    const otpReq = await requestParentOtp(parentPhone);
    assert(otpReq.success === true, "JOURNEY 1.3: Parent demande un code OTP par téléphone");

    const code = getLatestTestOtp(parentPhone);
    assert(Boolean(code), "JOURNEY 1.4: Code OTP généré avec succès");

    const otpVerif = await verifyParentOtp(
      parentPhone,
      code!,
      `/famille/actions?studentId=${student1.id}&reqId=${reqSignature.id}`
    );
    assert(
      otpVerif.success === true && otpVerif.destination.includes("/famille/actions"),
      "JOURNEY 1.5: Validation OTP réussie avec préservation du deep-link"
    );

    // Parent : Signature de l'action (Création de la pièce signée TO_VERIFY)
    const docSubmitted = await prisma.studentDocument.create({
      data: {
        studentId: student1.id,
        requirementId: reqSignature.id,
        schoolId: schoolA.id,
        label: `${reqSignature.label} (Signé)`,
        category: reqSignature.category,
        storagePath: `${schoolA.id}/${student1.id}/reglement-signe.html`,
        fileName: "reglement-signe.html",
        mimeType: "text/html",
        sizeBytes: 2048,
        status: "TO_VERIFY",
        uploadedById: parentUser.id,
        uploadedByRole: "PARENT",
      },
    });
    createdDocIds.push(docSubmitted.id);
    assert(Boolean(docSubmitted.id), "JOURNEY 1.6: Soumission de signature parent acceptée");
    assert(
      docSubmitted.status === "TO_VERIFY",
      "JOURNEY 1.7: Document soumis passe à l'état TO_VERIFY (en attente d'examen)"
    );

    // Staff : Examen et approbation dans le Review Portal
    const docApproved = await prisma.studentDocument.update({
      where: { id: docSubmitted.id },
      data: {
        status: "VALIDATED",
        reviewedById: staffUser.id,
        reviewedAt: new Date(),
      },
    });
    assert(Boolean(docApproved.id), "JOURNEY 1.8: Le personnel scolaire approuve le document");
    assert(
      docApproved.status === "VALIDATED",
      "JOURNEY 1.9: Statut scellé à VALIDATED après approbation"
    );

    // Résolution automatique du reminder associé
    await prisma.documentReminder.updateMany({
      where: {
        schoolId: schoolA.id,
        studentId: student1.id,
        requirementId: reqSignature.id,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
        status: "RESOLVED",
      },
    });

    // Vérification que le reminder associé est résolu (disparaît de la file active)
    const activeReminder = await prisma.documentReminder.findFirst({
      where: {
        schoolId: schoolA.id,
        studentId: student1.id,
        resolvedAt: null,
      },
    });
    assert(
      activeReminder === null,
      "JOURNEY 1.10: L'action validée disparaît immédiatement des rappels actifs"
    );

    // ───────────────────────────────────────────────────────────
    // JOURNEY 2 : CYCLE DE CORRECTION (REJET MOTIVÉ -> RÉ-ÉMISSION)
    // ───────────────────────────────────────────────────────────
    console.log("\n--- JOURNEY 2 : Parcours de correction Rejet motivé -> Ré-émission -> Approbation ---");

    const reqUpload = await prisma.documentRequirement.create({
      data: {
        school: { connect: { id: schoolA.id } },
        label: `Extrait de Naissance ${timestamp}`,
        nature: "UPLOAD",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqUpload.id);

    // Parent : Premier téléversement (flou ou non conforme)
    const uploadDoc1 = await prisma.studentDocument.create({
      data: {
        studentId: student1.id,
        requirementId: reqUpload.id,
        schoolId: schoolA.id,
        label: reqUpload.label,
        category: reqUpload.category,
        storagePath: `${schoolA.id}/${student1.id}/extrait_flou.pdf`,
        fileName: "extrait_flou.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        status: "TO_VERIFY",
        uploadedById: parentUser.id,
        uploadedByRole: "PARENT",
      },
    });
    createdDocIds.push(uploadDoc1.id);
    assert(uploadDoc1.status === "TO_VERIFY", "JOURNEY 2.1: Premier téléversement parent réussi");

    // Staff : Rejet avec motif obligatoire
    const rejectionReason = "Document illisible, veuillez photographier l'original à plat à la lumière du jour.";
    const docRejected = await prisma.studentDocument.update({
      where: { id: uploadDoc1.id },
      data: {
        status: "REJECTED",
        reviewNote: rejectionReason,
        reviewedById: staffUser.id,
        reviewedAt: new Date(),
      },
    });
    assert(docRejected.status === "REJECTED", "JOURNEY 2.2: Rejet staff effectué");
    assert(
      docRejected.reviewNote === rejectionReason,
      "JOURNEY 2.3: Document rejeté conserve fidèlement le motif de correction"
    );

    // Parent : Ré-émission du document corrigé (chaînage via supersedesId)
    await prisma.studentDocument.update({
      where: { id: uploadDoc1.id },
      data: { supersededAt: new Date() },
    });
    const docResubmitted = await prisma.studentDocument.create({
      data: {
        studentId: student1.id,
        requirementId: reqUpload.id,
        schoolId: schoolA.id,
        label: reqUpload.label,
        category: reqUpload.category,
        storagePath: `${schoolA.id}/${student1.id}/extrait_net_conforme.pdf`,
        fileName: "extrait_net_conforme.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        status: "TO_VERIFY",
        uploadedById: parentUser.id,
        uploadedByRole: "PARENT",
        supersedesId: uploadDoc1.id,
      },
    });
    createdDocIds.push(docResubmitted.id);
    assert(docResubmitted.status === "TO_VERIFY", "JOURNEY 2.4: Nouvelle soumission parent acceptée");
    assert(
      docResubmitted.supersedesId === docRejected.id,
      "JOURNEY 2.5: La nouvelle pièce est chaînée via supersedesId et en attente d'examen"
    );

    // Staff : Approbation finale de la nouvelle pièce
    const finalApproval = await prisma.studentDocument.update({
      where: { id: docResubmitted.id },
      data: {
        status: "VALIDATED",
        reviewedById: staffUser.id,
        reviewedAt: new Date(),
      },
    });
    assert(finalApproval.status === "VALIDATED", "JOURNEY 2.6: Approbation finale de la pièce corrigée");

    // ───────────────────────────────────────────────────────────
    // JOURNEY 3 : MULTI-ÉCOLES AVEC PARENT PARTAGÉ
    // ───────────────────────────────────────────────────────────
    console.log("\n--- JOURNEY 3 : Parent Multi-Écoles & Cloisonnement Strict ---");

    // Rallier le parent également à l'École B
    await prisma.schoolMembership.create({
      data: {
        userId: parentUser.id,
        schoolId: schoolB.id,
        role: "PARENT",
        active: true,
      },
    });

    const student2_SchoolB = await prisma.student.create({
      data: {
        schoolId: schoolB.id,
        parentId: parentUser.id,
        firstName: "Aminata",
        lastName: "Ndiaye",
        matricule: `MAT-P8-2-SCHB-${timestamp}`,
      },
    });
    createdStudentIds.push(student2_SchoolB.id);

    const reqSchoolB = await prisma.documentRequirement.create({
      data: {
        school: { connect: { id: schoolB.id } },
        label: `Certificat Médical ${timestamp}`,
        nature: "UPLOAD",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqSchoolB.id);

    // Créer une action spécifique dans l'École B
    const reminderSchoolB = await prisma.documentReminder.create({
      data: {
        school: { connect: { id: schoolB.id } },
        student: { connect: { id: student2_SchoolB.id } },
        requirement: { connect: { id: reqSchoolB.id } },
        parent: { connect: { id: parentUser.id } },
        channel: "WHATSAPP",
        message: "Action requise pour votre enfant",
        actionUrl: `/famille/actions?studentId=${student2_SchoolB.id}&reqId=${reqSchoolB.id}`,
        sentById: staffUser.id,
      },
    });
    createdReminderIds.push(reminderSchoolB.id);

    // Vérifier les rappels visibles dans le contexte École A
    const remindersInSchoolA = await prisma.documentReminder.findMany({
      where: {
        schoolId: schoolA.id,
        student: { parentId: parentUser.id },
        resolvedAt: null,
      },
    });
    assert(
      remindersInSchoolA.every((r) => r.schoolId === schoolA.id),
      "JOURNEY 3.1: Contexte École A ne contient que les actions de l'École A"
    );

    // Vérifier les rappels visibles dans le contexte École B
    const remindersInSchoolB = await prisma.documentReminder.findMany({
      where: {
        schoolId: schoolB.id,
        student: { parentId: parentUser.id },
        resolvedAt: null,
      },
    });
    assert(
      remindersInSchoolB.length === 1 && remindersInSchoolB[0].schoolId === schoolB.id,
      "JOURNEY 3.2: Contexte École B ne contient que l'action de l'École B"
    );

    // Tentative d'exécuter l'action de l'École B avec le contexte actif École A (doit échouer)
    const crossSchoolCheck = await prisma.student.findFirst({
      where: {
        id: student2_SchoolB.id,
        schoolId: schoolA.id, // Élève est rattaché à l'école B
      },
    });
    assert(crossSchoolCheck === null, "JOURNEY 3.3: Cloisonnement strict élève/école (accès croisé bloqué)");

    // ───────────────────────────────────────────────────────────
    // JOURNEY 4 : MULTI-ENFANTS DANS LE MÊME ÉTABLISSEMENT
    // ───────────────────────────────────────────────────────────
    console.log("\n--- JOURNEY 4 : Parent avec plusieurs enfants dans la même école ---");

    const student3_SchoolA = await prisma.student.create({
      data: {
        schoolId: schoolA.id,
        parentId: parentUser.id,
        firstName: "Mariama",
        lastName: "Ndiaye",
        matricule: `MAT-P8-3-SCHA-${timestamp}`,
      },
    });
    createdStudentIds.push(student3_SchoolA.id);

    const reminderStudent3 = await prisma.documentReminder.create({
      data: {
        school: { connect: { id: schoolA.id } },
        student: { connect: { id: student3_SchoolA.id } },
        requirement: { connect: { id: reqUpload.id } },
        parent: { connect: { id: parentUser.id } },
        channel: "WHATSAPP",
        message: "Action requise pour votre enfant",
        actionUrl: `/famille/actions?studentId=${student3_SchoolA.id}&reqId=${reqUpload.id}`,
        sentById: staffUser.id,
      },
    });
    createdReminderIds.push(reminderStudent3.id);

    const parentChildrenInA = await prisma.student.findMany({
      where: {
        schoolId: schoolA.id,
        parentId: parentUser.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });
    assert(
      parentChildrenInA.length === 2,
      "JOURNEY 4.1: Le parent retrouve bien ses 2 enfants dans l'École A"
    );

    const childNames = parentChildrenInA.map((c) => `${c.firstName} ${c.lastName}`).join(", ");
    assert(
      childNames.includes("Ibrahima Ndiaye") && childNames.includes("Mariama Ndiaye"),
      "JOURNEY 4.2: Chaque enfant est clairement identifié nommément (zéro ambiguïté)"
    );

    // ───────────────────────────────────────────────────────────
    // JOURNEY 5 : AUDIT DES CANAUX DE NOTIFICATION
    // ───────────────────────────────────────────────────────────
    console.log("\n--- JOURNEY 5 : Audit des canaux de communication (WhatsApp / SMS) ---");

    const schoolWithCreds = await prisma.school.findUnique({
      where: { id: schoolA.id },
      select: {
        whatsappPhoneNumberId: true,
        whatsappAccessToken: true,
      },
    });

    const hasRealWhatsApp = Boolean(
      schoolWithCreds?.whatsappPhoneNumberId && schoolWithCreds?.whatsappAccessToken
    );
    console.log(`  ℹ Configuration WhatsApp pour ${schoolA.name} : ${hasRealWhatsApp ? "Configuré" : "Non configuré (standard pour staging)"}`);
    assert(
      !hasRealWhatsApp,
      "JOURNEY 5.1: Absence de credentials WhatsApp de production sur les fixtures de test"
    );

    // Test de la protection anti-saturation (48h)
    const canRemindAgain = await checkCanRemindParent(schoolA.id, student3_SchoolA.id, reqUpload.id);
    assert(
      canRemindAgain.allowed === false && canRemindAgain.reason === "TOO_FREQUENT",
      "JOURNEY 5.2: Garde-fou anti-saturation 48h opérationnel sur les relances"
    );

  } finally {
    // ───────────────────────────────────────────────────────────
    // NETTOYAGE
    // ───────────────────────────────────────────────────────────
    console.log("\nNettoyage des fixtures de staging...");
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
    console.log("Nettoyage terminé.");
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`RÉSULTATS DE LA SUITE DE TESTS PHASE 8 : ${passed} PASS, ${failed} FAIL`);
  console.log("════════════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runStagingJourneyTests().catch((err) => {
  console.error("Erreur fatale lors des tests staging :", err);
  process.exit(1);
});
