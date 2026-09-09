import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { currentAcademicYear } from "@/lib/studentFile";
import WizardClient from "./WizardClient";

export const metadata = {
  title: "Installation rapide de votre établissement | EduCom",
  description: "Configurez votre école primaire ou secondaire en moins de 4 minutes.",
};

export default async function PedagogyWizardPage({
  searchParams,
}: {
  searchParams?: Promise<{ step?: string }>;
}) {
  const { schoolId, school, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  if (!hasAccess(role, "/dashboard/settings/pedagogie")) {
    redirect("/dashboard");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialStep = resolvedParams?.step ? parseInt(resolvedParams.step, 10) : 1;
  const currentYear = currentAcademicYear();

  return (
    <div className="py-6">
      <WizardClient
        schoolName={school?.name || "Votre Établissement"}
        currentYear={currentYear}
        initialStep={isNaN(initialStep) ? 1 : Math.min(Math.max(initialStep, 1), 4)}
      />
    </div>
  );
}
