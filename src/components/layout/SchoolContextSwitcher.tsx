"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Building2, Loader2 } from "lucide-react";
import { type ActiveMembershipInfo } from "@/lib/schoolContext";
import { roleLabel } from "@/lib/permissions";
import { switchActiveSchool } from "@/app/dashboard/actions";
import { toast } from "sonner";

interface SchoolContextSwitcherProps {
  currentSchoolName?: string;
  currentSchoolId?: string;
  userRole?: string;
  memberships?: ActiveMembershipInfo[];
  variant?: "topbar" | "parent";
}

export default function SchoolContextSwitcher({
  currentSchoolName = "EduCom",
  currentSchoolId,
  userRole,
  memberships = [],
  variant = "topbar",
}: SchoolContextSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [loadingSchoolId, setLoadingSchoolId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // S'il n'y a qu'une seule école ou aucune liste : affichage simple sans menu
  const hasMultiple = memberships.length > 1;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!hasMultiple) {
    if (variant === "parent") {
      return (
        <div>
          <h1 className="text-xs font-bold text-text leading-tight">{currentSchoolName}</h1>
          <p className="text-[10.5px] text-text-soft font-medium">Espace Famille</p>
        </div>
      );
    }

    return (
      <span
        data-tronque-volontaire
        title={currentSchoolName}
        className="font-bold text-xs sm:text-sm text-white truncate max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]"
      >
        {currentSchoolName}
      </span>
    );
  }

  const handleSwitch = async (targetSchoolId: string) => {
    if (targetSchoolId === currentSchoolId || loadingSchoolId) return;

    setLoadingSchoolId(targetSchoolId);
    try {
      const res = await switchActiveSchool(targetSchoolId);
      if (res.success) {
        toast.success("Établissement activé.");
        window.location.href = res.targetPath || "/dashboard";
      } else {
        toast.error(res.error || "Impossible de changer d'établissement.");
        setLoadingSchoolId(null);
      }
    } catch {
      toast.error("Erreur de connexion.");
      setLoadingSchoolId(null);
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        title="Changer d'établissement actif"
        className={
          variant === "parent"
            ? "flex items-center gap-1.5 rounded-control px-1.5 py-1 text-left hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            : "flex items-center gap-1.5 rounded-control px-1.5 py-0.5 text-left text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        }
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              data-tronque-volontaire
              className={
                variant === "parent"
                  ? "text-xs font-bold text-text truncate max-w-[150px] sm:max-w-[200px]"
                  : "font-bold text-xs sm:text-sm text-white truncate max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]"
              }
            >
              {currentSchoolName}
            </span>
            <span
              className={
                variant === "parent"
                  ? "rounded-full bg-primary/10 px-1.5 py-0.2 text-[9.5px] font-semibold text-primary"
                  : "rounded-full bg-white/20 px-1.5 py-0.2 text-[9.5px] font-semibold text-white/90"
              }
            >
              {memberships.length}
            </span>
          </div>
          {variant === "parent" && (
            <p className="text-[10px] text-text-soft font-medium">Espace Famille • Changer d'école ▾</p>
          )}
        </div>
        <ChevronDown
          className={
            variant === "parent"
              ? "h-3.5 w-3.5 text-text-muted shrink-0 transition-transform " + (open ? "rotate-180" : "")
              : "h-3.5 w-3.5 text-white/70 shrink-0 transition-transform " + (open ? "rotate-180" : "")
          }
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Sélection de l'établissement"
          className="absolute left-0 top-full mt-1.5 w-72 rounded-surface border border-rule bg-surface p-1.5 shadow-overlay z-50 animate-in fade-in zoom-in-95 text-text"
        >
          <div className="px-2 py-1.5 border-b border-rule/60 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Vos établissements rattachés
            </p>
            <p className="text-xs text-text-muted">
              Sélectionnez l'établissement pour activer son espace et vos droits.
            </p>
          </div>

          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
            {memberships.map((m) => {
              const isActive = m.schoolId === currentSchoolId;
              const isLoading = loadingSchoolId === m.schoolId;

              return (
                <button
                  key={m.id}
                  type="button"
                  role="menuitem"
                  disabled={loadingSchoolId !== null}
                  onClick={() => handleSwitch(m.schoolId)}
                  className={`flex w-full items-center justify-between gap-2 rounded-control px-2.5 py-2 text-xs transition-colors text-left ${
                    isActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "hover:bg-sunk text-text"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                        isActive ? "bg-primary text-white" : "bg-black/5 text-text-muted"
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.school.name}</p>
                      <p className="text-[10px] text-text-muted">
                        Rôle : {roleLabel(m.role)}
                        {m.isPrimary && " • Principal"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : isActive ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
