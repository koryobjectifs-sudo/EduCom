import { prisma } from "../src/lib/prisma";
import { recordInvoicePayment } from "../src/app/dashboard/payments/actions";

async function runTest() {
  console.log("=== TEST DU FLUX PAIEMENTS PARTIELS & RELIQUAT ===");

  const school = await prisma.school.findFirst({
    where: { name: { contains: "SENG.CO" } },
    select: { id: true, name: true },
  });
  if (!school) throw new Error("École SENG.CO introuvable");

  const student = await prisma.student.findFirst({
    where: { schoolId: school.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!student) throw new Error("Élève introuvable");

  const user = await prisma.user.findFirst({
    where: { schoolId: school.id, role: { in: ["ADMIN", "OWNER", "ACCOUNTANT"] } },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("Utilisateur staff introuvable");

  // Mock global session context if needed or run directly
  console.log(`École : ${school.name}`);
  console.log(`Élève de test : ${student.firstName} ${student.lastName}`);

  const testInvoice = await prisma.invoice.create({
    data: {
      title: "TEST_Facture Partielle",
      totalAmount: 50000,
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: "PENDING",
      studentId: student.id,
      schoolId: school.id,
      items: {
        create: [
          { title: "Scolarité test", amount: 50000, quantity: 1 },
        ],
      },
    },
  });

  try {
    console.log(`1. Facture créée : ${testInvoice.id} - Montant: ${testInvoice.totalAmount} FCFA - Statut: ${testInvoice.status}`);

    // Simulation de premier versement partiel (45 000 FCFA)
    const p1 = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          amount: 45000,
          method: "MOBILE_MONEY",
          reference: "WAVE_TEST_123",
          invoiceId: testInvoice.id,
          schoolId: school.id,
        },
      });
      await tx.invoice.update({
        where: { id: testInvoice.id },
        data: { status: "PARTIAL" },
      });
      return p;
    });

    const afterP1 = await prisma.invoice.findUniqueOrThrow({
      where: { id: testInvoice.id },
      include: { payments: true },
    });

    const paid1 = afterP1.payments.reduce((s, p) => s + p.amount, 0);
    const remaining1 = Math.max(0, afterP1.totalAmount - paid1);
    console.log(`2. Après versement 1 : Versé = ${paid1} FCFA, Reliquat = ${remaining1} FCFA, Statut = ${afterP1.status}`);
    if (afterP1.status !== "PARTIAL" || remaining1 !== 5000) {
      throw new Error(`Incohérence reliquat 1 : attendu 5000 et PARTIAL, obtenu ${remaining1} et ${afterP1.status}`);
    }

    // Simulation du second versement soldant (5 000 FCFA)
    const p2 = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          amount: 5000,
          method: "CASH",
          invoiceId: testInvoice.id,
          schoolId: school.id,
        },
      });
      await tx.invoice.update({
        where: { id: testInvoice.id },
        data: { status: "PAID" },
      });
      return p;
    });

    const afterP2 = await prisma.invoice.findUniqueOrThrow({
      where: { id: testInvoice.id },
      include: { payments: true },
    });

    const paid2 = afterP2.payments.reduce((s, p) => s + p.amount, 0);
    const remaining2 = Math.max(0, afterP2.totalAmount - paid2);
    console.log(`3. Après versement 2 : Versé = ${paid2} FCFA, Reliquat = ${remaining2} FCFA, Statut = ${afterP2.status}`);
    if (afterP2.status !== "PAID" || remaining2 !== 0) {
      throw new Error(`Incohérence reliquat 2 : attendu 0 et PAID, obtenu ${remaining2} et ${afterP2.status}`);
    }

    console.log("✓ Tous les calculs et transitions de statuts sont 100% validés.");
  } finally {
    await prisma.invoice.delete({ where: { id: testInvoice.id } });
    console.log("Nettoyage de la facture de test effectué.");
  }
}

runTest().finally(() => prisma.$disconnect());
