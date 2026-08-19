import type { Metadata } from "next";
import PageHeader from "@/components/landing/PageHeader";
import Pricing from "@/components/landing/Pricing";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";

export const metadata: Metadata = {
  title: "Tarifs — EduCom",
  description:
    "14 jours d'essai, Pro à 20 € (≈ 13 100 F CFA) par mois, Premium à 30 € (≈ 19 700 F CFA) par mois. Un prix par école, pas par élève.",
};

export default function PricingPage() {
  return (
    <>
      <PageHeader
        surtitre="Tarifs"
        titre="Un prix par école, pas par élève."
        intro="Commencez par 14 jours d'essai : le temps d'éditer votre premier document officiel. Aucune carte bancaire n'est demandée, et EduCom n'a pas encore de paiement en ligne — rien ne peut vous être débité."
      />
      <Pricing sansEntete />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
