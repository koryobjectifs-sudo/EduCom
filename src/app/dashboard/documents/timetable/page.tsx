import { prisma } from "@/lib/prisma";
import { requirePathAccess } from "@/lib/documentContext";
import { sortClasses } from "@/lib/classOrder";
import TimetableGenerator from "./Generator";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams?: Promise<{ classId?: string }>;
}) {
  const { schoolId } = await requirePathAccess("/dashboard/documents/timetable");
  const sp = searchParams ? await searchParams : null;
  const classId = sp?.classId;

  // Ordre pédagogique plutôt qu'alphabétique : voir `src/lib/classOrder.ts`.
  const classes = sortClasses(await prisma.class.findMany({ where: { schoolId } }));

  return <TimetableGenerator classes={classes} initialClassId={classId ?? null} />;
}
