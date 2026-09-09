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

export default async function DossierReviewPage() {
  const { user, schoolId } = await requireSchoolContext();
  const role = user.role as RoleType;

  if (!hasAccess(role, "/dashboard/students")) {
    redirect("/dashboard");
  }

  const actor = { schoolId, userId: user.id, role };
  const scope = await studentWhereFor(actor);
  const year = currentAcademicYear();

  // 1. Récupération parallèle des classes, exigences, élèves et pièces
  const [classes, allConfiguredRequirements, students, allStudentDocs] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, cycle: true },
      orderBy: { name: "asc" },
    }),
    prisma.documentRequirement.findMany({
      where: { schoolId, active: true },
      orderBy: [{ position: "asc" }, { label: "asc" }],
    }),
    prisma.student.findMany({
      where: { AND: [scope, { schoolId }] },
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
        { status: "asc" }, // "PENDING" prioritaire
        { createdAt: "desc" },
      ],
    }),
    prisma.studentDocument.findMany({
      where: {
        schoolId,
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
    }),
  ]);

  // 2. Référentiel des exigences (purement en lecture — aucune écriture au rendu)
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
        shortLabel: r.label,
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

  // 3. Indexation des pièces par studentId -> requirementId
  const docsByStudentAndReq = new Map<string, (typeof allStudentDocs)[0]>();
  for (const doc of allStudentDocs) {
    if (doc.requirementId) {
      docsByStudentAndReq.set(`${doc.studentId}|${doc.requirementId}`, doc);
    }
  }

  // 4. Construction des items pour la matrice avec calcul d'âge et pièces dynamiques
  const formattedStudents: ReviewStudentItem[] = students.map((s) => {
    const currentEnrollment = s.enrollments[0]?.class ?? null;
    const kind = resolveStudentKind(s, year);
    const ageCalc = calculateAge(s.dateOfBirth);
    const age = ageCalc ? ageCalc.age : null;
    const formattedAge = formatStudentAge(s.dateOfBirth);

    // Évaluation de l'applicabilité et de l'état de chaque exigence pour cet élève
    const docItems: StudentDocItem[] = effectiveRequirements.map((req) => {
      let applicable = true;
      let nonApplicableReason: string | null = null;

      // Cycle check
      if (req.cycle && currentEnrollment?.cycle && req.cycle !== currentEnrollment.cycle) {
        applicable = false;
        nonApplicableReason = `Non exigé en cycle ${currentEnrollment.cycle.toLowerCase()}`;
      }
      // Class check
      else if (req.classId && currentEnrollment?.id && req.classId !== currentEnrollment.id) {
        applicable = false;
        nonApplicableReason = `Spécifique à une autre classe`;
      }
      // Student kind check
      else if (req.studentKind && req.studentKind !== kind) {
        applicable = false;
        nonApplicableReason = `Non exigé pour les ${kind.toLowerCase()}s`;
      }
      // Condition check : "age < 6 in CI", transfert, etc.
      else if (req.conditional) {
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
        } else if (cond.includes("transfert") || cond.includes("exeat")) {
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
        } else if (doc.status === "TO_VERIFY" || doc.status === "RECEIVED") {
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

    // Calcul de la complétude basé UNIQUEMENT sur les pièces applicables et requises
    const applicableRequiredDocs = docItems.filter((d) => d.applicable && d.required);
    const compliantCount = applicableRequiredDocs.filter((d) => d.status === "CONFORME").length;
    const providedRequired = applicableRequiredDocs.filter(
      (d) => d.status === "CONFORME" || d.status === "FOURNI" || d.status === "EN_REGULARISATION"
    ).length;
    const missingCount = applicableRequiredDocs.filter(
      (d) => d.status === "MANQUANT" || d.status === "NON_CONFORME"
    ).length;
    
    // Un dossier est complet UNIQUEMENT si toutes ses pièces requises et applicables sont CONFORME
    const isCompliant = applicableRequiredDocs.length > 0 && compliantCount === applicableRequiredDocs.length;

    // Résolution tuteur / parent avec fallback si non renseigné
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

  // Liste globale de toutes les exigences pour la configuration
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

  const pendingCount = formattedStudents.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Élèves & Dossiers", href: "/dashboard/students" },
          { label: "Examen des admissions & conformité" },
        ]}
        title="Examen des admissions & conformité"
        description={`${pendingCount} dossier${pendingCount > 1 ? "s" : ""} d'admission à traiter · Contrôle des pièces réglementaires`}
        actions={
          <a
            href="/dashboard/settings/documents"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
          >
            <span>Configurer les pièces exigées</span>
          </a>
        }
      />

      <ReviewPortalClient
        students={formattedStudents}
        classes={classes}
        requirementDefs={requirementDefs}
        initialFilter="todo"
      />
    </div>
  );
}
