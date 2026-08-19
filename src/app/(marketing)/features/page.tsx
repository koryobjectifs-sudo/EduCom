import type { Metadata } from "next";
import PageHeader from "@/components/landing/PageHeader";
import Features from "@/components/landing/Features";
import DocumentsShowcase from "@/components/landing/DocumentsShowcase";
import FinalCTA from "@/components/landing/FinalCTA";

export const metadata: Metadata = {
  title: "Fonctionnalités — EduCom",
  description:
    "Élèves, documents officiels, notes et bulletins, frais et paiements, dossier numérique, rôles. Et ce qu'EduCom ne fait pas encore.",
};

/**
 * ⚠️ Addendum PLG — cette page portait `FeatureGrid` (un « pipeline
 * Admissions » inexistant, un « suivi de lecture » impossible) et
 * `AnalyticsSection` (**quatre statistiques inventées** : 342, 284, 198, 124).
 * Les deux composants restent au dépôt, inutilisés, mais ne doivent pas être
 * remis en ligne : voir l'en-tête de `DocumentsShowcase`.
 */
export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        surtitre="Fonctionnalités"
        titre="Ce qu'EduCom fait aujourd'hui, écran par écran."
        intro="Chaque capacité listée ici correspond à un écran que vous pouvez ouvrir dès la création de votre espace. Rien n'est annoncé « à venir » : ce qui manque encore est dit à la fin de la page."
      />
      <DocumentsShowcase />
      <Features />
      <FinalCTA />
    </>
  );
}
