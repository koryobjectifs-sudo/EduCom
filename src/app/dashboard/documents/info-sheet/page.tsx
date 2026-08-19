import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import InfoSheetGenerator from "./Generator";

export default async function InfoSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const { schoolId, school } = await requireSchoolContext();

  const students = await prisma.student.findMany({
    where: { schoolId },
    include: { parent: true, enrollments: { include: { class: true } } },
    orderBy: { lastName: "asc" },
  });

  return <InfoSheetGenerator students={students} initialStudentId={studentId ?? null} school={school} />;
}
