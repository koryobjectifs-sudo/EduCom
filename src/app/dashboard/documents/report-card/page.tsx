import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ReportCardGenerator from "./Generator";

export default async function ReportCardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const school = await prisma.school.findUnique({
    where: { id: dbUser.schoolId }
  });

  const classes = await prisma.class.findMany({
    where: { schoolId: dbUser.schoolId },
    orderBy: { name: 'asc' }
  });

  const terms = await prisma.term.findMany({
    where: { schoolId: dbUser.schoolId },
    include: { evaluations: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' }
  });

  return <ReportCardGenerator classes={classes} terms={terms} school={school} />;
}
