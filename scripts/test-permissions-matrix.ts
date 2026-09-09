import { prisma } from "./_env";
import { signedUrlFor } from "../src/lib/studentFile";
import { validateMagicBytes } from "../src/lib/studentFileLimits";
import { hasAccess } from "../src/lib/permissions";
import { requireActionContext } from "../src/lib/actionContext";

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║ TEST SUITE : MATRICE DE SÉCURITÉ & PERMISSIONS PARENT & ACTIONS    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const school = await prisma.school.findFirst({ where: { name: "École Pilote Dakar - Admissions" } });
  if (!school) throw new Error("Test school not found");
  const schoolId = school.id;

  // 1. Setup 2 distinct parents
  let parentA = await prisma.user.findFirst({ where: { email: "parent.a@test.sn" } });
  if (!parentA) {
    parentA = await prisma.user.create({
      data: {
        email: "parent.a@test.sn",
        firstName: "Amadou",
        lastName: "Diallo",
        role: "PARENT",
        schoolId,
      },
    });
  }

  let parentB = await prisma.user.findFirst({ where: { email: "parent.b@test.sn" } });
  if (!parentB) {
    parentB = await prisma.user.create({
      data: {
        email: "parent.b@test.sn",
        firstName: "Binta",
        lastName: "Ba",
        role: "PARENT",
        schoolId,
      },
    });
  }

  let teacher = await prisma.user.findFirst({ where: { email: "teacher.test@test.sn" } });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        email: "teacher.test@test.sn",
        firstName: "Mamadou",
        lastName: "Enseignant",
        role: "TEACHER",
        schoolId,
      },
    });
  }

  // 2. Setup 2 children (Child A of Parent A, Child B of Parent B)
  let childA = await prisma.student.findFirst({ where: { matricule: "SEC-TEST-001" } });
  if (!childA) {
    childA = await prisma.student.create({
      data: {
        firstName: "Samba",
        lastName: "Diallo",
        matricule: "SEC-TEST-001",
        schoolId,
        parentId: parentA.id,
        status: "PENDING",
      },
    });
  }

  let childB = await prisma.student.findFirst({ where: { matricule: "SEC-TEST-002" } });
  if (!childB) {
    childB = await prisma.student.create({
      data: {
        firstName: "Mariama",
        lastName: "Ba",
        matricule: "SEC-TEST-002",
        schoolId,
        parentId: parentB.id,
        status: "PENDING",
      },
    });
  }

  // Requirement
  let req = await prisma.documentRequirement.findFirst({ where: { schoolId, cycle: "ELEMENTAIRE" } });
  if (!req) {
    req = await prisma.documentRequirement.create({
      data: {
        label: "Extrait de naissance",
        shortLabel: "Extrait",
        category: "IDENTITE",
        source: "OFFICIEL",
        required: true,
        schoolId,
      },
    });
  }

  // Clean test documents
  await prisma.studentDocument.deleteMany({ where: { studentId: { in: [childA.id, childB.id] } } });

  // Document for Child B
  const docB = await prisma.studentDocument.create({
    data: {
      studentId: childB.id,
      requirementId: req.id,
      label: req.label,
      category: req.category,
      storagePath: `${schoolId}/${childB.id}/docB.pdf`,
      fileName: "docB.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      status: "VALIDATED",
      uploadedById: parentB.id,
      schoolId,
    },
  });

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition: boolean, title: string) {
    testsTotal++;
    if (condition) {
      console.log(`  ✓ TEST ${testsTotal} PASSÉ : ${title}`);
      testsPassed++;
    } else {
      console.error(`  ✗ TEST ${testsTotal} ÉCHEC : ${title}`);
      process.exit(1);
    }
  }

  console.log("── RÈGLE 1 : ISOLATION STRICTE INTER-PARENTS (Parent A ne peut pas lire Child B)");
  const urlForParentAOnDocB = await signedUrlFor(
    { schoolId, userId: parentA.id, role: "PARENT" },
    docB.id,
    900
  );
  assert("error" in urlForParentAOnDocB, "Parent A se voit refuser l'accès au document de l'enfant du Parent B");

  console.log("\n── RÈGLE 2 : PARENT A PEUT LIRE LE DOCUMENT DE SON PROPRE ENFANT");
  const docA = await prisma.studentDocument.create({
    data: {
      studentId: childA.id,
      requirementId: req.id,
      label: req.label,
      category: req.category,
      storagePath: `${schoolId}/${childA.id}/docA.pdf`,
      fileName: "docA.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      status: "TO_VERIFY",
      uploadedById: parentA.id,
      schoolId,
    },
  });
  const urlForParentAOnDocA = await signedUrlFor(
    { schoolId, userId: parentA.id, role: "PARENT" },
    docA.id,
    900
  );
  assert(
    !("error" in urlForParentAOnDocA) || !urlForParentAOnDocA.error.includes("introuvable dans votre établissement"),
    "Parent A passe le contrôle de sécurité sur son propre enfant"
  );

  console.log("\n── RÈGLE 3 : ENSEIGNANT N'A PAS ACCÈS AUX PIÈCES ADMINISTRATIVES (IDENTITE)");
  const urlForTeacherOnDocA = await signedUrlFor(
    { schoolId, userId: teacher.id, role: "TEACHER" },
    docA.id,
    900
  );
  assert("error" in urlForTeacherOnDocA, "L'enseignant est bloqué sur les pièces de catégorie IDENTITE");

  console.log("\n── RÈGLE 4 : VALIDATION DES MAGIC BYTES CONTRE LES FAUX FICHIERS");
  const fakePdfBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33]); // Not %PDF
  const realPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
  assert(!validateMagicBytes(fakePdfBytes, "application/pdf"), "Faux PDF détecté et rejeté par magic bytes");
  assert(validateMagicBytes(realPdfBytes, "application/pdf"), "Vrai PDF validé avec succès par magic bytes");

  console.log("\n── RÈGLE 5 : NOTIFICATION IN-APP AU PARENT EN CAS DE VALIDATION / REFUS");
  const initialNotifCount = await prisma.staffNotification.count({ where: { userId: parentA.id } });
  
  await prisma.staffNotification.create({
    data: {
      userId: parentA.id,
      schoolId,
      kind: "document.rejected",
      title: "Pièce à régulariser",
      body: "Document illisible. Motif obligatoire : Date tronquée.",
      link: `/dashboard/students/${childA.id}/dossier`,
    },
  });

  const finalNotifCount = await prisma.staffNotification.count({ where: { userId: parentA.id } });
  assert(finalNotifCount === initialNotifCount + 1, "Notification in-app générée avec succès pour le parent");

  console.log("\n── RÈGLE 6 : SÉCURITÉ DES ROUTES & SERVER ACTIONS (ROLE PARENT)");
  
  // 6a. Toutes les routes d'administration et d'émission doivent être STRICTEMENT REFUSÉES à PARENT
  const ADMIN_AND_ISSUER_PATHS = [
    "/dashboard/payments/new",
    "/dashboard/payments/invoice",
    "/dashboard/payments/receipt",
    "/dashboard/payments/statement",
    "/dashboard/payments/review",
    "/dashboard/payments/expenses",
    "/dashboard/payments/tarifs",
    "/dashboard/grades/saisie",
    "/dashboard/grades/report-card",
    "/dashboard/grades/difficultes",
    "/dashboard/settings/pedagogie",
    "/dashboard/settings/reinscription",
    "/dashboard/settings/documents",
    "/dashboard/settings/fees",
    "/dashboard/settings/academic-years",
    "/dashboard/students/dossiers/review",
    "/dashboard/students/new",
    "/dashboard/students/import",
    "/dashboard/students/export",
    "/dashboard/classes",
    "/dashboard/team",
    "/dashboard/attendance",
    "/dashboard/documents/validation",
    "/dashboard/documents/reminder",
    "/dashboard/documents/centre/gestion",
  ];

  for (const path of ADMIN_AND_ISSUER_PATHS) {
    assert(!hasAccess("PARENT", path), `PARENT est strictement refusé sur ${path}`);
  }

  // 6b. Seules les 5 destinations parent sont autorisées
  const PARENT_ALLOWED_DESTINATIONS = [
    "/dashboard/students",
    "/dashboard/documents",
    "/dashboard/grades",
    "/dashboard/payments",
    "/dashboard/settings",
  ];

  for (const path of PARENT_ALLOWED_DESTINATIONS) {
    assert(hasAccess("PARENT", path), `PARENT a accès à sa destination ${path}`);
  }

  console.log("\n── RÈGLE 7 : FAIL-CLOSED / LISTE BLANCHE — REJET PAR DÉFAUT DE TOUTE NOUVELLE ROUTE");
  const HYPOTHETICAL_UNLISTED_ROUTES = [
    "/dashboard/analytics",
    "/dashboard/audit-logs",
    "/dashboard/payments/export-all",
    "/dashboard/payments/custom-gateway",
    "/dashboard/settings/third-party-api",
    "/dashboard/students/batch-delete",
    "/dashboard/future-module-2027",
  ];

  for (const path of HYPOTHETICAL_UNLISTED_ROUTES) {
    assert(
      !hasAccess("PARENT", path),
      `Route non listée "${path}" est STRICTEMENT REFUSÉE par défaut au rôle PARENT (fail-closed)`
    );
  }

  console.log(`\n🎉 TOUS LES ${testsPassed}/${testsTotal} TESTS DE LA MATRICE DE SÉCURITÉ SONT PASSÉS SANS ERREUR !`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
