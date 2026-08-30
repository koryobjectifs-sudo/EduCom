"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import TeamAddForm from "./TeamAddForm";

export default function TeamActions({ managers }: { managers: any[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Button 
        onClick={() => setModalOpen(true)}
        icon={<UserPlus aria-hidden="true" className="h-4 w-4" />}
      >
        Ajouter un collaborateur
      </Button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un collaborateur"
        size="md"
      >
        <p className="mb-5 text-role-body leading-relaxed text-text-soft">
          Invitez un membre à rejoindre votre équipe en générant un lien, ou créez son compte manuellement.
        </p>
        <div className="pb-2">
          <TeamAddForm managers={managers} />
        </div>
      </Modal>
    </div>
  );
}
