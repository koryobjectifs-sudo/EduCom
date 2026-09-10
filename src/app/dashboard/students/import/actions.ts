"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { currentAcademicYear } from "@/lib/studentFile";
import { parseFlexibleDate } from "@/lib/dateUtils";

export type ImportRow = {
  matricule?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  className?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status?: string;
};

export type ImportPreviewResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  classesCount: number;
  duplicatesCount: number;
  classesDetected: string[];
  duplicateNames: string[];
};

export async function getDpaStatusAction() {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, dataProcessingAcceptedAt: true },
  });

  return {
    accepted: Boolean(school?.dataProcessingAcceptedAt),
    acceptedAt: school?.dataProcessingAcceptedAt?.toISOString() ?? null,
    schoolName: school?.name || "Votre établissement",
  };
}

export async function acceptDpaAction() {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  const entetes = await headers();
  const clientIp = entetes.get("x-forwarded-for")?.split(",")[0]?.trim() || entetes.get("x-real-ip") || "127.0.0.1";

  await prisma.school.update({
    where: { id: schoolId },
    data: {
      dataProcessingAcceptedAt: new Date(),
      dataProcessingVersion: "2026-09-v1",
    },
  });

  revalidatePath("/dashboard/students/import");
  return { success: true };
}

export async function normalizeRawRow(row: Record<string, any>): Promise<ImportRow> {
  return parseRawRow(row);
}

function parseRawRow(row: Record<string, any>): ImportRow {
  const normalized: Record<string, any> = {};
  
  for (const [rawKey, val] of Object.entries(row)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val).trim();
    if (!strVal) continue;

    const k = rawKey.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (!normalized.firstName && (k === "firstname" || k.includes("prenom") || k === "first name" || k === "first_name")) {
      normalized.firstName = strVal;
    } else if (!normalized.lastName && (k === "lastname" || (k.includes("nom") && !k.includes("prenom") && !k.includes("tuteur") && !k.includes("parent")) || k === "last name" || k === "last_name" || k === "nom de famille")) {
      normalized.lastName = strVal;
    } else if (!normalized.className && (k.includes("classe") || k.includes("class") || k.includes("niveau") || k.includes("division"))) {
      normalized.className = strVal;
    } else if (!normalized.dateOfBirth && (k.includes("naissance") || k.includes("dob") || k.includes("birth") || k === "date")) {
      normalized.dateOfBirth = strVal;
    } else if (!normalized.gender && (k.includes("sexe") || k.includes("gender") || k.includes("genre"))) {
      normalized.gender = strVal;
    } else if (!normalized.emergencyContact && (k.includes("tuteur") || k.includes("parent") || k.includes("responsable") || k === "emergencycontact")) {
      if (!k.includes("tel") && !k.includes("phone")) {
        normalized.emergencyContact = strVal;
      }
    } else if (!normalized.emergencyPhone && (k.includes("tel") || k.includes("phone") || k.includes("mobile") || k.includes("cellulaire") || k === "emergencyphone")) {
      normalized.emergencyPhone = strVal;
    } else if (!normalized.matricule && (k.includes("matricule") || k.includes("identifiant") || k === "id")) {
      normalized.matricule = strVal;
    } else if (!normalized.status && (k.includes("statut") || k.includes("status"))) {
      normalized.status = strVal;
    }
  }

  return {
    firstName: normalized.firstName || row.firstName || "",
    lastName: normalized.lastName || row.lastName || "",
    className: normalized.className || row.className || "",
    dateOfBirth: normalized.dateOfBirth || row.dateOfBirth || "",
    gender: normalized.gender || row.gender || "",
    emergencyContact: normalized.emergencyContact || row.emergencyContact || "",
    emergencyPhone: normalized.emergencyPhone || row.emergencyPhone || "",
    matricule: normalized.matricule || row.matricule || "",
    status: normalized.status || row.status || "",
  };
}

export async function previewImport(rows: ImportRow[]): Promise<{ data?: ImportPreviewResult; error?: string }> {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  if (!rows || rows.length === 0) {
    return { error: "Le fichier ne contient aucune donnée." };
  }

  const normalizedRows = rows.map((r) => parseRawRow(r));
  const validRows = normalizedRows.filter(r => r.firstName?.trim() && r.lastName?.trim());
  const invalidRows = normalizedRows.length - validRows.length;

  const uniqueClassNames = Array.from(new Set(validRows.map(r => r.className?.trim()).filter(Boolean))) as string[];

  // Fetch existing students to check for potential duplicates based on First Name + Last Name
  const existingStudents = await prisma.student.findMany({
    where: { schoolId },
    select: { firstName: true, lastName: true }
  });

  const existingSet = new Set(existingStudents.map(s => `${s.firstName.toLowerCase().trim()}|${s.lastName.toLowerCase().trim()}`));
  
  let duplicatesCount = 0;
  const duplicateNames: string[] = [];

  for (const row of validRows) {
    const key = `${row.firstName.toLowerCase().trim()}|${row.lastName.toLowerCase().trim()}`;
    if (existingSet.has(key)) {
      duplicatesCount++;
      if (duplicateNames.length < 5) {
        duplicateNames.push(`${row.firstName} ${row.lastName}`);
      }
    }
  }

  return {
    data: {
      totalRows: normalizedRows.length,
      validRows: validRows.length,
      invalidRows,
      classesCount: uniqueClassNames.length,
      duplicatesCount,
      classesDetected: uniqueClassNames,
      duplicateNames
    }
  };
}

export async function importStudents(rows: ImportRow[], skipDuplicates: boolean = false) {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  const schoolDb = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, activeAcademicYear: true, dataProcessingAcceptedAt: true },
  });

  if (!schoolDb?.dataProcessingAcceptedAt) {
    return {
      error: "Conformité légale : vous devez valider la convention de traitement des données (CDP Sénégal) avant d'importer des élèves.",
      needsDpa: true,
    };
  }

  if (!rows || rows.length === 0) {
    return { error: "Le fichier ne contient aucune donnée valide." };
  }

  const normalizedRows = rows.map((r) => parseRawRow(r));

  try {
    const year = currentAcademicYear(schoolDb);
    let importedCount = 0;
    const classBreakdownMap = new Map<string, number>();
    const partialErrors: { row: number; reason: string }[] = [];

    // Filter valid rows with first & last name
    const validRows: (ImportRow & { originalIndex: number })[] = [];
    normalizedRows.forEach((r, idx) => {
      if (!r.firstName?.trim() || !r.lastName?.trim()) {
        partialErrors.push({ row: idx + 1, reason: "Nom ou prénom manquant" });
      } else {
        validRows.push({ ...r, originalIndex: idx + 1 });
      }
    });

    let processRows = validRows;
    if (skipDuplicates) {
      const existingStudents = await prisma.student.findMany({
        where: { schoolId },
        select: { firstName: true, lastName: true },
      });
      const existingSet = new Set(
        existingStudents.map((s) => `${s.firstName.toLowerCase().trim()}|${s.lastName.toLowerCase().trim()}`)
      );
      processRows = validRows.filter((r) => {
        const key = `${r.firstName.toLowerCase().trim()}|${r.lastName.toLowerCase().trim()}`;
        const isDup = existingSet.has(key);
        if (isDup) partialErrors.push({ row: r.originalIndex, reason: "Doublon déjà inscrit (ignoré)" });
        return !isDup;
      });
    }

    if (processRows.length === 0) {
      return {
        error: "Aucun nouvel élève valide à importer.",
        partialErrors,
      };
    }

    let resultStudents: { id: string; firstName: string; lastName: string; className: string }[] = [];

    await prisma.$transaction(
      async (tx) => {
        // 1. Gérer les classes
        const uniqueClassNames = Array.from(
          new Set(processRows.map((r) => r.className?.trim()).filter(Boolean))
        ) as string[];
        const allClassMap = new Map<string, string>();

        if (uniqueClassNames.length > 0) {
          const existingClasses = await tx.class.findMany({
            where: { schoolId, name: { in: uniqueClassNames } },
          });
          const existingClassNames = new Set(existingClasses.map((c) => c.name));
          existingClasses.forEach((c) => allClassMap.set(c.name, c.id));

          const missingClassNames = uniqueClassNames.filter((name) => !existingClassNames.has(name));

          if (missingClassNames.length > 0) {
            const newClasses = await tx.class.createManyAndReturn({
              data: missingClassNames.map((name) => ({
                name,
                schoolId,
                cycle: "ELEMENTAIRE", // Default cycle
              })),
            });

            newClasses.forEach((c) => allClassMap.set(c.name, c.id));

            await tx.auditLog.createMany({
              data: newClasses.map((c) => ({
                action: "CREATED",
                entity: "Class",
                entityId: c.id,
                userId,
                schoolId,
                details: JSON.stringify({ name: c.name, source: "bulk_import" }),
              })),
            });
          }
        }

        // 2. Déduplication intelligente des tuteurs (téléphone + similarité de nom)
        const existingParents = await tx.user.findMany({
          where: { schoolId, role: "PARENT" },
          select: { id: true, firstName: true, lastName: true, phone: true },
        });

        // Map phone -> list of existing parents
        const phoneToParents = new Map<string, { id: string; firstName: string; lastName: string }[]>();
        for (const p of existingParents) {
          if (p.phone) {
            const norm = p.phone.replace(/[^0-9]/g, "");
            if (norm) {
              const list = phoneToParents.get(norm) || [];
              list.push({ id: p.id, firstName: p.firstName, lastName: p.lastName });
              phoneToParents.set(norm, list);
            }
          }
        }

        const rowsWithParentInfo = processRows.filter((r) => r.emergencyPhone || r.emergencyContact);
        const assignedParentIds = new Map<number, string>();

        for (const r of rowsWithParentInfo) {
          const rawPhone = (r.emergencyPhone || "").trim();
          const normPhone = rawPhone.replace(/[^0-9]/g, "");
          const rawContact = (r.emergencyContact || "Parent").trim();
          const names = rawContact.split(" ");
          const pFirst = names.length > 1 ? names.slice(0, -1).join(" ") : names[0] || "Tuteur";
          const pLast = names.length > 1 ? names[names.length - 1] : "Famille";

          if (normPhone) {
            const candidates = phoneToParents.get(normPhone) || [];
            // Vérifier similarité de nom
            const matchingCandidate = candidates.find(
              (c) =>
                c.lastName.toLowerCase().trim() === pLast.toLowerCase().trim() ||
                c.firstName.toLowerCase().trim() === pFirst.toLowerCase().trim() ||
                rawContact.toLowerCase().includes(c.lastName.toLowerCase())
            );

            if (matchingCandidate) {
              // Fusion : même téléphone + nom concordant
              assignedParentIds.set(r.originalIndex, matchingCandidate.id);
            } else {
              // Création d'un nouveau profil tuteur distinct
              const placeholderEmail = `${normPhone}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}@parent.educom.local`;
              const newParent = await tx.user.create({
                data: {
                  firstName: pFirst,
                  lastName: pLast,
                  phone: rawPhone,
                  email: placeholderEmail,
                  role: "PARENT",
                  schoolId,
                },
                select: { id: true, firstName: true, lastName: true },
              });
              candidates.push(newParent);
              phoneToParents.set(normPhone, candidates);
              assignedParentIds.set(r.originalIndex, newParent.id);
            }
          } else if (rawContact) {
            // Sans téléphone : création d'un tuteur distinct non fusionné
            const placeholderEmail = `tuteur_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}@parent.educom.local`;
            const newParent = await tx.user.create({
              data: {
                firstName: pFirst,
                lastName: pLast,
                phone: null,
                email: placeholderEmail,
                role: "PARENT",
                schoolId,
              },
              select: { id: true },
            });
            assignedParentIds.set(r.originalIndex, newParent.id);
          }
        }

        // 3. Préparer les données des élèves
        const studentsData = processRows.map((row) => {
          const dateOfBirth = parseFlexibleDate(row.dateOfBirth);
          const statusStr = row.status?.trim().toLowerCase() || "actif";
          const mappedStatus =
            statusStr === "inactif"
              ? "INACTIVE"
              : statusStr === "diplomé"
              ? "GRADUATED"
              : statusStr === "en attente"
              ? "PENDING"
              : "ENROLLED";

          const parentId = assignedParentIds.get(row.originalIndex) || null;

          return {
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            matricule: row.matricule?.trim() || null,
            gender: row.gender?.trim() || null,
            dateOfBirth,
            emergencyContact: row.emergencyContact?.trim() || null,
            emergencyPhone: row.emergencyPhone?.trim() || null,
            parentId,
            status: mappedStatus as "PENDING" | "ENROLLED" | "GRADUATED" | "INACTIVE",
            schoolId,
          };
        });

        // 4. Créer les élèves en masse
        const createdStudents = await tx.student.createManyAndReturn({
          data: studentsData,
        });

        // 5. Inscriptions et audits
        const enrollmentsData: any[] = [];
        const auditLogsData: any[] = [];

        for (let i = 0; i < createdStudents.length; i++) {
          const student = createdStudents[i];
          const row = processRows[i];

          auditLogsData.push({
            action: "CREATED",
            entity: "Student",
            entityId: student.id,
            userId,
            schoolId,
            details: JSON.stringify({ source: "bulk_import" }),
          });

          const className = row.className?.trim() || "Sans classe";
          resultStudents.push({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            className,
          });

          if (row.className) {
            const classId = allClassMap.get(row.className.trim());
            if (classId) {
              enrollmentsData.push({
                studentId: student.id,
                classId,
                academicYear: year,
              });
              const currentCount = classBreakdownMap.get(row.className.trim()) || 0;
              classBreakdownMap.set(row.className.trim(), currentCount + 1);
            }
          }
        }

        if (enrollmentsData.length > 0) {
          await tx.enrollment.createMany({ data: enrollmentsData });
        }

        if (auditLogsData.length > 0) {
          await tx.auditLog.createMany({ data: auditLogsData });
        }

        // 6. Activer l'école et mettre à jour setupProgress
        await tx.school.update({
          where: { id: schoolId },
          data: {
            schoolActivated: true,
            setupProgress: {
              classes: true,
              students: true,
              curriculum: true,
              calendar: true,
            },
          },
        });

        importedCount = createdStudents.length;
      },
      {
        timeout: 30000,
      }
    );

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard");

    const classesSummary = Array.from(classBreakdownMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      count: importedCount,
      classesSummary,
      importedStudents: resultStudents,
      firstStudent: resultStudents[0] || null,
      partialErrors,
    };
  } catch (error: any) {
    console.error("Erreur lors de l'import:", error);
    return {
      error: "Une erreur est survenue lors de l'importation. Veuillez vérifier le format de votre fichier.",
    };
  }
}
