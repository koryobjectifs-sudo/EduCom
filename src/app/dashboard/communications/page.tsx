import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CommunicationsClient from "./ClientPage";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function CommunicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true, school: { select: { name: true } } }
  });
  const schoolId = dbUser?.schoolId;
  if (!schoolId) return null;
  const schoolName = dbUser?.school?.name ?? "";

  // Fetch all classes
  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" }
  });

  // Fetch all parents with their children
  const parents = await prisma.user.findMany({
    where: { role: "PARENT", schoolId },
    include: {
      students: {
        include: {
          enrollments: {
            include: {
              class: true
            }
          },
          invoices: {
            where: { status: "OVERDUE" }
          }
        }
      }
    }
  });

  // Map parents to an easier format for the client
  const mappedParents = parents.map(parent => {
    const studentNames = parent.students.map(s => `${s.firstName} ${s.lastName}`).join(", ");
    
    // Check if any of their children are in a specific class
    const classIds = new Set<string>();
    parent.students.forEach(s => {
      s.enrollments.forEach(e => {
        if (e.classId) classIds.add(e.classId);
      });
    });

    // Check if parent has any overdue invoices across their children
    const hasOverdueInvoices = parent.students.some(s => s.invoices.length > 0);
    // Calculate total overdue amount
    const totalOverdue = parent.students.reduce((sum, s) => {
      return sum + s.invoices.reduce((invSum, inv) => invSum + inv.totalAmount, 0);
    }, 0);

    return {
      id: parent.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone || "",
      studentNames,
      classIds: Array.from(classIds),
      hasOverdueInvoices,
      totalOverdue
    };
  });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Communications" }]}
        title="Communications WhatsApp"
        description={`${mappedParents.length} parent${mappedParents.length > 1 ? "s" : ""} joignable${mappedParents.length > 1 ? "s" : ""} · ${classes.length} classe${classes.length > 1 ? "s" : ""}`}
        actions={
          <>
            <Link
              href="/dashboard/communications/inbox"
              className="inline-flex h-10 items-center justify-center rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              Boîte de réception
            </Link>
            <Link
              href="/dashboard/communications/surveys"
              className="inline-flex h-10 items-center justify-center rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              Sondages
            </Link>
          </>
        }
      />

      <CommunicationsClient classes={classes} parents={mappedParents} schoolName={schoolName} />
    </div>
  );
}
