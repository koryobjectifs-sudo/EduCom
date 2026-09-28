"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  List,
  FolderKanban,
  UserCheck,
  UploadCloud,
  Download,
  Plus,
  Layers,
  Calendar,
  Save,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import StudentListClient from "./StudentListClient";
import DossiersClient from "./dossiers/DossiersClient";
import { createClassInline } from "../classes/actions";

const CYCLES = [
  { id: "PRESCOLAIRE", label: "Maternelle" },
  { id: "ELEMENTAIRE", label: "Élémentaire" },
  { id: "MOYEN", label: "Collège" },
  { id: "SECONDAIRE", label: "Lycée" },
  { id: "AUTRE", label: "Autres" },
];

const HISTORICAL_YEAR_OPTIONS = [
  "2026-2027",
  "2025-2026",
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
  "2019-2020",
  "2018-2019",
  "2017-2018",
  "2016-2017",
  "2015-2016",
];

interface StudentsUnifiedClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studentsData: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classesData: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teachersData: any[];
  annees: string[];
  countsByYear?: Record<string, number>;
  anneeActive: string;
  userRole?: string;
  initialView?: "list" | "classes";
  initialClassId?: string | null;
}

export default function StudentsUnifiedClient({
  studentsData,
  classesData,
  teachersData,
  annees,
  countsByYear = {},
  anneeActive,
  userRole = "OWNER",
  initialView = "list",
  initialClassId = null,
}: StudentsUnifiedClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentView = (searchParams.get("view") as "list" | "classes") || initialView;
  const currentClassId = searchParams.get("classId") || initialClassId;

  // Modals state
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isAddingCycle, setIsAddingCycle] = useState(false);
  const [isAddingCustomYear, setIsAddingCustomYear] = useState(false);
  const [customYearInput, setCustomYearInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pendingCount = studentsData.filter((s) => s.status === "PENDING").length;

  // Calcul des cycles manquants
  const existingCycleIds = new Set(classesData.map((c) => c.cycle));
  const missingCycles = CYCLES.filter((c) => !existingCycleIds.has(c.id));

  // Options d'années
  const allYearOptions = useMemo(() => {
    const set = new Set([...annees, ...HISTORICAL_YEAR_OPTIONS]);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [annees]);

  const quickYears = useMemo(() => {
    return allYearOptions.slice(0, 3);
  }, [allYearOptions]);

  // Helper pour construire les URL préservant les searchParams
  const buildUrl = (params: Record<string, string | null | undefined>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, val]) => {
      if (val === null || val === undefined || val === "") {
        sp.delete(key);
      } else {
        sp.set(key, val);
      }
    });
    const query = sp.toString();
    return query ? `?${query}` : "/dashboard/students";
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createClassInline(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setIsCreatingClass(false);
        router.refresh();
      }
    });
  };

  const handleCustomYearSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customYearInput.trim()) return;
    const cleanYear = customYearInput.trim();
    setIsAddingCustomYear(false);
    router.push(buildUrl({ annee: cleanYear }));
  };

  return (
    <div className="space-y-4">
      {/* ═══ 1. BANDEAU NAVIGATION ANNÉE SCOLAIRE & ONGLET DE VUE ═══ */}
      <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 sm:p-3 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Gauche : Sélecteur de vue (Liste globale vs Par classe) */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/80 border border-slate-200/60 self-start md:self-auto">
          <Link
            href={buildUrl({ view: "list", classId: null })}
            scroll={false}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              currentView === "list"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <List className="h-3.5 w-3.5 text-slate-500" />
            <span>Liste globale</span>
          </Link>
          <Link
            href={buildUrl({ view: "classes", classId: null })}
            scroll={false}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              currentView === "classes"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5 text-slate-500" />
            <span>Par classe ({classesData.length})</span>
          </Link>
        </div>

        {/* Droite : Sélecteur d'année scolaire */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Année :</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-slate-100/80 border border-slate-200/60">
            {quickYears.map((a) => {
              const active = a === anneeActive;
              return (
                <Link
                  key={a}
                  href={buildUrl({ annee: a })}
                  scroll={false}
                  className={`relative px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    active
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/70 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span>{a}</span>
                  {active && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5 align-middle" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="relative inline-flex items-center">
            <select
              value={anneeActive}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setIsAddingCustomYear(true);
                } else {
                  router.push(buildUrl({ annee: e.target.value }));
                }
              }}
              className="h-7.5 pl-2.5 pr-6 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
              aria-label="Sélectionner une autre année scolaire"
            >
              <optgroup label="Archives scolaires">
                {allYearOptions.map((a) => (
                  <option key={a} value={a}>
                    {a} {a === anneeActive ? "✓" : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Autre période">
                <option value="custom">+ Saisir une année...</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* ═══ BANDEAU INFORMATIF DE TRANSITION D'ANNÉE ═══ */}
      {(() => {
        const parts = anneeActive.split("-").map(Number);
        const prevYear = parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])
          ? `${parts[0] - 1}-${parts[1] - 1}`
          : null;
        const activeCount = countsByYear[anneeActive] ?? studentsData.length;
        const prevCount = prevYear ? (countsByYear[prevYear] ?? 0) : 0;

        if (prevYear && prevCount > 0 && activeCount < prevCount) {
          return (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-900 text-sm">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Année scolaire {anneeActive}
                </div>
                <div className="text-sm text-slate-900">
                  <span className="font-semibold">{activeCount} élève{activeCount > 1 ? "s" : ""} inscrit{activeCount > 1 ? "s" : ""}</span> pour {anneeActive}.{" "}
                  <span className="text-slate-500">{prevCount.toLocaleString("fr-FR")} élèves étaient inscrits en {prevYear}.</span>
                </div>
              </div>
              <Link
                href={buildUrl({ annee: prevYear })}
                scroll={false}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline self-start sm:self-auto shrink-0"
              >
                Voir les effectifs {prevYear} →
              </Link>
            </div>
          );
        }
        return null;
      })()}

      {/* ═══ 2. BARRE D'ACTIONS HERO ═══ */}
      <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 sm:p-3 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        {/* Côté Gauche : Examen des admissions (Action clé) */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/students/dossiers/review"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 px-3 text-xs font-semibold shadow-2xs transition-all hover:shadow-xs group"
          >
            <UserCheck className="h-3.5 w-3.5 text-amber-700 group-hover:scale-105 transition-transform" />
            <span>Examen des admissions</span>
            {pendingCount > 0 ? (
              <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-extrabold shadow-2xs">
                {pendingCount}
              </span>
            ) : (
              <span className="rounded-full bg-amber-200/70 text-amber-800 px-1.5 py-0.2 text-[9.5px] font-semibold">
                0
              </span>
            )}
          </Link>
        </div>

        {/* Côté Droit : Création, Cycles, Import/Export */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Import / Export */}
          <div className="flex items-center rounded-lg bg-slate-100/80 border border-slate-200/60 p-0.5">
            <Link
              href="/dashboard/students/import"
              data-tour="student-import-link"
              className="inline-flex h-7.5 items-center gap-1 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
              title="Importer une liste d'élèves"
            >
              <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
              <span>Importer</span>
            </Link>
            <span className="w-px h-3.5 bg-slate-200" />
            <Link
              href="/dashboard/students/export"
              data-tour="student-export-link"
              className="inline-flex h-7.5 items-center gap-1 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
              title="Exporter le registre"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exporter</span>
            </Link>
          </div>

          {/* Nouveau cycle (direction / secrétariat) */}
          {userRole !== "TEACHER" && (
            <button
              type="button"
              data-tour="new-cycle-btn"
              onClick={() => setIsAddingCycle(true)}
              className="inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>Nouveau cycle</span>
            </button>
          )}

          {/* Nouvelle classe (direction / secrétariat) */}
          {userRole !== "TEACHER" && (
            <button
              type="button"
              data-tour="new-class-btn"
              onClick={() => setIsCreatingClass(true)}
              className="inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              <span>Nouvelle classe</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ 3. CONTENU PRINCIPAL SELON LA VUE ═══ */}
      {currentView === "classes" ? (
        <DossiersClient
          studentsData={studentsData}
          classesData={classesData}
          selectedClassId={currentClassId}
          onSelectClass={(id) => {
            router.push(buildUrl({ view: "classes", classId: id }), { scroll: false });
          }}
        />
      ) : (
        <StudentListClient
          students={studentsData}
          classesData={classesData}
          classesAssignables={classesData}
        />
      )}

      {/* Modal: Nouvelle classe */}
      <Modal
        open={isCreatingClass}
        onClose={() => setIsCreatingClass(false)}
        title="Nouvelle Classe"
        dismissible={!isPending}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <Input
            label="Nom de la classe"
            required
            type="text"
            name="name"
            id="name"
            placeholder="Ex: CP, CE1, 6ème A..."
          />

          <Select label="Cycle" name="cycle" id="cycle" required>
            {CYCLES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>

          <Select label="Professeur Principal" name="teacherId" id="teacherId">
            <option value="">Aucun professeur assigné</option>
            {teachersData.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </Select>

          {error && (
            <p className="text-xs text-rose-700 font-medium bg-rose-50 p-3 rounded-xl border border-rose-200">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsCreatingClass(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              loading={isPending}
              icon={<Save aria-hidden="true" className="w-4 h-4" />}
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Ajouter Cycle */}
      <Modal
        open={isAddingCycle}
        onClose={() => setIsAddingCycle(false)}
        title="Ajouter un cycle scolaire"
      >
        {missingCycles.length === 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Votre établissement a déjà ouvert des classes dans tous les cycles disponibles (Maternelle, Élémentaire, Collège, Lycée).
            </p>
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsAddingCycle(false)}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <form
            action={async (formData) => {
              setError(null);
              const cycleId = formData.get("cycleId") as string;
              if (!cycleId) return;
              startTransition(async () => {
                const { generateCycleClasses } = await import("../classes/actions");
                const res = await generateCycleClasses(cycleId);
                if (res.error) {
                  setError(res.error);
                } else {
                  setIsAddingCycle(false);
                  router.refresh();
                }
              });
            }}
            className="space-y-5"
          >
            <p className="text-xs text-slate-600">
              Ouvrez un nouveau cycle dans votre établissement. Les classes standards de ce cycle seront générées automatiquement.
            </p>
            <Select label="Sélectionnez le cycle à ouvrir" name="cycleId" required>
              {missingCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>

            {error && (
              <p className="text-xs text-rose-700 font-medium bg-rose-50 p-3 rounded-xl border border-rose-200">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsAddingCycle(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                loading={isPending}
                icon={<Plus aria-hidden="true" className="w-4 h-4" />}
              >
                Générer les classes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Digitaliser / Saisir une année scolaire antérieure */}
      <Modal
        open={isAddingCustomYear}
        onClose={() => setIsAddingCustomYear(false)}
        title="Digitaliser une année scolaire antérieure"
      >
        <form onSubmit={handleCustomYearSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Saisissez l&apos;année scolaire à ouvrir pour la numérisation ou la consultation d&apos;anciennes archives d&apos;élèves (ex: 2018-2019, 2015-2016).
          </p>
          <Input
            label="Format de l'année scolaire"
            placeholder="Ex: 2018-2019"
            value={customYearInput}
            onChange={(e) => setCustomYearInput(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsAddingCustomYear(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Ouvrir cette année
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
