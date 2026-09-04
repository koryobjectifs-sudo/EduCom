import type { Metadata } from "next";
import HeroSection from "@/components/landing/HeroSection";
import TrustSection from "@/components/landing/TrustSection";
import ProblemSection from "@/components/landing/ProblemSection";
import ProductShowcase from "@/components/landing/ProductShowcase";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import SchoolStories from "@/components/landing/SchoolStories";
import Pricing from "@/components/landing/Pricing";
import FinalCTA from "@/components/landing/FinalCTA";

/**
 * ⚠️ Le titre par défaut du dépôt était « EduCom SaaS » et la description
 * « Plateforme de gestion pour les écoles ». C'est ce qui s'affiche dans un
 * résultat de recherche et dans un partage WhatsApp — c'est-à-dire, au Sénégal,
 * le premier contact réel avec le produit. « SaaS » n'a aucun sens pour une
 * directrice d'école. Le titre dit maintenant ce que le produit fait.
 */
export const metadata: Metadata = {
  title: "EduCom — Les dossiers, les bulletins et les frais de votre école",
  description:
    "Inscrivez un élève, EduCom édite son certificat de scolarité à l'en-tête de votre établissement. Pour les écoles privées du Sénégal.",
};

/**
 * Page d'accueil — chantier PLG + addendum.
 *
 * ═══ L'ORDRE DES SECTIONS EST UNE DÉCISION, PAS UNE HABITUDE ═══
 *
 * Hero (ce que c'est) → preuves (pourquoi s'y fier) → constat (est-ce mon
 * problème ?) → l'écran lui-même (à quoi ça ressemble, refonte du 4 sept.) →
 * produit (qu'est-ce que j'obtiens) → déroulé (combien ça me coûte en temps)
 * → écoles (qui d'autre) → tarifs (combien en argent) → action.
 *
 * Les preuves passent **avant** le constat, contrairement à l'usage. Une
 * directrice qui découvre un produit inconnu, édité par une équipe qu'elle ne
 * connaît pas, et à qui on va demander les données de ses élèves, a besoin
 * qu'on réponde à « puis-je vous faire confiance ? » avant qu'on lui explique
 * son propre métier.
 *
 * ⚠️ `PillarsSection` a été retirée de l'accueil au chantier PLG : elle
 * présentait deux maquettes de modules QUI N'EXISTENT PAS — un « Pipeline
 * Admissions » en kanban et une application « EduCom Parents » — avec des noms
 * d'élèves inventés. Le composant reste au dépôt, inutilisé, jusqu'à ce que ces
 * modules existent.
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <ProblemSection />
      <ProductShowcase />
      <Features />
      <HowItWorks />
      <SchoolStories />
      <Pricing />
      <FinalCTA />
    </>
  );
}
