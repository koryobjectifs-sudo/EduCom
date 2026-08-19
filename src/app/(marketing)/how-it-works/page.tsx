import type { Metadata } from "next";
import PageHeader from "@/components/landing/PageHeader";
import HowItWorks from "@/components/landing/HowItWorks";
import FinalCTA from "@/components/landing/FinalCTA";

export const metadata: Metadata = {
  title: "Le déroulé — EduCom",
  description:
    "Créez l'espace de votre école, choisissez vos niveaux, inscrivez un élève : son certificat de scolarité est prêt à imprimer.",
};

/**
 * ⚠️ Chantier PLG — la section « Témoignages » de cette page affichait
 * « [Nom Prénom] » et « [Directeur d'école] » : des marques de gabarit livrées
 * en production. Retirée. La preuve sociale vit désormais dans
 * `SchoolStories`, sur l'accueil, avec sa règle de publication.
 */
export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        surtitre="Le déroulé"
        titre="Trois minutes entre le compte créé et le premier document."
        intro="Pas de déploiement, pas de reprise de données préalable, pas de formation à planifier. Vous créez votre espace et vous éditez un document officiel le jour même."
      />
      <HowItWorks />
      <FinalCTA />
    </>
  );
}
