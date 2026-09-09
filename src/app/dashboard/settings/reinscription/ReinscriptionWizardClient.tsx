"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Users,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Search,
  Check,
  X,
  Plus,
  ShieldCheck,
  Building2,
  Filter,
  GraduationCap,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  type ReinscriptionInitData,
  executeReinscriptionAction,
  cancelReinscriptionAction,
  getReinscriptionInitDataAction,
} from "./actions";
import { EXIT_DESTINATION, getNextAcademicYear } from "@/lib/reinscription";

interface ReinscriptionWizardClientProps {
  initialData: ReinscriptionInitData;
}

export default function ReinscriptionWizardClient({
  initialData,
}: ReinscriptionWizardClientProps) {
  const router = useRouter();
  const [data, setData] = useState<ReinscriptionInitData>(initialData);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = useTransition();

  // Étape 1 : Années
  const [sourceYear, setSourceYear] = useState(data.sourceYear);
  const [targetYear, setTargetYear] = useState(data.targetYear);
  const [isLoadingYears, setIsLoadingYears] = useState(false);

  // Étape 2 : Règles de promotion par classe
  // Map<sourceClassId, { targetClassId, targetClassName, targetCycle, isExit, isNewClass }>
  const [classRules, setClassRules] = useState<
    Record<
      string,
      {
        targetClassId: string | typeof EXIT_DESTINATION;
        targetClassName: string;
        targetCycle: string;
        isExit: boolean;
        isNewClass: boolean;
      }
    >
  >(() => {
    const map: Record<string, any> = {};
    for (const r of data.defaultRules) {
      map[r.sourceClassId] = {
        targetClassId: r.targetClassId,
        targetClassName: r.targetClassName,
        targetCycle: r.targetCycle,
        isExit: r.isExit,
        isNewClass: r.isNewClass,
      };
    }
    return map;
  });

  // Modal / Inline création de nouvelle classe cible
  const [newCustomClasses, setNewCustomClasses] = useState<
    { name: string; cycle: string }[]
  >([]);

  // Étape 3 : Revue individuelle des élèves
  // Map<studentId, { isReenrolled: boolean, targetClassId: string, targetClassName: string, promotionType: string }>
  const [studentDecisions, setStudentDecisions] = useState<
    Record<
      string,
      {
        isReenrolled: boolean;
        targetClassId: string | typeof EXIT_DESTINATION;
        targetClassName: string;
        isRepeat?: boolean;
        isSkip?: boolean;
      }
    >
  >(() => {
    const map: Record<string, any> = {};
    for (const st of data.students) {
      map[st.studentId] = {
        isReenrolled: st.isReenrolled,
        targetClassId: st.targetClassId,
        targetClassName: st.targetClassName,
        isRepeat: false,
        isSkip: false,
      };
    }
    return map;
  });

  // Filtres étape 3
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassId, setFilterClassId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "REINSCRIBED" | "EXIT">("ALL");

  // Annulation
  const [isCancelling, setIsCancelling] = useState(false);

  // Exécution
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<number | null>(null);
  const [executionSummary, setExecutionSummary] = useState<any>(null);

  // Recharger les données si l'utilisateur change les années à l'étape 1
  const handleReloadYears = async (newSource: string, newTarget: string) => {
    setIsLoadingYears(true);
    const res = await getReinscriptionInitDataAction(newSource, newTarget);
    if (res.success && res.data) {
      setData(res.data);
      setSourceYear(res.data.sourceYear);
      setTargetYear(res.data.targetYear);

      // Re-initialiser les règles
      const map: Record<string, any> = {};
      for (const r of res.data.defaultRules) {
        map[r.sourceClassId] = {
          targetClassId: r.targetClassId,
          targetClassName: r.targetClassName,
          targetCycle: r.targetCycle,
          isExit: r.isExit,
          isNewClass: r.isNewClass,
        };
      }
      setClassRules(map);

      // Re-initialiser les décisions élèves
      const stMap: Record<string, any> = {};
      for (const st of res.data.students) {
        stMap[st.studentId] = {
          isReenrolled: st.isReenrolled,
          targetClassId: st.targetClassId,
          targetClassName: st.targetClassName,
          isRepeat: false,
          isSkip: false,
        };
      }
      setStudentDecisions(stMap);
      toast.success(`Données chargées pour la transition ${newSource} → ${newTarget}`);
    } else {
      toast.error(res.error || "Impossible de charger les données pour ces années.");
    }
    setIsLoadingYears(false);
  };

  // Synchroniser les décisions des élèves lorsqu'une règle de classe change
  const handleClassRuleChange = (
    sourceClassId: string,
    targetClassId: string | typeof EXIT_DESTINATION,
    targetClassName: string,
    targetCycle: string,
    isExit: boolean,
    isNewClass: boolean
  ) => {
    setClassRules((prev) => ({
      ...prev,
      [sourceClassId]: {
        targetClassId,
        targetClassName,
        targetCycle,
        isExit,
        isNewClass,
      },
    }));

    // Mettre à jour tous les élèves de cette classe source qui n'ont pas de dérogation individuelle
    setStudentDecisions((prev) => {
      const next = { ...prev };
      for (const st of data.students) {
        if (st.sourceClassId === sourceClassId) {
          next[st.studentId] = {
            isReenrolled: !isExit,
            targetClassId,
            targetClassName,
            isRepeat: false,
            isSkip: false,
          };
        }
      }
      return next;
    });
  };

  // Basculer tous les élèves d'une classe source
  const handleToggleAllInClass = (sourceClassId: string, reenrolled: boolean) => {
    setStudentDecisions((prev) => {
      const next = { ...prev };
      for (const st of data.students) {
        if (st.sourceClassId === sourceClassId) {
          next[st.studentId] = {
            ...next[st.studentId],
            isReenrolled: reenrolled,
          };
        }
      }
      return next;
    });
  };

  // Décision individuelle élève
  const handleStudentToggle = (studentId: string, value: boolean) => {
    setStudentDecisions((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isReenrolled: value,
      },
    }));
  };

  const handleStudentTargetChange = (
    studentId: string,
    targetClassId: string | typeof EXIT_DESTINATION,
    targetClassName: string,
    mode?: "REPEAT" | "SKIP" | "CUSTOM"
  ) => {
    setStudentDecisions((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        targetClassId,
        targetClassName,
        isReenrolled: targetClassId !== EXIT_DESTINATION,
        isRepeat: mode === "REPEAT",
        isSkip: mode === "SKIP",
      },
    }));
  };

  // Filtrage des élèves pour l'étape 3
  const filteredStudents = useMemo(() => {
    return data.students.filter((st) => {
      // Recherche textuelle
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const fullName = `${st.firstName} ${st.lastName}`.toLowerCase();
        const mat = (st.matricule || "").toLowerCase();
        if (!fullName.includes(q) && !mat.includes(q)) return false;
      }

      // Filtre classe
      if (filterClassId !== "ALL" && st.sourceClassId !== filterClassId) {
        return false;
      }

      // Filtre statut
      const dec = studentDecisions[st.studentId];
      if (filterStatus === "REINSCRIBED" && !dec?.isReenrolled) return false;
      if (filterStatus === "EXIT" && dec?.isReenrolled) return false;

      return true;
    });
  }, [data.students, searchTerm, filterClassId, filterStatus, studentDecisions]);

  // Statistiques en direct
  const stats = useMemo(() => {
    let reenrolled = 0;
    let exits = 0;
    const perTargetClass: Record<string, number> = {};

    for (const st of data.students) {
      const dec = studentDecisions[st.studentId];
      if (dec?.isReenrolled && dec.targetClassId !== EXIT_DESTINATION) {
        reenrolled++;
        const targetName = dec.targetClassName || "Classe cible";
        perTargetClass[targetName] = (perTargetClass[targetName] || 0) + 1;
      } else {
        exits++;
      }
    }

    return {
      total: data.students.length,
      reenrolled,
      exits,
      perTargetClass,
    };
  }, [data.students, studentDecisions]);

  // Gestion de l'annulation
  const handleCancelReinscription = async () => {
    if (
      !confirm(
        `Êtes-vous certain de vouloir annuler toutes les réinscriptions pour l'année ${targetYear} ?\nCette opération effacera les inscriptions créées pour cette session.`
      )
    ) {
      return;
    }

    setIsCancelling(true);
    const res = await cancelReinscriptionAction(targetYear);
    if (res.success) {
      toast.success(`Réinscription annulée avec succès : ${res.deletedCount} inscription(s) retirée(s).`);
      await handleReloadYears(sourceYear, targetYear);
    } else {
      toast.error(res.error || "Impossible d'annuler la réinscription.");
    }
    setIsCancelling(false);
  };

  // Exécution finale
  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionProgress(15);

    // Détecter les classes cibles à créer
    const classesToCreateMap = new Map<string, { name: string; cycle: string }>();

    for (const [sourceId, rule] of Object.entries(classRules)) {
      if (!rule.isExit && rule.isNewClass && rule.targetClassName) {
        classesToCreateMap.set(rule.targetClassName.toLowerCase(), {
          name: rule.targetClassName,
          cycle: rule.targetCycle || "AUTRE",
        });
      }
    }

    // Ajouter les éventuelles classes créées manuellement
    for (const custom of newCustomClasses) {
      classesToCreateMap.set(custom.name.toLowerCase(), custom);
    }

    // Construire la liste des affectations élèves
    const studentAssignments = data.students.map((st) => {
      const dec = studentDecisions[st.studentId];
      return {
        studentId: st.studentId,
        targetClassId: dec?.targetClassId === EXIT_DESTINATION ? undefined : dec?.targetClassId,
        targetClassName: dec?.targetClassName,
        isReenrolled: Boolean(dec?.isReenrolled && dec.targetClassId !== EXIT_DESTINATION),
      };
    });

    setExecutionProgress(45);

    const res = await executeReinscriptionAction({
      sourceYear,
      targetYear,
      newClassesToCreate: Array.from(classesToCreateMap.values()),
      studentAssignments,
    });

    setExecutionProgress(100);

    if (res.success && res.summary) {
      setExecutionSummary(res.summary);
      toast.success(`Rentrée préparée avec succès ! ${res.summary.reenrolledCount} élèves réinscrits.`);
    } else {
      toast.error(res.error || "Erreur lors de l'enregistrement de la réinscription.");
    }

    setIsExecuting(false);
  };

  return (
    <div className="space-y-6">
      {/* ── EN-TÊTE DU POSTE DE RÉINSCRIPTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Réglages
            </Link>
            <span className="text-text-muted">/</span>
            <span className="text-xs font-semibold text-primary">Préparer la rentrée</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1">
            Préparer la rentrée scolaire
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Réinscription en masse et promotion de niveau des effectifs d&apos;une année sur l&apos;autre.
          </p>
        </div>

        {/* Bouton d'annulation si inscriptions existantes sur targetYear */}
        {data.targetStats.alreadyEnrolledCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-2xl">
            <div className="text-xs text-amber-900">
              <span className="font-semibold">{data.targetStats.alreadyEnrolledCount}</span> élève(s)
              déjà inscrit(s) en {targetYear}.
            </div>
            {data.targetStats.canCancel && (
              <Button
                variant="ghost"
                size="sm"
                loading={isCancelling}
                onClick={handleCancelReinscription}
                className="text-xs text-red-700 hover:text-red-800 hover:bg-red-100/50 h-7 px-2"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Défaire
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── BARRE DE PROGRESSION DES ÉTAPES ── */}
      <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { num: 1, label: "1. Années scolaires" },
            { num: 2, label: "2. Promotion des classes" },
            { num: 3, label: "3. Revue des élèves" },
            { num: 4, label: "4. Confirmation" },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                disabled={isExecuting || Boolean(executionSummary)}
                onClick={() => setStep(s.num as any)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : isDone
                    ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "text-text-muted hover:bg-secondary/40"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isActive
                      ? "bg-white text-primary"
                      : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-secondary text-text-muted"
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : s.num}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── ÉTAPE 1 : CHOIX ANNÉE SOURCE & ANNÉE CIBLE ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-text-primary">
                  Étape 1 — Sélectionner les années de transition
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Choisissez l&apos;année scolaire d&apos;origine contenant vos élèves actuels et l&apos;année scolaire de destination dans laquelle les nouvelles inscriptions seront créées.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Année Source */}
              <div className="rounded-2xl border border-border bg-secondary/20 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Année source (Origine)
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {data.students.length} élèves inscrits
                  </span>
                </div>
                <select
                  value={sourceYear}
                  onChange={(e) => {
                    const newSource = e.target.value;
                    const nextTarget = getNextAcademicYear(newSource);
                    setSourceYear(newSource);
                    setTargetYear(nextTarget);
                    handleReloadYears(newSource, nextTarget);
                  }}
                  disabled={isLoadingYears}
                  className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {data.availableYears.map((y) => (
                    <option key={y} value={y}>
                      Année {y} {y === data.sourceYear ? "(actuelle)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-text-muted">
                  Les effectifs, notes et pièces de cette année restent intacts et archivés.
                </p>
              </div>

              {/* Année Cible */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Année cible (Destination)
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {data.targetStats.alreadyEnrolledCount} déjà inscrit(s)
                  </span>
                </div>
                <input
                  type="text"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  onBlur={() => {
                    if (targetYear !== data.targetYear) {
                      handleReloadYears(sourceYear, targetYear);
                    }
                  }}
                  placeholder="Ex: 2026-2027"
                  className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <p className="text-[11px] text-text-muted">
                  Une nouvelle inscription (`Enrollment`) sera rattachée à cette session pour chaque élève réinscrit.
                </p>
              </div>
            </div>

            {/* Note de rassurance */}
            <div className="rounded-2xl border border-border/80 bg-sunk/40 p-4 flex items-start gap-3 text-xs text-text-secondary leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Principe directeur d&apos;EduCom :</strong> La réinscription est une confirmation, pas une saisie manuelle.
                Tous les élèves de {sourceYear} vous seront proposés pré-cochés et promus au niveau supérieur. Vous n&apos;aurez qu&apos;à décocher ceux qui quittent l&apos;établissement ou ajuster les cas particuliers (redoublements, sauts).
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="lg"
              disabled={isLoadingYears || !targetYear || sourceYear === targetYear}
              onClick={() => setStep(2)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Passer à la promotion des classes
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── ÉTAPE 2 : PROMOTION DE NIVEAU DES CLASSES ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-text-primary">
                    Étape 2 — Règles de promotion des classes
                  </h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Vérifiez la classe de destination proposée pour chaque classe d&apos;origine. Les règles respectent le cycle sénégalais standard (CI→CP, CP→CE1..., CM2→Sortie).
                  </p>
                </div>
              </div>
            </div>

            {/* Table des classes sources */}
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
              <div className="bg-secondary/40 px-4 py-3 grid grid-cols-12 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <div className="col-span-5 sm:col-span-4">Classe d&apos;origine ({sourceYear})</div>
                <div className="col-span-2 text-center hidden sm:block">Effectif</div>
                <div className="col-span-7 sm:col-span-6">Classe de destination ({targetYear})</div>
              </div>

              {data.classes.map((cls) => {
                const currentRule = classRules[cls.id] || {
                  targetClassId: EXIT_DESTINATION,
                  targetClassName: "Sortie",
                  targetCycle: "AUTRE",
                  isExit: true,
                  isNewClass: false,
                };

                return (
                  <div
                    key={cls.id}
                    className="px-4 py-3.5 grid grid-cols-12 items-center gap-2 hover:bg-secondary/15 transition-colors text-sm"
                  >
                    {/* Classe source */}
                    <div className="col-span-5 sm:col-span-4 space-y-0.5">
                      <div className="font-semibold text-text-primary">{cls.name}</div>
                      <div className="text-[11px] text-text-muted">{cls.cycle}</div>
                    </div>

                    {/* Effectif */}
                    <div className="col-span-2 text-center hidden sm:block">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-text-secondary">
                        {cls.studentCount} élève(s)
                      </span>
                    </div>

                    {/* Destination */}
                    <div className="col-span-7 sm:col-span-6 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <select
                        value={
                          currentRule.isExit
                            ? EXIT_DESTINATION
                            : currentRule.targetClassId || "__NEW__"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === EXIT_DESTINATION) {
                            handleClassRuleChange(
                              cls.id,
                              EXIT_DESTINATION,
                              "Sortie de cycle",
                              cls.cycle,
                              true,
                              false
                            );
                          } else if (val === "__NEW__") {
                            // Demander le nom de la classe
                            const customName = prompt(
                              `Nom de la nouvelle classe pour les élèves de ${cls.name} :`,
                              `${cls.name} (Suivante)`
                            );
                            if (customName && customName.trim()) {
                              handleClassRuleChange(
                                cls.id,
                                EXIT_DESTINATION,
                                customName.trim(),
                                cls.cycle,
                                false,
                                true
                              );
                            }
                          } else {
                            const matched = data.classes.find((c) => c.id === val);
                            handleClassRuleChange(
                              cls.id,
                              val,
                              matched ? matched.name : "Classe",
                              matched ? matched.cycle : cls.cycle,
                              false,
                              false
                            );
                          }
                        }}
                        className="w-full bg-white border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <optgroup label="Classes existantes dans l'école">
                          {data.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              → {c.name} ({c.cycle})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Cas particuliers">
                          <option value={EXIT_DESTINATION}>
                            ⊗ Sortie de cycle (Fin d&apos;études / Changement d&apos;établissement)
                          </option>
                          <option value="__NEW__">+ Créer une nouvelle classe...</option>
                        </optgroup>
                      </select>

                      {currentRule.isNewClass && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900 shrink-0">
                          <Sparkles className="w-3 h-3" />
                          Sera créée : {currentRule.targetClassName}
                        </span>
                      )}

                      {currentRule.isExit && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 shrink-0">
                          Fin de cycle
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setStep(1)}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Retour aux années
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setStep(3)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Revoir la liste des élèves ({data.students.length})
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── ÉTAPE 3 : REVUE INDIVIDUELLE DES ÉLÈVES ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm space-y-6">
            {/* Header + Compteur en direct */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-text-primary">
                  Étape 3 — Revue de la liste des élèves
                </h2>
                <p className="text-xs text-text-secondary">
                  Tous les élèves sont cochés par défaut. Décochez ceux qui ne reviennent pas ou ajustez les redoublements.
                </p>
              </div>

              {/* Compteur en direct */}
              <div className="flex items-center gap-2 shrink-0 bg-secondary/50 p-2 rounded-2xl border border-border">
                <div className="px-3 py-1 bg-white rounded-xl shadow-2xs text-xs font-bold text-emerald-800">
                  {stats.reenrolled} réinscrit(s)
                </div>
                <div className="px-3 py-1 bg-white rounded-xl shadow-2xs text-xs font-bold text-slate-600">
                  {stats.exits} sortant(s) / non réinscrit(s)
                </div>
              </div>
            </div>

            {/* Barre de filtres et recherche */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom ou matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-secondary/20 border border-border rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-text-primary focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Filtre par classe source */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="bg-secondary/20 border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:bg-white focus:outline-none"
                >
                  <option value="ALL">Toutes les classes d&apos;origine</option>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.studentCount})
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-secondary/20 border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:bg-white focus:outline-none"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="REINSCRIBED">Réinscrits uniquement</option>
                  <option value="EXIT">Sortants uniquement</option>
                </select>
              </div>
            </div>

            {/* Actions rapides par classe filtrée */}
            {filterClassId !== "ALL" && (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-3 rounded-2xl text-xs">
                <span className="font-semibold text-primary">
                  Actions sur la classe : {data.classes.find((c) => c.id === filterClassId)?.name}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAllInClass(filterClassId, true)}
                    className="text-xs h-7 text-emerald-800 hover:bg-emerald-100"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Tout cocher
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAllInClass(filterClassId, false)}
                    className="text-xs h-7 text-slate-700 hover:bg-slate-200"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Tout décocher (Sortie)
                  </Button>
                </div>
              </div>
            )}

            {/* Table des élèves */}
            <div className="border border-border rounded-2xl overflow-hidden max-h-[520px] overflow-y-auto divide-y divide-border/60">
              <div className="sticky top-0 z-10 bg-secondary px-4 py-2.5 grid grid-cols-12 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <div className="col-span-1 text-center">Réinscrire</div>
                <div className="col-span-4 sm:col-span-4">Élève</div>
                <div className="col-span-3 sm:col-span-3">Classe origine</div>
                <div className="col-span-4 sm:col-span-4">Destination {targetYear}</div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  Aucun élève ne correspond aux critères de recherche.
                </div>
              ) : (
                filteredStudents.map((st) => {
                  const dec = studentDecisions[st.studentId] || {
                    isReenrolled: true,
                    targetClassId: st.targetClassId,
                    targetClassName: st.targetClassName,
                  };

                  return (
                    <div
                      key={st.studentId}
                      className={`px-4 py-2.5 grid grid-cols-12 items-center gap-2 text-xs transition-colors ${
                        dec.isReenrolled ? "bg-white hover:bg-emerald-50/20" : "bg-slate-50/80 opacity-70"
                      }`}
                    >
                      {/* Case à cocher */}
                      <div className="col-span-1 text-center">
                        <input
                          type="checkbox"
                          checked={dec.isReenrolled}
                          onChange={(e) => handleStudentToggle(st.studentId, e.target.checked)}
                          className="w-4 h-4 rounded-md text-primary focus:ring-primary border-border"
                        />
                      </div>

                      {/* Identité élève */}
                      <div className="col-span-4 sm:col-span-4 space-y-0.5">
                        <div className="font-semibold text-text-primary">
                          {st.lastName.toUpperCase()} {st.firstName}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {st.matricule ? `Mat. ${st.matricule}` : "Sans matricule"}
                        </div>
                      </div>

                      {/* Classe source */}
                      <div className="col-span-3 sm:col-span-3 text-text-secondary">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[11px] font-medium">
                          {st.sourceClassName}
                        </span>
                      </div>

                      {/* Classe de destination & Ajustements rapides */}
                      <div className="col-span-4 sm:col-span-4 flex items-center gap-1.5">
                        {dec.isReenrolled ? (
                          <select
                            value={dec.targetClassId}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === EXIT_DESTINATION) {
                                handleStudentTargetChange(st.studentId, EXIT_DESTINATION, "Sortie");
                              } else {
                                const matched = data.classes.find((c) => c.id === val);
                                const isSameClass = val === st.sourceClassId;
                                handleStudentTargetChange(
                                  st.studentId,
                                  val,
                                  matched ? matched.name : "Classe",
                                  isSameClass ? "REPEAT" : "CUSTOM"
                                );
                              }
                            }}
                            className="w-full bg-white border border-border rounded-lg px-2 py-1 text-[11px] font-medium text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                          >
                            <optgroup label="Classes disponibles">
                              {data.classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} {c.id === st.sourceClassId ? "(Redoublement)" : ""}
                                </option>
                              ))}
                            </optgroup>
                            <option value={EXIT_DESTINATION}>⊗ Sortie de cycle</option>
                          </select>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500 italic">
                            Non réinscrit(e) / Sortant(e)
                          </span>
                        )}

                        {dec.isRepeat && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 shrink-0">
                            Redouble
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setStep(2)}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Retour à la promotion des classes
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setStep(4)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Vérifier le récapitulatif ({stats.reenrolled} réinscriptions)
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── ÉTAPE 4 : CONFIRMATION & EXÉCUTION ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-text-primary">
                  Étape 4 — Récapitulatif et validation
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Vérifiez la répartition des élèves par classe de destination avant d&apos;enregistrer la transition vers {targetYear}.
                </p>
              </div>
            </div>

            {/* Chiffres clés */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-emerald-50/60 p-4 space-y-1">
                <span className="text-xs font-medium text-emerald-800">Élèves réinscrits</span>
                <div className="text-2xl font-bold text-emerald-950">{stats.reenrolled}</div>
                <p className="text-[11px] text-emerald-700">Inscriptions générées en {targetYear}</p>
              </div>

              <div className="rounded-2xl border border-border bg-slate-50 p-4 space-y-1">
                <span className="text-xs font-medium text-slate-700">Sortants / Non réinscrits</span>
                <div className="text-2xl font-bold text-slate-900">{stats.exits}</div>
                <p className="text-[11px] text-slate-500">Restent archivés dans {sourceYear}</p>
              </div>

              <div className="rounded-2xl border border-border bg-primary/5 p-4 space-y-1">
                <span className="text-xs font-medium text-primary">Session cible</span>
                <div className="text-2xl font-bold text-primary">{targetYear}</div>
                <p className="text-[11px] text-text-muted">Nouvelle année scolaire prête</p>
              </div>
            </div>

            {/* Répartition par classe de destination */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Effectifs prévisionnels par classe pour {targetYear}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(stats.perTargetClass).map(([className, count]) => (
                  <div
                    key={className}
                    className="p-3 rounded-xl border border-border bg-white flex items-center justify-between shadow-2xs"
                  >
                    <span className="font-semibold text-xs text-text-primary">{className}</span>
                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Texte d'impact et de rassurance légale */}
            <div className="rounded-2xl border border-border bg-sunk/40 p-4 space-y-2 text-xs text-text-secondary leading-relaxed">
              <div className="font-semibold text-text-primary flex items-center gap-1.5">
                <Info className="w-4 h-4 text-primary" />
                Conséquences de la validation :
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Une nouvelle inscription (`Enrollment`) sera enregistrée pour chaque élève réinscrit dans sa classe cible pour l&apos;année <strong>{targetYear}</strong>.
                </li>
                <li>
                  <strong>Aucune duplication d&apos;élève :</strong> les fiches élèves (`Student`) sont conservées intactes.
                </li>
                <li>
                  <strong>Historique préservé :</strong> les notes, paiements et documents de l&apos;année {sourceYear} restent consultables à tout moment.
                </li>
                <li>
                  <strong>Annulation possible :</strong> vous pourrez défaire cette opération tant qu&apos;aucune note ni paiement n&apos;est enregistré sur l&apos;année {targetYear}.
                </li>
              </ul>
            </div>

            {/* Barre de progression pendant l'exécution */}
            {isExecuting && (
              <div className="space-y-2 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Enregistrement des inscriptions en masse...</span>
                  <span>{executionProgress}%</span>
                </div>
                <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${executionProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Résumé après exécution */}
            {executionSummary && (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 text-emerald-950">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-base">Rentrée préparée avec succès !</h3>
                    <p className="text-xs text-emerald-800">
                      {executionSummary.reenrolledCount} inscriptions enregistrées pour la session {executionSummary.targetYear}.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push("/dashboard/students")}
                  >
                    Voir l&apos;annuaire des élèves
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push("/dashboard/settings")}
                  >
                    Retour aux réglages
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!executionSummary && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={isExecuting}
                onClick={() => setStep(3)}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Modifier la liste des élèves
              </Button>
              <Button
                variant="primary"
                size="lg"
                loading={isExecuting}
                onClick={handleExecute}
                icon={<Check className="w-4 h-4" />}
              >
                Valider et enregistrer la réinscription ({stats.reenrolled} élèves)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
