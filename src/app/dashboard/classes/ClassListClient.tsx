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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteClass, assignTeacherDirectly } from "./actions";

export interface ClassItem {
  id: string;
  name: string;
  cycle: string;
  teacherId?: string | null;
  teacher?: { id: string; firstName: string; lastName: string } | null;
  _count?: { enrollments: number; grades?: number };
}

export interface TeacherItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}

interface ClassListClientProps {
  classes: ClassItem[];
  teachers: TeacherItem[];
  searchTerm: string;
  initialFilter?: "unassigned" | "all";
  selectedCycleParam?: string | null;
  activeYear?: string;
}

const CYCLES_CONFIG = [
  { id: "MATERNELLE", label: "Maternelle", icon: Baby, desc: "Petite, Moyenne, Grande Section" },
  { id: "ELEMENTAIRE", label: "Élémentaire", icon: Backpack, desc: "CI, CP, CE1, CE2, CM1, CM2" },
  { id: "COLLEGE", label: "Collège", icon: School, desc: "6ème, 5ème, 4ème, 3ème" },
  { id: "LYCEE", label: "Lycée", icon: GraduationCap, desc: "Seconde, Première, Terminale" },
  { id: "AUTRE", label: "Autres", icon: FolderOpen, desc: "Classes non catégorisées" },
];

export default function ClassListClient({
  classes,
  teachers,
  searchTerm: externalSearchTerm,
  initialFilter = "all",
  selectedCycleParam = null,
  activeYear = "2026-2027",
}: ClassListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("filter") === "unassigned" ? "unassigned" : initialFilter;
  const selectedCycle = searchParams.get("cycle") || selectedCycleParam;

  const [internalSearch, setInternalSearch] = useState("");
  const searchTerm = externalSearchTerm || internalSearch;

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Affectation rapide inline de titulaire
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, string>>({});
  const [assigningClassId, setAssigningClassId] = useState<string | null>(null);

  // Cycles présents dans l'école
  const presentCycles = useMemo(() => {
    return CYCLES_CONFIG.filter((cy) => classes.some((c) => c.cycle === cy.id));
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
    let list = selectedCycle ? classes.filter((c) => c.cycle === selectedCycle) : classes;

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

  // Affecter un titulaire
  const handleAssignTeacher = (classId: string) => {
    const teacherId = selectedTeachers[classId];
    if (!teacherId) return;

    setAssigningClassId(classId);
    setError(null);

    startTransition(async () => {
      const res = await assignTeacherDirectly(classId, teacherId);
      setAssigningClassId(null);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg("Enseignant titulaire affecté avec succès.");
        setTimeout(() => setSuccessMsg(null), 3000);
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

  const selectedCycleInfo = CYCLES_CONFIG.find((c) => c.id === selectedCycle);

  return (
    <div className="space-y-6">
      {/* ── NOTIFICATIONS STATUS ── */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-control bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-control bg-danger/10 p-3 text-xs font-semibold text-danger border border-danger/20">
          <AlertCircle className="h-4 w-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── ONGLETS DE FILTRAGE PRINCIPAUX ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`inline-flex items-center gap-2 rounded-control px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab !== "unassigned"
                ? "bg-primary text-white shadow-2xs"
                : "bg-surface border border-rule text-text-soft hover:bg-sunk hover:text-text"
            }`}
          >
            <School className="h-3.5 w-3.5" />
            <span>Tous les cycles & classes</span>
            <span
              className={`rounded-pill px-1.5 py-0.2 text-[10.5px] font-bold ${
                activeTab !== "unassigned" ? "bg-white/20 text-white" : "bg-sunk text-text-soft"
              }`}
            >
              {classes.length}
            </span>
          </button>

          {unassignedClasses.length > 0 && (
            <button
              type="button"
              onClick={() => handleTabChange("unassigned")}
              className={`inline-flex items-center gap-2 rounded-control px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "unassigned"
                  ? "bg-amber-100 text-amber-900 ring-2 ring-amber-400/40 shadow-2xs font-bold"
                  : "bg-surface border border-rule text-text-soft hover:bg-sunk hover:text-text"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Classes sans titulaire</span>
              <span className="rounded-pill bg-amber-200/80 px-1.5 py-0.2 text-[10.5px] font-bold text-amber-900">
                {unassignedClasses.length}
              </span>
            </button>
          )}
        </div>

        {/* Recherche locale */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <Input
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder="Rechercher une classe..."
            inputClassName="pl-8 h-8 text-xs rounded-control"
          />
        </div>
      </div>

      {/* ── VUE 1 : FOCUS TRANSVERSAL CLASSES SANS TITULAIRE ── */}
      {activeTab === "unassigned" && (
        <div className="space-y-4">
          <div className="rounded-surface bg-amber-50/70 border border-amber-200/80 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>
                    {unassignedClasses.length} classe{unassignedClasses.length > 1 ? "s" : ""} sans enseignant titulaire
                  </span>
                </h3>
                <p className="text-role-meta text-amber-800/90">
                  Désignez un titulaire pour chaque classe pour activer la saisie des notes et le suivi pédagogique.
                </p>
              </div>

              {teachers.length === 0 && (
                <Link
                  href="/dashboard/team"
                  className="inline-flex items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover text-white px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Inviter des enseignants</span>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {unassignedClasses.map((c) => {
              const cycleInfo = CYCLES_CONFIG.find((cy) => cy.id === c.cycle) || CYCLES_CONFIG[4];
              const Icon = cycleInfo.icon;
              const count = c._count?.enrollments || 0;
              const isAssigning = assigningClassId === c.id;
              const currentSelectVal = selectedTeachers[c.id] || "";

              return (
                <div
                  key={c.id}
                  className="flex flex-col justify-between rounded-surface border border-rule bg-surface p-4 shadow-card hover:border-amber-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-amber-50 text-amber-700 border border-amber-200">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-xs font-bold text-text">{c.name}</h4>
                          <p className="truncate text-role-meta text-text-soft">
                            {cycleInfo.label} · {count} élève{count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 whitespace-nowrap inline-flex items-center rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        Sans titulaire
                      </span>
                    </div>

                    {/* Sélecteur de titulaire */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-semibold text-text-soft">
                        Désigner l&apos;enseignant titulaire :
                      </label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={currentSelectVal}
                          onChange={(e) =>
                            setSelectedTeachers((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          className="h-8 text-xs rounded-control"
                        >
                          <option value="">Sélectionner un enseignant...</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.firstName} {t.lastName}
                            </option>
                          ))}
                        </Select>

                        <button
                          type="button"
                          onClick={() => handleAssignTeacher(c.id)}
                          disabled={!currentSelectVal || isAssigning}
                          className="inline-flex items-center gap-1 rounded-control bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-all disabled:opacity-40 whitespace-nowrap"
                        >
                          {isAssigning ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          <span>Affecter</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VUE 2 : NAVIGATION HIÉRARCHIQUE (NIVEAU 1 = CYCLES, NIVEAU 2 = CLASSES DU CYCLE) ── */}
      {activeTab === "all" && (
        <div className="space-y-6">
          {/* NIVEAU 1 : AFFICHAGE DES CYCLES SEULEMENT (quand aucun cycle sélectionné et pas de recherche textuelle) */}
          {!selectedCycle && !searchTerm && (
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
                  const cycleClasses = classes.filter((c) => c.cycle === cycle.id);
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
                          {cycleClasses.length} classe{cycleClasses.length > 1 ? "s" : ""} · {totalStudents} élève{totalStudents > 1 ? "s" : ""} ({activeYear})
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

          {/* NIVEAU 2 : CLASSES DU CYCLE SÉLECTIONNÉ (ou résultat de recherche) */}
          {(selectedCycle || searchTerm) && (
            <div className="space-y-4">
              {/* Barre de retour et titre du cycle */}
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
                  <span className="text-role-meta text-text-soft">
                    {selectedCycleInfo.desc}
                  </span>
                )}
              </div>

              {/* Grille des classes */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {currentCycleClasses.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      icon={BookOpen}
                      title="Aucune classe dans ce cycle"
                      description="Ajoutez une classe à ce cycle ou retournez à la liste globale."
                      action={{
                        label: "Retourner aux cycles",
                        onClick: () => handleSelectCycle(null),
                      }}
                    />
                  </div>
                ) : (
                  currentCycleClasses.map((c) => {
                    const cycleInfo = CYCLES_CONFIG.find((cy) => cy.id === c.cycle) || CYCLES_CONFIG[4];
                    const Icon = cycleInfo.icon;
                    const count = c._count?.enrollments || 0;

                    return (
                      <div
                        key={c.id}
                        className="group flex items-center justify-between rounded-surface border border-rule bg-surface p-3.5 shadow-card transition-colors hover:border-primary/40 gap-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft group-hover:text-primary transition-colors">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <Link
                                href={`/dashboard/classes/${c.id}`}
                                title={c.name}
                                className="truncate min-w-0 text-xs font-bold text-text hover:text-primary transition-colors"
                              >
                                {c.name}
                              </Link>
                              <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-text-soft bg-sunk px-1.5 py-0.2 rounded-control">
                                {count} élève{count > 1 ? "s" : ""} ({activeYear})
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-text-soft mt-0.5">
                              {c.teacher ? (
                                <span className="text-emerald-700 font-medium">
                                  {c.teacher.firstName} {c.teacher.lastName}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTabChange("unassigned")}
                                  className="text-amber-700 hover:underline font-medium"
                                >
                                  Assigner titulaire
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Supprimer la classe ${c.name}`}
                          onClick={(e) => handleDeleteClick(e, c.id)}
                          loading={isDeleting === c.id}
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          className="shrink-0 text-text-faint hover:text-danger h-7 w-7 p-0"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Suppression */}
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
