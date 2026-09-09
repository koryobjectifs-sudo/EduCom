import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { pickCurrentTerm } from "@/lib/terms";
import Link from "next/link";
import { ArrowLeft, AlertCircle, TrendingDown, BookOpen, GraduationCap, CheckCircle2, User, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Élèves en difficulté pédagogique | EduCom",
  description: "Suivi des élèves sous la moyenne générale",
};

interface DifficultesPageProps {
  searchParams: Promise<{ termId?: string; classId?: string }>;
}

export default async function ElevesEnDifficultePage({ searchParams }: DifficultesPageProps) {
  const { schoolId } = await requireSchoolContext();
  const sp = await searchParams;

  // 1. Récupérer les trimestres
  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const { current: defaultTerm } = pickCurrentTerm(terms);
  const selectedTermId = sp.termId || defaultTerm?.id;
  const selectedTerm = terms.find((t) => t.id === selectedTermId) || defaultTerm;

  // 2. Récupérer les classes
  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, cycle: true },
    orderBy: { name: "asc" },
  });

  const selectedClassId = sp.classId || "ALL";

  // 3. Récupérer les notes pour le trimestre
  let studentsInDifficulty: {
    studentId: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    className: string;
    classId: string;
    averageOn20: number;
    gradesCount: number;
    lowestSubject: { name: string; gradeOn20: number } | null;
  }[] = [];

  let totalEvaluatedCount = 0;

  if (selectedTerm) {
    const grades = await prisma.grade.findMany({
      where: {
        termId: selectedTerm.id,
        class: {
          schoolId,
          ...(selectedClassId !== "ALL" ? { id: selectedClassId } : {}),
        },
      },
      select: {
        id: true,
        value: true,
        max: true,
        coefficient: true,
        classId: true,
        class: { select: { id: true, name: true } },
        studentId: true,
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    // Agréger par élève
    const studentGradesMap = new Map<
      string,
      {
        student: { id: string; firstName: string; lastName: string; matricule: string | null };
        className: string;
        classId: string;
        num: number;
        den: number;
        gradesCount: number;
        subjects: { name: string; gradeOn20: number }[];
      }
    >();

    for (const g of grades) {
      if (!g.max || g.max <= 0) continue;
      const coef = g.coefficient > 0 ? g.coefficient : 1;
      const gradeOn20 = (g.value / g.max) * 20;

      const existing = studentGradesMap.get(g.studentId) || {
        student: g.student,
        className: g.class.name,
        classId: g.class.id,
        num: 0,
        den: 0,
        gradesCount: 0,
        subjects: [],
      };

      existing.num += gradeOn20 * coef;
      existing.den += coef;
      existing.gradesCount += 1;
      existing.subjects.push({ name: g.subject.name, gradeOn20: parseFloat(gradeOn20.toFixed(1)) });
      studentGradesMap.set(g.studentId, existing);
    }

    totalEvaluatedCount = studentGradesMap.size;

    for (const [, data] of studentGradesMap.entries()) {
      if (data.den > 0) {
        const avg = parseFloat((data.num / data.den).toFixed(1));
        if (avg < 10) {
          // Trouver la matière la plus faible
          data.subjects.sort((a, b) => a.gradeOn20 - b.gradeOn20);
          const lowest = data.subjects[0] || null;

          studentsInDifficulty.push({
            studentId: data.student.id,
            firstName: data.student.firstName,
            lastName: data.student.lastName,
            matricule: data.student.matricule,
            className: data.className,
            classId: data.classId,
            averageOn20: avg,
            gradesCount: data.gradesCount,
            lowestSubject: lowest,
          });
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
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0E2541] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour au poste de pilotage</span>
        </Link>
      </div>

      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700 border border-red-200/60 shadow-2xs">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Élèves en difficulté pédagogique
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Liste des élèves ayant une moyenne générale inférieure à 10 / 20
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-extrabold">
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
          <select
            aria-label="Filtrer par classe"
            defaultValue={selectedClassId}
            onChange={undefined}
            className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0E2541]"
          >
            <option value="ALL">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cycle})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RÉSULTATS / LISTE DES ÉLÈVES */}
      {totalEvaluatedCount === 0 ? (
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
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white p-4 border border-red-100 shadow-2xs hover:border-red-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 font-extrabold text-sm border border-red-200/60">
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
                          <span className="text-red-700 font-medium">
                            Point faible : {item.lowestSubject.name} ({item.lowestSubject.gradeOn20}/20)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="inline-block rounded-lg bg-red-100 px-3 py-1 text-base font-extrabold text-red-700">
                      {item.averageOn20} <span className="text-xs font-normal">/ 20</span>
                    </span>
                    <p className="text-[10px] text-red-600 font-semibold mt-0.5">Sous la moyenne</p>
                  </div>

                  <Link
                    href={`/dashboard/students/${item.studentId}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#0E2541] hover:text-white text-slate-700 px-3 py-2 text-xs font-bold transition-all shadow-2xs"
                  >
                    <span>Fiche élève</span>
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
