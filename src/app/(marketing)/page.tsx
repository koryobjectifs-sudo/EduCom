import type { Metadata } from "next";
import HeroSection from "@/components/landing/HeroSection";
import TrustSection from "@/components/landing/TrustSection";
import Convergence from "@/components/landing/Convergence";
import WorkflowStories from "@/components/landing/WorkflowStories";
import ArcDivider from "@/components/landing/ArcDivider";
import ProductStory from "@/components/landing/ProductStory";
import RolesSection from "@/components/landing/RolesSection";
import DirectorPilot from "@/components/landing/DirectorPilot";
import Gain from "@/components/landing/Gain";
import SchoolStories from "@/components/landing/SchoolStories";
import Pricing from "@/components/landing/Pricing";
import FinalCTA from "@/components/landing/FinalCTA";

export const metadata: Metadata = {
  title: "EduCom — La digitalisation part de votre annuaire",
  description:
    "Numérisez votre annuaire élèves : dossiers, notes, présences, communication et pilotage se connectent d'eux-mêmes. Pour les écoles privées du Sénégal.",
};

/**
 * Page d'accueil — passe d'ajustement du 7 septembre 2026.
 *
 * ═══ POURQUOI CETTE PASSE ═══
 *
 * v7 (storytelling + composition, voir historique git) était validée dans
 * son principe mais jugée trop sombre, trop grande et trop vide. Cette passe
 * resserre l'espacement et la typographie partout, retire la seule section
 * pleine largeur sombre de la page (`ConnectedSystem.tsx`, supprimé), et la
 * remplace par `WorkflowStories.tsx` : quatre parcours produit réels
 * (facturation, notes/bulletins, présences, admission) plutôt qu'une chaîne
 * unique — voir le plan validé (`~/.claude/plans/vivid-shimmying-meteor.md`)
 * pour le détail de la décision.
 *
 * ═══ LE RYTHME (demandé explicitement) ═══
 *
 * CALME (hero) → COULEUR (convergence — absorbe l'ancien constat) → PRODUIT
 * (quatre parcours réels) → INTERACTION (rôles, contrôle en pilule) →
 * CONTRASTE/DONNÉES (pilotage, panneau marine contenu — pas une section
 * sombre) → HUMAIN (le gain, écoles) → CONVERSION (tarifs, CTA final).
 *
 * ⚠️ `ProblemSection.tsx` et `Chain.tsx` sont supprimés du dépôt depuis v7 ;
 * `ConnectedSystem.tsx` l'est depuis cette passe. Aucune section restante
 * n'a de fond sombre plein cadre — seuls `DirectorPilot` et `FinalCTA`
 * gardent un panneau marine CONTENU (une carte, pas la section).
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <Convergence />
      <WorkflowStories />
      <ProductStory />
      <RolesSection />
      <DirectorPilot />
      <ArcDivider bg="var(--m-card)" fill="var(--m-warm)" />
      <Gain />
      <SchoolStories />
      <ArcDivider bg="var(--m-warm)" fill="var(--m-paper-deep)" />
      <Pricing />
      <FinalCTA />
    </>
  );
}
