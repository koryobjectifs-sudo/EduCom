import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, CircleDashed, CircleAlert, ArrowRight, CalendarClock, Megaphone,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { configurationReadiness, programmeByClass, schoolCalendar } from "@/lib/pedagogy";
import { curriculumProposal } from "@/lib/curriculum";
import { recentPlanningChanges, outboundNoticeReady } from "@/lib/planningNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import ProgrammePanel from "./ProgrammePanel";
import CalendarPanel from "./CalendarPanel";
import AssignmentsPanel from "./AssignmentsPanel";
import PedagogyAccordionView from "./PedagogyAccordionView";

export const metadata = {
  title: "Configuration pédagogique | EduCom",
  description: "Programme, coefficients, trimestres, évaluations et affectations",
};

export default async function PedagogiePage() {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  if (!hasAccess(role, "/dashboard/settings/pedagogie")) redirect("/dashboard");

  const actor = { schoolId, userId: user.id, role };

  // 1. Requêtes parallélisées et unifiées en une seule passe
  const [
    rawClasses,
    termRows,
    subjects,
    teachers,
    assignments,
    gradeCountsRaw,
    notices,
  ] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        cycle: true,
        teacherId: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: true } },
        subjects: {
          select: {
            subjectId: true,
            coefficient: true,
            subject: { select: { name: true, parent: { select: { name: true } } } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.term.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        evaluations: {
          select: { id: true, name: true, type: true, date: true },
          orderBy: [{ date: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["TEACHER", "OWNER", "ADMIN"] } },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.teachingAssignment.findMany({
      where: { schoolId },
      select: {
        id: true,
        classId: true,
        teacherId: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.grade.groupBy({
      by: ["classId", "subjectId"],
      where: { class: { schoolId } },
      _count: { _all: true },
    }),
    recentPlanningChanges(actor),
  ]);

  const gradeCounts = new Map(gradeCountsRaw.map((c) => [`${c.classId}|${c.subjectId}`, c._count._all]));
  const titulaires = rawClasses.filter((c) => c.teacherId && c.teacher);

  const [programme, calendar, readiness] = await Promise.all([
    programmeByClass(actor, rawClasses, gradeCounts),
    schoolCalendar(actor, new Date(), termRows),
    configurationReadiness(actor, {
      classes: rawClasses,
      terms: termRows,
      assignments,
      teachersCount: teachers.filter((t) => t.role === "TEACHER").length,
    }),
  ]);


  const proposal = curriculumProposal(
    programme.map((p) => ({ id: p.classId, name: p.className, cycle: p.cycle })),
    { withControls: true },
  );
  const restantAuModele = programme.reduce((n, p) => n + p.missingFromModel.length, 0);

  // Prochaine composition
  const allEvaluations = calendar.terms.flatMap((t) => t.evaluations);
  const upcomingComp = allEvaluations
    .filter((e) => e.isComposition && e.date)
    .sort((a, b) => (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0))[0];

  const nextExamFormatted = upcomingComp?.date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(upcomingComp.date))
    : null;

  const totalStudents = rawClasses.reduce((acc, c) => acc + c._count.enrollments, 0);
  const nonMaternelleClasses = rawClasses.filter((c) => c.cycle !== "MATERNELLE");

  const ICONE = {
    done: CheckCircle2,
    partial: CircleAlert,
    todo: CircleDashed,
  } as const;
  const TEINTE = {
    done: "text-success",
    partial: "text-warning",
    todo: "text-text-faint",
  } as const;

  const summary = {
    classesCount: rawClasses.length,
    studentsCount: totalStudents,
    weightedSubjectsCount: subjects.length,
    coveredClassesCount: nonMaternelleClasses.length,
    termsCount: calendar.terms.length,
    nextExamFormatted,
    teachersCount: teachers.length,
    assignedClassesCount: new Set([
      ...assignments.map((a) => a.classId),
      ...titulaires.map((t) => t.id),
    ]).size,
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        breadcrumb={[{ label: "Tableau de bord", href: "/dashboard" }, { label: "Configuration pédagogique" }]}
        title="Configuration pédagogique"
        description="Le programme, le calendrier et les affectations de votre établissement. Tout est modifiable à tout moment."
      />

      {/* ══ VALIDATION / ÉTAT DE PRÉPARATION ══ */}
      <Card
        title={readiness.canEnterGrades ? "Votre école peut produire des bulletins" : `${readiness.steps.filter(s => s.blocking && s.state !== "done").length} choses à régler avant les bulletins`}
        description={
          readiness.canEnterGrades
            ? `${readiness.done} / ${readiness.total} étapes complètes. Vos enseignants peuvent saisir des notes.`
            : readiness.firstBlocker?.todo ?? "Complétez les étapes marquées ci-dessous."
        }
        actions={
          readiness.canEnterGrades ? (
            <Link
              href="/dashboard/grades"
              className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-surface px-3 py-2 text-role-meta font-medium text-text-soft transition-colors hover:border-primary/30 hover:text-primary"
            >
              Voir la saisie
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          ) : undefined
        }
      >
        <ol className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {readiness.steps.map((s) => {
            const Icon = ICONE[s.state];
            return (
              <li key={s.id} className="flex items-start gap-2.5">
                <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${TEINTE[s.state]}`} />
                <div className="min-w-0">
                  <p className="text-role-body font-medium text-text">
                    {s.label}
                    {s.blocking && s.state !== "done" && (
                      <span className="ml-2 rounded-pill bg-warning/10 px-1.5 py-0.5 text-role-meta font-semibold text-warning">
                        bloquant
                      </span>
                    )}
                  </p>
                  <p className="text-role-meta text-text-soft">{s.display}</p>
                  {s.todo && (
                    <Link href={s.href} className="text-role-meta font-medium text-primary underline-offset-2 hover:underline">
                      {s.todo}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* ══ Changements de planning récents ══ */}
      {notices.length > 0 && (
        <Card
          title="Le calendrier a changé récemment"
          description={`${notices.length} modification${notices.length > 1 ? "s" : ""} sur les quatorze derniers jours. Vos enseignants en sont informés dans EduCom.`}
        >
          <ul className="space-y-2">
            {notices.map((n) => (
              <li key={n.id} className="flex items-start gap-2 text-role-body text-text-soft">
                <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
                <span>
                  <span className="font-medium text-text">{n.name}</span>
                  {n.termName && <span className="text-text-faint"> · {n.termName}</span>} — {n.sentence}
                  {n.by && <span className="text-text-faint"> (par {n.by})</span>}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-start gap-2 rounded-control border border-rule bg-sunk px-3 py-2.5 text-role-meta leading-relaxed text-text-soft">
            <Megaphone aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {outboundNoticeReady()
              ? "Un canal d'envoi est opérationnel : ces changements peuvent être annoncés aux familles depuis Communications."
              : "Aucun canal d'envoi n'est opérationnel dans EduCom : les familles ne sont pas prévenues automatiquement. Utilisez Communications pour préparer le message."}
          </p>
        </Card>
      )}

      {/* ══ ACCORDÉON DES 4 SECTIONS D'ÉDITION PÉDAGOGIQUE ══ */}
      <PedagogyAccordionView
        summary={summary}
        classesList={rawClasses.map((c) => ({
          id: c.id,
          name: c.name,
          cycle: c.cycle,
          studentCount: c._count.enrollments,
        }))}
        children={{
          programme: (
            <ProgrammePanel
              rows={programme}
              subjects={subjects}
              proposal={{ totals: proposal.totals, uncovered: proposal.uncovered }}
              missingFromModel={restantAuModele}
            />
          ),
          calendar: <CalendarPanel calendar={calendar} />,
          assignments: (
            <AssignmentsPanel
              classes={programme.map((p) => ({
                classId: p.classId,
                className: p.className,
                teacher: titulaires.find((t) => t.id === p.classId)?.teacher ?? null,
                subjects: p.subjects.map((s) => ({ id: s.subjectId, name: s.name, groupName: s.groupName })),
              }))}
              teachers={teachers}
              assignments={assignments}
            />
          ),
        }}
      />
    </div>
  );
}
