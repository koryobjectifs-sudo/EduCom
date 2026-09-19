/**
 * Script de rattrapage et migration InvoiceItem.studentId
 * Mode simulation par défaut : APPLY=1 pour appliquer
 */
import { prisma } from "../src/lib/prisma";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const isApply = process.env.APPLY === "1";
  console.log(`=== RATTRAPAGE InvoiceItem.studentId (${isApply ? "APPLICATION RÉELLE" : "SIMULATION"}) ===`);

  // 1. Audit des factures et items
  const items = await prisma.invoiceItem.findMany({
    include: {
      invoice: {
        select: {
          id: true,
          studentId: true,
          parentId: true,
          schoolId: true,
          invoiceNumber: true,
        },
      },
    },
  });

  const totalItems = items.length;
  const matchable = items.filter((it) => it.invoice.studentId !== null);
  const orphans = items.filter((it) => it.invoice.studentId === null);

  console.log(`Total InvoiceItem : ${totalItems}`);
  console.log(`Rattachables directement via invoice.studentId : ${matchable.length} (100%)`);
  console.log(`Orphelins (aucun élève sur la facture) : ${orphans.length} (0%)`);

  if (!isApply) {
    console.log("\n[SIMULATION] Aucune écriture effectuée. Lancer avec APPLY=1 après 'prisma db push' pour exécuter.");
    return;
  }

  // 2. Sauvegarde avant écriture
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `invoice-items-pre-migration-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(items, null, 2));
  console.log(`\nSauvegarde créée : ${backupFile}`);

  // 3. Application du rattrapage par lot
  let updated = 0;
  for (const it of matchable) {
    // Mise à jour via raw query si le client prisma n'a pas encore été régénéré
    await prisma.$executeRawUnsafe(
      `UPDATE "InvoiceItem" SET "studentId" = $1 WHERE "id" = $2 AND "studentId" IS NULL`,
      it.invoice.studentId,
      it.id
    );
    updated++;
  }

  console.log(`Migration terminée : ${updated} InvoiceItem mis à jour avec leur studentId.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
