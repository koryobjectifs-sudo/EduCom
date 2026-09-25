import type { Metadata } from "next";
import HeroSection from "@/components/landing/HeroSection";
import TrustSection from "@/components/landing/TrustSection";
import BeforeAfter from "@/components/landing/BeforeAfter";
import WorkflowStories from "@/components/landing/WorkflowStories";
import MobileShowcase from "@/components/landing/MobileShowcase";
import DirectorPilot from "@/components/landing/DirectorPilot";
import ThreeSteps from "@/components/landing/ThreeSteps";
import Pricing from "@/components/landing/Pricing";
import CreateSchoolSection from "@/components/landing/CreateSchoolSection";

export const metadata: Metadata = {
  title: "EduCom — Moins de paperasse, moins de travail manuel pour votre école",
  description:
    "EduCom aide les établissements scolaires, publics et privés, à digitaliser leurs admissions, leurs notes, leurs bulletins officiels, leur facturation et leurs documents administratifs.",
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <ThreeSteps />
      <WorkflowStories />
      <MobileShowcase />
      <BeforeAfter />
      <DirectorPilot />
      <Pricing />
      <CreateSchoolSection />
    </>
  );
}
