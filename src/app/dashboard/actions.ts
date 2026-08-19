"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function changeTestRole(newRole: string) {
  if (process.env.NODE_ENV === "production") return { success: false, error: "Only in dev" };
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { success: false, error: "Not logged in" };

  await prisma.user.update({
    where: { id: user.id },
    data: { role: newRole as any }
  });

  return { success: true };
}
