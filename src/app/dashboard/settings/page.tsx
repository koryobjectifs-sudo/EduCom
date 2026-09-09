import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { currentAcademicYear } from "@/lib/academicYear";
import SettingsClient from "./ClientPage";

/**
 * Réglages de l'établissement.
 *
 * ⚠️ Cette page n'avait **aucun contrôle de rôle**. Combinée au lien
 * « Paramètres » que l'ancienne sidebar n'filtrait pas, un `PARENT` pouvait
 * ouvrir les réglages de l'école et — avant le lot 01 — en modifier le nom, le
 * logo, le cachet et la signature.
 *
 * Le garde passe par `hasAccess()`, seule source de vérité : aucun rôle ne liste
 * `/dashboard/settings`, donc seuls `OWNER` et `ADMIN` franchissent, via `"*"`.
 * Le masquage dans la sidebar ne suffit pas — une URL se tape à la main.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { school: true }
  });
  if (!dbUser) redirect("/login");

  if (!hasAccess(dbUser.role as RoleType, "/dashboard/settings")) {
    redirect("/dashboard");
  }

  const school = dbUser.school;
  if (!school) {
    return <div>École non trouvée</div>;
  }

  const activeYear = currentAcademicYear(school);

  const [enrollmentYears, feeYears] = await Promise.all([
    prisma.enrollment.findMany({
      where: { class: { schoolId: school.id } },
      distinct: ["academicYear"],
      select: { academicYear: true },
    }),
    prisma.feeSchedule.findMany({
      where: { schoolId: school.id },
      distinct: ["academicYear"],
      select: { academicYear: true },
    }),
  ]);

  const availableYears = Array.from(
    new Set([
      activeYear,
      ...enrollmentYears.map((e) => e.academicYear),
      ...feeYears.map((f) => f.academicYear),
    ])
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <SettingsClient
        school={{
          name: school.name || "",
          email: school.email || "",
          phone: school.phone || "",
          address: school.address || "",
          logo: school.logo || "",
          stamp: school.stamp || "",
          signature: school.signature || "",
          activeAcademicYear: activeYear,
        }}
        availableYears={availableYears}
      />
    </div>
  );
}
