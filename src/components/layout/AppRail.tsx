"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Globe,
  Shield,
  LogOut,
  ChevronUp,
  Camera,
  UploadCloud,
  Trash2,
  Loader2,
  Minus,
  Plus,
  LifeBuoy,
  Building2,
  UserPlus,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Receipt,
  Calendar,
  CreditCard,
  FileText,
  Settings,
  Users,
  MessageSquare,
} from "lucide-react";
import ModalSupportJira from "@/components/support/ModalSupportJira";
import { AppleDashboardIcon } from "@/components/ui/apple-icons";
import { type NavSpace } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";
import { updateUserAvatar } from "@/app/dashboard/actions";
import DevRoleSwitcher from "@/components/dev/DevRoleSwitcher";
import BoutonRailGuide from "./BoutonRailGuide";
import { useSidebarSlot } from "./SidebarSlot";
import { toast } from "sonner";
import RailHovercard, { type QuickLink } from "./RailHovercard";
import SlackTooltip from "@/components/ui/SlackTooltip";

function getSpaceHovercardMeta(spaceId: string) {
  switch (spaceId) {
    case "students":
      return {
        title: "Scolarité",
        description: "Registre officiel des élèves, gestion des effectifs et inscriptions scolaires.",
        quickLinks: [
          { label: "Registre des élèves", href: "/dashboard/students", icon: <Users className="h-3.5 w-3.5" /> },
          { label: "Inscrire un élève", href: "/dashboard/students/new", icon: <UserPlus className="h-3.5 w-3.5" /> },
          { label: "Importer via Excel", href: "/dashboard/students/import", icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
          { label: "Classes & Effectifs", href: "/dashboard/classes", icon: <Building2 className="h-3.5 w-3.5" /> },
        ],
      };
    case "pedagogy":
      return {
        title: "Pédagogie",
        description: "Saisie des notes, contrôles continus, compositions et bulletins officiels.",
        quickLinks: [
          { label: "Saisie des notes", href: "/dashboard/grades", icon: <BookOpen className="h-3.5 w-3.5" /> },
          { label: "Génération des bulletins", href: "/dashboard/grades/report-card", icon: <FileText className="h-3.5 w-3.5" /> },
          { label: "Validation des grilles", href: "/dashboard/grades/validation", icon: <Shield className="h-3.5 w-3.5" /> },
          { label: "Présences & Retards", href: "/dashboard/attendance", icon: <Users className="h-3.5 w-3.5" /> },
        ],
      };
    case "finance":
      return {
        title: "Finance & Écolages",
        description: "Suivi des encaissements, émission de reçus infalsifiables et relances familles.",
        quickLinks: [
          { label: "Cockpit financier", href: "/dashboard/payments", icon: <CreditCard className="h-3.5 w-3.5" /> },
          { label: "+ Nouvel encaissement", href: "/dashboard/payments/new", icon: <Receipt className="h-3.5 w-3.5" /> },
          { label: "Comptes familles", href: "/dashboard/payments/familles", icon: <Users className="h-3.5 w-3.5" /> },
          { label: "Tarifs & Frais", href: "/dashboard/settings/tarifs", icon: <Settings className="h-3.5 w-3.5" /> },
        ],
      };
    case "comms":
      return {
        title: "Communauté & Messagerie",
        description: "Canaux officiels de l'établissement et messages directs (DMs) avec l'équipe et les parents.",
        quickLinks: [
          { label: "Fil d'actualité", href: "/dashboard/communications/communaute", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { label: "Messages directs (DMs)", href: "/dashboard/communications/communaute?espace=DMS", icon: <Users className="h-3.5 w-3.5" /> },
          { label: "Canal #Général", href: "/dashboard/communications/communaute?espace=GENERAL", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { label: "Enquêtes & Sondages", href: "/dashboard/communications/communaute?espace=SONDAGES", icon: <Layers className="h-3.5 w-3.5" /> },
        ],
      };
    case "documents":
      return {
        title: "Documents & Actes",
        description: "Modèles officiels, certificats de scolarité et bibliothèque d'actes administratifs.",
        quickLinks: [
          { label: "Bibliothèque des documents", href: "/dashboard/documents", icon: <FileText className="h-3.5 w-3.5" /> },
          { label: "Modèles d'actes scolaires", href: "/dashboard/documents/templates", icon: <Layers className="h-3.5 w-3.5" /> },
          { label: "Brouillons en attente", href: "/dashboard/documents/drafts", icon: <FileText className="h-3.5 w-3.5" /> },
        ],
      };
    case "admin":
      return {
        title: "Admin Tools",
        description: "Outils d'administration, gestion des collaborateurs et configuration de l'école.",
        isAdminTools: true,
        quickLinks: [
          { label: "Paramètres de l'école", href: "/dashboard/settings", icon: <Settings className="h-3.5 w-3.5" /> },
          { label: "Gérer les membres (équipe)", href: "/dashboard/team", icon: <Users className="h-3.5 w-3.5" /> },
          { label: "Session scolaire active", href: "/dashboard/settings#session", icon: <Calendar className="h-3.5 w-3.5" /> },
          { label: "Rapports & Audit", href: "/dashboard/admin/reports", icon: <Layers className="h-3.5 w-3.5" /> },
        ],
      };
    default:
      return null;
  }
}

export interface AppRailProps {
  spaces: NavSpace[];
  schoolName: string;
  schoolLogo?: string | null;
  activeSpaceId?: string | null;
  userRole?: string;
  userName?: string;
  userAvatar?: string | null;
  guideVuAt?: Date | null;
}

export default function AppRail({
  spaces,
  schoolName,
  schoolLogo,
  activeSpaceId,
  userRole = "OWNER",
  userName,
  userAvatar,
  guideVuAt,
}: AppRailProps) {
  const { guideActif, setGuideActif } = useSidebarSlot();
  const initial = schoolName?.trim() ? schoolName.trim().charAt(0).toUpperCase() : "E";
  const isDashboardActive = !activeSpaceId && !guideActif;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [supportOuvert, setSupportOuvert] = useState(false);
  const [density, setDensity] = useState<string>("normal");
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(userAvatar || null);
  const [imageError, setImageError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (userAvatar !== undefined) {
      setCurrentAvatar(userAvatar);
      setImageError(false);
    }
  }, [userAvatar]);

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
          setImageError(false);
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
    setImageError(false);
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
      style={{ backgroundColor: "var(--color-rail-bg, #581C87)" }}
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
        <nav aria-label="Espaces de travail" className="flex flex-col items-center gap-0.5 w-full px-0.5">
          {/* 1. Tuile permanente Tableau de bord */}
          <RailHovercard
            id="accueil"
            title="Tableau de bord"
            description="Cockpit général de pilotage et indicateurs clés de votre établissement."
            quickLinks={[
              { label: "Vue cockpit générale", href: "/dashboard", icon: <AppleDashboardIcon className="h-3.5 w-3.5" /> },
              { label: "Rapports & Audit", href: "/dashboard/admin/reports", icon: <Layers className="h-3.5 w-3.5" /> },
            ]}
            onOpenGuide={() => setGuideActif(true)}
          >
            <Link
              href="/dashboard"
              data-tour="nav-accueil"
              onClick={() => setGuideActif(false)}
              aria-current={isDashboardActive ? "page" : undefined}
              className={[
                "relative group flex w-full min-h-[44px] flex-col items-center justify-center rounded-control py-1 px-0 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
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

              <AppleDashboardIcon
                aria-hidden="true"
                className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                  isDashboardActive ? "text-white" : "text-white/70 group-hover:text-white"
                }`}
              />

              <span
                className={`mt-0.5 text-[10.5px] font-medium leading-tight truncate max-w-[62px] text-center ${
                  isDashboardActive ? "text-white font-bold" : "text-white/70 group-hover:text-white"
                }`}
              >
                Accueil
              </span>
            </Link>
          </RailHovercard>

          {/* Bouton Stratégique Onboarding & Premiers pas */}
          <BoutonRailGuide userRole={userRole} guideVuAt={guideVuAt} />

          {/* Filet séparateur entre Accueil/Guide et les espaces métier */}
          <div className="h-[1px] w-8 bg-white/15 my-0.5" aria-hidden="true" />

          {/* 2. Les Espaces Métier */}
          {spaces.map((space) => {
            const Icon = getNavIcon(space.icon);
            const isActive = !guideActif && space.id === activeSpaceId;
            const meta = getSpaceHovercardMeta(space.id);

            const tile = (
              <Link
                key={space.id}
                href={space.defaultHref}
                data-tour={`nav-${space.id}`}
                onClick={() => setGuideActif(false)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative group flex w-full min-h-[44px] flex-col items-center justify-center rounded-control py-1 px-0 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
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
                  className={`mt-0.5 font-medium leading-tight truncate max-w-[64px] text-center ${
                    space.label.length > 11 ? "text-[10px] tracking-[-0.03em]" : "text-[10.5px] tracking-[-0.015em]"
                  } ${isActive ? "text-white font-bold" : "text-white/70 group-hover:text-white"}`}
                >
                  {space.label}
                </span>
              </Link>
            );

            if (meta) {
              return (
                <RailHovercard
                  key={space.id}
                  id={space.id}
                  title={meta.title}
                  description={meta.description}
                  quickLinks={meta.quickLinks}
                  isAdminTools={meta.isAdminTools}
                >
                  {tile}
                </RailHovercard>
              );
            }

            return tile;
          })}
        </nav>
      </div>

      {/* Bas du rail : Support EduCom, Site Public, Rôle test (dev) & Profil utilisateur */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1 pt-2 border-t border-white/15">
        {/* Support EduCom */}
        <SlackTooltip title="Support EduCom" tip="Assistance directe & signalement d'incident" placement="right">
          <button
            type="button"
            onClick={() => setSupportOuvert(true)}
            aria-label="Support EduCom"
            className="flex h-8 w-8 items-center justify-center rounded-control text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LifeBuoy className="h-4 w-4" />
          </button>
        </SlackTooltip>

        {/* Site Public */}
        <SlackTooltip title="Site public" tip="Portail public de l'établissement" placement="right">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Site public"
            className="flex h-8 w-8 items-center justify-center rounded-control text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Globe className="h-4 w-4" />
          </Link>
        </SlackTooltip>

        {/* Sélecteur de rôle test (développement uniquement) */}
        {process.env.NODE_ENV !== "production" && (
          <DevRoleSwitcher currentRole={userRole} variant="dashboard" />
        )}

        {/* Avatar Profil utilisateur & Menu */}
        <div className="relative" ref={profileRef}>
          <SlackTooltip
            title={displayName}
            tip={`Rôle : ${roleLabel} · Gérer le compte et les accès`}
            placement="right"
            disabled={profileMenuOpen}
          >
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-label={displayName}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors border border-white/25 overflow-hidden shadow-2xs shrink-0 ring-2 ring-white/10 hover:ring-white/30"
            >
              {currentAvatar && !imageError ? (
                <img
                  src={currentAvatar}
                  alt=""
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || "U"
              )}
            </button>
          </SlackTooltip>

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
                      {currentAvatar && !imageError ? (
                        <img
                          src={currentAvatar}
                          alt=""
                          onError={() => setImageError(true)}
                          className="h-full w-full object-cover"
                        />
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

              {/* Zoom d'affichage (- 100% +) */}
              <div className="border-b border-rule px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-text-muted">
                  Zoom
                </span>
                <div className="inline-flex items-center rounded-lg border border-rule bg-sunk/70 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (density === "comfort") handleSetDensity("normal");
                      else if (density === "normal") handleSetDensity("compact");
                    }}
                    disabled={density === "compact"}
                    title="Réduire"
                    aria-label="Réduire"
                    className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface hover:shadow-xs disabled:opacity-25 disabled:pointer-events-none text-text transition-all font-bold text-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDensity("normal")}
                    title="Réinitialiser à 100%"
                    className="px-2.5 text-xs font-bold text-text hover:text-primary transition-colors min-w-[46px] text-center select-none"
                  >
                    {density === "compact" ? "90%" : density === "comfort" ? "110%" : "100%"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (density === "compact") handleSetDensity("normal");
                      else if (density === "normal") handleSetDensity("comfort");
                    }}
                    disabled={density === "comfort"}
                    title="Agrandir"
                    aria-label="Agrandir"
                    className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface hover:shadow-xs disabled:opacity-25 disabled:pointer-events-none text-text transition-all font-bold text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
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
      <ModalSupportJira ouvert={supportOuvert} onFermer={() => setSupportOuvert(false)} />
    </aside>
  );
}
