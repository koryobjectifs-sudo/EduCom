import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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

  if (dbUser.school.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    // ⚠️ Les trois halos flous de 600 px ont été retirés : ils ne portaient
    // aucune information, coûtaient du rendu sur les appareils modestes, et
    // signaient une maquette générée plutôt qu'un outil scolaire.
    <div className="flex min-h-[100dvh] flex-col items-center bg-sunk p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-[420px] my-auto">
        <Wizard
          schoolName={dbUser.school.name}
          userName={dbUser.firstName}
        />
      </div>
    </div>
  );
}
