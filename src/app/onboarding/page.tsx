import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import Wizard from "./Wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Récupérer l'utilisateur dans la base de données
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { school: true }
  });

  if (!dbUser || !dbUser.school) {
    redirect("/login");
  }

  // SÉCURITÉ : confirmation obligatoire avant d'accéder au wizard d'installation
  if (!dbUser.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(dbUser.email)}`);
  }

  if (dbUser.school.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center bg-white px-4 py-12 sm:py-16 overflow-y-auto">
      <div className="w-full max-w-[420px] my-auto">
        <Suspense fallback={<div className="h-40 w-full animate-pulse rounded-2xl bg-sunk/50"></div>}>
          <Wizard
            schoolName={dbUser.school.name}
            userName={dbUser.firstName}
          />
        </Suspense>
      </div>
    </div>
  );
}
