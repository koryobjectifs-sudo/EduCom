import "server-only";
import { requirePathAccess } from "@/lib/documentContext";
import type { RoleType } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { pickCurrentTerm } from "@/lib/terms";
import { sortClasses } from "@/lib/classOrder";
import { loadBulletin } from "@/lib/gradeEntry";
import { BulletinSheet } from "@/components/grades/BulletinSheet";

export default async function PreviewReportCardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { schoolId, user } = await requirePathAccess("/dashboard/grades/report-card");
  const role = user.role as RoleType;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const studentId = one("studentId") ?? null;
  let classId = one("classId");
  let termId = one("termId");
  const evaluationId = one("evaluationId");

  if (!studentId) return <div className="p-4 text-center text-gray-500">Aucun élève sélectionné.</div>;

  if (studentId && !classId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, class: { schoolId } },
      orderBy: { createdAt: "desc" },
      select: { classId: true },
    });
    classId = enrollment?.classId;
  }

  const termRows = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  if (!termId) termId = pickCurrentTerm(termRows).current?.id;

  if (!classId || !termId) {
    return <div className="p-4 text-center text-gray-500">Informations insuffisantes pour charger le bulletin.</div>;
  }

  const loaded = await loadBulletin({ schoolId, userId: user.id, role }, { classId, termId, evaluationId });
  if (!loaded) return <div className="p-4 text-center text-gray-500">Bulletin introuvable.</div>;

  const schoolParams = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, logo: true, signature: true, stamp: true },
  });

  const student = loaded.bulletin.students.find(s => s.studentId === studentId);
  if (!student) return <div className="p-4 text-center text-gray-500">Élève non trouvé dans ce bulletin.</div>;

  return (
    <div className="w-full min-h-screen bg-gray-100/50 sm:p-4 flex justify-center">
      <BulletinSheet
        student={student}
        bulletin={loaded.bulletin}
        school={schoolParams}
        className={loaded.klass.name}
        termName={loaded.term.name}
        evaluationName={loaded.evaluation?.name || "Toutes évaluations"}
        isComposition={loaded.evaluation?.isComposition || false}
        academicYear={loaded.academicYear}
      />
    </div>
  );
}
