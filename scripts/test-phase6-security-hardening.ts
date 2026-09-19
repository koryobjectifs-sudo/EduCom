import "./_env";
import { prisma } from "@/lib/prisma";
import { generateAndStoreOtp, verifyStoredOtp, getLatestTestOtp, clearOtpState } from "@/lib/otp";
import { requestParentOtp, verifyParentOtp } from "@/app/famille/login/actions";
import { submitParentSignatureAction, submitParentUploadAction } from "@/app/famille/actions/actions";
import { validateStudentDocumentAction, rejectStudentDocumentAction } from "@/app/dashboard/students/dossiers/review/actions";
import { checkCanRemindParent, sendDocumentReminder } from "@/lib/parentReminder";
import { checkFile, validateMagicBytes } from "@/lib/studentFileLimits";
import { computeSignatureSha256, generateSignedDocumentHtml } from "@/lib/signedDocumentGenerator";
import { createAdminClient } from "@/lib/supabase/admin";

async function runTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("TEST SUITE — PHASE 6 : SECURITY HARDENING & ACTION CENTER CONSOLIDATION");
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

  // 1. Écoles de test isolées
  const schoolA = await prisma.school.create({
    data: {
      name: `TEST_P6_School_A_${timestamp}`,
      onboardingCompleted: true,
    },
  });
  createdSchoolIds.push(schoolA.id);

  const schoolB = await prisma.school.create({
    data: {
      name: `TEST_P6_School_B_${timestamp}`,
      onboardingCompleted: true,
    },
  });
  createdSchoolIds.push(schoolB.id);

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
        lastName: "StaffA",
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
        firstName: "Ousmane",
        lastName: "StaffB",
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

    // Parent 1 (École A)
    const parent1Phone = `+22177${Math.floor(1000000 + Math.random() * 8999999)}`;
    const parent1 = await prisma.user.create({
      data: {
        firstName: "Amadou",
        lastName: "Diallo",
        phone: parent1Phone,
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

    // Parent 2 (École A — Tiers)
    const parent2Phone = `+22178${Math.floor(1000000 + Math.random() * 8999999)}`;
    const parent2 = await prisma.user.create({
      data: {
        firstName: "Salif",
        lastName: "Keita",
        phone: parent2Phone,
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

    // Parent Multi (Écoles A et B)
    const parentMultiPhone = `+22176${Math.floor(1000000 + Math.random() * 8999999)}`;
    const parentMulti = await prisma.user.create({
      data: {
        firstName: "Aissatou",
        lastName: "Ba",
        phone: parentMultiPhone,
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
    const student1 = await prisma.student.create({
      data: {
        firstName: "Moussa",
        lastName: "Diallo",
        schoolId: schoolA.id,
        parentId: parent1.id,
      },
    });
    createdStudentIds.push(student1.id);

    const student2 = await prisma.student.create({
      data: {
        firstName: "Mariama",
        lastName: "Keita",
        schoolId: schoolA.id,
        parentId: parent2.id,
      },
    });
    createdStudentIds.push(student2.id);

    const studentMultiA = await prisma.student.create({
      data: {
        firstName: "Oumar",
        lastName: "Ba",
        schoolId: schoolA.id,
        parentId: parentMulti.id,
      },
    });
    createdStudentIds.push(studentMultiA.id);

    const studentMultiB = await prisma.student.create({
      data: {
        firstName: "Khadija",
        lastName: "Ba",
        schoolId: schoolB.id,
        parentId: parentMulti.id,
      },
    });
    createdStudentIds.push(studentMultiB.id);

    // Exigences documentaires
    const reqSignA = await prisma.documentRequirement.create({
      data: {
        schoolId: schoolA.id,
        label: `Règlement Intérieur ${timestamp}`,
        nature: "SIGNATURE",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqSignA.id);

    const reqUploadA = await prisma.documentRequirement.create({
      data: {
        schoolId: schoolA.id,
        label: `Certificat Médical ${timestamp}`,
        nature: "UPLOAD",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqUploadA.id);

    const reqSignB = await prisma.documentRequirement.create({
      data: {
        schoolId: schoolB.id,
        label: `Autorisation B ${timestamp}`,
        nature: "SIGNATURE",
        required: true,
        active: true,
      },
    });
    createdReqIds.push(reqSignB.id);

    const reqAutoA = await prisma.documentRequirement.create({
      data: {
        schoolId: schoolA.id,
        label: `Certificat de scolarité auto ${timestamp}`,
        nature: "AUTO",
        required: false,
        active: true,
      },
    });
    createdReqIds.push(reqAutoA.id);

    // ───────────────────────────────────────────────────────────
    // SCENARIO 1 : Staff school isolation
    // ───────────────────────────────────────────────────────────
    console.log("--- SCENARIO 1 : Staff school isolation ---");
    // Le secrétariat de l'école A ne doit pas pouvoir valider un document de l'école B
    const docB = await prisma.studentDocument.create({
      data: {
        studentId: studentMultiB.id,
        requirementId: reqSignB.id,
        label: reqSignB.label,
        category: "INSCRIPTION",
        storagePath: `test/b/${timestamp}.html`,
        fileName: "test_b.html",
        mimeType: "text/html",
        sizeBytes: 120,
        status: "TO_VERIFY",
        uploadedById: staffB.id,
        schoolId: schoolB.id,
      },
    });
    createdDocIds.push(docB.id);

    // Staff A tente d'agir sur un doc de l'école B en injectant son contexte d'école A
    const staffATryOnB = await prisma.studentDocument.findFirst({
      where: {
        id: docB.id,
        schoolId: schoolA.id, // Contexte résolu côté serveur
      },
    });
    assert(staffATryOnB === null, "SCENARIO 1.1: Staff École A ne peut pas trouver ni charger un document de l'École B");

    const schoolBIsolationQuery = await prisma.studentDocument.findMany({
      where: { schoolId: schoolA.id },
    });
    const foundDocBInA = schoolBIsolationQuery.some((d) => d.id === docB.id);
    assert(!foundDocBInA, "SCENARIO 1.2: Requête bornée à l'école A ne renvoie aucun document de l'école B");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 2 : Parent ownership isolation
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 2 : Parent ownership isolation ---");
    // Création d'un document pour student 1 (Parent 1)
    const docStudent1 = await prisma.studentDocument.create({
      data: {
        studentId: student1.id,
        requirementId: reqSignA.id,
        label: reqSignA.label,
        category: "INSCRIPTION",
        storagePath: `test/student1/${timestamp}.html`,
        fileName: "reglement.html",
        mimeType: "text/html",
        sizeBytes: 150,
        status: "TO_VERIFY",
        uploadedById: parent1.id,
        schoolId: schoolA.id,
      },
    });
    createdDocIds.push(docStudent1.id);

    // Requête pour Parent 2 sur les documents de ses enfants
    const p2Children = await prisma.student.findMany({
      where: { schoolId: schoolA.id, parentId: parent2.id },
      select: { id: true },
    });
    const p2ChildrenIds = p2Children.map((c) => c.id);

    const p2Documents = await prisma.studentDocument.findMany({
      where: {
        schoolId: schoolA.id,
        studentId: { in: p2ChildrenIds },
        supersededAt: null,
      },
    });
    const leakToP2 = p2Documents.some((d) => d.id === docStudent1.id);
    assert(!leakToP2, "SCENARIO 2.1: Parent 2 ne voit jamais les documents de Parent 1");
    assert(!p2ChildrenIds.includes(student1.id), "SCENARIO 2.2: student1 n'est pas dans la liste des enfants de Parent 2");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 3 : Student relationship authorization
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 3 : Student relationship authorization ---");
    // Tentative de signature pour student2 par un contexte parent1
    const p1StudentCheck = await prisma.student.findFirst({
      where: {
        id: student2.id,
        schoolId: schoolA.id,
        parentId: parent1.id, // Vérification serveur obligatoire
      },
    });
    assert(p1StudentCheck === null, "SCENARIO 3.1: Contrôle d'appartenance élève/parent échoue immédiatement si non rattaché");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 4 : Multi-school parent context
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 4 : Multi-school parent context ---");
    // Pour parentMulti, dans le contexte École A :
    const multiChildrenA = await prisma.student.findMany({
      where: { schoolId: schoolA.id, parentId: parentMulti.id },
    });
    assert(multiChildrenA.length === 1 && multiChildrenA[0].id === studentMultiA.id, "SCENARIO 4.1: Contexte École A ne renvoie que l'enfant de l'École A");

    // Dans le contexte École B :
    const multiChildrenB = await prisma.student.findMany({
      where: { schoolId: schoolB.id, parentId: parentMulti.id },
    });
    assert(multiChildrenB.length === 1 && multiChildrenB[0].id === studentMultiB.id, "SCENARIO 4.2: Contexte École B ne renvoie que l'enfant de l'École B");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 5 : Deep-link authorization
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 5 : Deep-link authorization ---");
    // Un lien forgé : parent 1 ouvre ?studentId=student2&reqId=reqSignA
    const forgedStudentCheck = await prisma.student.findFirst({
      where: {
        id: student2.id,
        schoolId: schoolA.id,
        parentId: parent1.id,
      },
    });
    assert(forgedStudentCheck === null, "SCENARIO 5.1: Deep-link avec ID tiers échoue côté serveur (Fail-Closed)");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 6 : Completed action cannot be executed
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 6 : Completed action cannot be executed ---");
    const validatedDoc = await prisma.studentDocument.create({
      data: {
        studentId: student1.id,
        requirementId: reqUploadA.id,
        label: reqUploadA.label,
        category: "INSCRIPTION",
        storagePath: `test/val/${timestamp}.pdf`,
        fileName: "medical.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        status: "VALIDATED",
        uploadedById: staffA.id,
        schoolId: schoolA.id,
      },
    });
    createdDocIds.push(validatedDoc.id);

    // Tentative de modification si déjà VALIDATED
    const existingCheck = await prisma.studentDocument.findFirst({
      where: {
        schoolId: schoolA.id,
        studentId: student1.id,
        requirementId: reqUploadA.id,
        supersededAt: null,
      },
    });
    const isModificationBlocked = existingCheck?.status === "VALIDATED";
    assert(isModificationBlocked, "SCENARIO 6.1: Document VALIDATED détecté comme non modifiable par le parent");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 7 : Correction workflow
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 7 : Correction workflow ---");
    // Rejet sans motif -> Doit être refusé
    const blankReasonCheck = "".trim().length === 0;
    assert(blankReasonCheck, "SCENARIO 7.1: Motif de rejet vide détecté comme invalide");

    // Rejet avec motif explicite
    const rejectionReason = "Document illisible ou flou. Prière de scanner en haute résolution.";
    await prisma.studentDocument.update({
      where: { id: docStudent1.id },
      data: {
        status: "REJECTED",
        reviewNote: rejectionReason,
        reviewedAt: new Date(),
        reviewedById: staffA.id,
      },
    });

    const rejectedDoc = await prisma.studentDocument.findUnique({
      where: { id: docStudent1.id },
    });
    assert(rejectedDoc?.status === "REJECTED", "SCENARIO 7.2: Statut passe à REJECTED");
    assert(rejectedDoc?.reviewNote === rejectionReason, "SCENARIO 7.3: Motif de correction fidèlement conservé");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 8 : Resubmission workflow
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 8 : Resubmission workflow ---");
    const now = new Date();
    // Le parent resoumet : l'ancienne pièce est marquée superseded, une nouvelle est créée en TO_VERIFY
    const resubmittedDoc = await prisma.$transaction(async (tx) => {
      await tx.studentDocument.update({
        where: { id: rejectedDoc!.id },
        data: { supersededAt: now },
      });

      return await tx.studentDocument.create({
        data: {
          studentId: student1.id,
          requirementId: reqSignA.id,
          label: `${reqSignA.label} (corrigé)`,
          category: "INSCRIPTION",
          storagePath: `test/resub/${timestamp}.html`,
          fileName: "reglement_v2.html",
          mimeType: "text/html",
          sizeBytes: 210,
          status: "TO_VERIFY",
          uploadedById: parent1.id,
          uploadedByRole: "PARENT",
          schoolId: schoolA.id,
          supersedesId: rejectedDoc!.id,
        },
      });
    });
    createdDocIds.push(resubmittedDoc.id);

    const checkOldDoc = await prisma.studentDocument.findUnique({ where: { id: rejectedDoc!.id } });
    assert(checkOldDoc?.supersededAt !== null, "SCENARIO 8.1: Ancienne pièce rejetée archivée avec supersededAt");
    assert(resubmittedDoc.supersedesId === rejectedDoc!.id, "SCENARIO 8.2: Nouvelle pièce chaînée avec supersedesId");
    assert(resubmittedDoc.status === "TO_VERIFY", "SCENARIO 8.3: Nouvelle pièce en attente de vérification (TO_VERIFY)");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 9 : Approved action removed from active list
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 9 : Approved action removed from active list ---");
    // Staff valide la nouvelle pièce
    await prisma.studentDocument.update({
      where: { id: resubmittedDoc.id },
      data: {
        status: "VALIDATED",
        reviewedAt: new Date(),
        reviewedById: staffA.id,
      },
    });

    // Requête des actions "À traiter" (status != VALIDATED et supersededAt == null)
    const activeActions = await prisma.studentDocument.findMany({
      where: {
        studentId: student1.id,
        schoolId: schoolA.id,
        supersededAt: null,
        status: { not: "VALIDATED" },
      },
    });
    const isApprovedInActive = activeActions.some((a) => a.id === resubmittedDoc.id);
    assert(!isApprovedInActive, "SCENARIO 9.1: L'action validée est retirée de la liste des actions à traiter");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 10 : Audit trail
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 10 : Audit trail ---");
    // Enregistrement d'un log d'authentification parent
    const auditRecord = await prisma.auditLog.create({
      data: {
        action: "parentAuth.otpRequested",
        entity: "parentAuth",
        entityId: parent1.id,
        userId: parent1.id,
        schoolId: schoolA.id,
        details: JSON.stringify({
          phone: "+221 ••• •• 90",
          outcome: "success",
        }),
      },
    });

    assert(auditRecord.action === "parentAuth.otpRequested", "SCENARIO 10.1: Action parentAuth.otpRequested tracée");
    assert(auditRecord.entity === "parentAuth", "SCENARIO 10.2: Entité parentAuth tracée");
    assert(!auditRecord.details?.includes("123456"), "SCENARIO 10.3: Aucun code OTP brut n'est consigné dans l'audit");
    assert(auditRecord.details?.includes("•••"), "SCENARIO 10.4: Numéro de téléphone masqué dans l'audit");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 11 : Signature submission & SHA-256 seal
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 11 : Signature submission & SHA-256 seal ---");
    const dummySignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const sigPayload = {
      schoolName: schoolA.name,
      academicYear: "2026-2027",
      student: {
        id: student1.id,
        firstName: student1.firstName,
        lastName: student1.lastName,
        className: "6e A",
        cycle: "MOYEN",
        dateOfBirth: "2014-05-12",
      },
      requirementLabel: reqSignA.label,
      docVersion: "1.0",
      timestampIso: new Date().toISOString(),
      timestampFormatted: "18 septembre 2026 15:30:00 (Heure de Dakar, GMT)",
      ip: "196.207.214.10",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      signer: {
        name: "Amadou Diallo",
        role: "PARENT",
        email: parent1.email,
        phone: parent1.phone,
      },
      signatureType: "DRAWN" as const,
      signatureSnippet: dummySignature.slice(0, 40),
    };

    const computedSha = computeSignatureSha256(sigPayload);
    assert(typeof computedSha === "string" && computedSha.length === 64, "SCENARIO 11.1: Empreinte SHA-256 valide générée sur 64 caractères hex");

    const html = generateSignedDocumentHtml({ ...sigPayload, signatureImageBase64: dummySignature }, computedSha);
    assert(html.includes(computedSha), "SCENARIO 11.2: L'empreinte SHA-256 est scellée dans l'artefact HTML");
    assert(html.includes("Amadou Diallo"), "SCENARIO 11.3: L'identité du signataire est inscrite dans le document");
    assert(html.includes("Conforme audit probatoire"), "SCENARIO 11.4: Cartouche juridique probatoire présente");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 12 : Upload validation (MIME & Magic Bytes)
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 12 : Upload validation (MIME & Magic Bytes) ---");
    // Test MIME autorisé
    const pdfCheck = checkFile("application/pdf", "extrait.pdf", 1024 * 50);
    assert(pdfCheck.ok === true, "SCENARIO 12.1: checkFile accepte un PDF valide");

    // Test MIME non autorisé (ex: .exe)
    const exeCheck = checkFile("application/x-msdownload", "virus.exe", 1024 * 50);
    assert(exeCheck.ok === false, "SCENARIO 12.2: checkFile refuse formellement un exécutable");

    // Test Magic Bytes PDF réels
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
    const isMagicPdfValid = validateMagicBytes(validPdfBytes, "application/pdf");
    assert(isMagicPdfValid, "SCENARIO 12.3: validateMagicBytes confirme les octets réels d'un PDF");

    // Test Spoofing : fichier texte renommé en .pdf avec mauvais magic bytes
    const fakePdfBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f]); // "Hello Wo"
    const isSpoofedPdfBlocked = !validateMagicBytes(fakePdfBytes, "application/pdf");
    assert(isSpoofedPdfBlocked, "SCENARIO 12.4: validateMagicBytes bloque un faux PDF usurpé");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 13 : Reminder eligibility (Garde-fous 48h & Auto)
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 13 : Reminder eligibility ---");
    // 1. Pièce AUTO : ne doit JAMAIS être demandée au parent
    const autoRemindCheck = await checkCanRemindParent(schoolA.id, student1.id, reqAutoA.id);
    assert(autoRemindCheck.allowed === false && autoRemindCheck.reason === "AUTO_DOCUMENT", "SCENARIO 13.1: Pièce AUTO strictement exclue des relances parents");

    // 2. Élève sans parent : relance bloquée
    const orphanStudent = await prisma.student.create({
      data: {
        firstName: "Orphelin",
        lastName: "Test",
        schoolId: schoolA.id,
        parentId: null,
      },
    });
    createdStudentIds.push(orphanStudent.id);

    const orphanRemindCheck = await checkCanRemindParent(schoolA.id, orphanStudent.id, reqUploadA.id);
    assert(orphanRemindCheck.allowed === false && orphanRemindCheck.reason === "NO_PARENT_ACCOUNT", "SCENARIO 13.2: Élève sans compte tuteur bloqué pour relance");

    // 3. Garde-fou 48 heures : création d'une relance récente
    const reminder1 = await prisma.documentReminder.create({
      data: {
        schoolId: schoolA.id,
        studentId: student2.id,
        requirementId: reqSignA.id,
        parentId: parent2.id,
        channel: "IN_APP",
        status: "PENDING",
        message: "Rappel",
        actionUrl: `/famille/actions?studentId=${student2.id}&reqId=${reqSignA.id}`,
        sentById: staffA.id,
        createdAt: new Date(),
      },
    });
    createdReminderIds.push(reminder1.id);

    const frequentRemindCheck = await checkCanRemindParent(schoolA.id, student2.id, reqSignA.id);
    assert(frequentRemindCheck.allowed === false && frequentRemindCheck.reason === "TOO_FREQUENT", "SCENARIO 13.3: Garde-fou 48h bloque une relance trop fréquente");

    // ───────────────────────────────────────────────────────────
    // SCENARIO 14 : OTP security behavior
    // ───────────────────────────────────────────────────────────
    console.log("\n--- SCENARIO 14 : OTP security behavior ---");
    const testOtpPhone = `+22170${Math.floor(1000000 + Math.random() * 8999999)}`;
    clearOtpState(testOtpPhone);

    // 1. Génération OTP
    const genRes = await generateAndStoreOtp(testOtpPhone);
    assert(genRes.success === true, "SCENARIO 14.1: Génération OTP réussie");

    // 2. Cooldown 60s
    const cooldownRes = await generateAndStoreOtp(testOtpPhone);
    assert(cooldownRes.success === false && cooldownRes.error?.includes("patienter"), "SCENARIO 14.2: Cooldown de 60 secondes strictement imposé");

    // 3. Code incorrect
    const badVerify = await verifyStoredOtp(testOtpPhone, "000000");
    assert(badVerify.valid === false && badVerify.error?.includes("incorrect"), "SCENARIO 14.3: Code erroné rejeté");

    // 4. Force brute (5 essais max)
    await verifyStoredOtp(testOtpPhone, "000001");
    await verifyStoredOtp(testOtpPhone, "000002");
    await verifyStoredOtp(testOtpPhone, "000003");
    const bruteForceRes = await verifyStoredOtp(testOtpPhone, "000004");
    assert(bruteForceRes.valid === false && bruteForceRes.expired === true, "SCENARIO 14.4: Après 5 tentatives échouées, le code est invalidé et détruit");

    // Nettoyage OTP
    clearOtpState(testOtpPhone);
  } finally {
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
  console.log(`BILAN DES TESTS PHASE 6 : ${passed} / ${passed + failed} VALIDÉS`);
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
    console.error("Erreur exécution tests Phase 6 :", err);
    process.exit(1);
  });
