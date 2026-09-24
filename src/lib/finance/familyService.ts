import { prisma } from "@/lib/prisma";
import type { ActorContext } from "@/lib/audit";

export type FamilyStatus = "UP_TO_DATE" | "PARTIAL" | "OVERDUE";

export type FamilyChild = {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  className: string | null;
};

export type FamilyInvoice = {
  id: string;
  invoiceNumber: string | null;
  title: string;
  month: string | null;
  totalAmount: number;
  paidAmount: number;
  reliquat: number;
  dueDate: Date;
  status: string;
  studentId: string | null;
  studentName?: string;
};

export type FamilyRow = {
  id: string;
  parentId: string | null;
  familyName: string;
  guardianName: string;
  guardianPhone: string | null;
  guardianEmail: string | null;
  children: FamilyChild[];
  invoices: FamilyInvoice[];
  unpaidInvoices: FamilyInvoice[];
  totalDue: number;
  totalPaid: number;
  reliquat: number;
  status: FamilyStatus;
  hasOverdue: boolean;
};

export type FamiliesSummary = {
  totalFamilies: number;
  upToDateCount: number;
  partialCount: number;
  overdueCount: number;
  totalDue: number;
  totalPaid: number;
  totalReliquat: number;
};

/**
 * Service de gestion des familles pour le module Finance.
 * 
 * ═══ RÈGLE STRICTE DE CLOISONNEMENT PAR ÉTABLISSEMENT ═══
 * Toutes les requêtes sont partitionnées par `actor.schoolId` côté serveur.
 * Aucune donnée ne peut fuiter d'une école à l'autre.
 */
export async function getFamiliesFinanceData(actor: ActorContext): Promise<{
  families: FamilyRow[];
  summary: FamiliesSummary;
}> {
  if (!actor.schoolId) {
    throw new Error("schoolId manquant dans le contexte de l'acteur.");
  }

  const now = new Date();

  // 1. Récupération des élèves de l'école avec leur classe et leur parent
  const students = await prisma.student.findMany({
    where: { schoolId: actor.schoolId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      matricule: true,
      parentId: true,
      emergencyContact: true,
      emergencyPhone: true,
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
      enrollments: {
        select: {
          class: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // 2. Récupération de toutes les factures de l'école avec leurs paiements
  const invoices = await prisma.invoice.findMany({
    where: { schoolId: actor.schoolId },
    select: {
      id: true,
      invoiceNumber: true,
      title: true,
      month: true,
      totalAmount: true,
      dueDate: true,
      status: true,
      studentId: true,
      parentId: true,
      payments: {
        select: { id: true, amount: true, receiptNumber: true, createdAt: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Table de correspondance élève -> nom complet & parentId
  const studentMap = new Map<string, { fullName: string; parentId: string | null }>();
  for (const s of students) {
    studentMap.set(s.id, {
      fullName: `${s.firstName} ${s.lastName}`,
      parentId: s.parentId,
    });
  }

  // 3. Regroupement par famille (clé = parentId ou "student_${studentId}" si élève sans parent)
  type FamilyAccumulator = {
    id: string;
    parentId: string | null;
    familyName: string;
    guardianName: string;
    guardianPhone: string | null;
    guardianEmail: string | null;
    children: FamilyChild[];
    studentIds: Set<string>;
    invoices: FamilyInvoice[];
  };

  const familyGroups = new Map<string, FamilyAccumulator>();

  for (const s of students) {
    const familyKey = s.parentId ? `parent_${s.parentId}` : `student_${s.id}`;
    let fam = familyGroups.get(familyKey);

    if (!fam) {
      const gName = s.parent
        ? `${s.parent.firstName} ${s.parent.lastName}`
        : (s.emergencyContact || `${s.firstName} ${s.lastName}`);
      const gPhone = s.parent?.phone || s.emergencyPhone || null;
      const gEmail = s.parent?.email || null;
      const fName = s.parent
        ? `Famille ${s.parent.lastName.toUpperCase()}`
        : `Famille ${s.lastName.toUpperCase()}`;

      fam = {
        id: familyKey,
        parentId: s.parentId,
        familyName: fName,
        guardianName: gName,
        guardianPhone: gPhone,
        guardianEmail: gEmail,
        children: [],
        studentIds: new Set<string>(),
        invoices: [],
      };
      familyGroups.set(familyKey, fam);
    }

    fam.studentIds.add(s.id);
    fam.children.push({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      matricule: s.matricule,
      className: s.enrollments[0]?.class?.name || null,
    });
  }

  // 4. Rattachement des factures aux familles
  for (const inv of invoices) {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const reliquat = Math.max(0, inv.totalAmount - paid);
    const studentInfo = inv.studentId ? studentMap.get(inv.studentId) : undefined;

    const formattedInv: FamilyInvoice = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      title: inv.title,
      month: inv.month,
      totalAmount: inv.totalAmount,
      paidAmount: paid,
      reliquat,
      dueDate: inv.dueDate,
      status: inv.status,
      studentId: inv.studentId,
      studentName: studentInfo?.fullName,
    };

    // Trouver le groupe familial correspondant
    let targetFam: FamilyAccumulator | undefined;

    if (inv.parentId) {
      targetFam = familyGroups.get(`parent_${inv.parentId}`);
    } else if (inv.studentId) {
      const pId = studentInfo?.parentId;
      if (pId) {
        targetFam = familyGroups.get(`parent_${pId}`);
      }
      if (!targetFam) {
        targetFam = familyGroups.get(`student_${inv.studentId}`);
      }
    }

    if (targetFam) {
      targetFam.invoices.push(formattedInv);
    } else {
      // Cas résiduel : facture rattachée à un élève/parent qui n'est pas dans la liste des élèves actifs
      const syntheticKey = inv.parentId ? `parent_${inv.parentId}` : (inv.studentId ? `student_${inv.studentId}` : `inv_${inv.id}`);
      let synFam = familyGroups.get(syntheticKey);
      if (!synFam) {
        synFam = {
          id: syntheticKey,
          parentId: inv.parentId,
          familyName: `Facture ${inv.invoiceNumber || inv.id}`,
          guardianName: studentInfo?.fullName || "Client externe",
          guardianPhone: null,
          guardianEmail: null,
          children: inv.studentId && studentInfo ? [{
            id: inv.studentId,
            firstName: studentInfo.fullName,
            lastName: "",
            matricule: null,
            className: null,
          }] : [],
          studentIds: new Set(inv.studentId ? [inv.studentId] : []),
          invoices: [],
        };
        familyGroups.set(syntheticKey, synFam);
      }
      synFam.invoices.push(formattedInv);
    }
  }

  // 5. Calcul des totaux et statuts pour chaque famille
  let totalDueAll = 0;
  let totalPaidAll = 0;
  let totalReliquatAll = 0;
  let upToDateCount = 0;
  let partialCount = 0;
  let overdueCount = 0;

  const families: FamilyRow[] = [];

  for (const fam of familyGroups.values()) {
    let famDue = 0;
    let famPaid = 0;
    let hasOverdue = false;
    const unpaidInvoices: FamilyInvoice[] = [];

    for (const inv of fam.invoices) {
      famDue += inv.totalAmount;
      famPaid += inv.paidAmount;
      if (inv.reliquat > 0) {
        unpaidInvoices.push(inv);
        if (new Date(inv.dueDate) < now) {
          hasOverdue = true;
        }
      }
    }

    const famReliquat = Math.max(0, famDue - famPaid);

    let status: FamilyStatus = "UP_TO_DATE";
    if (famDue === 0 || famReliquat === 0) {
      status = "UP_TO_DATE";
      upToDateCount++;
    } else if (hasOverdue) {
      status = "OVERDUE";
      overdueCount++;
    } else if (famPaid > 0) {
      status = "PARTIAL";
      partialCount++;
    } else {
      // Non encore échu mais non payé
      status = "PARTIAL";
      partialCount++;
    }

    totalDueAll += famDue;
    totalPaidAll += famPaid;
    totalReliquatAll += famReliquat;

    families.push({
      id: fam.id,
      parentId: fam.parentId,
      familyName: fam.familyName,
      guardianName: fam.guardianName,
      guardianPhone: fam.guardianPhone,
      guardianEmail: fam.guardianEmail,
      children: fam.children,
      invoices: fam.invoices,
      unpaidInvoices,
      totalDue: famDue,
      totalPaid: famPaid,
      reliquat: famReliquat,
      status,
      hasOverdue,
    });
  }

  // Tri : Familles avec reliquat en premier (En retard, puis Partiel, puis À jour)
  families.sort((a, b) => {
    if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
    if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1;
    if (a.status === "PARTIAL" && b.status === "UP_TO_DATE") return -1;
    if (b.status === "PARTIAL" && a.status === "UP_TO_DATE") return 1;
    if (b.reliquat !== a.reliquat) return b.reliquat - a.reliquat;
    return a.familyName.localeCompare(b.familyName);
  });

  return {
    families,
    summary: {
      totalFamilies: families.length,
      upToDateCount,
      partialCount,
      overdueCount,
      totalDue: totalDueAll,
      totalPaid: totalPaidAll,
      totalReliquat: totalReliquatAll,
    },
  };
}
