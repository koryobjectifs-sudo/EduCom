import { prisma } from "./_env";
const TAG = "SAISIE-SMOKE-TAG";
async function main() {
  const ecoles = await prisma.school.findMany({ where: { name: { contains: TAG } }, select: { id: true } });
  const schoolIds = ecoles.map((e) => e.id);
  if (schoolIds.length === 0) { console.log("Rien à nettoyer."); return; }

  const classes = await prisma.class.findMany({ where: { schoolId: { in: schoolIds } }, select: { id: true } });
  const classIds = classes.map((c) => c.id);

  await prisma.termReview.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.subjectAppreciation.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.grade.deleteMany({ where: { classId: { in: classIds } } });
  await prisma.enrollment.deleteMany({ where: { classId: { in: classIds } } });
  await prisma.teachingAssignment.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.classSubject.deleteMany({ where: { classId: { in: classIds } } });
  await prisma.class.deleteMany({ where: { id: { in: classIds } } });
  await prisma.gradeSubDiscipline.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.gradeDomain.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.subject.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.student.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.user.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.term.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
  console.log(`Nettoyé : ${schoolIds.length} école(s) de test résiduelle(s).`);
}
main().then(() => prisma.$disconnect());
