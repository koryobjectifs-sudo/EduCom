"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Trash2,
  Search,
  BookOpen,
  ArrowLeft,
  Baby,
  Backpack,
  School,
  GraduationCap,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserPlus,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  deleteClass,
  assignTeacherDirectly,
  assignSubjectTeacher,
  assignTeacherBulk,
} from "./actions";
import { deduceCycleAndSerie } from "../students/import/utils";

export interface ClassSubjectAssignment {
  subjectId: string;
  subjectName: string;
  coefficient?: number;
  assignedTeacherId: string | null;
  assignedTeacherName: string | null;
}

export interface ClassItem {
  id: string;
  name: string;
  cycle: string;
  teacherId?: string | null;
  teacher?: { id: string; firstName: string; lastName: string } | null;
  _count?: { enrollments: number; grades?: number };
  subjects?: ClassSubjectAssignment[];
}

export interface TeacherItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  assignedClassCount: number;
  highLoadWarning: boolean;
  subjectIdsTaught: string[];
}

interface ClassListClientProps {
  classes: ClassItem[];
  teachers: TeacherItem[];
  allSubjects?: { id: string; name: string }[];
  searchTerm: string;
  initialFilter?: "unassigned" | "all";
  selectedCycleParam?: string | null;
  activeYear?: string;
  totalUnassignedSubjects?: number;
}

export const CYCLES_CONFIG = [
  { id: "PRESCOLAIRE", label: "Maternelle", icon: Baby, desc: "Petite, Moyenne, Grande Section" },
  { id: "ELEMENTAIRE", label: "Élémentaire", icon: Backpack, desc: "CI, CP, CE1, CE2, CM1, CM2" },
  { id: "MOYEN", label: "Collège", icon: School, desc: "6ème, 5ème, 4ème, 3ème" },
  { id: "SECONDAIRE", label: "Lycée", icon: GraduationCap, desc: "Seconde, Première, Terminale" },
  { id: "AUTRE", label: "Autres", icon: FolderOpen, desc: "Classes non catégorisées" },
];

export function normalizeCycleId(c?: string | null): string {
  if (!c) return "AUTRE";
  const up = c.toUpperCase();
  if (up === "COLLEGE" || up === "MOYEN") return "MOYEN";
  if (up === "LYCEE" || up === "SECONDAIRE") return "SECONDAIRE";
  if (up === "MATERNELLE" || up === "PRESCOLAIRE") return "PRESCOLAIRE";
  if (up === "ELEMENTAIRE") return "ELEMENTAIRE";
  return up;
}

export function resolveClassCycle(c: { cycle?: string | null; name: string }): string {
  const norm = normalizeCycleId(c.cycle);
  if (norm !== "AUTRE") return norm;
  const deduced = deduceCycleAndSerie(c.name).cycle;
  return normalizeCycleId(deduced);
}

export function getCycleInfo(cycleId?: string | null, className?: string) {
  let resolvedId = cycleId ? normalizeCycleId(cycleId) : "AUTRE";
  if (resolvedId === "AUTRE" && className) {
    resolvedId = resolveClassCycle({ cycle: cycleId, name: className });
  }
  return CYCLES_CONFIG.find((cy) => cy.id === resolvedId) || CYCLES_CONFIG[4];
}

export default function ClassListClient({
  classes,
  teachers,
  allSubjects = [],
  searchTerm: externalSearchTerm,
  initialFilter = "all",
  selectedCycleParam = null,
  activeYear = "2026-2027",
  totalUnassignedSubjects = 0,
}: ClassListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("filter") === "unassigned" ? "unassigned" : initialFilter;
  const selectedCycle = searchParams.get("cycle") || selectedCycleParam;

  const [internalSearch, setInternalSearch] = useState("");
  const searchTerm = externalSearchTerm || internalSearch;

  // Mode d'affichage principal : Vue par classe vs Vue par enseignant (Affectation en masse)
  const [mainViewMode, setMainViewMode] = useState<"classes" | "bulk_teachers">("classes");

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dépliage des matières par classe
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // Modale de désignation du Professeur Principal (avec enseignement de matière)
  const [ppModalClass, setPpModalClass] = useState<ClassItem | null>(null);
  const [ppSelectedTeacherId, setPpSelectedTeacherId] = useState("");
  const [ppTeachSubjectId, setPpTeachSubjectId] = useState("");
  const [isAssigningPp, setIsAssigningPp] = useState(false);

  // État de modification d'enseignant par matière inline
  const [busySubjectKey, setBusySubjectKey] = useState<string | null>(null);

  // État pour la Vue par Enseignant (Affectation en masse)
  const [bulkTeacherId, setBulkTeacherId] = useState<string>("");
  const [bulkSubjectId, setBulkSubjectId] = useState<string>("");
  const [bulkSelectedClassIds, setBulkSelectedClassIds] = useState<string[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Cycles présents dans l'école
  const presentCycles = useMemo(() => {
    return CYCLES_CONFIG.filter((cy) => classes.some((c) => resolveClassCycle(c) === cy.id));
  }, [classes]);

  // Classes sans titulaire (tous cycles confondus)
  const unassignedClasses = useMemo(() => {
    return classes.filter((c) => !c.teacherId && !c.teacher);
  }, [classes]);

  // Navigation vers cycle via searchParams
  const handleSelectCycle = (cycleId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cycleId) {
      params.set("cycle", cycleId);
      params.delete("filter");
    } else {
      params.delete("cycle");
    }
    router.push(`/dashboard/classes?${params.toString()}`, { scroll: false });
  };

  // Bascule de tab (Tous les cycles / Sans titulaire)
  const handleTabChange = (tab: "all" | "unassigned") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "unassigned") {
      params.set("filter", "unassigned");
      params.delete("cycle");
    } else {
      params.delete("filter");
    }
    router.push(`/dashboard/classes?${params.toString()}`, { scroll: false });
  };

  // Classes filtrées selon le cycle et la recherche
  const currentCycleClasses = useMemo(() => {
    const normSelected = selectedCycle ? normalizeCycleId(selectedCycle) : null;
    let list = normSelected
      ? classes.filter((c) => resolveClassCycle(c) === normSelected)
      : classes;

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.teacher && `${c.teacher.firstName} ${c.teacher.lastName}`.toLowerCase().includes(q))
      );
    }
    return list;
  }, [classes, selectedCycle, searchTerm]);

  // Ouvrir la modale PP
  const openPpModal = (c: ClassItem) => {
    setPpModalClass(c);
    setPpSelectedTeacherId(c.teacherId || "");
    setPpTeachSubjectId("");
    setError(null);
    setWarningMsg(null);
  };

  // Confirmer l'affectation du titulaire / PP
  const confirmAssignPp = () => {
    if (!ppModalClass || !ppSelectedTeacherId) return;
    setIsAssigningPp(true);
    setError(null);
    setWarningMsg(null);

    startTransition(async () => {
      const res = await assignTeacherDirectly(
        ppModalClass.id,
        ppSelectedTeacherId,
        ppTeachSubjectId || null
      );
      setIsAssigningPp(false);
      if (res.error) {
        setError(res.error);
      } else {
        if (res.warning) {
          setWarningMsg(res.warning);
        }
        setSuccessMsg("Professeur principal désigné avec succès.");
        setPpModalClass(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        router.refresh();
      }
    });
  };

  // Affecter un enseignant à une matière précise d'une classe
  const handleAssignSubjectTeacher = (classId: string, subjectId: string, teacherId: string) => {
    const key = `${classId}|${subjectId}`;
    setBusySubjectKey(key);
    setError(null);
    setWarningMsg(null);

    startTransition(async () => {
      const res = await assignSubjectTeacher(classId, subjectId, teacherId || null);
      setBusySubjectKey(null);
      if (res.error) {
        setError(res.error);
      } else {
        if (res.warning) {
          setWarningMsg(res.warning);
        }
        setSuccessMsg("Affectation de matière enregistrée.");
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      }
    });
  };

  // Basculer l'affichage des matières pour une classe
  const toggleExpand = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  // Gestion de la sélection d'enseignant dans la vue en masse
  const handleBulkTeacherChange = (teacherId: string) => {
    setBulkTeacherId(teacherId);
    if (!teacherId) {
      setBulkSelectedClassIds([]);
      return;
    }
    // Si un sujet est déjà sélectionné, pré-cocher les classes correspondantes
    if (bulkSubjectId) {
      updateBulkCheckedClasses(teacherId, bulkSubjectId);
    }
  };

  // Gestion du sujet dans la vue en masse
  const handleBulkSubjectChange = (subjectId: string) => {
    setBulkSubjectId(subjectId);
    if (bulkTeacherId) {
      updateBulkCheckedClasses(bulkTeacherId, subjectId);
    }
  };

  const updateBulkCheckedClasses = (tId: string, sId: string) => {
    const matched = classes
      .filter((c) => {
        if (!sId) {
          return c.teacherId === tId;
        }
        return c.subjects?.some((cs) => cs.subjectId === sId && cs.assignedTeacherId === tId);
      })
      .map((c) => c.id);
    setBulkSelectedClassIds(matched);
  };

  const toggleBulkClassCheck = (classId: string) => {
    setBulkSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const submitBulkAssignment = () => {
    if (!bulkTeacherId) {
      setError("Veuillez choisir un enseignant.");
      return;
    }
    setIsBulkSaving(true);
    setError(null);
    setWarningMsg(null);

    startTransition(async () => {
      const res = await assignTeacherBulk(
        bulkTeacherId,
        bulkSubjectId || null,
        bulkSelectedClassIds
      );
      setIsBulkSaving(false);
      if (res.error) {
        setError(res.error);
      } else {
        if (res.warning) {
          setWarningMsg(res.warning);
        }
        setSuccessMsg(
          `Affectation en masse réussie : ${bulkSelectedClassIds.length} classe(s) mise(s) à jour.`
        );
        setTimeout(() => setSuccessMsg(null), 4000);
        router.refresh();
      }
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setClassToDelete(id);
  };

  const confirmDelete = async () => {
    if (!classToDelete) return;
    setIsDeleting(classToDelete);
    const res = await deleteClass(classToDelete);
    if (res.error) {
      setError(res.error);
    }
    setIsDeleting(null);
    setClassToDelete(null);
    router.refresh();
  };

  const selectedCycleInfo = selectedCycle ? getCycleInfo(selectedCycle) : undefined;
  const currentBulkTeacher = teachers.find((t) => t.id === bulkTeacherId);

  return (
    <div className="space-y-6">
      {/* ── NOTIFICATIONS STATUS ── */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-control bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {warningMsg && (
        <div className="flex items-center gap-2 rounded-control bg-amber-50 p-3 text-xs font-semibold text-amber-900 border border-amber-200 animate-in fade-in">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{warningMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-control bg-danger/10 p-3 text-xs font-semibold text-danger border border-danger/20 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── BANNIÈRE D'ALERTE EN TÊTE (Classes sans titulaire & Matières sans enseignant) ── */}
      {(unassignedClasses.length > 0 || totalUnassignedSubjects > 0) && (
        <div className="rounded-surface bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-amber-500/20 text-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Affectations incomplètes
                </h4>
                <p className="text-sm font-semibold text-amber-900 mt-0.5">
                  <span className={unassignedClasses.length > 0 ? "text-amber-950 underline font-bold" : ""}>
                    {unassignedClasses.length} classe{unassignedClasses.length > 1 ? "s" : ""} sans titulaire
                  </span>
                  {" · "}
                  <span className={totalUnassignedSubjects > 0 ? "text-amber-950 underline font-bold" : ""}>
                    {totalUnassignedSubjects} matière{totalUnassignedSubjects > 1 ? "s" : ""} sans enseignant
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMainViewMode(mainViewMode === "classes" ? "bulk_teachers" : "classes")}
                className="inline-flex items-center gap-1.5 rounded-control bg-white border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50 transition-colors shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                <span>
                  {mainViewMode === "classes" ? "Affectation en masse par enseignant" : "Revenir à la vue par classe"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BASCULE DE VUE PRINCIPALE (VUE PAR CLASSE vs VUE PAR ENSEIGNANT) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMainViewMode("classes")}
            className={`inline-flex items-center gap-2 rounded-control px-3.5 py-1.5 text-xs font-semibold transition-all ${
              mainViewMode === "classes"
                ? "bg-primary text-white shadow-2xs"
                : "bg-surface border border-rule text-text-soft hover:bg-sunk hover:text-text"
            }`}
          >
            <School className="h-3.5 w-3.5" />
            <span>Vue par classe</span>
          </button>

          <button
            type="button"
            onClick={() => setMainViewMode("bulk_teachers")}
            className={`inline-flex items-center gap-2 rounded-control px-3.5 py-1.5 text-xs font-semibold transition-all ${
              mainViewMode === "bulk_teachers"
                ? "bg-primary text-white shadow-2xs"
                : "bg-surface border border-rule text-text-soft hover:bg-sunk hover:text-text"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Vue par enseignant (Affectation en masse)</span>
          </button>
        </div>

        {mainViewMode === "classes" && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
            <Input
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="Rechercher une classe..."
              inputClassName="pl-8 h-8 text-xs rounded-control"
            />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VUE 1 : VUE PAR CLASSE (Titulaires + Matières détaillées avec filtres)
          ══════════════════════════════════════════════════════════════════════ */}
      {mainViewMode === "classes" && (
        <div className="space-y-6">
          {/* Onglets de filtrage (Tous les cycles / Sans titulaire) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab !== "unassigned"
                  ? "bg-sunk font-bold text-text"
                  : "text-text-soft hover:text-text"
              }`}
            >
              <span>Toutes les classes ({classes.length})</span>
            </button>

            {unassignedClasses.length > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange("unassigned")}
                className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                  activeTab === "unassigned"
                    ? "bg-amber-100 text-amber-950 font-bold"
                    : "text-amber-800 hover:text-amber-950"
                }`}
              >
                <AlertCircle className="h-3 w-3 text-amber-600" />
                <span>Sans titulaire ({unassignedClasses.length})</span>
              </button>
            )}
          </div>

          {/* NIVEAU 1 : AFFICHAGE DES CYCLES (si aucun cycle sélectionné et pas de recherche) */}
          {activeTab === "all" && !selectedCycle && !searchTerm && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-text-faint">
                  Cycles de l&apos;établissement ({presentCycles.length})
                </p>
                <p className="text-role-meta text-text-soft">
                  Cliquez sur un cycle pour afficher et gérer ses classes
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {presentCycles.map((cycle) => {
                  const cycleClasses = classes.filter((c) => resolveClassCycle(c) === cycle.id);
                  const totalStudents = cycleClasses.reduce(
                    (acc, c) => acc + (c._count?.enrollments || 0),
                    0
                  );
                  const cycleUnassigned = cycleClasses.filter((c) => !c.teacherId && !c.teacher).length;
                  const Icon = cycle.icon;

                  return (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => handleSelectCycle(cycle.id)}
                      className="group flex flex-col justify-between rounded-surface border border-rule bg-surface p-4 text-left shadow-card transition-all hover:border-primary/50 hover:shadow-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="type-card-title text-text group-hover:text-primary transition-colors truncate">
                              {cycle.label}
                            </h3>
                            <p className="text-role-meta text-text-faint truncate mt-0.5">
                              {cycle.desc}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 shrink-0 text-text-faint group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between w-full text-xs">
                        <span className="font-semibold text-text">
                          {cycleClasses.length} classe{cycleClasses.length > 1 ? "s" : ""} · {totalStudents} élève{totalStudents > 1 ? "s" : ""}
                        </span>
                        {cycleUnassigned > 0 ? (
                          <span className="text-role-meta font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-pill">
                            {cycleUnassigned} sans titulaire
                          </span>
                        ) : (
                          <span className="text-role-meta font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-pill">
                            Titulaires complets
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NIVEAU 2 : CLASSES DU CYCLE SÉLECTIONNÉ OU RECHERCHE OU ONGLET SANS TITULAIRE */}
          {(selectedCycle || searchTerm || activeTab === "unassigned") && (
            <div className="space-y-4">
              {activeTab !== "unassigned" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-sunk/60 rounded-surface p-3 border border-rule">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleSelectCycle(null)}
                      className="inline-flex items-center gap-1.5 rounded-control bg-surface border border-rule px-2.5 py-1 text-xs font-semibold text-text hover:bg-sunk transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Tous les cycles</span>
                    </button>

                    <span className="text-text-faint">/</span>

                    <h3 className="type-section-title text-text truncate">
                      {selectedCycleInfo ? selectedCycleInfo.label : "Recherche"}
                    </h3>

                    <span className="shrink-0 rounded-pill bg-surface border border-rule px-2 py-0.5 text-role-meta font-bold text-text-soft">
                      {currentCycleClasses.length} classe{currentCycleClasses.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {selectedCycleInfo && (
                    <span className="text-role-meta text-text-soft">{selectedCycleInfo.desc}</span>
                  )}
                </div>
              )}

              {/* Grille des cartes de classes avec gestion des matières */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {currentCycleClasses.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      icon={BookOpen}
                      title="Aucune classe trouvée"
                      description="Modifiez vos critères de recherche ou ajoutez une classe."
                      action={{
                        label: "Retourner aux cycles",
                        onClick: () => handleSelectCycle(null),
                      }}
                    />
                  </div>
                ) : (
                  currentCycleClasses.map((c) => {
                    const cycleInfo = getCycleInfo(c.cycle, c.name);
                    const Icon = cycleInfo.icon;
                    const count = c._count?.enrollments || 0;
                    const subjects = c.subjects || [];
                    const isExpanded = expandedClasses[c.id] ?? false;
                    const isSecondaryOrMoyen = ["MOYEN", "SECONDAIRE"].includes(normalizeCycleId(c.cycle));

                    return (
                      <div
                        key={c.id}
                        className="rounded-surface border border-rule bg-surface p-4 shadow-card hover:border-primary/40 transition-colors flex flex-col justify-between"
                      >
                        {/* En-tête de la carte */}
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft">
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <Link
                                  href={`/dashboard/classes/${c.id}`}
                                  className="text-sm font-bold text-text hover:text-primary transition-colors truncate block"
                                >
                                  {c.name}
                                </Link>
                                <span className="text-[11px] text-text-muted">
                                  {cycleInfo.label} · {count} élève{count > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Supprimer ${c.name}`}
                              onClick={(e) => handleDeleteClick(e, c.id)}
                              loading={isDeleting === c.id}
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                              className="text-text-faint hover:text-danger h-7 w-7 p-0 shrink-0"
                            />
                          </div>

                          {/* PROFESSEUR PRINCIPAL */}
                          <div className="mt-3.5 rounded-control bg-sunk/60 border border-rule/80 p-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-text-faint">
                                Professeur Principal
                              </span>
                              <div className="text-xs font-semibold text-text truncate mt-0.5">
                                {c.teacher ? (
                                  <span className="text-emerald-800">
                                    {c.teacher.firstName} {c.teacher.lastName}
                                  </span>
                                ) : (
                                  <span className="text-amber-800 font-medium italic">
                                    Non assigné
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => openPpModal(c)}
                              className="shrink-0 rounded-control bg-surface border border-rule px-2.5 py-1 text-[11px] font-semibold text-text hover:bg-sunk transition-colors shadow-2xs"
                            >
                              {c.teacher ? "Changer" : "Désigner"}
                            </button>
                          </div>

                          {/* MATIÈRES & ENSEIGNANTS (Secondaire / Moyen & classes avec matières) */}
                          <div className="mt-3 pt-2.5 border-t border-rule">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-text-soft flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-text-faint" />
                                <span>Matières ({subjects.length})</span>
                              </span>

                              {subjects.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(c.id)}
                                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                                >
                                  <span>{isExpanded ? "Réduire" : "Gérer les matières"}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>

                            {subjects.length === 0 ? (
                              <p className="text-[11px] text-text-faint italic">
                                Aucune matière configurée pour cette classe.
                              </p>
                            ) : !isExpanded && !isSecondaryOrMoyen ? (
                              <div className="flex flex-wrap gap-1 text-[11px] text-text-soft">
                                {subjects.slice(0, 4).map((s) => (
                                  <span
                                    key={s.subjectId}
                                    className="rounded-pill bg-sunk px-2 py-0.5 text-[10.5px]"
                                  >
                                    {s.subjectName}
                                  </span>
                                ))}
                                {subjects.length > 4 && (
                                  <span className="rounded-pill bg-sunk px-2 py-0.5 text-[10.5px] text-text-faint">
                                    +{subjects.length - 4} autres
                                  </span>
                                )}
                              </div>
                            ) : (
                              /* Liste détaillée des matières avec sélecteur filtré */
                              <div className="space-y-1.5 mt-2">
                                {subjects.map((s) => {
                                  const key = `${c.id}|${s.subjectId}`;
                                  const isBusy = busySubjectKey === key;

                                  // Filtre des enseignants recommandés (ceux qui enseignent déjà cette matière ailleurs)
                                  const recommendedTeachers = teachers.filter((t) =>
                                    t.subjectIdsTaught.includes(s.subjectId)
                                  );
                                  const otherTeachers = teachers.filter(
                                    (t) => !t.subjectIdsTaught.includes(s.subjectId)
                                  );

                                  return (
                                    <div
                                      key={s.subjectId}
                                      className="flex items-center justify-between gap-2 rounded-control bg-sunk/40 px-2.5 py-1.5 text-xs border border-rule/60"
                                    >
                                      <span className="font-medium text-text min-w-0 truncate flex-1">
                                        {s.subjectName}
                                      </span>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {isBusy ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                        ) : (
                                          <select
                                            value={s.assignedTeacherId || ""}
                                            onChange={(e) =>
                                              handleAssignSubjectTeacher(c.id, s.subjectId, e.target.value)
                                            }
                                            className={`rounded-control border px-2 py-1 text-[11px] font-medium outline-none transition-colors ${
                                              s.assignedTeacherId
                                                ? "border-rule bg-surface text-text"
                                                : "border-amber-300 bg-amber-50 text-amber-900 font-bold"
                                            }`}
                                          >
                                            <option value="">Non affecté</option>
                                            {recommendedTeachers.length > 0 && (
                                              <optgroup label="⭐ Enseignants de la matière (recommandés)">
                                                {recommendedTeachers.map((t) => (
                                                  <option key={t.id} value={t.id}>
                                                    {t.firstName} {t.lastName} ({t.assignedClassCount} cl.)
                                                    {t.highLoadWarning ? " ⚠️ > 8 classes" : ""}
                                                  </option>
                                                ))}
                                              </optgroup>
                                            )}
                                            <optgroup label="Autres enseignants">
                                              {otherTeachers.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                  {t.firstName} {t.lastName} ({t.assignedClassCount} cl.)
                                                  {t.highLoadWarning ? " ⚠️ > 8 classes" : ""}
                                                </option>
                                              ))}
                                            </optgroup>
                                          </select>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-xs">
                          <Link
                            href={`/dashboard/classes/${c.id}`}
                            className="font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            <span>Détails & liste des élèves</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VUE 2 : VUE PAR ENSEIGNANT (AFFECTATION EN MASSE EN MOINS D'UNE MINUTE)
          ══════════════════════════════════════════════════════════════════════ */}
      {mainViewMode === "bulk_teachers" && (
        <div className="space-y-6">
          <div className="rounded-surface bg-surface border border-rule p-5 shadow-card space-y-4">
            <div className="border-b border-rule pb-3">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Affectation en masse par enseignant</span>
              </h3>
              <p className="text-xs text-text-soft mt-1">
                Recrutement en cours d&apos;année ou rentrée scolaire : choisissez un enseignant, sa matière et cochez toutes ses classes en quelques secondes.
              </p>
            </div>

            {/* ÉTAPE 1 : Choix de l'enseignant et de la matière */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-soft uppercase tracking-wider mb-1.5">
                  1. Enseignant
                </label>
                <select
                  value={bulkTeacherId}
                  onChange={(e) => handleBulkTeacherChange(e.target.value)}
                  className="w-full border border-rule rounded-control px-3 py-2 text-xs bg-surface text-text focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Sélectionner un enseignant...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.assignedClassCount} classes actuelles)
                      {t.highLoadWarning ? " ⚠️ charge élevée (> 8)" : ""}
                    </option>
                  ))}
                </select>

                {currentBulkTeacher?.highLoadWarning && (
                  <p className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-control px-2 py-1 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                    Attention : cet enseignant est déjà affecté à {currentBulkTeacher.assignedClassCount} classes.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-soft uppercase tracking-wider mb-1.5">
                  2. Matière à affecter
                </label>
                <select
                  value={bulkSubjectId}
                  onChange={(e) => handleBulkSubjectChange(e.target.value)}
                  className="w-full border border-rule rounded-control px-3 py-2 text-xs bg-surface text-text focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Toutes les matières (Maître unique)</option>
                  {allSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ÉTAPE 2 : Sélection des classes par case à cocher */}
            {bulkTeacherId && (
              <div className="pt-3 border-t border-rule space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-text uppercase tracking-wider">
                    3. Cochez les classes d&apos;intervention ({bulkSelectedClassIds.length} sélectionnée{bulkSelectedClassIds.length > 1 ? "s" : ""})
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setBulkSelectedClassIds(classes.map((c) => c.id))}
                      className="text-primary hover:underline font-medium"
                    >
                      Tout cocher
                    </button>
                    <span className="text-text-faint">·</span>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedClassIds([])}
                      className="text-text-soft hover:underline font-medium"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto p-1">
                  {classes.map((c) => {
                    const isChecked = bulkSelectedClassIds.includes(c.id);
                    const cycleInfo = getCycleInfo(c.cycle, c.name);

                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 rounded-control p-2.5 border cursor-pointer transition-all ${
                          isChecked
                            ? "border-primary bg-primary/5 text-text shadow-2xs"
                            : "border-rule bg-surface hover:bg-sunk text-text-soft"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBulkClassCheck(c.id)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary border-rule"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-text truncate">
                            {c.name}
                          </span>
                          <span className="block text-[10px] text-text-muted">
                            {cycleInfo.label} · {c._count?.enrollments || 0} élèves
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Bouton d'action final */}
                <div className="pt-3 border-t border-rule flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    loading={isBulkSaving}
                    disabled={isBulkSaving || !bulkTeacherId}
                    onClick={submitBulkAssignment}
                    icon={<Check className="h-4 w-4" />}
                  >
                    Valider l&apos;affectation ({bulkSelectedClassIds.length} classe{bulkSelectedClassIds.length > 1 ? "s" : ""})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODALE : DÉSIGNATION DU PROFESSEUR PRINCIPAL (AVEC CHOIX DE SA MATIÈRE) ── */}
      <Modal
        open={ppModalClass !== null}
        onClose={() => setPpModalClass(null)}
        title={`Professeur Principal · ${ppModalClass?.name}`}
        size="md"
        dismissible={!isAssigningPp}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPpModalClass(null)}
              disabled={isAssigningPp}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={confirmAssignPp}
              loading={isAssigningPp}
              disabled={isAssigningPp || !ppSelectedTeacherId}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-text-soft">
            Le professeur principal coordonne le conseil de classe et le suivi des élèves.
          </p>

          <div>
            <label className="block text-xs font-bold text-text mb-1">
              Choisir l&apos;enseignant
            </label>
            <select
              value={ppSelectedTeacherId}
              onChange={(e) => setPpSelectedTeacherId(e.target.value)}
              className="w-full border border-rule rounded-control px-3 py-2 text-xs bg-surface text-text focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Sélectionner...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.assignedClassCount} classes)
                  {t.highLoadWarning ? " ⚠️ > 8 classes" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Précision 1 : Au secondaire, proposer d'affecter aussi à sa matière sans l'imposer */}
          <div className="rounded-control bg-sunk/60 border border-rule p-3 space-y-2">
            <label className="block text-xs font-bold text-text">
              Enseigne-t-il également une matière dans cette classe ?
            </label>
            <p className="text-[11px] text-text-soft">
              Au secondaire, le professeur principal enseigne généralement sa propre matière. Choisissez sa matière pour l&apos;affecter automatiquement, ou laissez vide s&apos;il est coordinateur uniquement.
            </p>
            <select
              value={ppTeachSubjectId}
              onChange={(e) => setPpTeachSubjectId(e.target.value)}
              className="w-full border border-rule rounded-control px-2.5 py-1.5 text-xs bg-surface text-text outline-none"
            >
              <option value="">Coordinateur uniquement (aucune matière)</option>
              {ppModalClass?.subjects?.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── MODALE : SUPPRESSION DE CLASSE ── */}
      <Modal
        open={classToDelete !== null}
        onClose={() => setClassToDelete(null)}
        title="Supprimer la classe ?"
        size="sm"
        dismissible={isDeleting === null}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setClassToDelete(null)}
              disabled={isDeleting !== null}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={isDeleting === classToDelete}
              disabled={isDeleting !== null}
            >
              Supprimer
            </Button>
          </>
        }
      >
        Êtes-vous sûr de vouloir supprimer cette classe ? Cette action est irréversible.
      </Modal>
    </div>
  );
}
