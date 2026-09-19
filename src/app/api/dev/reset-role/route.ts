import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Route HTTP d'échappement hors shells (/api/dev/reset-role)
 * Rétablit le rôle réel de l'utilisateur (ADMIN par défaut) et redirige vers /dashboard.
 * Strictement interdite en production (403).
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Action de test non autorisée en production", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawRole = searchParams.get("role") || "ADMIN";
  let targetRole = rawRole.toUpperCase().trim();
  if (targetRole === "COMPTABLE") targetRole = "ACCOUNTANT";
  if (targetRole === "DIRECTION") targetRole = "ADMIN";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // 1. Rétablir User.role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: targetRole as any },
    });

    // 2. Rétablir SchoolMembership.role
    const memberships = await prisma.schoolMembership.findMany({
      where: { userId: user.id, active: true },
    });
    if (memberships.length > 0) {
      const primary = memberships.find((m) => m.isPrimary) || memberships[0];
      await prisma.schoolMembership.update({
        where: { id: primary.id },
        data: { role: targetRole as any },
      });
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("educom_dev_simulated_role");
  cookieStore.delete("educom_dev_original_role");

  const targetPath = targetRole === "PARENT" ? "/famille" : "/dashboard";
  return NextResponse.redirect(new URL(targetPath, req.url));
}
