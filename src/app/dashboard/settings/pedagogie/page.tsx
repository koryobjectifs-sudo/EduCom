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

export const metadata = {
  title: "Configuration pédagogique | EduCom",
  description: "Programme, coefficients, trimestres, évaluations et affectations",
};

/**
 * **La configuration pédagogique de l'établissement.**
 *
 * ═══ POURQUOI CET ÉCRAN, ALORS QUE LA CONFIGURATION EXISTAIT DÉJÀ ═══
 *
 * Elle existait — éparpillée. Les trimestres et les matières dans un onglet
 * caché de `/dashboard/grades/bulletin`, les affectations dans la fiche d'une
 * classe, les coefficients nulle part, les dates d'évaluation nulle part non
 * plus. Aucune surface ne répondait à la seule question qui compte pour une
 * directrice : **« mon école est-elle prête à produire des bulletins ? »**
 *
 * ⚠️ **Ce n'est pas un système parallèle.** Chaque action de cet écran est celle
 * qui existait déjà : `setTermDates`, `addSubjectToClass`, `createAssignment`,
 * `deleteEvaluation`… importées, jamais réécrites. Ce qui est nouveau, ce sont
 * les trois choses qui n'existaient nulle part : le coefficient, la date d'une
 * évaluation, et la mesure de l'état de configuration.
 *
 * ═══ GARDE ═══
 *
 * `hasAccess()`, seule source de vérité. Direction ET secrétariat — c'est le
 * secrétariat qui tient le calendrier au quotidien. Le chemin est plus précis
 * que `/dashboard/settings`, qui reste réservé à la direction : autoriser le
 * pédagogique n'ouvre pas le nom, le logo ni la signature de l'établissement.
 */
export default async function PedagogiePage() {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  if (!hasAccess(role, "/dashboard/settings/pedagogie")) redirect("/dashboard");

  const actor = { schoolId, userId: user.id, role };

  const [readiness, programme, calendar, subjects, teachers, titulaires, assignments, notices] = await Promise.all([
    configurationReadiness(actor),
    programmeByClass(actor),
    schoolCalendar(actor),
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
    prisma.class.findMany({
      where: { schoolId, teacherId: { not: null } },
      select: { id: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.teachingAssignment.findMany({
      where: { schoolId },
      select: {
        id: true, classId: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    recentPlanningChanges(actor),
  ]);

  const proposal = curriculumProposal(
    programme.map((p) => ({ id: p.classId, name: p.className, cycle: p.cycle })),
    { withControls: true },
  );
  const restantAuModele = programme.reduce((n, p) => n + p.missingFromModel.length, 0);

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

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        breadcrumb={[{ label: "Tableau de bord", href: "/dashboard" }, { label: "Configuration pédagogique" }]}
        title="Configuration pédagogique"
        description="Le programme, le calendrier et les affectations de votre établissement. Tout est modifiable à tout moment."
      />

      {/* ══ VALIDATION — l'étape finale du parcours, placée EN TÊTE ══
          Elle conclut la configuration, mais c'est la première chose qu'une
          directrice veut lire : « où j'en suis ». La reléguer en bas obligerait
          à parcourir cinq sections pour obtenir la réponse. */}
      <Card
        title={readiness.canEnterGrades ? "Votre école peut produire des bulletins" : "Il manque encore quelque chose"}
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
                    {/* ⚠️ « Bloquant » n'est écrit QUE sur ce qui empêche
                        réellement de saisir une note aujourd'hui. Marquer
                        toutes les étapes comme obligatoires ferait croire à une
                        configuration de trois heures avant la première valeur. */}
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

      {/* ══ Changements de planning récents ══
          Ils sont affichés ICI, à la direction, parce que c'est elle qui décide
          s'il faut prévenir les familles — et parce que le produit ne peut pas
          les prévenir à sa place (voir `src/lib/channels.ts`). */}
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

          {/*
            ⚠️ **Ce bloc ne dit jamais « envoyé ».** `outboundNoticeReady()`
            relaie `src/lib/channels.ts`, seule autorité du projet sur la
            question, et son registre d'envois réels est VIDE. Écrire
            « les familles ont été prévenues » ferait croire à trois cents
            parents informés alors que personne ne l'est. Le produit dit donc ce
            qu'il fait réellement : il a prévenu à l'intérieur d'EduCom.
          */}
          <p className="mt-4 flex items-start gap-2 rounded-control border border-rule bg-sunk px-3 py-2.5 text-role-meta leading-relaxed text-text-soft">
            <Megaphone aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {outboundNoticeReady()
              ? "Un canal d'envoi est opérationnel : ces changements peuvent être annoncés aux familles depuis Communications."
              : "Aucun canal d'envoi n'est opérationnel dans EduCom : les familles ne sont pas prévenues automatiquement. Utilisez Communications pour préparer le message."}
          </p>
        </Card>
      )}

      <ProgrammePanel
        rows={programme}
        subjects={subjects}
        proposal={{ totals: proposal.totals, uncovered: proposal.uncovered }}
        missingFromModel={restantAuModele}
      />

      <CalendarPanel calendar={calendar} />

      {/*
        ⚠️ Le TITULAIRE est transmis, pas seulement les affectations. Sans lui,
        l'écran annonçait « personne n'est affecté » sur une classe dont le
        professeur principal peut parfaitement saisir les notes —
        `editableSubjectIds()` retombe sur `Class.teacherId` tant qu'aucune
        affectation n'existe. Le tableau aurait donc décrit un vide qui n'en
        était pas un, et poussé la direction à corriger ce qui marchait.
      */}
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
    </div>
  );
}
