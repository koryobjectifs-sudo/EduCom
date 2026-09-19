"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, RotateCcw, Check, ExternalLink } from "lucide-react";
import { changeTestRole } from "@/app/actions/dev";

const ALL_TEST_ROLES = [
  { role: "ADMIN", label: "Administrateur" },
  { role: "TEACHER", label: "Enseignant" },
  { role: "PARENT", label: "Parent d'élève" },
  { role: "ACCOUNTANT", label: "Comptable" },
  { role: "SECRETARY", label: "Secrétariat" },
];

export interface DevRoleSwitcherProps {
  currentRole: string;
  variant?: "dashboard" | "famille";
}

export default function DevRoleSwitcher({
  currentRole,
  variant = "famille",
}: DevRoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const handleRoleChange = async (role: string) => {
    setIsPending(true);
    setIsOpen(false);
    try {
      const res = await changeTestRole(role);
      if (res.success && res.targetPath) {
        window.location.href = res.targetPath;
      } else {
        window.location.href = role === "PARENT" ? "/famille" : "/dashboard";
      }
    } catch {
      window.location.href = "/api/dev/reset-role?role=" + role;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {variant === "famille" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          aria-expanded={isOpen}
          title={`Mode Test (DEV) : Rôle actuel ${currentRole}`}
          className="flex h-8 items-center gap-1.5 px-2.5 rounded-control text-amber-900 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors text-xs font-semibold shadow-2xs"
        >
          <Shield className="h-3.5 w-3.5 text-amber-700 shrink-0" />
          <span className="hidden sm:inline">Rôle : {currentRole}</span>
          <span className="sm:hidden text-[10px]">{currentRole.slice(0, 3)}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          aria-expanded={isOpen}
          title={`Rôle test (DEV) : ${currentRole}`}
          className="flex h-8 w-8 items-center justify-center rounded-control text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 transition-colors"
        >
          <Shield className="h-4 w-4" />
        </button>
      )}

      {isOpen && (
        <div
          role="menu"
          className={`absolute ${
            variant === "famille" ? "right-0 mt-2" : "bottom-0 left-full ml-2"
          } w-56 overflow-hidden rounded-surface border border-rule bg-surface p-1.5 shadow-overlay z-50 text-text animate-in fade-in zoom-in-95`}
        >
          <div className="px-2 py-1.5 border-b border-rule/60 mb-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Mode Test (DEV)
              </p>
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                NON-PROD
              </span>
            </div>
            <p className="text-xs font-semibold text-text mt-0.5">Tester en tant que :</p>
          </div>

          <div className="space-y-0.5 max-h-60 overflow-y-auto py-0.5">
            {ALL_TEST_ROLES.map(({ role, label }) => {
              const isActive = currentRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  onClick={() => handleRoleChange(role)}
                  className={`flex w-full items-center justify-between rounded-control px-2 py-1.5 text-xs transition-colors hover:bg-sunk ${
                    isActive ? "font-bold text-primary bg-primary/10" : "text-text"
                  }`}
                >
                  <div className="text-left">
                    <div>{label}</div>
                    <div className="text-[10px] text-text-muted font-mono">{role}</div>
                  </div>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 mt-1 border-t border-rule/60">
            <button
              type="button"
              onClick={() => handleRoleChange("ADMIN")}
              className="flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100/60 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
              <span>Rétablir rôle ADMIN réel</span>
            </button>
            <a
              href="/api/dev/reset-role?role=ADMIN"
              className="mt-1 flex items-center justify-between px-2 py-1 text-[10px] text-text-muted hover:text-text hover:underline"
              title="URL d'échappement autonome"
            >
              <span>Lien direct d'échappement</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
