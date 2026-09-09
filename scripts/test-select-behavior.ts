import { prisma } from '../src/lib/prisma';

interface QueryLog {
  query: string;
}
const queries: QueryLog[] = [];
// @ts-ignore
prisma.$on('query', (e: any) => {
  queries.push({ query: e.query });
});

async function run() {
  const schoolId = 'c5e484f1-2e4d-44f9-a403-f68e4f54bec8';

  console.log('=== TEST SELECT SUR LES 7 RELATIONS IMBRIQUÉES ===');

  // 1. Class -> teacher
  queries.length = 0;
  await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, teacher: { select: { firstName: true, lastName: true } } },
  });
  console.log('1. Class.findMany (select teacher) -> ' + queries.length + ' requête(s) SQL');

  // 2. FeeSchedule -> items
  queries.length = 0;
  await prisma.feeSchedule.findFirst({
    where: { schoolId, status: 'ACTIVE' },
    select: { id: true, items: { select: { id: true, amount: true } } },
  });
  console.log('2. FeeSchedule.findFirst (select items) -> ' + queries.length + ' requête(s) SQL');

  // 3. Term -> evaluations
  queries.length = 0;
  await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, evaluations: { select: { id: true, name: true } } },
  });
  console.log('3. Term.findMany (select evaluations) -> ' + queries.length + ' requête(s) SQL');

  // 4. Class -> _count.enrollments
  queries.length = 0;
  await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, _count: { select: { enrollments: true } } },
  });
  console.log('4. Class.findMany (select _count.enrollments) -> ' + queries.length + ' requête(s) SQL');

  // 5 & 6. Payment -> invoice -> student
  queries.length = 0;
  await prisma.payment.findMany({
    where: { schoolId },
    select: { id: true, invoice: { select: { student: { select: { firstName: true } } } } },
    take: 4,
  });
  console.log('5 & 6. Payment.findMany (select invoice.student) -> ' + queries.length + ' requête(s) SQL');

  // 7. Message -> parent
  queries.length = 0;
  await prisma.message.findMany({
    where: { schoolId },
    select: { id: true, parent: { select: { firstName: true } } },
    take: 3,
  });
  console.log('7. Message.findMany (select parent) -> ' + queries.length + ' requête(s) SQL');

  process.exit(0);
}
run().catch(console.error);
