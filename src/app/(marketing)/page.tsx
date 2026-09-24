import type { Metadata } from "next";
import HeroSection from "@/components/landing/HeroSection";
import TrustSection from "@/components/landing/TrustSection";
import BeforeAfter from "@/components/landing/BeforeAfter";
import WorkflowStories from "@/components/landing/WorkflowStories";
import DirectorPilot from "@/components/landing/DirectorPilot";
import ThreeSteps from "@/components/landing/ThreeSteps";
import Pricing from "@/components/landing/Pricing";
import DemoBookingSection from "@/components/landing/DemoBookingSection";

export const metadata: Metadata = {
  title: "EduCom — Moins de paperasse, moins de travail manuel pour votre école",
  description:
    "EduCom aide les écoles privées du Sénégal à digitaliser leurs admissions, leurs notes, leurs bulletins officiels, leur facturation et leurs documents administratifs.",
};

/**
 * Page d'accueil — resserrée le 23 septembre 2026 (14 → 8 sections).
 *
 * Kory : « comprendre le produit et la valeur en quelques minutes ». La page
 * faisait 11 000 px et répétait trois fois l'avant/après (Convergence, Gain,
 * FinalCTA). Retirées de l'assemblage (fichiers conservés, réversibles) :
 * Convergence + Gain → fusionnés dans `BeforeAfter` ; ProductStory (fiche
 * élève, déjà dans les parcours) ; SupportingOperations (présences, WhatsApp,
 * sondages → cités dans TargetAudience/parcours) ; RolesSection (détail
 * interne des permissions — gardé en une ligne de confiance dans TrustSection) ;
 * SchoolStories (pilote) ; TargetAudience (cycles déjà dans le hero — remplacée par
 * `ThreeSteps`, le message central de Kory : créer, importer, le reste suit) ; FinalCTA (doublon de DemoBookingSection, et il
 * annonçait « Essayer gratuitement » alors que la campagne vise la démo).
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <ThreeSteps />
      <WorkflowStories />
      <BeforeAfter />
      <DirectorPilot />
      <Pricing />
      <DemoBookingSection />
    </>
  );
}
