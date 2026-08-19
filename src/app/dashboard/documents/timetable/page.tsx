import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { sortClasses } from "@/lib/classOrder";
import TimetableGenerator from "./Generator";

export default async function TimetablePage() {
  const { schoolId } = await requireSchoolContext();

  // Ordre pédagogique plutôt qu'alphabétique : voir `src/lib/classOrder.ts`.
  const classes = sortClasses(await prisma.class.findMany({ where: { schoolId } }));

  return <TimetableGenerator classes={classes} />;
}
