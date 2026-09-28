"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import GuideEnseignant from "./GuideEnseignant";
import { marquerGuideVu } from "@/app/dashboard/aide/actions";

/**
 * Guide de démarrage par métier (27 sept. 2026) : popup bloquante à la
 * première connexion — impossible de continuer sans cliquer « J'ai compris ».
 * V1 : métier Enseignant uniquement (voir `GUIDES` dans `GuideMetierContenu.tsx`).
 */
export default function GuideMetierGate({ role, guideVuAt }: { role: string; guideVuAt: Date | null }) {
  const [ferme, setFerme] = useState(false);
  const [enCours, demarrer] = useTransition();

  const concerne = role === "TEACHER";
  const ouvert = concerne && !guideVuAt && !ferme;
  if (!concerne) return null;

  return (
    <Modal
      open={ouvert}
      onClose={() => {}}
      dismissible={false}
      size="xl"
      title="Bienvenue sur EduCom"
      description="Trois minutes pour repérer l'essentiel de votre espace enseignant."
      footer={
        <Button
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              await marquerGuideVu();
              setFerme(true);
            })
          }
        >
          {enCours ? "…" : "J'ai compris"}
        </Button>
      }
    >
      <GuideEnseignant />
    </Modal>
  );
}
