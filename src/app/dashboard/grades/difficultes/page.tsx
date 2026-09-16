import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { pickCurrentTerm } from "@/lib/terms";
import { calculerClasseElementaire } from "@/lib/notes/elementaire-classe";
import { calculerClasseSecondaire } from "@/lib/notes/secondaire-classe";
import { roundTo2 } from "@/lib/notes/round";
import Link from "next/link";
import { ArrowLeft, TrendingDown, GraduationCap, CheckCircle2, ChevronRight } from "lucide-react";
import { ClassFilterSelect } from "./ClassFilterSelect";

export const metadata = {
  title: "Élèves en difficulté pédagogique | EduCom",
  description: "Suivi officiel des élèves sous la moyenne générale (élémentaire et secondaire)",
};

interface DifficultesPageProps {
  searchParams: Promise<{ termId?: string; classId?: string }>;
}

export default async function ElevesEnDifficultePage({ searchParams }: DifficultesPageProps) {
  const { user, schoolId } = await requireSchoolContext();
  const sp = await searchParams;

  // 1. Détection du rôle enseignant : n'affiche que ses classes
  const isTeacher = user.role === "TEACHER";
  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      ...(isTeacher
        ? {
            OR: [
              { teacherId: user.id },
              { assignments: { some: { teacherId: user.id } } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, cycle: true, serie: true },
    orderBy: { name: "asc" },
  });

  // 2. Trimestres de l'école
  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  const { current: defaultTerm } = pickCurrentTerm(terms);
  const selectedTermId = sp.termId || defaultTerm?.id;
  const selectedTerm = terms.find((t) => t.id === selectedTermId) || defaultTerm;

  const selectedClassId = sp.classId || "ALL";

  // Classes ciblées par le filtre
  const targetClasses =
    selectedClassId !== "ALL"
      ? classes.filter((c) => c.id === selectedClassId)
      : classes;

  type EleveDifficulte = {
    studentId: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    className: string;
    classId: string;
    averageOn20: number;
    gradesCount: number;
    lowestSubject: { name: string; gradeOn20: number } | null;
  };

  const studentsInDifficulty: EleveDifficulte[] = [];
  let totalEvaluatedCount = 0;

  if (selectedTerm && targetClasses.length > 0) {
    for (const c of targetClasses) {
      const isElementaire =
        c.cycle === "ELEMENTAIRE" ||
        c.cycle === "PRESCOLAIRE" ||
        ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
          c.name.toLowerCase().trim().startsWith(l),
        );

      if (isElementaire) {
        // Moteur officiel Élémentaire (barème 20 pour comparaison directe)
        const resElem = await calculerClasseElementaire({
          schoolId,
          classId: c.id,
          termId: selectedTerm.id,
          bareme: 20,
        });

        const studentIdsInClass = resElem.eleves.map((e) => e.studentId);
        const studentsMeta = studentIdsInClass.length
          ? await prisma.student.findMany({
              where: { id: { in: studentIdsInClass } },
              select: { id: true, firstName: true, lastName: true, matricule: true },
            })
          : [];
        const metaMap = new Map(studentsMeta.map((s) => [s.id, s]));

        for (const el of resElem.eleves) {
          if (el.moyenneGenerale === null) continue;
          totalEvaluatedCount++;

          if (el.moyenneGenerale < 10) {
            const meta = metaMap.get(el.studentId);
            if (!meta) continue;

            // Trouver le domaine le plus faible
            const evalDomaines = el.domaines.filter((d) => d.moyenne !== null);
            let lowestSubject: { name: string; gradeOn20: number } | null = null;
            if (evalDomaines.length > 0) {
              const sorted = [...evalDomaines].sort((a, b) => (a.moyenne ?? 0) - (b.moyenne ?? 0));
              const weakest = sorted[0];
              lowestSubject = {
                name: weakest.name,
                gradeOn20: roundTo2(weakest.moyenne! * 2), // ramené sur 20
              };
            }

            studentsInDifficulty.push({
              studentId: meta.id,
              firstName: meta.firstName,
              lastName: meta.lastName,
              matricule: meta.matricule,
              className: c.name,
              classId: c.id,
              averageOn20: el.moyenneGenerale,
              gradesCount: el.domaines.reduce((acc, d) => acc + d.sousDisciplinesNotees, 0),
              lowestSubject,
            });
          }
        }
      } else {
        // Moteur officiel Secondaire (coefficients, devoirs et composition)
        const resSec = await calculerClasseSecondaire({
          schoolId,
          classId: c.id,
          termId: selectedTerm.id,
        });

        const studentIdsInClass = resSec.eleves.map((e) => e.studentId);
        const studentsMeta = studentIdsInClass.length
          ? await prisma.student.findMany({
              where: { id: { in: studentIdsInClass } },
              select: { id: true, firstName: true, lastName: true, matricule: true },
            })
          : [];
        const metaMap = new Map(studentsMeta.map((s) => [s.id, s]));

        for (const el of resSec.eleves) {
          if (el.moyenneGenerale === null) continue;
          totalEvaluatedCount++;

          if (el.moyenneGenerale < 10) {
            const meta = metaMap.get(el.studentId);
            if (!meta) continue;

            const evaluatedMats = el.matieres.filter((m) => m.mm !== null);
            let lowestSubject: { name: string; gradeOn20: number } | null = null;
            if (evaluatedMats.length > 0) {
              const sorted = [...evaluatedMats].sort((a, b) => a.mm! - b.mm!);
              const weakest = sorted[0];
              lowestSubject = {
                name: weakest.name,
                gradeOn20: weakest.mm!,
              };
            }

            studentsInDifficulty.push({
              studentId: meta.id,
              firstName: meta.firstName,
              lastName: meta.lastName,
              matricule: meta.matricule,
              className: c.name,
              classId: c.id,
              averageOn20: el.moyenneGenerale,
              gradesCount: evaluatedMats.length,
              lowestSubject,
            });
          }
        }
      }
    }

    // Trier du plus faible au plus proche de 10
    studentsInDifficulty.sort((a, b) => a.averageOn20 - b.averageOn20);
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Navigation retour */}
      <div>
        <Link
          href="/dashboard/grades"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0E2541] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour à l&apos;espace Pédagogie</span>
        </Link>
      </div>

      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200/60 shadow-2xs">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Élèves en difficulté pédagogique
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Diagnostic officiel des moyennes générales inférieures à 10 / 20 (élémentaire et secondaire)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-xs font-extrabold">
            {studentsInDifficulty.length} élève{studentsInDifficulty.length > 1 ? "s" : ""} concerné{studentsInDifficulty.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Barre de Filtres (Trimestre & Classe) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Trimestre :</span>
          {terms.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/grades/difficultes?termId=${t.id}&classId=${selectedClassId}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedTerm?.id === t.id
                  ? "bg-[#0E2541] text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Classe :</span>
          <ClassFilterSelect
            selectedClassId={selectedClassId}
            selectedTermId={selectedTerm?.id}
            classes={classes}
          />
        </div>
      </div>

      {/* RÉSULTATS / LISTE DES ÉLÈVES */}
      {classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">Aucune classe assignée</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vous n&apos;avez actuellement aucune classe rattachée dans cet établissement.
          </p>
        </div>
      ) : totalEvaluatedCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">Aucune note enregistrée pour ce trimestre</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Les moyennes et le diagnostic des élèves en difficulté seront automatiquement calculés dès que les enseignants auront commencé la saisie des notes.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/grades"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0E2541] px-4 py-2 text-xs font-semibold text-white hover:bg-[#183a63] transition-colors"
            >
              <span>Accéder à la saisie des notes</span>
            </Link>
          </div>
        </div>
      ) : studentsInDifficulty.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-12 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h3 className="text-base font-bold text-emerald-950">Excellente nouvelle !</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            Aucun élève évalué n&apos;est actuellement en dessous de 10 / 20 pour {selectedTerm?.name || "ce trimestre"}.
          </p>
          <span className="inline-block text-[11px] font-semibold text-emerald-700">
            {totalEvaluatedCount} élève{totalEvaluatedCount > 1 ? "s" : ""} évalué{totalEvaluatedCount > 1 ? "s" : ""} au total
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Affichage de {studentsInDifficulty.length} élève{studentsInDifficulty.length > 1 ? "s" : ""} sur {totalEvaluatedCount} élèves évalués
            </span>
            <span>Trié de la moyenne la plus faible à la plus élevée</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {studentsInDifficulty.map((item, idx) => (
              <div
                key={item.studentId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white p-4 border border-rose-100 shadow-2xs hover:border-rose-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 font-extrabold text-sm border border-rose-200/60">
                    #{idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {item.firstName} {item.lastName}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {item.className}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {item.matricule && <span>Matricule : {item.matricule}</span>}
                      <span>•</span>
                      <span>{item.gradesCount} note{item.gradesCount > 1 ? "s" : ""} enregistrée{item.gradesCount > 1 ? "s" : ""}</span>
                      {item.lowestSubject && (
                        <>
                          <span>•</span>
                          <span className="text-rose-700 font-medium">
                            Discipline la plus faible : {item.lowestSubject.name} ({item.lowestSubject.gradeOn20} / 20)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="inline-block rounded-lg bg-rose-100 px-3 py-1 text-base font-extrabold text-rose-700">
                      {item.averageOn20} <span className="text-xs font-normal">/ 20</span>
                    </span>
                    <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Sous la moyenne</p>
                  </div>

                  <Link
                    href={`/dashboard/students/${item.studentId}/dossier`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#0E2541] hover:text-white text-slate-700 px-3 py-2 text-xs font-bold transition-all shadow-2xs"
                  >
                    <span>Dossier</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
