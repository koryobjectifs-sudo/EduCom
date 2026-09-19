import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { pickCurrentTerm } from "@/lib/terms";
import { loadOfficialBulletin } from "@/lib/bulletin/loadOfficialBulletin";
import { BulletinSecondaireSheet } from "@/components/grades/BulletinSecondaireSheet";
import { BulletinElementaireSheet } from "@/components/grades/BulletinElementaireSheet";

export default async function PreviewReportCardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const studentId = one("studentId") ?? null;
  let classId = one("classId");
  let termId = one("termId");

  if (role === "PARENT") {
    if (!studentId) return <div className="p-4 text-center text-gray-500">Aucun élève sélectionné.</div>;
    const isParentOfStudent = await prisma.student.count({
      where: { id: studentId, parentId: user.id, schoolId },
    });
    if (!isParentOfStudent) {
      return <div className="p-4 text-center text-gray-500">Accès non autorisé à ce bulletin.</div>;
    }
  } else {
    if (!hasAccess(role, "/dashboard/grades/report-card")) {
      redirect(firstAllowedPath(role));
    }
  }

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

  const loaded = await loadOfficialBulletin({ schoolId, classId, termId, studentId });
  if (!loaded) return <div className="p-4 text-center text-gray-500">Bulletin introuvable.</div>;

  const student = (loaded.students as any[]).find((s) => s.studentId === studentId);
  if (!student) return <div className="p-4 text-center text-gray-500">Élève non trouvé dans ce bulletin.</div>;

  return (
    <div className="w-full min-h-screen bg-gray-100/50 sm:p-4 flex justify-center">
      {loaded.cycle === "ELEMENTAIRE" ? (
        <BulletinElementaireSheet
          student={student}
          school={loaded.school}
          className={loaded.classe.name}
          termName={loaded.term.name}
          isT3={loaded.term.isT3}
        />
      ) : (
        <BulletinSecondaireSheet
          student={student}
          school={loaded.school}
          className={loaded.classe.name}
          termName={loaded.term.name}
          isT3={loaded.term.isT3}
        />
      )}
    </div>
  );
}
