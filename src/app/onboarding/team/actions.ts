"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inviteTeamMember } from "@/app/dashboard/team/actions";
import { configValide } from "@/lib/equipe";

export async function bulkInviteTeam(members: { firstName: string; lastName: string; email: string; role: string; classId?: string }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non autorisé" };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser || !dbUser.schoolId || (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN")) {
    return { success: false, error: "Non autorisé" };
  }

  const results = [];
  
  for (const member of members) {
    const formData = new FormData();
    formData.append("email", member.email);
    formData.append("role", member.role);
    
    // inviteTeamMember valide les quotas, insère dans prisma.invitation, et génère un token
    const res = await inviteTeamMember(formData);
    
    if (res.error) {
      results.push({ email: member.email, error: res.error });
      continue;
    }
    
    // La classe choisie est mémorisée (StaffSetup) et appliquée à
    // l'acceptation de l'invitation (`appliquerConfigurationInvitation`) :
    // l'enseignant trouve sa classe dès sa première connexion.
    if (member.role === "TEACHER" && member.classId) {
      const email = member.email.trim().toLowerCase();
      const assignments = await configValide(dbUser.schoolId, { titulaire: [member.classId], matieres: [] });
      await prisma.staffSetup
        .upsert({
          where: { schoolId_email: { schoolId: dbUser.schoolId, email } },
          create: { schoolId: dbUser.schoolId, email, assignments, capabilities: [], createdById: dbUser.id },
          update: { assignments, appliedAt: null },
        })
        .catch((e: Error) => console.error("[onboarding] classe non mémorisée :", e.message));
    }
    
    results.push({ email: member.email, success: true, link: res.link });
  }

  return { success: true, results };
}
