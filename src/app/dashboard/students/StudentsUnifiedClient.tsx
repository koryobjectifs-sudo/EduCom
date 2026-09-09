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
  History,
  Save,
  ArrowLeft,
  Users,
  FolderOpen,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import StudentListClient from "./StudentListClient";
import DossiersClient from "./dossiers/DossiersClient";
import { createClassInline } from "../classes/actions";
import { CYCLE_LABELS } from "@/lib/schoolDocumentLabels";

const CYCLES = [
  { id: "MATERNELLE", label: "Maternelle" },
  { id: "ELEMENTAIRE", label: "Élémentaire" },
  { id: "COLLEGE", label: "Collège" },
  { id: "LYCEE", label: "Lycée" },
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
  studentsData: any[];
  classesData: any[];
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

  const isCurrentYear = anneeActive === (annees[0] || "2026-2027");

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
      <div className="rounded-surface border border-rule bg-surface p-2.5 sm:p-3 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Gauche : Sélecteur de vue (Liste globale vs Par classe) */}
        <div className="flex items-center gap-1 p-0.5 rounded-control bg-sunk border border-rule self-start md:self-auto">
          <Link
            href={buildUrl({ view: "list", classId: null })}
            scroll={false}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-control transition-all ${
              currentView === "list"
                ? "bg-surface text-text shadow-xs font-bold"
                : "text-text-soft hover:text-text hover:bg-surface/50"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Liste globale</span>
          </Link>
          <Link
            href={buildUrl({ view: "classes", classId: null })}
            scroll={false}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-control transition-all ${
              currentView === "classes"
                ? "bg-surface text-text shadow-xs font-bold"
                : "text-text-soft hover:text-text hover:bg-surface/50"
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Par classe ({classesData.length})</span>
          </Link>
        </div>

        {/* Droite : Sélecteur d'année scolaire */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 text-role-meta font-bold text-text-soft uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Année :</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-control bg-sunk">
            {quickYears.map((a) => {
              const active = a === anneeActive;
              return (
                <Link
                  key={a}
                  href={buildUrl({ annee: a })}
                  scroll={false}
                  className={`relative px-2.5 py-1 text-xs font-semibold rounded-control transition-all ${
                    active
                      ? "bg-surface text-text shadow-xs border border-rule"
                      : "text-text-soft hover:text-text hover:bg-surface/50"
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
              className="h-7 pl-2 pr-6 text-xs font-semibold text-text bg-surface hover:bg-sunk border border-rule rounded-control cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            <div className="rounded-card border border-border bg-secondary/30 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-text-primary text-sm">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Année scolaire {anneeActive}
                </div>
                <div className="text-sm text-text-primary">
                  <span className="font-semibold">{activeCount} élève{activeCount > 1 ? "s" : ""} inscrit{activeCount > 1 ? "s" : ""}</span> pour {anneeActive}.{" "}
                  <span className="text-text-secondary">{prevCount.toLocaleString("fr-FR")} élèves étaient inscrits en {prevYear}.</span>
                </div>
              </div>
              <Link
                href={buildUrl({ annee: prevYear })}
                scroll={false}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-focus hover:underline self-start sm:self-auto shrink-0"
              >
                Voir les effectifs {prevYear} →
              </Link>
            </div>
          );
        }
        return null;
      })()}

      {/* ═══ 2. BARRE D'ACTIONS HERO ═══ */}
      <div className="rounded-surface border border-rule bg-surface p-2.5 sm:p-3 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        {/* Côté Gauche : Examen des admissions (Action clé) */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/students/dossiers/review"
            className="inline-flex h-8 items-center gap-1.5 rounded-control bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-900 px-3 text-xs font-bold shadow-2xs transition-all hover:shadow-xs group"
          >
            <UserCheck className="h-3.5 w-3.5 text-amber-700 group-hover:scale-110 transition-transform" />
            <span>Examen des admissions</span>
            {pendingCount > 0 ? (
              <span className="rounded-pill bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-extrabold shadow-2xs">
                {pendingCount}
              </span>
            ) : (
              <span className="rounded-pill bg-amber-200/70 text-amber-800 px-1.5 py-0.2 text-[9.5px] font-semibold">
                0
              </span>
            )}
          </Link>
        </div>

        {/* Côté Droit : Création, Cycles, Import/Export */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Import / Export */}
          <div className="flex items-center rounded-control bg-sunk border border-rule p-0.5">
            <Link
              href="/dashboard/students/import"
              className="inline-flex h-7 items-center gap-1 px-2.5 text-xs font-semibold text-text-soft hover:text-text hover:bg-surface rounded-control transition-colors"
              title="Importer une liste d'élèves"
            >
              <UploadCloud className="h-3.5 w-3.5 text-text-faint" />
              <span>Importer</span>
            </Link>
            <span className="w-px h-3.5 bg-rule" />
            <Link
              href="/dashboard/students/export"
              className="inline-flex h-7 items-center gap-1 px-2.5 text-xs font-semibold text-text-soft hover:text-text hover:bg-surface rounded-control transition-colors"
              title="Exporter le registre"
            >
              <Download className="h-3.5 w-3.5 text-text-faint" />
              <span>Exporter</span>
            </Link>
          </div>

          {/* Nouveau cycle (direction / secrétariat) */}
          {userRole !== "TEACHER" && (
            <button
              type="button"
              onClick={() => setIsAddingCycle(true)}
              className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-semibold text-text-soft hover:text-text bg-surface hover:bg-sunk border border-rule rounded-control shadow-2xs transition-colors cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-text-faint" />
              <span>Nouveau cycle</span>
            </button>
          )}

          {/* Nouvelle classe (direction / secrétariat) */}
          {userRole !== "TEACHER" && (
            <button
              type="button"
              onClick={() => setIsCreatingClass(true)}
              className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-semibold text-text-soft hover:text-text bg-surface hover:bg-sunk border border-rule rounded-control shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-text-faint" />
              <span>Nouvelle classe</span>
            </button>
          )}

          {/* Inscrire un élève */}
          <Link
            href="/dashboard/students/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-3 text-xs font-bold text-white shadow-2xs transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Inscrire un élève</span>
          </Link>
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
