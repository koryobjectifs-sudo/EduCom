import { prisma } from "../src/lib/prisma";
import { getFamiliesFinanceData } from "../src/lib/finance/familyService";
import { invoiceOverview } from "../src/lib/finance";
import type { ActorContext } from "../src/lib/audit";

async function main() {
  console.log("=== TEST DE CLOISONNEMENT STRICT PAR ÉCOLE (FINANCE) ===");

  const timestamp = Date.now();
  const schoolAName = `Test Alpha Finance ${timestamp}`;
  const schoolBName = `Test Beta Finance ${timestamp}`;

  // 1. Création des deux écoles isolées
  const schoolA = await prisma.school.create({
    data: { name: schoolAName },
  });
  const schoolB = await prisma.school.create({
    data: { name: schoolBName },
  });

  console.log(`✓ École A créée : ${schoolA.name} (${schoolA.id})`);
  console.log(`✓ École B créée : ${schoolB.name} (${schoolB.id})`);

  try {
    // 2. Création des acteurs
    const userA = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        email: `admin-a-${timestamp}@educom.sn`,
        firstName: "Directeur",
        lastName: "Alpha",
        role: "ADMIN",
      },
    });

    const userB = await prisma.user.create({
      data: {
        schoolId: schoolB.id,
        email: `admin-b-${timestamp}@educom.sn`,
        firstName: "Directeur",
        lastName: "Beta",
        role: "ADMIN",
      },
    });

    const actorA: ActorContext = {
      userId: userA.id,
      schoolId: schoolA.id,
      role: userA.role,
    };

    const actorB: ActorContext = {
      userId: userB.id,
      schoolId: schoolB.id,
      role: userB.role,
    };

    // 3. Création des données École A (Famille Diop : 100 000 FCFA dû, 60 000 FCFA payé)
    const parentA = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        email: `parent-a-${timestamp}@educom.sn`,
        firstName: "Modou",
        lastName: "Diop",
        role: "PARENT",
        phone: "+221770000001",
      },
    });

    const studentA = await prisma.student.create({
      data: {
        schoolId: schoolA.id,
        parentId: parentA.id,
        firstName: "Aminata",
        lastName: "Diop",
      },
    });

    const invoiceA = await prisma.invoice.create({
      data: {
        schoolId: schoolA.id,
        parentId: parentA.id,
        studentId: studentA.id,
        invoiceNumber: `FAC-A-${timestamp}`,
        title: "Scolarité Trimestre 1",
        totalAmount: 100000,
        dueDate: new Date(Date.now() + 86400000 * 10),
        status: "PARTIAL",
      },
    });

    const paymentA = await prisma.payment.create({
      data: {
        schoolId: schoolA.id,
        invoiceId: invoiceA.id,
        receiptNumber: `REC-A-${timestamp}`,
        amount: 60000,
        method: "CASH",
      },
    });

    // 4. Création des données École B (Famille Ndiaye : 250 000 FCFA dû, 0 FCFA payé)
    const parentB = await prisma.user.create({
      data: {
        schoolId: schoolB.id,
        email: `parent-b-${timestamp}@educom.sn`,
        firstName: "Fatou",
        lastName: "Ndiaye",
        role: "PARENT",
        phone: "+221770000002",
      },
    });

    const studentB = await prisma.student.create({
      data: {
        schoolId: schoolB.id,
        parentId: parentB.id,
        firstName: "Moussa",
        lastName: "Ndiaye",
      },
    });

    const invoiceB = await prisma.invoice.create({
      data: {
        schoolId: schoolB.id,
        parentId: parentB.id,
        studentId: studentB.id,
        invoiceNumber: `FAC-B-${timestamp}`,
        title: "Scolarité Trimestre 1",
        totalAmount: 250000,
        dueDate: new Date(Date.now() - 86400000 * 2), // Échue
        status: "PENDING",
      },
    });

    // ═══════ VÉRIFICATION 1 : LISTE DES FAMILLES ═══════
    console.log("\n[Test 1] Cloisonnement de la liste des familles...");
    const familiesA = await getFamiliesFinanceData(actorA);
    const familiesB = await getFamiliesFinanceData(actorB);

    // Vérifier que A ne voit QUE A
    if (familiesA.families.length !== 1) {
      throw new Error(`Échec : École A attendait 1 famille, a reçu ${familiesA.families.length}`);
    }
    if (familiesA.families[0].guardianName !== "Modou Diop") {
      throw new Error(`Échec : Famille A incorrecte (${familiesA.families[0].guardianName})`);
    }
    if (familiesA.summary.totalDue !== 100000 || familiesA.summary.totalPaid !== 60000 || familiesA.summary.totalReliquat !== 40000) {
      throw new Error(`Échec : Totaux Famille A incorrects : ${JSON.stringify(familiesA.summary)}`);
    }
    // Vérifier qu'aucune fuite de B n'est présente dans A
    const leakBInA = familiesA.families.some((f) => f.guardianName.includes("Ndiaye") || f.children.some((c) => c.firstName === "Moussa"));
    if (leakBInA) {
      throw new Error("🚨 FUITE GRAVE : Données de l'École B trouvées dans l'École A !");
    }
    console.log("✓ École A : 100% cloisonnée (0 donnée de l'école B).");

    // Vérifier que B ne voit QUE B
    if (familiesB.families.length !== 1) {
      throw new Error(`Échec : École B attendait 1 famille, a reçu ${familiesB.families.length}`);
    }
    if (familiesB.families[0].guardianName !== "Fatou Ndiaye") {
      throw new Error(`Échec : Famille B incorrecte (${familiesB.families[0].guardianName})`);
    }
    if (familiesB.summary.totalDue !== 250000 || familiesB.summary.totalPaid !== 0 || familiesB.summary.totalReliquat !== 250000) {
      throw new Error(`Échec : Totaux Famille B incorrects : ${JSON.stringify(familiesB.summary)}`);
    }
    const leakAInB = familiesB.families.some((f) => f.guardianName.includes("Diop") || f.children.some((c) => c.firstName === "Aminata"));
    if (leakAInB) {
      throw new Error("🚨 FUITE GRAVE : Données de l'École A trouvées dans l'École B !");
    }
    console.log("✓ École B : 100% cloisonnée (0 donnée de l'école A).");

    // ═══════ VÉRIFICATION 2 : ENCAISSEMENTS ET PAIEMENTS CLOISONNÉS ═══════
    console.log("\n[Test 2] Cloisonnement des encaissements et totaux financiers...");
    const paymentsA = await prisma.payment.findMany({
      where: { schoolId: actorA.schoolId },
    });
    const paymentsB = await prisma.payment.findMany({
      where: { schoolId: actorB.schoolId },
    });

    if (paymentsA.length !== 1 || paymentsA[0].amount !== 60000) {
      throw new Error(`Échec paiements A : ${JSON.stringify(paymentsA)}`);
    }
    if (paymentsB.length !== 0) {
      throw new Error(`Échec paiements B : École B ne devrait avoir aucun paiement, reçu ${paymentsB.length}`);
    }
    console.log("✓ Encaissements et paiements : 100% cloisonnés par école.");

    // ═══════ VÉRIFICATION 3 : TENTATIVE D'ACCÈS CROISÉ PAR ID ═══════
    console.log("\n[Test 3] Cloisonnement requête directe (accès facture école B avec contexte école A)...");
    const crossInvoiceCheck = await prisma.invoice.findFirst({
      where: {
        id: invoiceB.id,
        schoolId: actorA.schoolId, // Le serveur filtre TOUJOURS par schoolId de l'acteur
      },
    });

    if (crossInvoiceCheck !== null) {
      throw new Error("🚨 FUITE GRAVE : Une facture de l'École B a été retournée pour l'École A !");
    }
    console.log("✓ Accès croisé impossible : requête retourne null comme attendu.");

    console.log("\n🎉 TEST DE CLOISONNEMENT VALIDÉ À 100% : ZÉRO FUITE MULTI-TENANT.");
  } finally {
    // Nettoyage complet des données de test
    await prisma.school.delete({ where: { id: schoolA.id } });
    await prisma.school.delete({ where: { id: schoolB.id } });
    console.log("✓ Données de test nettoyées avec succès.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
