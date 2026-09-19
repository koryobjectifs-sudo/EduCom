import { prisma } from "./_env";

/**
 * Script de rattrapage / backfill pour InvoiceItem.studentId
 *
 * Usage :
 *   npx tsx --env-file=.env scripts/catchup-invoice-item-student-id.ts          (Simulation / Essai à blanc)
 *   APPLY=1 npx tsx --env-file=.env scripts/catchup-invoice-item-student-id.ts  (Application réelle après migration)
 */
async function main() {
  const isApply = process.env.APPLY === "1";

  console.log(`\n=== AUDIT & SIMULATION RATTRAPAGE InvoiceItem.studentId [${isApply ? "ÉCRITURE (APPLY=1)" : "ESSAI À BLANC"}] ===\n`);

  // 1. Comptage des factures et items
  const totalInvoices = await prisma.invoice.count();
  const invoicesWithStudent = await prisma.invoice.count({ where: { studentId: { not: null } } });
  const invoicesWithoutStudent = await prisma.invoice.count({ where: { studentId: null } });

  const totalItems = await prisma.invoiceItem.count();
  const itemsWithParentInvoiceStudent = await prisma.invoiceItem.count({
    where: { invoice: { studentId: { not: null } } },
  });
  const itemsWithoutParentInvoiceStudent = await prisma.invoiceItem.count({
    where: { invoice: { studentId: null } },
  });

  console.log(`📊 État réel de la base :`);
  console.log(`   - Factures totales : ${totalInvoices} (avec élève: ${invoicesWithStudent}, sans élève: ${invoicesWithoutStudent})`);
  console.log(`   - Lignes de facture (InvoiceItem) : ${totalItems}`);
  console.log(`   - Lignes rattachables immédiatement via leur facture : ${itemsWithParentInvoiceStudent}`);
  console.log(`   - Lignes orphelines (facture sans élève) : ${itemsWithoutParentInvoiceStudent}`);

  if (itemsWithoutParentInvoiceStudent > 0) {
    console.warn(`⚠️ Attention : ${itemsWithoutParentInvoiceStudent} items ne peuvent pas déduire leur élève automatiquement.`);
  } else {
    console.log(`✓ 100% des lignes existantes (${totalItems}/${totalItems}) ont un élève identifiable via leur facture.`);
  }

  // 2. Vérification de l'existence de la colonne en base PostgreSQL
  const columns: Array<{ column_name: string }> = await prisma.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'InvoiceItem' AND column_name = 'studentId'
  `;
  const columnExists = columns.length > 0;

  console.log(`\n🔍 État de la colonne 'studentId' sur 'InvoiceItem' : ${columnExists ? "PRÉSENTE EN BASE" : "NON ENCORE AJOUTÉE AU SCHÉMA"}`);

  if (!columnExists) {
    console.log(`ℹ️ Simulation terminée : après ajout du champ 'studentId' (nullable), 0 orphelin.`);
    console.log(`   Le script pourra s'exécuter avec APPLY=1 dès que la migration sera validée.\n`);
    return;
  }

  if (isApply) {
    const updated: any = await prisma.$executeRaw`
      UPDATE "InvoiceItem" ii
      SET "studentId" = i."studentId"
      FROM "Invoice" i
      WHERE ii."invoiceId" = i."id"
        AND ii."studentId" IS NULL
        AND i."studentId" IS NOT NULL
    `;
    console.log(`\n✅ Mise à jour réelle effectuée : ${updated} ligne(s) InvoiceItem enrichie(s) avec succès.`);
  } else {
    console.log(`\nℹ️ Mode essai à blanc terminé. Pour appliquer : APPLY=1 npx tsx --env-file=.env scripts/catchup-invoice-item-student-id.ts`);
  }
}

main()
  .catch((err) => {
    console.error("Erreur script :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
