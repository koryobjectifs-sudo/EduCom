import { prisma } from '../src/lib/prisma';
import { getDirectorDashboardSnapshot, getAcademicDashboardData, getRecentActivityFeedData } from '../src/lib/dashboard-director';

interface QueryLog {
  query: string;
  duration: number;
}
let currentLog: QueryLog[] = [];
// @ts-ignore
prisma.$on('query', (e: any) => {
  currentLog.push({ query: e.query, duration: e.duration });
});

async function run() {
  const schoolId = 'c5e484f1-2e4d-44f9-a403-f68e4f54bec8';
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { users: { where: { role: 'ADMIN' }, take: 1 } },
  });
  if (!school || !school.users[0]) throw new Error('Not found');
  const user = school.users[0];

  const logSnapshot: QueryLog[] = [];
  const logAcademic: QueryLog[] = [];
  const logRecent: QueryLog[] = [];

  currentLog = logSnapshot;
  const startSnap = performance.now();
  await getDirectorDashboardSnapshot(
    { schoolId, userId: user.id, role: user.role as any },
    { firstName: user.firstName, schoolName: school.name }
  );
  const snapMs = performance.now() - startSnap;

  currentLog = logAcademic;
  const startAcad = performance.now();
  await getAcademicDashboardData(schoolId);
  const acadMs = performance.now() - startAcad;

  currentLog = logRecent;
  const startRec = performance.now();
  await getRecentActivityFeedData(schoolId, true);
  const recMs = performance.now() - startRec;

  console.log('\n======================================================');
  console.log('1. SNAPSHOT BLOQUANT (Header, KPI, A traiter, Finances, Assiduite, Effectifs)');
  console.log('   - Nb requetes SQL : ' + logSnapshot.length);
  console.log('   - Wall-clock time : ' + Math.round(snapMs) + ' ms');
  console.log('------------------------------------------------------');
  logSnapshot.forEach((q, i) => {
    console.log('   [' + (i + 1) + '] ' + Math.round(q.duration) + 'ms | ' + q.query.slice(0, 110));
  });

  console.log('\n======================================================');
  console.log('2. SUIVI PEDAGOGIQUE (Differe via Suspense)');
  console.log('   - Nb requetes SQL : ' + logAcademic.length);
  console.log('   - Wall-clock time : ' + Math.round(acadMs) + ' ms');
  console.log('------------------------------------------------------');
  logAcademic.forEach((q, i) => {
    console.log('   [' + (i + 1) + '] ' + Math.round(q.duration) + 'ms | ' + q.query.slice(0, 110));
  });

  console.log('\n======================================================');
  console.log('3. ACTIVITE RECENTE (Differe via Suspense)');
  console.log('   - Nb requetes SQL : ' + logRecent.length);
  console.log('   - Wall-clock time : ' + Math.round(recMs) + ' ms');
  console.log('------------------------------------------------------');
  logRecent.forEach((q, i) => {
    console.log('   [' + (i + 1) + '] ' + Math.round(q.duration) + 'ms | ' + q.query.slice(0, 110));
  });

  process.exit(0);
}
run().catch(console.error);
