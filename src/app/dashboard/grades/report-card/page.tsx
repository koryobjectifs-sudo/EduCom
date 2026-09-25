import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePathAccess } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { loadOfficialBulletin } from "@/lib/bulletin/loadOfficialBulletin";
import { pickCurrentTerm } from "@/lib/terms";
import { sortClasses } from "@/lib/classOrder";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataState } from "@/components/dashboard/DataState";
import { teacherClassIds } from "@/lib/studentScope";
import ReportCardGenerator from "./Generator";

export const metadata = { title: "Bulletins | EduCom" };

export default async function ReportCardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { schoolId, user, school } = await requirePathAccess("/dashboard/grades/report-card");
  const role = user.role as RoleType;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  let studentId = one("studentId") ?? null;
  let classId = one("classId");
  let termId = one("termId");
  const evaluationId = one("evaluationId");
  const isEmbed = one("embed") === "1";

  // Périmètre enseignant : filtrage strict côté serveur
  const isTeacher = role === "TEACHER";
  const allowedClassIds = isTeacher
    ? await teacherClassIds({ schoolId, userId: user.id, role })
    : null;

  if (isTeacher && allowedClassIds && allowedClassIds.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          breadcrumb={[
            { label: "Accueil", href: "/dashboard" },
            { label: "Notes", href: "/dashboard/grades" },
            { label: "Bulletins" },
          ]}
          title="Bulletins officiels"
          description={`Consultez et imprimez les bulletins des élèves · Établissement actif : ${school.name}`}
        />
        <div className="rounded-xl border border-rule/60 p-8 text-center bg-surface/50">
          <p className="text-sm text-text-soft">Aucune classe ne vous est affectée dans {school.name}.</p>
        </div>
      </div>
    );
  }

  // ── Résolution de ce qui manque, jamais une question posée à l'utilisateur ──
  if (studentId && !classId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        class: {
          schoolId,
          ...(allowedClassIds ? { id: { in: allowedClassIds } } : {}),
        },
      },
      orderBy: { createdAt: "desc" },
      select: { classId: true },
    });
    classId = enrollment?.classId;
  }

  // Si la classe demandée est hors périmètre enseignant, on l'annule
  if (classId && allowedClassIds && !allowedClassIds.includes(classId)) {
    classId = undefined;
  }

  const termRows = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  if (!termId) termId = pickCurrentTerm(termRows).current?.id;

  const [classes, evaluations] = await Promise.all([
    prisma.class.findMany({
      where: {
        schoolId,
        ...(allowedClassIds ? { id: { in: allowedClassIds } } : {}),
      },
      select: { id: true, name: true, cycle: true },
    }),
    termId
      ? prisma.evaluation.findMany({
          where: { schoolId, termId },
          select: { id: true, name: true, type: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const ordered = sortClasses(classes as never[]) as unknown as { id: string; name: string }[];

  if (!classId && termId && ordered.length > 0) {
    const notees = await prisma.grade.groupBy({
      by: ["classId"],
      where: {
        termId,
        class: {
          schoolId,
          ...(allowedClassIds ? { id: { in: allowedClassIds } } : {}),
        },
      },
      _count: { _all: true },
    });
    const avecNotes = new Set(notees.map((g) => g.classId));
    classId = ordered.find((c) => avecNotes.has(c.id))?.id ?? ordered[0].id;
  }

  // Vérification de cohérence : ignorer le paramètre studentId résiduel s'il n'appartient pas à la classe sélectionnée
  if (studentId && classId) {
    const isEnrolledInClass = await prisma.enrollment.findFirst({
      where: { classId, studentId },
      select: { id: true },
    });
    if (!isEnrolledInClass) {
      studentId = null; // Paramètre résiduel d'une autre classe ignoré
    }
  }

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { classId, termId, evaluationId, studentId: studentId ?? undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/dashboard/grades/report-card?${p.toString()}`;
  };

  const selectedClassName = ordered.find((c) => c.id === classId)?.name || "la classe";

  const canLoadOfficial = Boolean(classId && termId && (!allowedClassIds || allowedClassIds.includes(classId)));
  const officialData = canLoadOfficial && classId && termId
    ? await loadOfficialBulletin({ schoolId, classId, termId, studentId })
    : null;

  const Selectors = (
    <div className="space-y-3 print:hidden">
      <Row label="Classe">
        <div className="flex flex-wrap items-center gap-1.5">
          {ordered.map((c) => (
            <Pill key={c.id} href={link({ classId: c.id, studentId: undefined })} active={c.id === classId}>{c.name}</Pill>
          ))}
        </div>
      </Row>
      <Row label="Trimestre">
        <div className="flex flex-wrap items-center gap-1.5">
          {termRows.map((t) => (
            <Pill key={t.id} href={link({ termId: t.id, evaluationId: undefined })} active={t.id === termId}>{t.name}</Pill>
          ))}
        </div>
      </Row>
    </div>
  );

  return (
    <div className={isEmbed ? "" : "space-y-5 pb-12"}>
      {!isEmbed && (
        <div className="print:hidden">
          <PageHeader
            breadcrumb={[
              { label: "Accueil", href: "/dashboard" },
              { label: "Documents", href: "/dashboard/documents" },
              { label: "Bulletins" },
            ]}
            title="Bulletins officiels"
            description={`Gabarits conformes au Ministère de l'Éducation Nationale (A4) · Établissement actif : ${school.name}`}
          />
        </div>
      )}

      {!isEmbed && Selectors}

      {!officialData ? (
        <div className="print:hidden">
          <DataState
            kind="empty"
            icon={FileText}
            title={
              termRows.length === 0
                ? "Aucun trimestre déclaré"
                : ordered.length === 0
                ? `Aucune classe dans ${school.name}`
                : `Aucun élève en ${selectedClassName} à ${school.name}`
            }
            description={
              termRows.length === 0
                ? `Déclarez au moins un trimestre pour produire des bulletins à ${school.name}.`
                : `Aucun élève n'est inscrit en ${selectedClassName} pour l'établissement actif (${school.name}).`
            }
            action={{
              label: termRows.length === 0 ? "Configurer le calendrier" : "Ouvrir le registre",
              href: termRows.length === 0 ? "/dashboard/settings/pedagogie#calendrier" : "/dashboard/students",
            }}
          />
        </div>
      ) : (
        <ReportCardGenerator
          key={`${officialData.school.id}-${officialData.classe.id}-${officialData.term.id}-${officialData.school.bulletinWatermark}`}
          data={officialData}
          canPrint={role !== "TEACHER"}
          focusStudentId={studentId}
          embed={isEmbed}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
      <span className="w-20 shrink-0 text-role-meta font-semibold uppercase tracking-wider text-text-faint">{label}</span>
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-control border px-3 py-1.5 text-role-meta font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "border-primary bg-primary text-white shadow-card"
          : "border-rule bg-surface text-text-soft hover:border-primary/30 hover:text-primary"
      }`}
    >
      {children}
    </Link>
  );
}
