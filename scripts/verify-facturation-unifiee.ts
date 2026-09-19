import { prisma } from "./_env";
import { getNextInvoiceNumber, getNextReceiptNumber, formatXOF, amountInWordsXOF } from "../src/lib/finance/numbering";
import { hasAccess, RoleType } from "../src/lib/permissions";

async function main() {
  console.log("=== VÉRIFICATION DU CHANTIER FACTURATION ET REÇU UNIFIÉS ===");

  // 1. Multi-tenant sequential numbering test
  const sengco = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO" } },
  });
  if (!sengco) throw new Error("SENG.CO non trouvée");
  const schoolId = sengco.id;

  console.log(`\n[1] Test sur l'école : ${sengco.name} (${schoolId})`);

  const student = await prisma.student.findFirst({
    where: { schoolId },
    include: { enrollments: { include: { class: true } } },
  });
  if (!student) throw new Error("Aucun élève trouvé sur SENG.CO");

  // Vérifier le prochain numéro séquentiel
  const currentSeqInv = await prisma.documentSequence.findUnique({
    where: { schoolId_type_year: { schoolId, type: "INVOICE", year: 2026 } },
  });
  const currentValInv = currentSeqInv?.lastNumber || 0;
  console.log(`Dernière séquence facture 2026 : ${currentValInv}`);

  // Création transactionnelle d'une facture test
  const testInvoice = await prisma.$transaction(async (tx) => {
    const num = await getNextInvoiceNumber(tx, schoolId);
    return tx.invoice.create({
      data: {
        schoolId,
        studentId: student.id,
        title: "Scolarité Septembre 2026",
        invoiceNumber: num,
        totalAmount: 50000,
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: "PENDING",
      },
    });
  });

  console.log(`Facture créée avec succès : ${testInvoice.invoiceNumber} (ID: ${testInvoice.id})`);
  if (!testInvoice.invoiceNumber?.startsWith("FAC-2026-")) {
    throw new Error(`Format facture invalide : ${testInvoice.invoiceNumber}`);
  }

  // Encaissement transactionnel d'un paiement
  const currentSeqRec = await prisma.documentSequence.findUnique({
    where: { schoolId_type_year: { schoolId, type: "RECEIPT", year: 2026 } },
  });
  const currentValRec = currentSeqRec?.lastNumber || 0;
  console.log(`Dernière séquence reçu 2026 : ${currentValRec}`);

  const testPayment = await prisma.$transaction(async (tx) => {
    const recNum = await getNextReceiptNumber(tx, schoolId);
    const payment = await tx.payment.create({
      data: {
        schoolId,
        invoiceId: testInvoice.id,
        amount: 50000,
        method: "CASH",
        receiptNumber: recNum,
      },
    });
    await tx.invoice.update({
      where: { id: testInvoice.id },
      data: { status: "PAID" },
    });
    return payment;
  });

  console.log(`Paiement créé avec succès : ${testPayment.receiptNumber} (Montant: ${formatXOF(testPayment.amount)})`);
  if (!testPayment.receiptNumber?.startsWith("REC-2026-")) {
    throw new Error(`Format reçu invalide : ${testPayment.receiptNumber}`);
  }

  // Vérifier format XOF sans décimales et lettres
  console.log(`Formatage test 50000 : ${formatXOF(50000)} | En lettres : ${amountInWordsXOF(50000)}`);
  if (formatXOF(50000).includes(",")) throw new Error("formatXOF ne doit pas contenir de décimales");

  // 2. Vérification des permissions
  console.log("\n[2] Vérification des permissions serveur :");
  const roles: RoleType[] = ["OWNER", "ADMIN", "ACCOUNTANT", "TEACHER", "PARENT"];
  for (const role of roles) {
    const canNew = hasAccess(role, "/dashboard/payments/new");
    const canInvoice = hasAccess(role, "/dashboard/payments/invoice");
    const canReceipt = hasAccess(role, "/dashboard/payments/receipt");
    console.log(`- ${role.padEnd(12)} : new=${canNew}, invoice=${canInvoice}, receipt=${canReceipt}`);

    if (role === "TEACHER" || role === "PARENT") {
      if (canNew || canInvoice || canReceipt) {
        throw new Error(`Sécurité compromise : ${role} ne devrait pas avoir accès aux générateurs/émissions de paiement !`);
      }
    }
    if (role === "OWNER" || role === "ADMIN" || role === "ACCOUNTANT") {
      if (!canNew || !canInvoice || !canReceipt) {
        throw new Error(`Problème d'accès : ${role} devrait avoir accès aux écrans de facturation !`);
      }
    }
  }

  // 3. Nettoyage de la facture et du paiement de test
  await prisma.payment.delete({ where: { id: testPayment.id } });
  await prisma.invoice.delete({ where: { id: testInvoice.id } });
  // Rétablir la séquence pour laisser la base propre
  if (currentSeqInv) {
    await prisma.documentSequence.update({
      where: { id: currentSeqInv.id },
      data: { lastNumber: currentValInv },
    });
  }
  if (currentSeqRec) {
    await prisma.documentSequence.update({
      where: { id: currentSeqRec.id },
      data: { lastNumber: currentValRec },
    });
  }

  console.log("\n[3] Nettoyage terminé (données de test effacées, séquence restaurée).");
  console.log("=== TOUS LES CONTRÔLES SONT VALIDÉS ===");
}

main().catch((err) => {
  console.error("ERREUR DE VÉRIFICATION:", err);
  process.exit(1);
});
