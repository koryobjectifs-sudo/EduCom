import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import TeamWizard from "./TeamWizard";

export default async function TeamOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { school: true }
  });

  if (!dbUser || !dbUser.school) {
    redirect("/login");
  }

  if (!dbUser.school.onboardingCompleted) {
    redirect("/onboarding");
  }

  const teachers = await prisma.user.findMany({
    where: { schoolId: dbUser.schoolId, role: "TEACHER" },
  });
  
  const classes = await prisma.class.findMany({
    where: { schoolId: dbUser.schoolId },
  });

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center bg-white px-4 py-12 sm:py-16 overflow-y-auto">
      <div className="w-full max-w-[500px] my-auto">
        <Suspense fallback={<div className="h-40 w-full animate-pulse rounded-2xl bg-sunk/50"></div>}>
          <TeamWizard
            schoolId={dbUser.schoolId}
            schoolName={dbUser.school.name}
            existingTeachers={teachers}
            existingClasses={classes}
          />
        </Suspense>
      </div>
    </div>
  );
}
