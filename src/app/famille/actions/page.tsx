import { requireFamilyContext } from "@/lib/familyContext";
import { prisma } from "@/lib/prisma";
import FamilyActionCenterClient, { type FamilyActionItem } from "./FamilyActionCenterClient";

export const metadata = {
  title: "Centre d'Actions Documentaires | Espace Famille EduCom",
  description: "Signatures et dépôts de pièces justificatives pour vos enfants",
};

export default async function FamilyActionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ studentId?: string; reqId?: string }>;
}) {
  const { school, user, schoolId, children } = await requireFamilyContext();
  const sp = searchParams ? await searchParams : {};
  const activeStudentId = sp.studentId;
  const activeReqId = sp.reqId;

  const childrenIds = children.map((c) => c.id);

  if (childrenIds.length === 0) {
    return (
      <FamilyActionCenterClient
        actions={[]}
        activeStudentId={activeStudentId}
        activeReqId={activeReqId}
        schoolName={school.name}
        parentName={`${user.firstName} ${user.lastName}`}
      />
    );
  }

  // 1. Récupération des exigences applicables dans l'école (Signatures et Uploads)
  const requirements = await prisma.documentRequirement.findMany({
    where: {
      schoolId,
      active: true,
      nature: { in: ["SIGNATURE", "UPLOAD"] },
    },
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });

  // 2. Récupération des documents réels déjà soumis
  const documents = await prisma.studentDocument.findMany({
    where: {
      schoolId,
      studentId: { in: childrenIds },
      supersededAt: null,
    },
    select: {
      id: true,
      studentId: true,
      requirementId: true,
      status: true,
      reviewNote: true,
      fileName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 3. Récupération des relances en attente pour le parent
  const reminders = await prisma.documentReminder.findMany({
    where: {
      schoolId,
      parentId: user.id,
      status: "PENDING",
    },
    select: {
      id: true,
      studentId: true,
      requirementId: true,
      message: true,
      createdAt: true,
    },
  });

  // Indexation pour lookup O(1)
  const docMap = new Map<string, (typeof documents)[0]>();
  for (const doc of documents) {
    if (doc.requirementId) {
      docMap.set(`${doc.studentId}|${doc.requirementId}`, doc);
    }
  }

  const reminderMap = new Map<string, (typeof reminders)[0]>();
  for (const rem of reminders) {
    reminderMap.set(`${rem.studentId}|${rem.requirementId}`, rem);
  }

  // 4. Construction des actions par enfant et par exigence
  const actions: FamilyActionItem[] = [];

  for (const child of children) {
    for (const req of requirements) {
      // Filtrage de portée éventuelle par classe
      if (req.classId && child.classId && req.classId !== child.classId) {
        continue;
      }

      const key = `${child.id}|${req.id}`;
      const doc = docMap.get(key);
      const reminder = reminderMap.get(key);

      // Si aucun document et aucune relance, et exigence non requise/non-pinned, ignorer
      if (!doc && !reminder && !req.required && !req.pinned) {
        continue;
      }

      let status: FamilyActionItem["status"] = "ACTION_REQUIRED";
      let reviewNote: string | null = null;
      let fileName: string | null = null;
      let updatedAt: string | null = null;

      if (doc) {
        fileName = doc.fileName;
        updatedAt = doc.updatedAt.toISOString();

        if (doc.status === "VALIDATED") {
          status = "APPROVED";
        } else if (doc.status === "REJECTED") {
          status = "NEEDS_CORRECTION";
          reviewNote = doc.reviewNote;
        } else if (doc.status === "TO_VERIFY" || doc.status === "EN_REGULARISATION") {
          status = "IN_REVIEW";
        } else {
          status = "ACTION_REQUIRED";
        }
      }

      actions.push({
        id: doc?.id || reminder?.id || `${child.id}-${req.id}`,
        studentId: child.id,
        studentName: `${child.firstName} ${child.lastName}`,
        className: child.className,
        requirementId: req.id,
        requirementLabel: req.label,
        nature: req.nature as "SIGNATURE" | "UPLOAD",
        status,
        reviewNote,
        message: reminder?.message || null,
        createdAt: (reminder?.createdAt || doc?.createdAt || new Date()).toISOString(),
        updatedAt,
        fileName,
      });
    }
  }

  return (
    <FamilyActionCenterClient
      actions={actions}
      activeStudentId={activeStudentId}
      activeReqId={activeReqId}
      schoolName={school.name}
      parentName={`${user.firstName} ${user.lastName}`}
    />
  );
}
