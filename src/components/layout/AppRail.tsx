"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Globe, Shield, LogOut, ChevronUp, Camera, UploadCloud, Trash2, Loader2 } from "lucide-react";
import { type NavSpace } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";
import { changeTestRole, updateUserAvatar } from "@/app/dashboard/actions";
import { toast } from "sonner";

export interface AppRailProps {
  spaces: NavSpace[];
  schoolName: string;
  schoolLogo?: string | null;
  activeSpaceId?: string | null;
  userRole?: string;
  userName?: string;
  userAvatar?: string | null;
}

const ALL_TEST_ROLES = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

export default function AppRail({
  spaces,
  schoolName,
  schoolLogo,
  activeSpaceId,
  userRole = "OWNER",
  userName,
  userAvatar,
}: AppRailProps) {
  const initial = schoolName?.trim() ? schoolName.trim().charAt(0).toUpperCase() : "E";
  const isDashboardActive = !activeSpaceId;

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [density, setDensity] = useState<string>("normal");
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(userAvatar || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (userAvatar !== undefined) {
      setCurrentAvatar(userAvatar);
    }
  }, [userAvatar]);

  const roleRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-density") || "normal";
    setDensity(current);
  }, []);

  const handleSetDensity = (newDensity: string) => {
    setDensity(newDensity);
    document.documentElement.setAttribute("data-density", newDensity);
    document.cookie = `educom_density=${newDensity}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = userName?.trim() || "Mon compte";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  const roleLabel = userRole.charAt(0) + userRole.slice(1).toLowerCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Plage élargie jusqu'à 10 Mo pour photos haute résolution
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La photo dépasse 10 Mo. Veuillez choisir une image plus légère.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          // Plage de résolution élargie à 640px pour une netteté parfaite
          const maxDim = 640;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL("image/jpeg", 0.90);

          setCurrentAvatar(base64);
          const res = await updateUserAvatar(base64);
          setIsUploadingAvatar(false);
          if (res.success) {
            toast.success("Photo de profil mise à jour et liée à l'organigramme !");
          } else {
            toast.error(res.error || "Erreur lors de la mise à jour.");
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingAvatar(false);
      toast.error("Erreur lors de la lecture du fichier.");
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setCurrentAvatar(null);
    const res = await updateUserAvatar(null);
    setIsUploadingAvatar(false);
    if (res.success) {
      toast.success("Photo de profil retirée.");
    } else {
      toast.error(res.error || "Erreur.");
    }
  };

  return (
    <aside
      aria-label="Espaces de travail"
      style={{ backgroundColor: "var(--color-rail-bg, #0E2541)" }}
      className="hidden w-[68px] shrink-0 flex-col items-center justify-between py-2 text-white md:flex print:hidden select-none z-30 transition-colors duration-200"
    >
      {/* Haut : Identité & Logo Établissement + Navigation */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Logo Établissement (Identité visuelle neutre) */}
        <div
          title={schoolName}
          aria-label={schoolName}
          className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-control bg-white p-0.5 shadow-2xs select-none"
        >
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center rounded bg-black/25 text-[10px] font-bold text-white"
            >
              {initial}
            </div>
          )}
        </div>

        {/* Séparateur discret */}
        <div className="h-[1px] w-8 bg-white/15" aria-hidden="true" />

        {/* Navigation : Tableau de bord en première position + Espaces métier */}
        <nav aria-label="Espaces de travail" className="flex flex-col items-center gap-0.5 w-full px-1">
          {/* 1. Tuile permanente Tableau de bord */}
          <Link
            href="/dashboard"
            aria-current={isDashboardActive ? "page" : undefined}
            title="Tableau de bord"
            className={[
              "relative group flex w-full min-h-[44px] flex-col items-center justify-center rounded-control py-1 px-1 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              isDashboardActive
                ? "bg-white/20 text-white shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {isDashboardActive && (
              <span
                aria-hidden="true"
                data-testid="rail-active-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[22px] w-[3px] rounded-r-full bg-[var(--color-rail-accent,#9C0F15)]"
              />
            )}

            <LayoutDashboard
              aria-hidden="true"
              className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                isDashboardActive ? "text-white" : "text-white/70 group-hover:text-white"
              }`}
              strokeWidth={isDashboardActive ? 2.2 : 1.8}
            />

            <span
              className={`mt-0.5 text-[10.5px] font-medium leading-tight truncate max-w-[62px] text-center ${
                isDashboardActive ? "text-white font-bold" : "text-white/70 group-hover:text-white"
              }`}
            >
              Accueil
            </span>
          </Link>

          {/* Filet séparateur entre Tableau de bord et les espaces métier */}
          <div className="h-[1px] w-8 bg-white/15 my-0.5" aria-hidden="true" />

          {/* 2. Les 5 Espaces Métier */}
          {spaces.map((space) => {
            const Icon = getNavIcon(space.icon);
            const isActive = space.id === activeSpaceId;

            return (
              <Link
                key={space.id}
                href={space.defaultHref}
                aria-current={isActive ? "page" : undefined}
                title={space.fullLabel ?? space.label}
                className={[
                  "relative group flex w-full min-h-[44px] flex-col items-center justify-center rounded-control py-1 px-1 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  isActive
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    data-testid="rail-active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[22px] w-[3px] rounded-r-full bg-[var(--color-rail-accent,#9C0F15)]"
                  />
                )}

                <Icon
                  aria-hidden="true"
                  className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-white" : "text-white/70 group-hover:text-white"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />

                <span
                  className={`mt-0.5 text-[10.5px] font-medium leading-tight truncate max-w-[62px] text-center ${
                    isActive ? "text-white font-bold" : "text-white/70 group-hover:text-white"
                  }`}
                >
                  {space.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bas du rail : Site Public, Rôle test (dev) & Profil utilisateur */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1 pt-2 border-t border-white/15">
        {/* Site Public */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="Site public"
          aria-label="Site public"
          className="flex h-8 w-8 items-center justify-center rounded-control text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Globe className="h-4 w-4" />
        </Link>

        {/* Sélecteur de rôle test (développement uniquement) */}
        {process.env.NODE_ENV !== "production" && (
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              aria-expanded={roleMenuOpen}
              title={`Rôle test : ${roleLabel}`}
              className="flex h-8 w-8 items-center justify-center rounded-control text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 transition-colors"
            >
              <Shield className="h-4 w-4" />
            </button>

            {roleMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-0 left-full ml-2 w-48 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay z-50 text-slate-800 animate-in fade-in zoom-in-95"
              >
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  Tester en tant que
                </p>
                {ALL_TEST_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setRoleMenuOpen(false);
                      await changeTestRole(r);
                      window.location.reload();
                    }}
                    className={`flex w-full items-center justify-between rounded-control px-2 py-1 text-xs transition-colors hover:bg-sunk ${
                      userRole === r ? "font-semibold text-primary" : "text-text"
                    }`}
                  >
                    <span>{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                    {userRole === r && <span className="text-[10px] text-primary">Actif</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avatar Profil utilisateur & Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-expanded={profileMenuOpen}
            title={displayName}
            aria-label={displayName}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors border border-white/25 overflow-hidden shadow-2xs shrink-0 ring-2 ring-white/10 hover:ring-white/30"
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials || "U"
            )}
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-0 left-full ml-2.5 w-72 overflow-hidden rounded-2xl border border-rule bg-surface shadow-overlay z-50 text-slate-800 animate-in fade-in zoom-in-95"
            >
              {/* En-tête profil interactif avec upload photo */}
              <div className="border-b border-rule p-3.5 bg-secondary/15">
                <div className="flex items-center gap-3.5">
                  <div className="relative group/avatar shrink-0">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-surface bg-surface shadow-md flex items-center justify-center">
                      {currentAvatar ? (
                        <img src={currentAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-text">{initials || "U"}</span>
                      )}
                    </div>
                    {/* Overlay photo survol */}
                    <label
                      title="Modifier la photo"
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="h-5 w-5 drop-shadow" />
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={isUploadingAvatar}
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-text leading-tight">{displayName}</p>
                    <p className="text-[10.5px] text-text-muted mt-0.5">{roleLabel}</p>
                    <div className="flex items-center gap-2.5 mt-2">
                      <label className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer font-medium">
                        {isUploadingAvatar ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5" />
                        )}
                        <span>{isUploadingAvatar ? "Envoi..." : currentAvatar ? "Changer" : "Ajouter"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={isUploadingAvatar}
                          onChange={handleAvatarUpload}
                        />
                      </label>

                      {currentAvatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="text-[11px] text-danger hover:underline"
                          title="Supprimer la photo"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Densité d'affichage */}
              <div className="border-b border-rule px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint mb-1.5">
                  Densité d'affichage
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "compact", label: "Compact" },
                    { id: "normal", label: "Normal" },
                    { id: "comfort", label: "Confort" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSetDensity(d.id)}
                      className={`rounded-control py-1 text-center text-[10.5px] transition-colors ${
                        density === d.id
                          ? "bg-primary/10 font-bold text-primary border border-primary/20"
                          : "hover:bg-sunk text-text-soft"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Déconnexion */}
              <div className="p-1.5">
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10"
                  >
                    <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
