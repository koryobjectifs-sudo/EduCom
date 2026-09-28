"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Trash2, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { annulerInvitation, renvoyerEmailInvitation } from "./equipe-actions";

/**
 * Lien d'invitation, affiché et copiable avec option d'envoi par e-mail et d'annulation.
 */
export default function InviteLink({ token, id }: { token: string; id?: string }) {
  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [envoiMail, demarrerMail] = useTransition();
  const path = `/invite?token=${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const annuler = () => {
    if (!id || !confirm("Voulez-vous vraiment annuler cette invitation ?")) return;
    demarrer(async () => {
      await annulerInvitation(id);
    });
  };

  const renvoyerMail = () => {
    if (!id) return;
    setEmailStatus(null);
    demarrerMail(async () => {
      const res = await renvoyerEmailInvitation(id);
      if (res.ok) {
        setEmailStatus("E-mail envoyé avec succès !");
        setTimeout(() => setEmailStatus(null), 4000);
      } else {
        setEmailStatus(res.error || "Échec de l'envoi de l'e-mail.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-control border border-rule bg-sunk px-2.5 py-1.5 text-role-meta text-text-soft">
          {path}
        </code>
        <Button
          variant="secondary"
          size="sm"
          onClick={copy}
          aria-label={copied ? "Lien copié" : "Copier le lien d'invitation"}
          icon={
            copied
              ? <Check aria-hidden="true" className="h-4 w-4 text-emerald-600" />
              : <Copy aria-hidden="true" className="h-4 w-4" />
          }
        >
          {copied ? "Copié !" : "Copier"}
        </Button>
        {id && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={renvoyerMail}
              disabled={envoiMail}
              icon={
                envoiMail
                  ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-primary" />
                  : <Mail aria-hidden="true" className="h-4 w-4 text-primary" />
              }
            >
              Envoyer par mail
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={annuler}
              disabled={enCours}
              aria-label="Annuler l'invitation"
              icon={<Trash2 aria-hidden="true" className="h-4 w-4 text-rose-500" />}
            />
          </>
        )}
      </div>
      {emailStatus && (
        <p className={`text-[12px] font-medium ${emailStatus.includes("succès") ? "text-emerald-600" : "text-amber-600"}`}>
          {emailStatus}
        </p>
      )}
      <p className="text-[11.5px] text-text-faint">
        Vous pouvez envoyer l&apos;e-mail directement ou lui transmettre le lien par WhatsApp ou SMS.
      </p>
    </div>
  );
}

