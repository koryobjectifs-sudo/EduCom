import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasAccess, type RoleType } from "@/lib/permissions";
import PrintClient from "./PrintClient";

export const metadata = { title: "Impression des bulletins | EduCom" };


export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; termId?: string; evaluationId?: string }>;
}) {
  const { classId, termId, evaluationId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");
  // ⚠️ Contrôle via `hasAccess()`, seule source de vérité. Un tableau `ALLOWED`
  // local dupliquait la règle : vérifié, il donnait exactement le même ensemble
  // {OWNER, ADMIN, SECRETARY} que `permissions.ts`, mais il aurait dérivé au
  // premier changement de rôle. Cette page expose des notes non encore relues :
  // le contrôle serveur reste indispensable, il change juste de source.
  if (!hasAccess(dbUser.role as RoleType, "/dashboard/documents/validation")) {
    redirect("/dashboard/documents");
  }

  if (!classId || !termId || !evaluationId) redirect("/dashboard/documents/validation");

  // Le dossier est déjà validé : on ne redemande RIEN à l'utilisateur, tout
  // vient de l'URL. Il ne reste qu'à produire.
  const [school, klass, term, evaluation, enrollments, classSubjects, grades, cards] =
    await Promise.all([
      prisma.school.findUnique({ where: { id: dbUser.schoolId } }),
      prisma.class.findFirst({ where: { id: classId, schoolId: dbUser.schoolId } }),
      prisma.term.findUnique({ where: { id: termId } }),
      prisma.evaluation.findUnique({ where: { id: evaluationId } }),
      prisma.enrollment.findMany({
        where: { classId },
        include: { student: true },
        orderBy: { student: { lastName: "asc" } },
      }),
      prisma.classSubject.findMany({
        where: { classId },
        include: { subject: { include: { parent: true } } },
      }),
      prisma.grade.findMany({ where: { classId, evaluationId }, include: { subject: true } }),
      prisma.reportCard.findMany({ where: { classId, evaluationId } }),
    ]);

  if (!klass || !term || !evaluation) redirect("/dashboard/documents/validation");

  const statusByStudent = new Map(cards.map((c) => [c.studentId, c.status]));
  const gradesByStudent = new Map<string, any[]>();
  for (const g of grades) {
    const list = gradesByStudent.get(g.studentId) ?? [];
    list.push({
      subjectId: g.subjectId,
      value: g.value,
      coefficient: g.coefficient,
      comment: g.comment,
    });
    gradesByStudent.set(g.studentId, list);
  }

  const students = enrollments.map((e) => ({
    id: e.student.id,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
    dateOfBirth: e.student.dateOfBirth ? e.student.dateOfBirth.toISOString() : null,
    status: statusByStudent.get(e.student.id) ?? "DRAFT",
    grades: gradesByStudent.get(e.student.id) ?? [],
  }));

  const subjects = classSubjects.map((cs) => ({
    id: cs.subject.id,
    name: cs.subject.name,
    parentId: cs.subject.parentId,
    parent: cs.subject.parent ? { id: cs.subject.parent.id, name: cs.subject.parent.name } : null,
  }));

  return (
    <PrintClient
      school={school}
      className={klass.name}
      termName={term.name}
      evaluationName={evaluation.name}
      evaluationType={evaluation.type}
      students={students}
      subjects={subjects}
    />
  );
}
