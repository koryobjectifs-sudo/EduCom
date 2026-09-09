import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { studentWhereFor } from "@/lib/studentScope";
import { requirementsFor, resolveStudentKind, currentAcademicYear } from "@/lib/studentFile";
import { OFFICIAL_REQUIREMENTS_BY_CYCLE, type OfficialRequirementDef } from "@/lib/officialRequirements";
import { calculateAge, formatStudentAge } from "@/lib/dateUtils";
import { PageHeader } from "@/components/ui/PageHeader";
import ReviewPortalClient, {
  type ReviewStudentItem,
  type RequirementDefItem,
  type StudentDocItem,
} from "./ReviewPortalClient";
import type { EducationalCycle } from "@/generated/prisma/client";

export const metadata = {
  title: "Examen des admissions & conformité | EduCom",
  description: "Examen des admissions, conformité des pièces d'inscription réglementaires sénégalaises",
};

export default async function DossierReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string;
    page?: string;
    q?: string;
    classId?: string;
    cycle?: string;
    missingPiece?: string;
  }>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  const role = user.role as RoleType;

  // Enseignants et parents n'ont aucun accès aux dossiers d'admission administratifs globaux
  if (role === "TEACHER" || role === "PARENT" || !hasAccess(role, "/dashboard/students")) {
    redirect("/dashboard");
  }

  const sp = searchParams ? await searchParams : {};
  const currentTab = (sp.tab || "todo") as "todo" | "missing_docs" | "compliant" | "all";
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 50;
  const searchQuery = sp.q?.trim() || "";
  const classFilter = sp.classId || "";
  const cycleFilter = sp.cycle || "";

  const actor = { schoolId, userId: user.id, role };
  const scope = await studentWhereFor(actor);
  const year = currentAcademicYear();

  // 1. Récupération des classes et des exigences
  const [classes, allConfiguredRequirements] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, cycle: true },
      orderBy: { name: "asc" },
    }),
    prisma.documentRequirement.findMany({
      where: { schoolId, active: true },
      orderBy: [{ position: "asc" }, { label: "asc" }],
    }),
  ]);

  // 2. Référentiel des exigences
  let effectiveRequirements = allConfiguredRequirements;
  if (allConfiguredRequirements.length === 0 && classes.length > 0) {
    const activeCycles = Array.from(
      new Set(classes.map((c) => c.cycle).filter(Boolean))
    ) as EducationalCycle[];

    effectiveRequirements = activeCycles.flatMap((cycle) => {
      const reqs = OFFICIAL_REQUIREMENTS_BY_CYCLE[cycle] ?? [];
      return reqs.map((r: OfficialRequirementDef, i: number) => ({
        id: `virtual-${cycle}-${i}`,
        label: r.label,
        shortLabel: r.shortLabel || r.label,
        category: r.category as any,
        cycle,
        classId: null,
        academicYear: null,
        studentKind: r.studentKind ?? null,
        source: r.source as any,
        required: r.required,
        pinned: r.pinned,
        conditional: r.conditional ?? null,
        validityMonths: null,
        active: true,
        position: r.order || i + 1,
        schoolId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    });
  }

  // 3. Calcul des compteurs SQL étanches pour les 4 onglets
  const baseWhere = { AND: [scope, { schoolId }] };

  // a. À traiter (PENDING)
  const todoCount = await prisma.student.count({
    where: {
      AND: [baseWhere, { status: "PENDING" }],
    },
  });

  // b. Tous les élèves
  const allCount = await prisma.student.count({
    where: baseWhere,
  });

  // c. Évaluation des élèves admis (ENROLLED) pour Complétude / Pièces manquantes
  const enrolledStudents = await prisma.student.findMany({
    where: {
      AND: [baseWhere, { status: "ENROLLED" }],
    },
    select: {
      id: true,
      dateOfBirth: true,
      kindOverride: true,
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          academicYear: true,
          class: { select: { id: true, name: true, cycle: true } },
        },
      },
      documents: {
        where: { supersededAt: null },
        select: { requirementId: true, status: true },
      },
    },
  });

  const compliantStudentIds: string[] = [];
  const missingDocsStudentIds: string[] = [];

  for (const s of enrolledStudents) {
    const currentEnrollment = s.enrollments[0]?.class ?? null;
    const kind = resolveStudentKind(s, year);
    const ageCalc = calculateAge(s.dateOfBirth);
    const age = ageCalc ? ageCalc.age : null;

    let totalRequiredApplicable = 0;
    let compliantCount = 0;

    for (const req of effectiveRequirements) {
      if (!req.required) continue;

      let applicable = true;
      if (req.cycle && currentEnrollment?.cycle && req.cycle !== currentEnrollment.cycle) {
        applicable = false;
      } else if (req.classId && currentEnrollment?.id && req.classId !== currentEnrollment.id) {
        applicable = false;
      } else if (req.studentKind && req.studentKind !== kind) {
        applicable = false;
      } else if (req.conditional) {
        const cond = req.conditional.toLowerCase().trim();
        if (cond.includes("age < 6") || cond.includes("age_lt_6") || cond.includes("prescolaire")) {
          const isCI = currentEnrollment?.name ? currentEnrollment.name.toUpperCase().includes("CI") : false;
          if (!isCI || (age !== null && age >= 6)) applicable = false;
        } else if (cond.includes("transfer") || cond.includes("exeat")) {
          if (kind !== "TRANSFERT") applicable = false;
        }
      }

      if (applicable) {
        totalRequiredApplicable++;
        const hasValidDoc = s.documents.some(
          (d) => d.requirementId === req.id && d.status === "VALIDATED"
        );
        if (hasValidDoc) compliantCount++;
      }
    }

    const isFullyCompliant = totalRequiredApplicable > 0 && compliantCount === totalRequiredApplicable;
    if (isFullyCompliant) {
      compliantStudentIds.push(s.id);
    } else {
      missingDocsStudentIds.push(s.id);
    }
  }

  const sqlCounts = {
    todo: todoCount,
    missing_docs: missingDocsStudentIds.length,
    compliant: compliantStudentIds.length,
    all: allCount,
  };

  // 4. Construction de la condition de filtrage pour la page courante
  let targetWhere: any = { ...baseWhere };

  if (currentTab === "todo") {
    targetWhere = { AND: [targetWhere, { status: "PENDING" }] };
  } else if (currentTab === "missing_docs") {
    targetWhere = { AND: [targetWhere, { id: { in: missingDocsStudentIds } }] };
  } else if (currentTab === "compliant") {
    targetWhere = { AND: [targetWhere, { id: { in: compliantStudentIds } }] };
  }

  if (classFilter && classFilter !== "ALL") {
    targetWhere = {
      AND: [targetWhere, { enrollments: { some: { classId: classFilter } } }],
    };
  } else if (cycleFilter && cycleFilter !== "ALL") {
    targetWhere = {
      AND: [targetWhere, { enrollments: { some: { class: { cycle: cycleFilter as any } } } }],
    };
  }

  if (searchQuery) {
    targetWhere = {
      AND: [
        targetWhere,
        {
          OR: [
            { firstName: { contains: searchQuery, mode: "insensitive" } },
            { lastName: { contains: searchQuery, mode: "insensitive" } },
            { matricule: { contains: searchQuery, mode: "insensitive" } },
            { emergencyContact: { contains: searchQuery, mode: "insensitive" } },
            { emergencyPhone: { contains: searchQuery, mode: "insensitive" } },
            { parent: { firstName: { contains: searchQuery, mode: "insensitive" } } },
            { parent: { lastName: { contains: searchQuery, mode: "insensitive" } } },
            { parent: { phone: { contains: searchQuery, mode: "insensitive" } } },
          ],
        },
      ],
    };
  }

  // 5. Comptage total et pagination serveur (50 lignes max)
  const totalFilteredCount = await prisma.student.count({ where: targetWhere });
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageStudents = await prisma.student.findMany({
    where: targetWhere,
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      status: true,
      kindOverride: true,
      createdAt: true,
      emergencyContact: true,
      emergencyPhone: true,
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          academicYear: true,
          class: {
            select: {
              id: true,
              name: true,
              cycle: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" }, // "PENDING" en priorité
      { createdAt: "desc" },
    ],
  });

  // 6. Une SEULE requête agrégée pour les pièces des 50 élèves de la page
  const pageStudentIds = pageStudents.map((s) => s.id);
  const pageStudentDocs = pageStudentIds.length > 0
    ? await prisma.studentDocument.findMany({
        where: {
          schoolId,
          studentId: { in: pageStudentIds },
          supersededAt: null,
        },
        select: {
          id: true,
          studentId: true,
          requirementId: true,
          status: true,
          fileName: true,
          storagePath: true,
          reviewNote: true,
          updatedAt: true,
        },
      })
    : [];

  // Indexation des pièces par studentId -> requirementId
  const docsByStudentAndReq = new Map<string, (typeof pageStudentDocs)[0]>();
  for (const doc of pageStudentDocs) {
    if (doc.requirementId) {
      docsByStudentAndReq.set(`${doc.studentId}|${doc.requirementId}`, doc);
    }
  }

  // 7. Construction des items pour la matrice
  const formattedStudents: ReviewStudentItem[] = pageStudents.map((s) => {
    const currentEnrollment = s.enrollments[0]?.class ?? null;
    const kind = resolveStudentKind(s, year);
    const ageCalc = calculateAge(s.dateOfBirth);
    const age = ageCalc ? ageCalc.age : null;
    const formattedAge = formatStudentAge(s.dateOfBirth);

    const docItems: StudentDocItem[] = effectiveRequirements.map((req) => {
      let applicable = true;
      let nonApplicableReason: string | null = null;

      if (req.cycle && currentEnrollment?.cycle && req.cycle !== currentEnrollment.cycle) {
        applicable = false;
        nonApplicableReason = `Non exigé en cycle ${currentEnrollment.cycle.toLowerCase()}`;
      } else if (req.classId && currentEnrollment?.id && req.classId !== currentEnrollment.id) {
        applicable = false;
        nonApplicableReason = `Spécifique à une autre classe`;
      } else if (req.studentKind && req.studentKind !== kind) {
        applicable = false;
        nonApplicableReason = `Non exigé pour les ${kind.toLowerCase()}s`;
      } else if (req.conditional) {
        const cond = req.conditional.toLowerCase().trim();
        if (cond.includes("age < 6") || cond.includes("age_lt_6") || cond.includes("prescolaire")) {
          const isCI = currentEnrollment?.name ? currentEnrollment.name.toUpperCase().includes("CI") : false;
          if (!isCI) {
            applicable = false;
            nonApplicableReason = "Réservé aux élèves de CI";
          } else if (age !== null && age >= 6) {
            applicable = false;
            nonApplicableReason = "Dispensé (élève de 6 ans ou plus)";
          }
        } else if (cond.includes("transfer") || cond.includes("exeat")) {
          if (kind !== "TRANSFERT") {
            applicable = false;
            nonApplicableReason = "Uniquement en cas de transfert";
          }
        }
      }

      const doc = docsByStudentAndReq.get(`${s.id}|${req.id}`);
      let status: "NON_APPLICABLE" | "MANQUANT" | "EN_REGULARISATION" | "FOURNI" | "CONFORME" | "NON_CONFORME" = "MANQUANT";

      if (!applicable) {
        status = "NON_APPLICABLE";
      } else if (!doc) {
        status = "MANQUANT";
      } else {
        if (doc.status === "VALIDATED") {
          status = "CONFORME";
        } else if (doc.status === "REJECTED") {
          status = "NON_CONFORME";
        } else if (doc.status === "EN_REGULARISATION") {
          status = "EN_REGULARISATION";
        } else if (doc.status === "TO_VERIFY") {
          status = "FOURNI";
        } else {
          status = "MANQUANT";
        }
      }

      return {
        requirementId: req.id,
        label: req.label,
        shortLabel: (req as any).shortLabel || req.label,
        category: req.category,
        cycle: req.cycle || null,
        source: req.source as "OFFICIEL" | "ETABLISSEMENT",
        required: req.required,
        pinned: req.pinned,
        order: req.position || 0,
        applicable,
        nonApplicableReason,
        status,
        documentId: doc?.id,
        fileName: doc?.fileName || null,
        fileUrl: null,
        storagePath: doc?.storagePath || null,
        note: doc?.reviewNote || null,
        updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
      };
    });

    const applicableRequiredDocs = docItems.filter((d) => d.applicable && d.required);
    const compliantCount = applicableRequiredDocs.filter((d) => d.status === "CONFORME").length;
    const providedRequired = applicableRequiredDocs.filter(
      (d) => d.status === "CONFORME" || d.status === "FOURNI" || d.status === "EN_REGULARISATION"
    ).length;
    const missingCount = applicableRequiredDocs.filter(
      (d) => d.status === "MANQUANT" || d.status === "NON_CONFORME"
    ).length;

    const isCompliant = applicableRequiredDocs.length > 0 && compliantCount === applicableRequiredDocs.length;

    let parentObj = s.parent
      ? {
          id: s.parent.id,
          firstName: s.parent.firstName,
          lastName: s.parent.lastName,
          phone: s.parent.phone,
        }
      : null;

    if (!parentObj && (s.emergencyContact || s.emergencyPhone)) {
      const names = (s.emergencyContact || "Tuteur").trim().split(" ");
      parentObj = {
        id: "",
        firstName: names.length > 1 ? names.slice(0, -1).join(" ") : names[0] || "Tuteur",
        lastName: names.length > 1 ? names[names.length - 1] : "",
        phone: s.emergencyPhone || null,
      };
    }

    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString() : null,
      age,
      formattedAge,
      gender: s.gender,
      status: s.status as any,
      createdAt: s.createdAt.toISOString(),
      className: currentEnrollment?.name ?? null,
      classId: currentEnrollment?.id ?? null,
      cycle: currentEnrollment?.cycle ?? null,
      parent: parentObj,
      docs: docItems,
      completeness: {
        totalRequired: applicableRequiredDocs.length,
        providedRequired,
        compliantCount,
        missingCount,
        isCompliant,
      },
    };
  });

  const requirementDefs: RequirementDefItem[] = effectiveRequirements.map((r) => ({
    id: r.id,
    label: r.label,
    shortLabel: (r as any).shortLabel || r.label,
    category: r.category,
    cycle: r.cycle ? String(r.cycle) : null,
    source: (r.source ?? "ETABLISSEMENT") as "OFFICIEL" | "ETABLISSEMENT",
    required: r.required,
    pinned: r.pinned,
    order: r.position || 0,
    conditional: r.conditional,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Élèves & Dossiers", href: "/dashboard/students" },
          { label: "Examen des admissions & conformité" },
        ]}
        title="Examen des admissions & conformité"
        description={`${todoCount} dossier${todoCount > 1 ? "s" : ""} d'admission à traiter · Contrôle des pièces réglementaires`}
      />

      <ReviewPortalClient
        students={formattedStudents}
        classes={classes}
        requirementDefs={requirementDefs}
        initialFilter={currentTab}
        sqlCounts={sqlCounts}
        currentPage={safePage}
        totalPages={totalPages}
        totalFilteredCount={totalFilteredCount}
      />
    </div>
  );
}
