"use client";

import { useState, useEffect } from "react";
import ModalQuizTesteur from "./ModalQuizTesteur";
import IncitationQuizTesteur from "./IncitationQuizTesteur";

export default function GlobalQuizTesteur({ userRole = "OWNER" }: { userRole?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("educom:ouvrir_quiz_testeur", handleOpen);
    return () => window.removeEventListener("educom:ouvrir_quiz_testeur", handleOpen);
  }, []);

  return (
    <>
      {/* Widget flottant de rappel doux après un temps d'utilisation */}
      <IncitationQuizTesteur userRole={userRole} onOpenQuiz={() => setIsOpen(true)} />

      {/* Modale d'évaluation 1-clic */}
      <ModalQuizTesteur
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultRole={userRole}
      />
    </>
  );
}
