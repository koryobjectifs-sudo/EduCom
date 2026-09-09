import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess } from "@/lib/permissions";
import { getReinscriptionInitDataAction } from "./actions";
import ReinscriptionWizardClient from "./ReinscriptionWizardClient";

export const metadata = {
  title: "Préparer la rentrée — Réinscription en masse | EduCom",
};

export default async function ReinscriptionPage() {
  const { user } = await requireSchoolContext();

  if (!hasAccess(user.role, "/dashboard/settings")) {
    redirect("/dashboard");
  }

  const res = await getReinscriptionInitDataAction();

  if (!res.success || !res.data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-lg font-bold">Impossible de charger les données de réinscription</h2>
          <p className="text-sm mt-1">{res.error || "Une erreur inattendue est survenue."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <ReinscriptionWizardClient initialData={res.data} />
    </div>
  );
}
