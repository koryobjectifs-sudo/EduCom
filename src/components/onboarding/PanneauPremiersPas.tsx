"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  UserPlus,
  FileSpreadsheet,
  BookOpen,
  LifeBuoy,
} from "lucide-react";
import { getOnboardingConfig } from "@/lib/onboarding-metiers";
import WalkthroughInteractif from "./WalkthroughInteractif";

interface PanneauPremiersPasProps {
  role: string;
  ouvert: boolean;
  onFermer: () => void;
  guideVu?: boolean;
}

export default function PanneauPremiersPas({
  role,
  ouvert,
  onFermer,
  guideVu = false,
}: PanneauPremiersPasProps) {
  const router = useRouter();
  const [tourOuvert, setTourOuvert] = useState(false);
  const [tachesFaite, setTachesFaite] = useState<Record<string, boolean>>({});
  const config = getOnboardingConfig(role);

  if (!ouvert) return null;

  const toggleTache = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTachesFaite((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const navEtFermer = (lien: string) => {
    onFermer();
    router.push(lien);
  };

  const totalTaches = config.etapes.length;
  const compteFaite = Object.values(tachesFaite).filter(Boolean).length;

  return (
    <>
      {/* Overlay translucide d'arrière-plan */}
      <div
        onClick={onFermer}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-150"
      />

      {/* Volet latéral coulissant (Slide-over) façon Notion / Stripe */}
      <aside
        aria-label="Premières choses à faire"
        className="fixed top-0 bottom-0 left-0 md:left-[68px] z-40 w-full max-w-sm sm:max-w-md bg-white border-r border-slate-200/90 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-250 select-none"
      >
        {/* En-tête du volet */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Premiers pas · {config.nomMetier}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {config.slogan}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer le panneau"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Mini-jauge de progression */}
          <div className="mt-3.5 space-y-1">
            <div className="flex justify-between text-[10.5px] font-medium text-slate-500">
              <span>Progression d&apos;accueil</span>
              <span>
                {compteFaite}/{totalTaches} étapes
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(15, (compteFaite / totalTaches) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Corps : Liste des premières choses à faire */}
        <div className="flex-1 p-5 space-y-4">
          {/* Carte 1 : Tour guidé express en 2 minutes (Highlight) */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                  ⚡
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  Faites le tour en 2 minutes
                </h4>
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9.5px] font-bold text-primary">
                Recommandé
              </span>
            </div>

            <p className="text-[11.5px] leading-relaxed text-slate-600">
              Découvrez les écrans clés de votre métier sans chercher dans les menus.
            </p>

            <button
              type="button"
              onClick={() => setTourOuvert(true)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-[0.99] transition-all"
            >
              <span>Lancer le tour guidé</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Carte 2 : Checklist des étapes métier (inspirée de la maquette "Set up Notetaker") */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Actions prioritaires
            </p>

            <div className="divide-y divide-slate-100">
              {config.etapes.map((etape) => {
                const faite = !!tachesFaite[etape.id];

                return (
                  <div
                    key={etape.id}
                    onClick={() => navEtFermer(etape.lien)}
                    className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleTache(etape.id, e)}
                      title={faite ? "Marquer non fait" : "Marquer comme fait"}
                      className="mt-0.5 text-slate-400 hover:text-primary transition-colors shrink-0"
                    >
                      {faite ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 group-hover:text-slate-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold truncate ${
                            faite ? "line-through text-slate-400" : "text-slate-800"
                          }`}
                        >
                          {etape.titre}
                        </span>
                        {etape.badge && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 shrink-0">
                            {etape.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                        {etape.description}
                      </p>
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pied de panneau : Inviter l'équipe + Guide complet */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2">
          {config.peutInviterEquipe && (
            <Link
              href="/dashboard/team"
              onClick={onFermer}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 hover:bg-slate-100/80 shadow-2xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span>Inviter vos équipes</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          )}

          {config.peutImporterEleves && (
            <Link
              href="/dashboard/students/import"
              onClick={onFermer}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 hover:bg-slate-100/80 shadow-2xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Importer les documents & élèves</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          )}

          <Link
            href="/dashboard/aide/guide"
            onClick={onFermer}
            className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-primary hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Consulter le guide complet avec captures</span>
          </Link>
        </div>
      </aside>

      {/* Modal du Tour interactif si déclenché */}
      <WalkthroughInteractif
        role={role}
        ouvert={tourOuvert}
        onFermer={() => setTourOuvert(false)}
      />
    </>
  );
}
