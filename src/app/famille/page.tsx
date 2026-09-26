import { requireFamilyContext } from "@/lib/familyContext";
import { getFamilyDashboardSnapshot } from "@/lib/dashboard-family";
import FamilyDashboard from "@/components/dashboard/family/FamilyDashboard";

/**
 * ACCUEIL ESPACE FAMILLE / COCKPIT PARENT
 * Refonte « Soft Elegance » — Standard unifié avec Director & Teacher.
 * Expérience calme, valorisante et proactive : courbes de notes, indicateurs de sérénité,
 * démarches prioritaires et suivi des enfants scolarisés.
 */
export default async function FamilyHomePage() {
  const familyContext = await requireFamilyContext();
  const snapshot = await getFamilyDashboardSnapshot(familyContext);

  return <FamilyDashboard snapshot={snapshot} />;
}
