import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { roleLabel } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import InviteLink from "./InviteLink";
import OrgChartClient from "./OrgChartClient";
import TeamActions from "./TeamActions";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true, role: true }
  });

  if (!dbUser) {
    redirect("/login");
  }

  const teamMembers = await prisma.user.findMany({
    where: {
      schoolId: dbUser.schoolId,
      role: { not: "PARENT" }
    },
    orderBy: { createdAt: "asc" }
  });

  const pendingInvitations = await prisma.invitation.findMany({
    where: {
      schoolId: dbUser.schoolId,
      status: "PENDING"
    },
    orderBy: { createdAt: "desc" }
  });

  const classesData = await prisma.class.findMany({
    where: { schoolId: dbUser.schoolId },
    select: { id: true, name: true, cycle: true, teacherId: true },
    orderBy: { name: "asc" }
  });

  const subjectsData = await prisma.subject.findMany({
    where: { schoolId: dbUser.schoolId, parentId: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  const teachingAssignments = await prisma.teachingAssignment.findMany({
    where: { schoolId: dbUser.schoolId },
    select: { teacherId: true, classId: true, subjectId: true }
  });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Équipe" }]}
        title="Équipe"
        description={
          `${teamMembers.length} membre${teamMembers.length > 1 ? "s" : ""}` +
          (pendingInvitations.length > 0
            ? ` · ${pendingInvitations.length} invitation${pendingInvitations.length > 1 ? "s" : ""} en attente`
            : "")
        }
        actions={<TeamActions managers={teamMembers} />}
      />

      <Card flush className="p-4 overflow-x-auto min-h-[500px]">
        <OrgChartClient 
          members={teamMembers} 
          classesData={classesData}
          subjectsData={subjectsData}
          teachingAssignments={teachingAssignments}
        />
      </Card>

      {pendingInvitations.length > 0 && (
        <Card
          flush
          title={
            <span className="flex items-center gap-2">
              <Mail aria-hidden="true" className="h-4 w-4 text-warning" />
              Invitations en attente
            </span>
          }
          actions={<span className="text-role-meta tabular-nums text-text-faint">{pendingInvitations.length}</span>}
        >
          <ul className="divide-y divide-rule">
            {pendingInvitations.map((invite) => (
              <li key={invite.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-role-body font-semibold text-text">{invite.email}</span>
                  <Badge variant="warning">{roleLabel(invite.role)}</Badge>
                  <span className="text-role-meta text-text-faint">
                    créée le {new Date(invite.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <InviteLink token={invite.token} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
