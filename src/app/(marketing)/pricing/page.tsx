import type { Metadata } from "next";
import PageHeader from "@/components/landing/PageHeader";
import Pricing from "@/components/landing/Pricing";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import { PRO_PRICE_EUR, formatFCFA, TRIAL_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Tarifs — EduCom",
  description:
    `${TRIAL_DAYS} jours d'essai, Pro à ${PRO_PRICE_EUR} € (≈ ${formatFCFA(PRO_PRICE_EUR)}) par mois. Un prix par école, pas par élève. Découvrez aussi notre offre On Demand pour le sur-mesure.`,
};

export default function PricingPage() {
  return (
    <>
      <PageHeader
        surtitre="Tarifs"
        titre="Un prix par école, pas par élève."
        intro={`Commencez par ${TRIAL_DAYS} jours d'essai : le temps d'éditer votre premier document officiel. Aucune carte bancaire n'est demandée, et EduCom n'a pas encore de paiement en ligne — rien ne peut vous être débité.`}
      />
      <Pricing sansEntete />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
