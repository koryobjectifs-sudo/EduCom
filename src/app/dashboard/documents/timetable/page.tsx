import { prisma } from "@/lib/prisma";
import { requirePathAccess } from "@/lib/documentContext";
import { sortClasses } from "@/lib/classOrder";
import TimetableGenerator from "./Generator";

export default async function TimetablePage() {
  const { schoolId } = await requirePathAccess("/dashboard/documents/timetable");

  // Ordre pédagogique plutôt qu'alphabétique : voir `src/lib/classOrder.ts`.
  const classes = sortClasses(await prisma.class.findMany({ where: { schoolId } }));

  return <TimetableGenerator classes={classes} />;
}
