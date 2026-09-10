"use client";

import { useState } from "react";
import { inviteTeamMember } from "./actions";
import { Copy, Check, MessageCircle, Mail, Smartphone, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ROLE_LABELS, type RoleType } from "@/lib/permissions";

const ASSIGNABLE: RoleType[] = ["TEACHER", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "ADMIN"];

export default function TeamAddForm({ managers, onSuccess }: { managers: any[], onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessLink(null);
    setCopied(false);

    const formData = new FormData(e.currentTarget);
    const res = await inviteTeamMember(formData);
    if (res.error) {
      setError(res.error);
    } else if (res.link) {
      setSuccessLink(res.link);
      e.currentTarget.reset();
      if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (successLink) {
      navigator.clipboard.writeText(successLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Adresse email"
        type="email"
        name="email"
        id="email"
        required
        placeholder="collegue@ecole.com"
      />

      <Select label="Rôle / Permissions" name="role" id="role" required defaultValue="TEACHER">
        {ASSIGNABLE.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r].label} — {ROLE_LABELS[r].description}
          </option>
        ))}
      </Select>

      <Select label="Responsable hiérarchique" id="managerId" name="managerId" defaultValue="">
        <option value="">Aucun responsable (au sommet)</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName} ({ROLE_LABELS[m.role as RoleType]?.label})
          </option>
        ))}
      </Select>

      {error && (
        <div className="rounded-control border border-danger/20 bg-danger/10 p-3 text-role-body font-medium text-danger">
          {error}
        </div>
      )}

      {successLink && (
        <div className="space-y-3 rounded-control border border-success/20 bg-success/10 p-4">
          <p className="text-role-body font-medium text-success">
            Invitation générée avec succès !
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              aria-label="Lien d'invitation généré"
              value={successLink} 
              className="min-w-0 flex-1 rounded-control border border-rule bg-surface px-3 py-1.5 text-role-meta text-text-soft focus:outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={copyToClipboard}
              aria-label={copied ? "Lien copié" : "Copier le lien d'invitation"}
              title="Copier le lien"
              icon={copied
                ? <Check aria-hidden="true" className="w-4 h-4" />
                : <Copy aria-hidden="true" className="w-4 h-4" />}
            />
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Bonjour, voici votre lien pour rejoindre l'espace EduCom de notre établissement : ${successLink}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-control bg-[#25D366] px-2 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#128C7E] shadow-sm"
              title="Envoyer par WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <a
              href={`sms:?&body=${encodeURIComponent(`Bonjour, voici votre lien pour rejoindre l'espace EduCom de notre établissement : ${successLink}`)}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-control bg-blue-500 px-2 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-blue-600 shadow-sm"
              title="Envoyer par SMS"
            >
              <Smartphone className="w-3.5 h-3.5" /> SMS
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent("Invitation à rejoindre EduCom")}&body=${encodeURIComponent(`Bonjour,\n\nVoici votre lien pour rejoindre l'espace EduCom de notre établissement :\n${successLink}`)}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-control bg-slate-700 px-2 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800 shadow-sm"
              title="Envoyer par Email"
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </a>
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        block 
        loading={loading}
        icon={<Wand2 className="w-4 h-4" />}
      >
        Générer le lien d&apos;invitation
      </Button>
    </form>
  );
}
