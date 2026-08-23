import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, Mail, Users, Network } from "lucide-react";
import { roleLabel, ROLE_LABELS, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import TeamForms from "./TeamForms";
import InviteLink from "./InviteLink";
import OrgChartClient from "./OrgChartClient";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
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

  const params = await searchParams;
  const activeTab = params.tab === "org" ? "org" : "list";

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
      />

      {/* Tabs navigation */}
      <div role="tablist" className="flex gap-1 rounded-control bg-sunk p-1 w-fit">
        <Link
          href="/dashboard/team?tab=list"
          role="tab"
          aria-selected={activeTab === "list"}
          className={`flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            activeTab === "list"
              ? "bg-surface font-semibold text-text shadow-card"
              : "text-text-soft hover:text-text"
          }`}
        >
          <Briefcase className="h-4 w-4" /> Liste
        </Link>
        <Link
          href="/dashboard/team?tab=org"
          role="tab"
          aria-selected={activeTab === "org"}
          className={`flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            activeTab === "org"
              ? "bg-surface font-semibold text-text shadow-card"
              : "text-text-soft hover:text-text"
          }`}
        >
          <Network className="h-4 w-4" /> Organigramme
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {activeTab === "org" ? (
            <Card flush className="p-4 overflow-hidden">
              <OrgChartClient members={teamMembers} />
            </Card>
          ) : (
            <Card
              flush
              title={
                <span className="flex items-center gap-2">
                  <Briefcase aria-hidden="true" className="h-4 w-4 text-text-faint" />
                  Membres actifs
                </span>
              }
              actions={<span className="text-role-meta tabular-nums text-text-faint">{teamMembers.length}</span>}
            >
              {teamMembers.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={Users}
                    title="Aucun collaborateur"
                    description="Créez un compte ou envoyez une invitation depuis le panneau de droite."
                    size="sm"
                  />
                </div>
              ) : (
                <ul className="divide-y divide-rule">
                  {teamMembers.map((member) => {
                    const isMe = member.id === user.id;
                    const initials = `${member.firstName?.charAt(0) ?? ""}${member.lastName?.charAt(0) ?? ""}`.toUpperCase();
                    const info = ROLE_LABELS[member.role as RoleType];

                    return (
                      <li
                        key={member.id}
                        className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-sunk/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-role-meta font-semibold text-primary"
                          >
                            {initials || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-role-body font-semibold text-text">
                              {member.firstName} {member.lastName}
                              {isMe && (
                                <span className="ml-2 font-normal text-role-meta text-text-faint">(vous)</span>
                              )}
                            </p>
                            <p className="truncate text-role-meta text-text-soft">{member.email}</p>
                          </div>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <Badge variant={isMe ? "info" : "neutral"} title={info?.description}>
                            {roleLabel(member.role)}
                          </Badge>
                          {info && (
                            <p className="mt-1 hidden max-w-xs text-role-meta text-text-faint sm:block">
                              {info.description}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {activeTab === "list" && pendingInvitations.length > 0 && (
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

        <div className="lg:col-span-1">
          <TeamForms managers={teamMembers} />
        </div>
      </div>
    </div>
  );
}
