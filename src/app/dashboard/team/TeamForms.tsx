"use client";

import { useState } from "react";
import TeamInviteForm from "./TeamInviteForm";
import TeamCreateForm from "./TeamCreateForm";

export default function TeamForms({ managers }: { managers: any[] }) {
  const [activeTab, setActiveTab] = useState<"invite" | "create">("create");

  return (
    <div className="sticky top-20 rounded-surface border border-rule bg-surface p-5 shadow-card">
      <div role="tablist" aria-label="Ajouter un collaborateur" className="mb-5 flex gap-1 rounded-control bg-sunk p-1">
        {([
          ["create", "Créer un compte"],
          ["invite", "Inviter par lien"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-control px-3 py-2 text-role-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              activeTab === key
                ? "bg-surface font-semibold text-text shadow-card"
                : "text-text-soft hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "create" ? (
        <div>
          <p className="mb-5 text-role-body leading-relaxed text-text-soft">
            Créez directement le compte d'un collaborateur pour qu'il puisse se connecter immédiatement.
          </p>
          <TeamCreateForm managers={managers} />
        </div>
      ) : (
        <div>
          <p className="mb-5 text-role-body leading-relaxed text-text-soft">
            Générez un lien d'invitation sécurisé, à copier et transmettre vous-même au collaborateur.
          </p>
          <TeamInviteForm managers={managers} />
        </div>
      )}
    </div>
  );
}
