"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { submitDocumentRequest } from "./actions";

/**
 * Demande d'un nouveau modèle de document.
 *
 * ⚠️ **Le message de confirmation était trompeur.** Il annonçait « Notre équipe
 * technique a bien reçu votre demande… Nous vous contacterons bientôt » — or
 * l'action écrit simplement une ligne dans `DocumentRequest` : personne n'est
 * notifié, aucun contact n'est pris. La demande est désormais décrite pour ce
 * qu'elle est : un besoin enregistré, visible dans la liste du hub.
 *
 * Le formulaire passe par les primitives du lot 04 : `htmlFor` lié, erreur
 * annoncée, `Modal` avec piège de focus et fermeture par Escape.
 */
export default function RequestDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Indiquez le nom du document souhaité.");
      return;
    }
    setSubmitting(true);
    const res = await submitDocumentRequest(name.trim(), description.trim());
    setSubmitting(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    close();
    setName("");
    setDescription("");
    toast.success("Besoin enregistré", {
      description: `« ${name.trim() }» apparaît maintenant dans les modèles demandés.`,
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        icon={<Plus aria-hidden="true" className="h-4 w-4" />}
      >
        Demander un modèle
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Demander un nouveau modèle"
        description="Décrivez le document qui vous manque. Le besoin est enregistré et reste visible dans la liste des modèles demandés."
        dismissible={!submitting}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submit} loading={submitting}>
              Enregistrer le besoin
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nom du document"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Ex : Attestation de réussite"
            error={error}
          />
          <Textarea
            label="À quoi doit-il servir ?"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quelles informations doit-il contenir, et dans quel cadre est-il demandé ?"
            hint="Facultatif, mais cela aide à cadrer le modèle."
          />
        </div>
      </Modal>
    </>
  );
}
