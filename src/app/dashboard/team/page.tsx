import { prisma } from "@/lib/prisma";
import { requirePathAccess } from "@/lib/documentContext";
import { Mail } from "lucide-react";
import { roleLabel } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import InviteLink from "./InviteLink";
import OrgChartClient from "./OrgChartClient";
import AjouterMembre from "./AjouterMembre";
import { donneesAffectation } from "@/lib/equipe";
import { formatDate } from "@/lib/dateUtils";

export default async function TeamPage() {
  // Contexte multi-écoles (même école que les actions `equipe-actions.ts`).
  const ctx = await requirePathAccess("/dashboard/team");
  const dbUser = { schoolId: ctx.schoolId, role: ctx.role };

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

  const [donnees, affectations, grants] = await Promise.all([
    donneesAffectation(dbUser.schoolId),
    prisma.teachingAssignment.findMany({
      where: { schoolId: dbUser.schoolId },
      select: { teacherId: true, classId: true, subjectId: true },
    }),
    prisma.staffGrant.findMany({ where: { schoolId: dbUser.schoolId }, select: { userId: true, capability: true } }).catch(() => []),
  ]);
  const noms = Object.fromEntries(teamMembers.map((m) => [m.id, `${m.firstName} ${m.lastName}`]));
  const acces: Record<string, string[]> = {};
  for (const g of grants) (acces[g.userId] ??= []).push(g.capability);
  const peutGerer = dbUser.role === "OWNER" || dbUser.role === "ADMIN";

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
        actions={peutGerer ? <AjouterMembre donnees={donnees} autres={{ noms, affectations }} /> : undefined}
      />

      <Card flush className="p-4 overflow-x-auto min-h-[500px]">
        <OrgChartClient
          members={teamMembers}
          donnees={donnees}
          autres={{ noms, affectations }}
          acces={acces}
          peutGerer={peutGerer}
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
                    créée le {formatDate(invite.createdAt)}
                  </span>
                </div>
                <InviteLink token={invite.token} id={invite.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
