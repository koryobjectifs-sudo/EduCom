import Link from "next/link";
import { ClipboardList, FileText, Calendar, Clock, TrendingDown, ShieldAlert } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { sortClasses } from "@/lib/classOrder";
import { teacherClassIds } from "@/lib/studentScope";
import ParentGradesView from "./ParentGradesView";

export const metadata = {
  title: "Saisie de notes & Évaluations | EduCom",
  description: "Accédez à la saisie des contrôles, compositions, bulletins et suivi des élèves en difficulté",
};

export default async function GradesEntryChoicePage() {
  const { schoolId, user } = await requireSchoolContext();

  if (user.role === "PARENT") {
    const children = await prisma.student.findMany({
      where: { schoolId, parentId: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        enrollments: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            academicYear: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const items = children.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      className: c.enrollments[0]?.class?.name || "Non assigné",
      academicYear: c.enrollments[0]?.academicYear,
    }));

    return <ParentGradesView children={items} />;
  }

  const isTeacher = user.role === "TEACHER";
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";
  let classWhere: any = { schoolId };
  if (isTeacher) {
    const classIds = await teacherClassIds({ schoolId, userId: user.id, role: user.role });
    classWhere = {
      schoolId,
      id: { in: classIds },
    };
  }

  const allClasses = sortClasses(
    await prisma.class.findMany({
      where: classWhere,
      include: {
        _count: { select: { enrollments: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        assignments: {
          where: isTeacher ? { teacherId: user.id } : undefined,
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
    })
  );

  const isElementaire = (c: { cycle: string; name: string }) =>
    c.cycle === "ELEMENTAIRE" ||
    ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
      c.name.toLowerCase().trim().startsWith(l)
    );

  const elementaryClasses = allClasses.filter(isElementaire);
  const secondaryClasses = allClasses.filter((c) => !isElementaire(c));
  const isElementaryOnlyTeacher = isTeacher && elementaryClasses.length > 0 && secondaryClasses.length === 0;
  const isSecondaryOnlyTeacher = isTeacher && secondaryClasses.length > 0 && elementaryClasses.length === 0;

  // Fetch upcoming evaluations (limit to 10 for the widget)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvaluations = await prisma.evaluation.findMany({
    where: {
      schoolId,
      date: {
        gte: today, // Upcoming or today
      },
    },
    select: {
      id: true,
      name: true,
      type: true,
      date: true,
      term: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
    take: 10,
  });

  const mainEntryHref = isElementaryOnlyTeacher
    ? `/dashboard/grades/elementaire?class=${elementaryClasses[0].id}`
    : isSecondaryOnlyTeacher
    ? `/dashboard/grades/secondaire?class=${secondaryClasses[0].id}`
    : "/dashboard/grades/bulletin?type=controle";

  return (
    <div className="space-y-4 pb-8 max-w-5xl">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-role-page font-bold tracking-tight text-text">
            Notes & Évaluations
          </h1>
          <p className="mt-1 text-role-body text-text-soft">
            Sélectionnez le module d&apos;évaluation, l&apos;édition des bulletins ou le suivi pédagogique.
          </p>
        </div>
        {/* Action principale de l'écran — adaptée si enseignant d'élémentaire */}
        <Link
          href={mainEntryHref}
          className="inline-flex h-8.5 shrink-0 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover"
        >
          <ClipboardList aria-hidden="true" className="h-3.5 w-3.5" />
          Saisir les notes
        </Link>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-2.5 mt-4`}>
        <Link 
          href="/dashboard/grades/bulletin?type=controle"
          className="group relative rounded-surface border border-rule bg-surface p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
              1. Contrôle
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Notes continues
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/bulletin?type=composition"
          className="group relative rounded-surface border border-rule bg-surface p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
              2. Composition
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Fin de trimestre
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/report-card"
          className="group relative rounded-surface border border-rule bg-surface p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
              3. Bulletins
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Générer et imprimer
            </p>
          </div>
        </Link>

        <Link 
          href="/dashboard/grades/difficultes"
          className="group relative rounded-surface border border-rose-200/80 bg-rose-50/20 p-3 shadow-2xs transition-all hover:border-rose-400 hover:shadow-subtle flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-text group-hover:text-rose-700 transition-colors">
              4. En difficulté
            </h2>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Moyenne &lt; 10/20
            </p>
          </div>
        </Link>

        {isAdmin && (
          <Link 
            href="/dashboard/grades/conseil"
            className="group relative rounded-surface border border-purple-200/80 bg-purple-50/20 p-3 shadow-2xs transition-all hover:border-purple-400 hover:shadow-subtle flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-purple-100 text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition-colors">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-text group-hover:text-purple-800 transition-colors">
                5. Conseil
              </h2>
              <p className="mt-0.5 text-role-meta text-text-soft">
                Distinctions & sanctions
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Saisie Élémentaire — Accès direct par classe (Lot 18/3A) */}
      {elementaryClasses.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
                Saisie élémentaire (CI à CM2 — par domaines)
              </h2>
            </div>
            <span className="text-role-meta text-text-soft">
              {elementaryClasses.length} classe{elementaryClasses.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {elementaryClasses.map((c) => (
              <div
                key={c.id}
                className="group relative rounded-surface border border-rule bg-surface p-3.5 shadow-2xs transition-all hover:border-primary/50 hover:shadow-subtle flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                      {c.name}
                    </h3>
                    <span className="inline-flex items-center rounded-pill bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Élémentaire
                    </span>
                  </div>
                  <p className="mt-1 text-role-meta text-text-soft">
                    {c._count.enrollments} élève{c._count.enrollments > 1 ? "s" : ""}
                    {c.teacher ? ` · Titulaire : ${c.teacher.firstName} ${c.teacher.lastName}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/grades/elementaire?class=${c.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover w-full sm:w-auto self-start"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Saisir les notes &rarr;
                  </Link>

                  {isAdmin && (
                    <Link
                      href={`/dashboard/grades/conseil?class=${c.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-control border border-purple-200 bg-purple-50/50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors w-full sm:w-auto self-start"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Conseil &rarr;
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saisie Secondaire & Moyen — Accès direct par classe et matière (Lot 18/3B) */}
      {secondaryClasses.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-600" />
              <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
                Saisie secondaire & moyen (6e à Terminale — par matières)
              </h2>
            </div>
            <span className="text-role-meta text-text-soft">
              {secondaryClasses.length} classe{secondaryClasses.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {secondaryClasses.map((c) => {
              const allowedSubjects = isTeacher
                ? (c.assignments ?? []).map((a: any) => a.subject).filter(Boolean)
                : (c.subjects ?? []).map((cs: any) => cs.subject).filter(Boolean);

              const firstSubject = allowedSubjects[0];

              return (
                <div
                  key={c.id}
                  className="group relative rounded-surface border border-rule bg-surface p-3.5 shadow-2xs transition-all hover:border-sky-500/50 hover:shadow-subtle flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-text group-hover:text-sky-600 transition-colors">
                        {c.name}
                      </h3>
                      <span className="inline-flex items-center rounded-pill bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                        {c.cycle === "MOYEN" ? "Moyen" : "Secondaire"}
                        {c.serie ? ` · ${c.serie}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-role-meta text-text-soft">
                      {c._count.enrollments} élève{c._count.enrollments > 1 ? "s" : ""}
                      {c.teacher ? ` · PP : ${c.teacher.firstName} ${c.teacher.lastName}` : ""}
                    </p>

                    {allowedSubjects.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {allowedSubjects.map((s: any) => (
                          <Link
                            key={s.id}
                            href={`/dashboard/grades/secondaire?class=${c.id}&subject=${s.id}`}
                            className="inline-flex items-center rounded-pill border border-rule bg-sunk/50 px-2 py-0.5 text-[11px] font-medium text-text-soft hover:border-sky-500/50 hover:text-sky-700 hover:bg-surface transition-colors"
                          >
                            {s.code || s.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2.5">
                        <span className="text-[11px] text-amber-700 font-medium">
                          Aucune matière configurée
                          {isAdmin ? (
                            <>
                              {" · "}
                              <Link href="/dashboard/settings/pedagogie" className="underline hover:text-amber-900 font-semibold">
                                Configurer
                              </Link>
                            </>
                          ) : (
                            " · Contacter l'administration"
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/grades/secondaire?class=${c.id}${firstSubject ? `&subject=${firstSubject.id}` : ""}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-control bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-sky-700 w-full sm:w-auto self-start"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Saisir les notes &rarr;
                    </Link>

                    {isAdmin && (
                      <Link
                        href={`/dashboard/grades/conseil?class=${c.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-control border border-purple-200 bg-purple-50/50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors w-full sm:w-auto self-start"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Conseil &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Planning des évaluations */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-text-soft" />
          <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
            Planning des évaluations à venir
          </h2>
        </div>

        {upcomingEvaluations.length === 0 ? (
          <div className="rounded-surface border border-dashed border-rule bg-sunk/40 p-6 text-center">
            <Calendar className="mx-auto h-6 w-6 text-text-faint mb-2" />
            <h3 className="text-xs font-semibold text-text">Aucune évaluation planifiée</h3>
            <p className="mt-0.5 text-role-meta text-text-soft">
              Les prochaines dates de contrôles et compositions apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="rounded-surface border border-rule bg-surface overflow-hidden shadow-2xs">
            <ul className="divide-y divide-rule">
              {upcomingEvaluations.map((evalItem) => (
                <li key={evalItem.id} className="p-3 sm:px-4 hover:bg-sunk transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center w-9 h-9 rounded-control bg-primary/5 text-primary shrink-0 border border-primary/10">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider">
                        {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(evalItem.date) : "-"}
                      </span>
                      <span className="text-xs font-bold leading-none">
                        {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(evalItem.date) : "-"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-text flex items-center gap-1.5">
                        {evalItem.name}
                        {evalItem.type === "EXAM" ? (
                          <span className="inline-flex items-center rounded-pill bg-amber-50 px-1.5 py-0.2 text-[9.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Composition
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-pill bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Contrôle
                          </span>
                        )}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2 text-role-meta text-text-soft">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {evalItem.date ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(evalItem.date) : "Date à définir"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-rule"></span>
                        <span>{evalItem.term.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/dashboard/grades/bulletin?type=${evalItem.type === "EXAM" ? "composition" : "controle"}`}
                    className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                  >
                    Saisir les notes &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
