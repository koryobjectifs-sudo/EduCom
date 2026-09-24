import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock, Eye, GraduationCap, ShieldAlert } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { sortClasses } from "@/lib/classOrder";
import { teacherClassIds } from "@/lib/studentScope";
import ParentGradesView from "./ParentGradesView";

export const metadata = {
  title: "Saisie de notes & Évaluations | EduCom",
  description: "Accédez à la saisie des contrôles, compositions et conseils de classe",
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

  // Évaluations à venir (limite 10)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvaluations = await prisma.evaluation.findMany({
    where: {
      schoolId,
      date: {
        gte: today,
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

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* En-tête épuré et clair avec détection explicite du rôle */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            {isTeacher ? "Mes classes & Saisie des notes" : "Pédagogie & Conseils de classe"}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {isTeacher
              ? "Vos classes affectées pour la saisie et le suivi régulier des notes."
              : "Vue d'ensemble de l'établissement · Conseils de classe et consultation des grilles."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-pill bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
            {allClasses.length} classe{allClasses.length > 1 ? "s" : ""}
          </span>
          {isAdmin && (
            <span className="inline-flex items-center rounded-pill bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
              Direction
            </span>
          )}
        </div>
      </div>

      {allClasses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <h3 className="text-sm font-semibold text-gray-800">Aucune classe disponible</h3>
          <p className="mt-1 text-xs text-gray-500">
            {isTeacher
              ? "Vous n'avez aucune affectation pédagogique active dans cet établissement."
              : "Aucune classe n'est encore enregistrée dans l'établissement."}
          </p>
        </div>
      )}

      {/* Section Élémentaire (CI à CM2) */}
      {elementaryClasses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                Classes élémentaires{" "}
                <span className="text-xs font-normal text-gray-500">
                  (CI à CM2)
                </span>
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {elementaryClasses.length} classe{elementaryClasses.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {elementaryClasses.map((c) => {
              const isTitulaire = c.teacherId === user.id;
              const gradeLink = `/dashboard/grades/elementaire?class=${c.id}`;
              const conseilLink = `/dashboard/grades/conseil?class=${c.id}`;

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        {c.name}
                      </h3>
                      <span className="inline-flex items-center rounded-pill bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Élémentaire
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {c._count.enrollments} élève{c._count.enrollments > 1 ? "s" : ""}
                      </span>
                      {isTeacher ? (
                        isTitulaire ? (
                          <span className="inline-flex items-center rounded-pill bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Titulaire
                          </span>
                        ) : null
                      ) : (
                        c.teacher && (
                          <span className="text-gray-400">
                            · Titulaire : {c.teacher.firstName} {c.teacher.lastName}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {isAdmin ? (
                      <>
                        <Link
                          href={conseilLink}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-purple-700 transition-colors"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          <span>Conseil de classe</span>
                        </Link>
                        <Link
                          href={gradeLink}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0"
                          title="Consulter la grille des notes (lecture seule)"
                        >
                          <Eye className="h-3.5 w-3.5 text-gray-500" />
                          <span>Consulter</span>
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={gradeLink}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-primary-hover transition-colors"
                      >
                        <span>Saisir les notes</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section Secondaire & Moyen (6e à Terminale) */}
      {secondaryClasses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <GraduationCap className="h-4 w-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                Classes secondaires & moyen{" "}
                <span className="text-xs font-normal text-gray-500">
                  (6e à Terminale)
                </span>
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {secondaryClasses.length} classe{secondaryClasses.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {secondaryClasses.map((c) => {
              const allowedSubjects = isTeacher
                ? (c.assignments ?? []).map((a: any) => a.subject).filter(Boolean)
                : (c.subjects ?? []).map((cs: any) => cs.subject).filter(Boolean);

              const firstSubject = allowedSubjects[0];
              const isPP = c.teacherId === user.id;

              const gradeLink = firstSubject
                ? `/dashboard/grades/secondaire?class=${c.id}&subject=${firstSubject.id}`
                : `/dashboard/grades/secondaire?class=${c.id}`;

              const conseilLink = `/dashboard/grades/conseil?class=${c.id}`;

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        {c.name}
                      </h3>
                      <span className="inline-flex items-center rounded-pill bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                        {c.cycle === "MOYEN" ? "Moyen" : "Secondaire"}
                        {c.serie ? ` · ${c.serie}` : ""}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {c._count.enrollments} élève{c._count.enrollments > 1 ? "s" : ""}
                      </span>
                      {isTeacher ? (
                        isPP ? (
                          <span className="inline-flex items-center rounded-pill bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                            Professeur principal
                          </span>
                        ) : null
                      ) : (
                        c.teacher && (
                          <span className="text-gray-400">
                            · PP : {c.teacher.firstName} {c.teacher.lastName}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {isAdmin ? (
                      <>
                        <Link
                          href={conseilLink}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-purple-700 transition-colors"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          <span>Conseil de classe</span>
                        </Link>
                        <Link
                          href={gradeLink}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0"
                          title="Consulter la grille des notes (lecture seule)"
                        >
                          <Eye className="h-3.5 w-3.5 text-gray-500" />
                          <span>Consulter</span>
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={gradeLink}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-primary-hover transition-colors"
                      >
                        <span>Saisir les notes</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Planning des évaluations programmées */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
            Planning des évaluations à venir
          </h2>
        </div>

        {upcomingEvaluations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-6 text-center">
            <Calendar className="mx-auto h-6 w-6 text-gray-400 mb-2" />
            <h3 className="text-xs font-semibold text-gray-800">Aucune évaluation planifiée</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Les prochaines dates de contrôles et compositions apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
            <ul className="divide-y divide-gray-100">
              {upcomingEvaluations.map((evalItem) => (
                <li
                  key={evalItem.id}
                  className="p-3 sm:px-4 hover:bg-gray-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center w-9 h-9 rounded-xl bg-primary/5 text-primary shrink-0 border border-primary/10">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider">
                        {evalItem.date
                          ? new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(evalItem.date)
                          : "-"}
                      </span>
                      <span className="text-xs font-bold leading-none">
                        {evalItem.date
                          ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(evalItem.date)
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                        {evalItem.name}
                        {evalItem.type === "EXAM" ? (
                          <span className="inline-flex items-center rounded-pill bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Composition
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-pill bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Contrôle
                          </span>
                        )}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {evalItem.date
                            ? new Intl.DateTimeFormat("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }).format(evalItem.date)
                            : "Date à définir"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span>{evalItem.term.name}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/grades/bulletin?type=${evalItem.type === "EXAM" ? "composition" : "controle"}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors shrink-0"
                  >
                    <span>Accéder</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
