"use client";

import { useState, useEffect } from "react";
import EcranBienvenue from "@/components/onboarding/EcranBienvenue";
import { useSidebarSlot } from "@/components/layout/SidebarSlot";

interface DashboardWelcomeWrapperProps {
  userRole?: string;
  userName?: string;
  schoolName?: string;
  guideVuAt?: Date | null;
  children: React.ReactNode;
}

export default function DashboardWelcomeWrapper({
  userRole = "OWNER",
  userName,
  schoolName,
  guideVuAt,
  children,
}: DashboardWelcomeWrapperProps) {
  const { setTourDeclenche } = useSidebarSlot();
  const [montrerBienvenue, setMontrerBienvenue] = useState<boolean>(false);
  const [initialise, setInitialise] = useState(false);

  useEffect(() => {
    // Si l'utilisateur a déjà complété le tour en base, on ne l'affiche pas
    if (guideVuAt) {
      setMontrerBienvenue(false);
      setInitialise(true);
      return;
    }

    try {
      const dismiss = sessionStorage.getItem("educom_welcome_dismissed");
      if (!dismiss) {
        setMontrerBienvenue(true);
      }
    } catch {
      // Ignorer
    }
    setInitialise(true);
  }, [guideVuAt]);

  const handleDecouvrir = () => {
    try {
      sessionStorage.setItem("educom_welcome_dismissed", "true");
    } catch {
      // Ignorer
    }
    setMontrerBienvenue(false);
    setTourDeclenche(true);
  };

  const handlePasser = () => {
    try {
      sessionStorage.setItem("educom_welcome_dismissed", "true");
    } catch {
      // Ignorer
    }
    setMontrerBienvenue(false);
  };

  // Tant que l'état côté client n'est pas résolu, rendre les children pour éviter le layout shift
  if (!initialise) {
    return <div className="space-y-6">{children}</div>;
  }

  if (montrerBienvenue) {
    return (
      <div className="space-y-6">
        <EcranBienvenue
          userRole={userRole}
          userName={userName}
          schoolName={schoolName}
          onDecouvrir={handleDecouvrir}
          onPasser={handlePasser}
        />
        {/* On laisse également le dashboard visible en dessous ou estompé pour rassurer l'utilisateur sur la richesse du logiciel */}
        <div className="opacity-90 transition-opacity">
          {children}
        </div>
      </div>
    );
  }

  return <div className="space-y-6">{children}</div>;
}
