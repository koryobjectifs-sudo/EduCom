import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CommunicationsClient from "./ClientPage";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { requireActionContext } from "@/lib/actionContext";

export default async function CommunicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true, school: { select: { name: true } } }
  });
  const schoolId = dbUser?.schoolId;
  const schoolName = dbUser?.school?.name ?? "";

  const auth = await requireActionContext("/dashboard/communications/campaigns/new");
  const role = auth.ok ? auth.ctx.role : "TEACHER";
  
  if (role === "TEACHER") {
    // Teachers are blocked from campaign creation entirely
    return (
      <div className="p-10 text-center text-red-500">
        Vous n&apos;avez pas les droits pour accéder à cette page.
      </div>
    );
  }

  const isAccountant = role === "ACCOUNTANT";

  // Fetch all classes
  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" }
  });

  // Fetch approved WhatsApp templates
  // Accountant only sees accounting templates
  const templates = await prisma.whatsAppTemplate.findMany({
    where: { 
      schoolId, 
      status: "APPROVED",
      // Assuming accounting templates might be categorized, 
      // but in the absence of a explicit category, we might just fetch all for now, 
      // or filter based on a naming convention. The strict filtering is on the action.
    },
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
  let mappedParents = parents.map(parent => {
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

  if (isAccountant) {
    // Accountant should theoretically only target parents with overdue invoices
    // or we leave the UI intact but the action enforces `trigger: PAYMENT_DUE`
    // We'll leave the parents list intact but they will be restricted by the trigger anyway.
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" }, 
          { label: "Communications", href: "/dashboard/communications" },
          { label: "Nouvelle campagne" }
        ]}
        title="Nouvelle Campagne"
        description={`${mappedParents.length} parent${mappedParents.length > 1 ? "s" : ""} joignable${mappedParents.length > 1 ? "s" : ""} · ${classes.length} classe${classes.length > 1 ? "s" : ""}`}
      />

      <CommunicationsClient 
        classes={classes} 
        parents={mappedParents} 
        templates={templates}
        schoolName={schoolName} 
      />
    </div>
  );
}
