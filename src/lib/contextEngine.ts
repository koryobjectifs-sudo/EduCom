import { prisma } from "@/lib/prisma";
import type { RoleType } from "@/lib/permissions";

export type PeriodKind =
  | "Admission"
  | "Teaching"
  | "Assessment"
  | "Grade Entry"
  | "Report Cards"
  | "Re-registration"
  | "Vacation";

export type ConfiguredPeriod = {
  kind: PeriodKind;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
};

export type CurrentContext = {
  period: PeriodKind;
  role: RoleType;
  /** Active events or workflows tied to this period */
  activeEvents: string[];
  /** Is this a simulated test context? */
  isSimulated: boolean;
};

/**
 * Derives the current contextual period for a school based on a given date.
 * If the school has explicitly configured periods in `School.periods`, it uses them.
 * Otherwise, it attempts to infer the period from terms and evaluations,
 * falling back to "Teaching" or "Vacation".
 */
export async function determineSchoolContext(
  schoolId: string,
  role: RoleType,
  date: Date = new Date(),
  simulatedPeriod?: PeriodKind
): Promise<CurrentContext> {
  // If a simulated period is provided (Local Test Mode), trust it immediately.
  if (simulatedPeriod) {
    return {
      period: simulatedPeriod,
      role,
      activeEvents: [`Simulation: ${simulatedPeriod}`],
      isSimulated: true,
    };
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { periods: true },
  });

  const configuredPeriods = (school?.periods as ConfiguredPeriod[] | null) || [];
  
  // 1. Check explicit configurations first
  for (const p of configuredPeriods) {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (date >= start && date <= end) {
      return {
        period: p.kind,
        role,
        activeEvents: [`Période active: ${p.kind}`],
        isSimulated: false,
      };
    }
  }

  // 2. Fallback inference based on terms and evaluations if no explicit periods match
  const terms = await prisma.term.findMany({
    where: { schoolId },
    select: {
      startDate: true,
      endDate: true,
      evaluations: { select: { date: true, type: true } }
    },
  });

  let inferredPeriod: PeriodKind = "Vacation";
  let activeEvents: string[] = [];

  for (const term of terms) {
    if (!term.startDate || !term.endDate) continue;
    
    // Within term
    if (date >= term.startDate && date <= term.endDate) {
      inferredPeriod = "Teaching"; // Default inside a term
      activeEvents = ["Trimestre en cours"];

      // Check proximity to evaluations
      for (const ev of term.evaluations) {
        if (!ev.date) continue;
        const daysToEval = (ev.date.getTime() - date.getTime()) / 86400000;
        
        if (daysToEval >= 0 && daysToEval <= 7) {
          inferredPeriod = "Assessment";
          activeEvents = ["Évaluation imminente"];
          break;
        } else if (daysToEval < 0 && daysToEval >= -7) {
          inferredPeriod = "Grade Entry";
          activeEvents = ["Saisie des notes en cours"];
          break;
        } else if (daysToEval < -7 && daysToEval >= -14 && ev.type === "EXAM") {
          // Typically report cards are generated shortly after exams
          inferredPeriod = "Report Cards";
          activeEvents = ["Préparation des bulletins"];
          break;
        }
      }
      break; // Found the active term
    }
  }

  // If we are before the first term of the year, it's likely Admission
  if (inferredPeriod === "Vacation" && terms.length > 0) {
    const firstTerm = terms.reduce((earliest, current) => {
      if (!earliest.startDate) return current;
      if (!current.startDate) return earliest;
      return current.startDate < earliest.startDate ? current : earliest;
    });

    if (firstTerm.startDate && date < firstTerm.startDate) {
      const daysToStart = (firstTerm.startDate.getTime() - date.getTime()) / 86400000;
      if (daysToStart <= 60) {
        inferredPeriod = "Admission";
        activeEvents = ["Préparation de la rentrée", "Inscriptions"];
      }
    }
  }

  return {
    period: inferredPeriod,
    role,
    activeEvents,
    isSimulated: false,
  };
}

export type NextBestAction = {
  title: string;
  ctaLabel: string;
  href: string;
  reason: string;
  icon: string;
  severity: "urgent" | "watch" | "info" | "success";
};

/**
 * Computes the Next Best Action based on the Context and available data signals.
 */
export function getNextBestAction(
  context: CurrentContext,
  signals: {
    pendingAdmissions: number;
    incompleteFiles: number;
    unassignedClasses: number;
    missingGrades: number;
    pendingReportCards: number;
    overdueFamilies: number;
    classesCount: number;
    pendingAttendanceClasses: number;
  }
): NextBestAction | null {
  const { period, role } = context;

  // DIRECTOR / SECRETARY logic
  if (role === "OWNER" || role === "ADMIN" || role === "SECRETARY") {
    // Routine d'assiduité (Direction/Secrétariat)
    if (period === "Teaching" || period === "Admission") {
      if (signals.pendingAttendanceClasses > 0 && signals.classesCount > 0) {
        return {
          title: `${signals.pendingAttendanceClasses} classe${signals.pendingAttendanceClasses > 1 ? 's' : ''} en attente d'appel`,
          ctaLabel: "Voir les présences",
          href: "/dashboard/attendance",
          reason: "Le suivi d'assiduité du jour n'est pas encore complet.",
          icon: "clipboardCheck",
          severity: "watch",
        };
      }
    }

    if (period === "Admission" || period === "Re-registration") {
      if (signals.pendingAdmissions > 0) {
        return {
          title: `${signals.pendingAdmissions} admission${signals.pendingAdmissions > 1 ? 's' : ''} en attente`,
          ctaLabel: "Examiner les admissions",
          href: "/dashboard/students",
          reason: "En période d'admission, le traitement rapide des nouveaux dossiers est prioritaire.",
          icon: "userPlus",
          severity: "urgent",
        };
      }
      if (signals.incompleteFiles > 0) {
        return {
          title: `${signals.incompleteFiles} dossier${signals.incompleteFiles > 1 ? 's' : ''} incomplet${signals.incompleteFiles > 1 ? 's' : ''}`,
          ctaLabel: "Compléter les dossiers",
          href: "/dashboard/students",
          reason: "Assurez-vous que tous les dossiers d'inscription sont complets avant la rentrée.",
          icon: "fileWarning",
          severity: "watch",
        };
      }
    }

    if (period === "Teaching") {
      if (signals.unassignedClasses > 0) {
        return {
          title: `${signals.unassignedClasses} classe${signals.unassignedClasses > 1 ? 's' : ''} sans enseignant`,
          ctaLabel: "Affecter les classes",
          href: "/dashboard/classes",
          reason: "En période de cours, l'organisation pédagogique exige que chaque classe ait un responsable.",
          icon: "users",
          severity: "urgent",
        };
      }
    }
    
    if (period === "Assessment" || period === "Grade Entry") {
      if (signals.missingGrades > 0) {
        return {
          title: "Saisies de notes en attente",
          ctaLabel: "Vérifier la saisie",
          href: "/dashboard/grades",
          reason: "Nous sommes en période d'évaluation, le suivi de la saisie des notes est essentiel.",
          icon: "penTool",
          severity: "watch",
        };
      }
    }

    if (period === "Report Cards") {
      if (signals.pendingReportCards > 0) {
        return {
          title: `${signals.pendingReportCards} bulletin${signals.pendingReportCards > 1 ? 's' : ''} à valider`,
          ctaLabel: "Valider les bulletins",
          href: "/dashboard/documents/validation",
          reason: "Les enseignants ont soumis des bulletins. La vérification finale permet leur publication.",
          icon: "clipboardCheck",
          severity: "urgent",
        };
      }
    }
  }

  // TEACHER logic
  if (role === "TEACHER") {
    if (signals.pendingAttendanceClasses > 0 && (period === "Teaching" || period === "Assessment")) {
      return {
        title: "Présence du jour requise",
        ctaLabel: "Prendre les présences",
        href: "/dashboard/attendance",
        reason: "Vous devez enregistrer les présences pour vos classes.",
        icon: "clipboardCheck",
        severity: "urgent",
      };
    }
    if (period === "Grade Entry" || period === "Assessment") {
      if (signals.missingGrades > 0) {
        return {
          title: "Saisie des notes requise",
          ctaLabel: "Saisir mes notes",
          href: "/dashboard/grades",
          reason: "La période de saisie des notes est ouverte pour vos évaluations récentes.",
          icon: "penTool",
          severity: "urgent",
        };
      }
    }
  }

  // ACCOUNTING logic
  if (role === "ACCOUNTANT") {
    if (signals.overdueFamilies > 0) {
      return {
        title: `${signals.overdueFamilies} famille${signals.overdueFamilies > 1 ? 's' : ''} en retard de paiement`,
        ctaLabel: "Voir les impayés",
        href: "/dashboard/payments",
        reason: "Le recouvrement garantit la santé financière de l'établissement.",
        icon: "banknote",
        severity: "urgent",
      };
    }
  }

  // Fallback / Generic WIN mapping for Owner/Admin
  if (role === "OWNER" || role === "ADMIN") {
    if (signals.overdueFamilies > 0) {
      return {
        title: `${signals.overdueFamilies} famille${signals.overdueFamilies > 1 ? 's' : ''} en retard de paiement`,
        ctaLabel: "Gérer les recouvrements",
        href: "/dashboard/payments",
        reason: "Maintien de la santé financière de l'établissement.",
        icon: "banknote",
        severity: "watch",
      };
    }
    
    // First win setup check
    if (signals.classesCount === 0) {
      return {
        title: "Structurer votre établissement",
        ctaLabel: "Créer mes classes",
        href: "/dashboard/classes",
        reason: "La création des classes est la première étape pour configurer votre école.",
        icon: "school",
        severity: "urgent",
      };
    }
  }

  return null;
}
