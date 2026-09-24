import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  console.log('=== VERIFICATION SENG.CO & QUEEN SCHOOL ===');

  // SENG.CO
  const seng = await prisma.school.findFirst({
    where: { name: { contains: 'SENG', mode: 'insensitive' } },
  });
  console.log('SENG.CO ID:', seng?.id, seng?.name);

  if (seng) {
    const invoices = await prisma.invoice.findMany({
      where: { schoolId: seng.id },
      include: {
        parent: { select: { id: true, firstName: true, lastName: true, phone: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        payments: true,
      },
      orderBy: { invoiceNumber: 'asc' },
    });

    console.log(`\nSENG.CO FACTURES (${invoices.length}) :`);
    let totalFacture = 0;
    let totalEncaisse = 0;
    for (const inv of invoices) {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      totalFacture += inv.totalAmount;
      totalEncaisse += paid;
      const reliquat = inv.totalAmount - paid;
      const famille = inv.parent ? `${inv.parent.firstName} ${inv.parent.lastName}` : (inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Inconnue');
      console.log(`- ${inv.invoiceNumber || inv.id} | Famille: ${famille} | Montant: ${inv.totalAmount.toLocaleString('fr-FR')} FCFA | Encaissé: ${paid.toLocaleString('fr-FR')} FCFA | Reliquat: ${reliquat.toLocaleString('fr-FR')} FCFA | Statut: ${inv.status}`);
    }
    console.log(`\nTOTAL SENG.CO :`);
    console.log(`Total facturé : ${totalFacture.toLocaleString('fr-FR')} FCFA`);
    console.log(`Total encaissé : ${totalEncaisse.toLocaleString('fr-FR')} FCFA`);
    console.log(`Reliquat : ${(totalFacture - totalEncaisse).toLocaleString('fr-FR')} FCFA`);
  }

  // QUEEN SCHOOL
  const queen = await prisma.school.findFirst({
    where: { name: { contains: 'Queen', mode: 'insensitive' } },
  });
  console.log('\nQUEEN SCHOOL ID:', queen?.id, queen?.name);
  if (queen) {
    const qInvoices = await prisma.invoice.findMany({
      where: { schoolId: queen.id },
      include: {
        parent: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`\nQUEEN SCHOOL FACTURES (${qInvoices.length}) :`);
    let qTotal = 0;
    for (const inv of qInvoices) {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      qTotal += inv.totalAmount;
      const nom = inv.parent ? `${inv.parent.firstName} ${inv.parent.lastName}` : (inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Inconnu');
      console.log(`- ${inv.invoiceNumber || inv.id} | Famille/Élève: ${nom} | Montant: ${inv.totalAmount.toLocaleString('fr-FR')} FCFA | Statut: ${inv.status}`);
    }
    console.log(`Total Queen School : ${qTotal.toLocaleString('fr-FR')} FCFA`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
