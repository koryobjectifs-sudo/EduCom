"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  UploadCloud,
  Settings,
  Users,
  BookOpen,
  CheckCircle2,
  Circle,
  ArrowRight,
  LifeBuoy,
  FileSpreadsheet,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getOnboardingConfig, SECTIONS_FORMATION, type EtapeMetier } from "@/lib/onboarding-metiers";
import { getOnboardingRealStatus, type OnboardingRealStatus } from "@/app/dashboard/aide/actions";
import { useSidebarSlot } from "./SidebarSlot";

interface GuideSidebarContentProps {
  userRole: string;
  collapsed: boolean;
}

export default function GuideSidebarContent({
  userRole,
  collapsed,
}: GuideSidebarContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTourDeclenche } = useSidebarSlot();
  const config = getOnboardingConfig(userRole);

  const sectionFormationActive = Object.values(SECTIONS_FORMATION).find(
    (s) => pathname === s.prefixPath || (pathname ? pathname.startsWith(s.prefixPath + "/") : false)
  );

  const [dbStatus, setDbStatus] = useState<OnboardingRealStatus | null>(null);
  const [tachesLocales, setTachesLocales] = useState<Record<string, boolean>>({});
  const [checklistRepliee, setChecklistRepliee] = useState(false);

  // Synchronisation des données réelles de la base
  const rafraichirStatut = useCallback(async () => {
    try {
      const res = await getOnboardingRealStatus();
      setDbStatus(res);
    } catch {
      // Ignorer
    }
  }, []);

  useEffect(() => {
    rafraichirStatut();
    // Rafraîchir lors du focus de fenêtre (si l'utilisateur a importé dans un autre onglet ou après navigation)
    window.addEventListener("focus", rafraichirStatut);
    return () => window.removeEventListener("focus", rafraichirStatut);
  }, [rafraichirStatut]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`educom_guide_checklist_${userRole}`);
      if (saved) {
        setTachesLocales(JSON.parse(saved));
      }
    } catch {
      // Ignorer
    }
  }, [userRole]);

  const estFait = (id: string): boolean => {
    if (dbStatus) {
      if (id === "settings") return dbStatus.schoolConfigured;
      if (id === "import") return dbStatus.studentsImported;
      if (id === "teachers") return dbStatus.teachersInvited;
      if (id === "staff") return dbStatus.staffInvited;
      if (dbStatus.completedStepIds.includes(id)) return true;
    }
    return Boolean(tachesLocales[id]);
  };

  const toggleTache = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTachesLocales((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`educom_guide_checklist_${userRole}`, JSON.stringify(next));
      } catch {
        // Ignorer
      }
      return next;
    });
  };

  const executerEtape = (etape: EtapeMetier) => {
    if (etape.selecteurSpotlight) {
      try {
        sessionStorage.setItem(
          "educom_active_step_spotlight",
          JSON.stringify({
            selecteur: etape.selecteurSpotlight,
            titre: etape.titreSpotlight || etape.titre,
            description: etape.descriptionSpotlight || etape.description,
          })
        );
        window.dispatchEvent(new CustomEvent("educom:step_spotlight_triggered"));
      } catch {
        // Ignorer
      }
    }
    router.push(etape.lien);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <button
          type="button"
          onClick={() => setTourDeclenche(true)}
          title="Lancer le tour guidé (2 min)"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-control bg-primary text-white shadow-2xs hover:bg-primary-hover transition-colors"
        >
          <Sparkles className="h-4 w-4" />
        </button>

        <Link
          href="/dashboard/students/import"
          title="Importer les élèves"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-slate-600 hover:bg-black/5 hover:text-slate-900 transition-colors"
        >
          <UploadCloud className="h-4 w-4" />
        </Link>

        <Link
          href="/dashboard/team"
          title="Mon équipe & Staff"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-slate-600 hover:bg-black/5 hover:text-slate-900 transition-colors"
        >
          <Users className="h-4 w-4" />
        </Link>

        <Link
          href="/dashboard/settings"
          title="Paramètres"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-slate-600 hover:bg-black/5 hover:text-slate-900 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </Link>

        <Link
          href="/dashboard/aide/guide"
          title="Guide illustré"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-slate-600 hover:bg-black/5 hover:text-slate-900 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const compteFaite = config.etapes.filter((etape) => estFait(etape.id)).length;
  const totalTaches = config.etapes.length;
  const pourcentage = Math.round((compteFaite / totalTaches) * 100);
  const toutEstPret = compteFaite === totalTaches;

  return (
    <div className="space-y-3.5 pb-4 select-none">
      {/* En-tête Guide & Progression */}
      <div className="px-2 pt-1 pb-2 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white shadow-2xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold text-slate-900 truncate">
              Guide & Premiers pas
            </h3>
            <p className="text-[10px] text-slate-500 truncate">
              Profil : <strong className="text-slate-700 font-semibold">{config.nomMetier}</strong>
            </p>
          </div>
        </div>

        {/* Jauge de progression checklist avec pourcentage réel */}
        <div className="mt-2.5 space-y-1">
          <div className="flex justify-between text-[9.5px] font-medium text-slate-500">
            <span>Setup initial</span>
            <span className="font-semibold text-slate-800">
              {compteFaite}/{totalTaches} fait ({pourcentage} %)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                toutEstPret ? "bg-emerald-600" : "bg-primary"
              }`}
              style={{ width: `${Math.max(8, pourcentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 1. Bouton Tour Guidé Express + Formation de page */}
      <div className="px-1 space-y-1.5">
        <button
          type="button"
          onClick={() => setTourDeclenche(true)}
          className="group relative flex w-full items-center gap-2.5 rounded-xl bg-[var(--color-frame-bg,#581C87)] px-3 py-2.5 text-left text-white shadow-md hover:bg-purple-900 active:scale-[0.98] transition-all cursor-pointer animate-pulse hover:animate-none border border-purple-400/40"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white text-sm shadow-xs">
            ⚡
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold leading-tight tracking-tight">Faire le tour guidé</p>
            <p className="text-[10px] text-purple-200 leading-tight mt-0.5">
              {userRole === "SECRETARY" ? "1 minute · 5 étapes" : "1 minute · 7 étapes"}
            </p>
          </div>
        </button>

        {sectionFormationActive && (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("educom:relancer_formation_page", {
                  detail: { sectionCle: sectionFormationActive.cle },
                })
              );
            }}
            className="group flex w-full items-center justify-between gap-2 rounded-xl border border-purple-200/90 bg-purple-50/70 hover:bg-purple-100/90 px-3 py-1.5 text-left text-purple-950 transition-all cursor-pointer shadow-2xs"
            title={`Relancer la découverte des boutons pour ${sectionFormationActive.titreModule}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold">
                🎯
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold leading-tight truncate">
                  Formation : {sectionFormationActive.titreModule}
                </p>
                <p className="text-[9px] text-purple-700 leading-tight">
                  {sectionFormationActive.etapes.length} boutons clés expliqués
                </p>
              </div>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-purple-700 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* TEMPS 4 : Célébration Waouh quand tout est prêt */}
      {toutEstPret && (
        <div className="mx-1 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-3 text-left space-y-2 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950">
                Votre école est prête ! 🎉
              </h4>
              <p className="text-[10px] text-emerald-800">
                Configuration essentielle validée.
              </p>
            </div>
          </div>
          <p className="text-[10.5px] leading-relaxed text-emerald-900">
            Vos enseignants peuvent saisir des notes et vos reçus sont prêts à être émis.
          </p>

          <button
            type="button"
            onClick={() => setChecklistRepliee(!checklistRepliee)}
            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 pt-0.5 transition-colors cursor-pointer"
          >
            <span>{checklistRepliee ? "Voir la checklist" : "Masquer la checklist"}</span>
            {checklistRepliee ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      )}

      {/* TEMPS 3 : Checklist des 4 étapes indispensables */}
      {(!toutEstPret || !checklistRepliee) && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between px-2 pb-0.5">
            <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
              Actions indispensables
            </h4>
            <span className="text-[9.5px] text-slate-400 font-medium">
              Vérification auto
            </span>
          </div>

          <div className="space-y-1">
            {config.etapes.map((etape) => {
              const faite = estFait(etape.id);

              return (
                <div
                  key={etape.id}
                  onClick={() => executerEtape(etape)}
                  className={`group relative flex flex-col gap-1.5 rounded-xl border p-2.5 transition-all cursor-pointer ${
                    faite
                      ? "border-emerald-200/60 bg-emerald-50/20 hover:bg-emerald-50/40"
                      : "border-purple-200/70 bg-white hover:border-purple-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={(e) => toggleTache(etape.id, e)}
                      title={faite ? "Étape validée en base" : "Cliquer pour marquer"}
                      className="mt-0.5 text-slate-400 shrink-0"
                    >
                      {faite ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-purple-300 group-hover:text-purple-600 transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs font-bold leading-tight truncate ${
                            faite ? "text-slate-600 line-through" : "text-slate-900"
                          }`}
                        >
                          {etape.titre}
                        </p>
                        {etape.badge && (
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold ${
                              faite
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {etape.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-500 leading-relaxed mt-1 line-clamp-2">
                        {etape.description}
                      </p>
                    </div>
                  </div>

                  {!faite && etape.boutonLabel && (
                    <div className="flex justify-end pt-1">
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--color-frame-bg,#581C87)] group-hover:translate-x-0.5 transition-transform">
                        <span>{etape.boutonLabel}</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raccourcis rapides */}
      <div className="space-y-0.5 pt-1">
        <h4 className="px-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
          Raccourcis directs
        </h4>

        {config.peutImporterEleves && (
          <Link
            href="/dashboard/students/import"
            className="group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">Importer vos données</span>
          </Link>
        )}

        {config.peutInviterEquipe && (
          <Link
            href="/dashboard/team"
            className="group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors"
          >
            <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">Inviter vos équipes (staff)</span>
          </Link>
        )}

        {(userRole === "OWNER" || userRole === "ADMIN") && (
          <Link
            href="/dashboard/settings"
            className="group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors"
          >
            <Settings className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="truncate">Paramètres de l&apos;école</span>
          </Link>
        )}
      </div>

      {/* Pour aller plus loin & Documentation */}
      <div className="space-y-0.5 pt-2 border-t border-slate-200/70">
        <h4 className="px-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
          {toutEstPret ? "Pour aller plus loin" : "Ressources & Aide"}
        </h4>

        {toutEstPret && (
          <>
            <Link
              href="/dashboard/grades/report-card"
              className="group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors"
            >
              <span className="text-xs">📄</span>
              <span className="truncate">Personnaliser les bulletins</span>
            </Link>
            <Link
              href="/dashboard/communications/communaute"
              className="group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors"
            >
              <span className="text-xs">💬</span>
              <span className="truncate">Activer la communauté & fil</span>
            </Link>
          </>
        )}

        <Link
          href="/dashboard/aide/guide"
          className="group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">Guide illustré complet</span>
        </Link>

        <Link
          href="/dashboard/aide"
          className="group flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors"
        >
          <LifeBuoy className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate">Centre d&apos;aide EduCom</span>
        </Link>
      </div>
    </div>
  );
}
