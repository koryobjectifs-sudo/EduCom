import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { sortClasses } from "@/lib/classOrder";
import ValidationClient from "./ValidationClient";

export const metadata = {
  title: "Validation des bulletins | EduCom",
};



import { PageHeader } from "@/components/ui/PageHeader";
import { DocumentsTabs } from "../DocumentsTabs";
import { FileStack } from "lucide-react";
import Link from "next/link";

export default async function ValidationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  if (!hasAccess(dbUser.role as RoleType, "/dashboard/documents/validation")) {
    redirect("/dashboard/documents");
  }

  const cards = await prisma.reportCard.findMany({
    where: { schoolId: dbUser.schoolId, status: { in: ["SUBMITTED", "RETURNED", "APPROVED"] } },
    include: {
      class: true,
      term: true,
      evaluation: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const teacherIds = [...new Set(cards.map((c) => c.submittedById ?? c.validatedById).filter(Boolean))] as string[];
  const teachers = teacherIds.length
    ? await prisma.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const teacherById = new Map(teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));

  const grouped = new Map<string, any>();
  for (const c of cards) {
    const key = `${c.classId}::${c.evaluationId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        classId: c.classId,
        className: c.class.name,
        cycle: c.class.cycle,
        termId: c.termId,
        termName: c.term.name,
        evaluationId: c.evaluationId,
        evaluationName: c.evaluation.name,
        teacher: teacherById.get((c.submittedById ?? c.validatedById) as string) ?? "—",
        submittedAt: c.submittedAt?.toISOString() ?? null,
        returnedReason: c.returnedReason,
        counts: { SUBMITTED: 0, RETURNED: 0, APPROVED: 0 },
        total: 0,
      });
    }
    const g = grouped.get(key);
    g.counts[c.status] = (g.counts[c.status] ?? 0) + 1;
    g.total++;
  }

  const submissions = [...grouped.values()].sort((a, b) => {
    const rank = (g: any) => (g.counts.SUBMITTED > 0 ? 0 : g.counts.RETURNED > 0 ? 1 : 2);
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return sortClasses([
      { name: a.className, cycle: a.cycle },
      { name: b.className, cycle: b.cycle },
    ])[0].name === a.className
      ? -1
      : 1;
  });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Documents" }]}
        title="Documents"
        description="Le travail déposé par les enseignants. Relisez, renvoyez pour correction si nécessaire, puis validez pour autoriser l'impression."
        actions={
          <Link
            href="/dashboard/documents/drafts"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            <FileStack aria-hidden="true" className="h-4 w-4" />
            Brouillons
          </Link>
        }
      />
      
      <DocumentsTabs canValidate={true} />

      <ValidationClient submissions={submissions} />
    </div>
  );
}
