import { prisma } from '../src/lib/prisma';

async function run() {
  const schools = await prisma.school.findMany({
    include: { _count: { select: { invoices: true, students: true, users: true } } }
  });
  console.log('=== LISTE DES ÉCOLES ET FACTURES ===');
  for (const s of schools) {
    console.log(`ID: ${s.id} | Nom: "${s.name}" | Factures: ${s._count.invoices} | Elèves: ${s._count.students} | Users: ${s._count.users}`);
  }

  const allInvoices = await prisma.invoice.findMany({
    include: {
      school: { select: { id: true, name: true } },
      parent: { select: { id: true, firstName: true, lastName: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
      payments: true,
    }
  });

  console.log(`\n=== TOUTES LES FACTURES EN BASE (${allInvoices.length}) ===`);
  for (const inv of allInvoices) {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const clientName = inv.parent ? `${inv.parent.firstName} ${inv.parent.lastName}` : (inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Inconnu');
    console.log(`École: "${inv.school.name}" (${inv.school.id}) | N°: ${inv.invoiceNumber || inv.id} | Client: ${clientName} | Montant: ${inv.totalAmount.toLocaleString('fr-FR')} FCFA | Payé: ${paid.toLocaleString('fr-FR')} FCFA | Statut: ${inv.status}`);
  }
}

run().catch(console.error);
