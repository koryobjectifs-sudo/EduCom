import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import ClassListClient from "./ClassListClient";
import { sortClasses } from "@/lib/classOrder";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (!dbUser) return null;

  const classes = sortClasses(
    await prisma.class.findMany({
      where: { schoolId: dbUser.schoolId },
      include: {
        teacher: true,
        _count: {
          select: { enrollments: true }
        }
      }
    })
  );

  const teachers = await prisma.user.findMany({
    where: {
      schoolId: dbUser.schoolId,
      role: "TEACHER"
    },
    orderBy: {
      firstName: "asc"
    }
  });

  const totalEnrolled = classes.reduce((sum, c) => sum + (c._count?.enrollments ?? 0), 0);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Classes" }]}
        title="Classes"
        description={`${classes.length} classe${classes.length > 1 ? "s" : ""} · ${totalEnrolled} élève${totalEnrolled > 1 ? "s" : ""} inscrit${totalEnrolled > 1 ? "s" : ""}`}
      />

      <ClassListClient classes={classes} teachers={teachers} />
    </div>
  );
}
