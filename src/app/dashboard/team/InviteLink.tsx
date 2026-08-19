"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Lien d'invitation, affiché et copiable.
 *
 * ⚠️ L'écran Équipe affichait auparavant `educom.app/invite?token=…` — **un
 * domaine qui n'existe pas**. Un secrétaire qui recopiait cette adresse
 * envoyait au collaborateur un lien mort.
 *
 * Le chemin affiché est désormais celui de l'application (`/invite?token=…`), et
 * la copie reconstruit l'URL absolue depuis `window.location.origin` : elle est
 * donc juste en développement comme en production, sans domaine codé en dur.
 */
export default function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/invite?token=${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Le presse-papiers peut être refusé (contexte non sécurisé, permission) :
      // le chemin reste visible et sélectionnable à la main.
      setCopied(false);
    }
  };

  return (
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
            ? <Check aria-hidden="true" className="h-4 w-4" />
            : <Copy aria-hidden="true" className="h-4 w-4" />
        }
      />
    </div>
  );
}
