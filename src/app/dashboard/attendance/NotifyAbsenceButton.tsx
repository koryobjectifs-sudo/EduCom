"use client";

import { useState, useEffect } from "react";
import { Check, MessageCircle, Smartphone, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { validateAbsence } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export default function NotifyAbsenceButton({ attendanceId, studentName, dateStr }: { attendanceId: string, studentName: string, dateStr: string }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleValidate = async () => {
    setLoading(true);
    const res = await validateAbsence(attendanceId);
    if (res.success) {
      router.refresh();
      setModalOpen(false);
    }
    setLoading(false);
  };

  const magicLink = `${origin}/absence/${attendanceId}`;
  const message = `Bonjour, merci de bien vouloir confirmer l'absence de ${studentName} le ${dateStr} et de nous en préciser le motif via ce lien sécurisé : ${magicLink}`;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 rounded-control border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning-dark transition-colors hover:bg-warning hover:text-white"
        title="Notifier les parents"
      >
        <BellRing className="h-3.5 w-3.5" />
        Notifier
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Suivi d'absence : ${studentName}`}
        size="md"
      >
        <p className="mb-5 text-role-body leading-relaxed text-text-soft">
          Comment souhaitez-vous contacter les parents pour justifier cette absence ?
        </p>

        <div className="space-y-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setModalOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-control bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#128C7E]"
          >
            <MessageCircle className="w-5 h-5" /> Envoyer par WhatsApp
          </a>

          <a
            href={`sms:?&body=${encodeURIComponent(message)}`}
            onClick={() => setModalOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-control bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
          >
            <Smartphone className="w-5 h-5" /> Envoyer par SMS
          </a>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-rule"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-2 text-[12px] text-text-faint uppercase tracking-wider font-semibold">
                Ou
              </span>
            </div>
          </div>

          <Button 
            variant="secondary" 
            block 
            onClick={handleValidate} 
            loading={loading}
            icon={<Check className="w-4 h-4" />}
          >
            J'ai appelé le parent (Valider manuellement)
          </Button>
        </div>
      </Modal>
    </>
  );
}
