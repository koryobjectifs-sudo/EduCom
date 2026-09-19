import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sortClasses } from "@/lib/classOrder";
import { teacherClassIds } from "@/lib/studentScope";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Saisie de notes | EduCom",
  description: "Aiguillage automatique vers la saisie élémentaire ou secondaire",
};

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; class?: string; termId?: string; term?: string; type?: string }>;
}) {
  const params = await searchParams;
  const requestedClassId = params.classId || params.class;
  const requestedTermId = params.termId || params.term;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const isTeacher = dbUser.role === "TEACHER";

  let classWhere: any = { schoolId: dbUser.schoolId };
  if (isTeacher) {
    const classIds = await teacherClassIds({
      schoolId: dbUser.schoolId,
      userId: dbUser.id,
      role: dbUser.role,
    });
    classWhere = {
      schoolId: dbUser.schoolId,
      id: { in: classIds },
    };
  }

  const classes = sortClasses(await prisma.class.findMany({ where: classWhere }));

  if (classes.length === 0) {
    return (
      <div className="flex-1 p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Aucune classe disponible</h1>
        <p className="text-sm text-gray-500 mt-2">
          Vous n&apos;avez aucune classe affectée dans cet établissement.
        </p>
        <Link
          href="/dashboard/grades"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux évaluations
        </Link>
      </div>
    );
  }

  // Résolution de la classe cible
  const targetClass = (requestedClassId ? classes.find((c) => c.id === requestedClassId) : null) ?? classes[0];

  // Aiguillage serveur par cycle
  const isElementaire =
    targetClass.cycle === "ELEMENTAIRE" ||
    targetClass.cycle === "PRESCOLAIRE" ||
    ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
      targetClass.name.toLowerCase().trim().startsWith(l)
    );

  const termQuery = requestedTermId ? `&term=${requestedTermId}` : "";

  if (isElementaire) {
    redirect(`/dashboard/grades/elementaire?class=${targetClass.id}${termQuery}`);
  } else {
    redirect(`/dashboard/grades/secondaire?class=${targetClass.id}${termQuery}`);
  }
}
