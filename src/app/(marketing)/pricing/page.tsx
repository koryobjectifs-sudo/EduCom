import type { Metadata } from "next";
import PageHeader from "@/components/landing/PageHeader";
import Pricing from "@/components/landing/Pricing";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import { PRO_PRICE_EUR, formatFCFA, TRIAL_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Tarifs — EduCom",
  description:
    `${TRIAL_DAYS} jours d'essai gratuit. Formules Standard (9 900 F CFA/mois), Premium (14 900 F CFA/mois) et Sur Demande. Un tarif fixe par école, jamais par élève.`,
};

export default function PricingPage() {
  return (
    <>
      <PageHeader
        surtitre="Tarifs"
        titre="Un prix par école, pas par élève."
        intro={`Profitez de ${TRIAL_DAYS} jours d'essai gratuit pour tester l'ensemble des fonctionnalités avec votre équipe. Aucune carte bancaire demandée.`}
      />
      <Pricing sansEntete />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
