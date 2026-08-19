import type { Metadata } from "next";
import PageHeader from "@/components/landing/PageHeader";
import RolesSection from "@/components/landing/RolesSection";
import FinalCTA from "@/components/landing/FinalCTA";

export const metadata: Metadata = {
  title: "Pour qui — EduCom",
  description:
    "Sept rôles : direction, secrétariat, enseignant, comptable, assistant, parent. Chacun ne voit que ce qui le concerne.",
};

/**
 * ⚠️ Addendum PLG — cette page portait `ChaosToControl`, `ParentExperience` et
 * `CommunicationSection`. Les deux derniers annonçaient un envoi WhatsApp/SMS
 * « en un clic », des accusés de lecture et un suivi des absences : trois
 * fonctionnalités qui n'existent pas (`rappel.md` §30 à §32, et aucune donnée
 * de présence au schéma). Ils restent au dépôt, inutilisés.
 */
export default function SolutionsPage() {
  return (
    <>
      <PageHeader
        surtitre="Pour qui"
        titre="Une école, plusieurs métiers, un seul espace."
        intro="Une directrice, une secrétaire, un enseignant et un comptable n'ont ni les mêmes gestes ni les mêmes droits. EduCom leur donne le même espace et des vues différentes — et cette page est écrite à partir de la matrice de droits réellement appliquée par le produit."
      />
      <RolesSection />
      <FinalCTA />
    </>
  );
}
