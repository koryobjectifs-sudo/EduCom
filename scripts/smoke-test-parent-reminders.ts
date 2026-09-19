import { prisma } from "./_env";
import {
  checkCanRemindParent,
  sendDocumentReminder,
  sendBulkDocumentReminders,
  resolveDocumentReminders,
  getActiveParentReminders,
} from "../src/lib/parentReminder";

async function runSmokeTests() {
  console.log("═════════════ SMOKE TEST — RELANCE PARENT DEPUIS L'ÉCOLE ═════════════\n");

  // Trouver un élève de test avec parent à SENG.CO ACADEMY
  const studentWithParent = await prisma.student.findFirst({
    where: {
      school: { name: { contains: "SENG.CO" } },
      parentId: { not: null },
      parent: { role: "PARENT" },
    },
    include: { parent: true, school: true },
  });

  if (!studentWithParent || !studentWithParent.parentId) {
    throw new Error("Aucun élève avec parent trouvé pour le test.");
  }

  // Trouver un élève sans parent
  const studentWithoutParent = await prisma.student.findFirst({
    where: {
      schoolId: studentWithParent.schoolId,
      parentId: null,
    },
  });

  // Trouver une exigence UPLOAD et une exigence AUTO
  const reqUpload = await prisma.documentRequirement.findFirst({
    where: { schoolId: studentWithParent.schoolId, nature: "UPLOAD", active: true },
  });
  const reqAuto = await prisma.documentRequirement.findFirst({
    where: { schoolId: studentWithParent.schoolId, nature: "AUTO", active: true },
  });

  if (!reqUpload || !reqAuto) {
    throw new Error("Exigences UPLOAD ou AUTO introuvables.");
  }

  const schoolId = studentWithParent.schoolId;
  const adminActor = { userId: "admin-tester", schoolId, role: "ADMIN" as const };

  console.log(`1. Test élève : ${studentWithParent.firstName} ${studentWithParent.lastName} (Parent: ${studentWithParent.parent?.firstName} ${studentWithParent.parent?.lastName})`);
  console.log(`- Exigence UPLOAD testée : "${reqUpload.label}" (${reqUpload.id})`);
  console.log(`- Exigence AUTO testée : "${reqAuto.label}" (${reqAuto.id})`);

  // Nettoyage préalable d'anciens rappels de test sur cet élève et cette exigence
  await prisma.documentReminder.deleteMany({
    where: { studentId: studentWithParent.id, requirementId: reqUpload.id },
  });

  // Test 1 : Rejet si l'élève n'a pas de compte tuteur
  if (studentWithoutParent) {
    console.log("\n2. TEST GARDE-FOU : Élève sans tuteur rattaché");
    const checkNoParent = await checkCanRemindParent(schoolId, studentWithoutParent.id, reqUpload.id);
    console.log(`- allowed: ${checkNoParent.allowed} | reason: ${checkNoParent.reason} | message: "${checkNoParent.message}"`);
    if (checkNoParent.allowed || checkNoParent.reason !== "NO_PARENT_ACCOUNT") {
      throw new Error("Échec : l'élève sans parent aurait dû être rejeté avec NO_PARENT_ACCOUNT.");
    }
  }

  // Test 2 : Rejet si la pièce est AUTO (ne doit jamais être demandée au parent)
  console.log("\n3. TEST GARDE-FOU : Pièce de nature AUTO");
  const checkAuto = await checkCanRemindParent(schoolId, studentWithParent.id, reqAuto.id);
  console.log(`- allowed: ${checkAuto.allowed} | reason: ${checkAuto.reason} | message: "${checkAuto.message}"`);
  if (checkAuto.allowed || checkAuto.reason !== "AUTO_DOCUMENT") {
    throw new Error("Échec : une pièce AUTO aurait dû être rejetée avec AUTO_DOCUMENT.");
  }

  // Test 3 : Éligibilité initiale pour une pièce UPLOAD manquante
  console.log("\n4. TEST ÉLIGIBILITÉ : Pièce UPLOAD manquante");
  const checkInitial = await checkCanRemindParent(schoolId, studentWithParent.id, reqUpload.id);
  console.log(`- allowed: ${checkInitial.allowed}`);
  if (!checkInitial.allowed) {
    throw new Error(`Échec : la pièce aurait dû être autorisée : ${checkInitial.message}`);
  }

  // Test 4 : Envoi de la relance ciblée
  console.log("\n5. TEST ENVOI RELANCE CIBLÉE :");
  const sendRes = await sendDocumentReminder(adminActor, {
    studentId: studentWithParent.id,
    requirementId: reqUpload.id,
  });
  console.log(`- success: ${sendRes.success}`);
  console.log(`- channel: ${sendRes.channel}`);
  console.log(`- message: "${sendRes.message}"`);
  console.log(`- actionUrl: "${sendRes.actionUrl}"`);
  if (!sendRes.success || !sendRes.actionUrl?.includes("action=deposit")) {
    throw new Error("Échec de l'envoi de la relance ciblée.");
  }

  // Test 5 : Garde-fou 48h — une deuxième relance immédiate doit être bloquée
  console.log("\n6. TEST GARDE-FOU 48H : Tentative de relance immédiate");
  const checkTooFrequent = await checkCanRemindParent(schoolId, studentWithParent.id, reqUpload.id);
  console.log(`- allowed: ${checkTooFrequent.allowed} | reason: ${checkTooFrequent.reason}`);
  console.log(`- lastSentAt: ${checkTooFrequent.lastSentAt?.toISOString()}`);
  console.log(`- message: "${checkTooFrequent.message}"`);
  if (checkTooFrequent.allowed || checkTooFrequent.reason !== "TOO_FREQUENT" || !checkTooFrequent.lastSentAt) {
    throw new Error("Échec : le garde-fou 48h n'a pas bloqué la seconde relance.");
  }

  // Test 6 : Présence de la notification active dans l'espace parent
  console.log("\n7. TEST ESPACE PARENT : Récupération des rappels actifs");
  const activeRemindersBefore = await getActiveParentReminders(studentWithParent.parentId);
  const myReminder = activeRemindersBefore.find((r) => r.requirementId === reqUpload.id && r.studentId === studentWithParent.id);
  console.log(`- Rappel trouvé dans l'espace parent : ${Boolean(myReminder)}`);
  if (!myReminder) {
    throw new Error("Le rappel n'apparaît pas dans l'espace parent.");
  }

  // Test 7 : Résolution automatique dès le dépôt / signature
  console.log("\n8. TEST RÉSOLUTION AUTOMATIQUE : Dépôt de la pièce");
  await resolveDocumentReminders(studentWithParent.id, reqUpload.id);
  const activeRemindersAfter = await getActiveParentReminders(studentWithParent.parentId);
  const resolvedCheck = activeRemindersAfter.find((r) => r.requirementId === reqUpload.id && r.studentId === studentWithParent.id);
  console.log(`- Rappel actif après dépôt : ${Boolean(resolvedCheck)} (doit être false)`);
  if (resolvedCheck) {
    throw new Error("Le rappel n'a pas disparu de l'espace parent après résolution.");
  }

  // Test 8 : Relance groupée
  console.log("\n9. TEST RELANCE GROUPÉE (Bulk) :");
  const bulkRes = await sendBulkDocumentReminders(adminActor, [studentWithParent.id]);
  console.log(`- totalRequested: ${bulkRes.results?.totalRequested}`);
  console.log(`- sentCount: ${bulkRes.results?.sentCount}`);
  console.log(`- details:`, bulkRes.results?.details);

  console.log("\n═════════════ TOUS LES SMOKE TESTS ONT RÉUSSI (100% CONFORME) ═════════════");
}

runSmokeTests().finally(() => prisma.$disconnect());
