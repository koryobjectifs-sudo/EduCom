"use client";

import { useState } from "react";
import { inviteTeamMember } from "./actions";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ROLE_LABELS, type RoleType } from "@/lib/permissions";

/** Mêmes rôles attribuables que pour la création directe de compte. */
const ASSIGNABLE: RoleType[] = ["TEACHER", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "ADMIN"];

export default function TeamInviteForm() {
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

      <Select label="Rôle / Permissions" name="role" id="role" required defaultValue="SECRETARY">
        {/* Options tirées de ROLE_LABELS : un rôle ajouté au système apparaît
            ici automatiquement, avec son libellé français. */}
        {ASSIGNABLE.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r].label} — {ROLE_LABELS[r].description}
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
          <p className="text-role-meta text-text-soft">
            Copiez ce lien et envoyez-le à votre collaborateur. Il pourra créer son mot de passe en cliquant dessus.
          </p>
        </div>
      )}

      <Button type="submit" block loading={loading}>
        Générer le lien magique
      </Button>
    </form>
  );
}
