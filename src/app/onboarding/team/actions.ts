"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inviteTeamMember } from "@/app/dashboard/team/actions";

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
    
    // Note: Since the user isn't created yet (it's an invitation), we can't create the TeacherAssignment
    // right now. The assignment must happen after the user claims the invitation or we must store 
    // it differently. For this fix, we simply return the link.
    
    results.push({ email: member.email, success: true, link: res.link });
  }

  return { success: true, results };
}
