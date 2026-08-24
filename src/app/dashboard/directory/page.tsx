import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { studentWhereFor } from "@/lib/studentScope";
import { sortClasses } from "@/lib/classOrder";
import { PageHeader } from "@/components/ui/PageHeader";
import DirectoryClient from "./DirectoryClient";
import { createClient } from "@/lib/supabase/server";

export default async function DirectoryPage() {
  const { user, schoolId } = await requireSchoolContext();
  
  // -- Fetch Students --
  const scope = await studentWhereFor({ userId: user.id, schoolId, role: user.role });
  
  const studentsPromise = prisma.student.findMany({
    where: { AND: [scope, { schoolId }] },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      status: true,
      parent: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          academicYear: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // -- Fetch Classes --
  const classesPromise = prisma.class.findMany({
    where: { schoolId },
    include: {
      teacher: true,
      _count: {
        select: { enrollments: true }
      }
    }
  });

  // -- Fetch Teachers --
  const teachersPromise = prisma.user.findMany({
    where: {
      schoolId,
      role: "TEACHER"
    },
    orderBy: {
      firstName: "asc"
    }
  });

  // Wait for all queries
  const [studentsData, rawClasses, teachers] = await Promise.all([
    studentsPromise,
    classesPromise,
    teachersPromise
  ]);

  const classes = sortClasses(rawClasses);
  const enrolled = studentsData.filter((s) => s.status === "ENROLLED").length;
  const pending = studentsData.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Annuaire" }]}
        title="Annuaire"
        description={
          `${studentsData.length} élève${studentsData.length > 1 ? "s" : ""} · ${enrolled} inscrit${enrolled > 1 ? "s" : ""}` +
          (pending > 0 ? ` · ${pending} en attente de validation` : "") +
          ` · ${classes.length} classe${classes.length > 1 ? "s" : ""}`
        }
      />

      <DirectoryClient 
        studentsData={studentsData} 
        classesData={classes} 
        teachersData={teachers} 
      />
    </div>
  );
}
