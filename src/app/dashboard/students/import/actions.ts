"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { currentAcademicYear } from "@/lib/studentFile";
import { parseFlexibleDate } from "@/lib/dateUtils";
import { OFFICIAL_REQUIREMENTS_BY_CYCLE } from "@/lib/officialRequirements";
import type { EducationalCycle } from "@/generated/prisma/client";

export type {
  EduComFieldKey,
  ImportRow,
  MissingClassDef,
  GuardianConflictDef,
  ImportPreviewResult,
  ImportStudentResult,
} from "./utils";

import {
  deduceCycleAndSerie,
  normalizePhone,
  detectFieldForHeader,
  normalizeRawRow,
  type ImportRow,
  type MissingClassDef,
  type GuardianConflictDef,
  type ImportPreviewResult,
  type ImportStudentResult,
} from "./utils";

// -------------------------------------------------------------
// ACTIONS DU WIZARD ET CONFIGURATION
// -------------------------------------------------------------

export async function getImportConfigAction() {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true,
      importMapping: true,
      dataProcessingAcceptedAt: true,
      classes: { select: { id: true, name: true, cycle: true, serie: true } },
    },
  });

  return {
    accepted: Boolean(school?.dataProcessingAcceptedAt),
    schoolName: school?.name || "Votre établissement",
    savedMapping: (school?.importMapping as Record<string, string>) || {},
    existingClasses: school?.classes || [],
  };
}

export async function saveImportMappingAction(mapping: Record<string, string>) {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  await prisma.school.update({
    where: { id: schoolId },
    data: { importMapping: mapping },
  });

  return { success: true };
}

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

// -------------------------------------------------------------
// PRÉVISUALISATION ET ANALYSE
// -------------------------------------------------------------

export async function executePreviewImport(
  schoolId: string,
  rows: ImportRow[],
): Promise<{ data?: ImportPreviewResult; error?: string }> {
  if (!rows || rows.length === 0) {
    return { error: "Le fichier ne contient aucune donnée." };
  }

  const normalizedRows = rows.map((r) => {
    if (r.firstName !== undefined && r.lastName !== undefined) return r;
    return r;
  });

  const validRows = normalizedRows.filter((r) => r.firstName?.trim() && r.lastName?.trim());
  const invalidRows = normalizedRows.length - validRows.length;

  // 1. Analyse des classes
  const uniqueClassNames = Array.from(
    new Set(validRows.map((r) => r.className?.trim()).filter(Boolean)),
  ) as string[];

  const existingClasses = await prisma.class.findMany({
    where: { schoolId },
    select: { name: true, cycle: true, serie: true },
  });
  const existingClassNamesSet = new Set(existingClasses.map((c) => c.name.toLowerCase().trim()));

  const missingClassNames = uniqueClassNames.filter(
    (name) => !existingClassNamesSet.has(name.toLowerCase().trim()),
  );

  const missingClasses: MissingClassDef[] = await Promise.all(
    missingClassNames.map(async (name) => {
      const { cycle, serie } = await deduceCycleAndSerie(name);
      return { name, cycle, serie };
    }),
  );

  // 2. Détection des doublons élèves
  const existingStudents = await prisma.student.findMany({
    where: { schoolId },
    select: { firstName: true, lastName: true },
  });
  const existingStudentSet = new Set(
    existingStudents.map((s) => `${s.firstName.toLowerCase().trim()}|${s.lastName.toLowerCase().trim()}`),
  );

  let duplicatesCount = 0;
  const duplicateNames: string[] = [];

  for (const row of validRows) {
    const key = `${row.firstName.toLowerCase().trim()}|${row.lastName.toLowerCase().trim()}`;
    if (existingStudentSet.has(key)) {
      duplicatesCount++;
      if (duplicateNames.length < 5) {
        duplicateNames.push(`${row.firstName} ${row.lastName}`);
      }
    }
  }

  // 3. Détection des conflits de tuteurs (même téléphone, nom différent)
  const existingParents = await prisma.user.findMany({
    where: { schoolId, role: "PARENT", phone: { not: null } },
    select: { firstName: true, lastName: true, phone: true },
  });

  const phoneMap = new Map<string, string>();
  for (const p of existingParents) {
    const norm = normalizePhone(p.phone);
    if (norm) {
      phoneMap.set(norm.normalizedDigits, `${p.firstName} ${p.lastName}`.trim());
    }
  }

  const guardianConflicts: GuardianConflictDef[] = [];
  for (const r of validRows) {
    if (r.emergencyPhone && r.emergencyContact) {
      const norm = normalizePhone(r.emergencyPhone);
      if (norm && phoneMap.has(norm.normalizedDigits)) {
        const existingName = phoneMap.get(norm.normalizedDigits)!;
        const incomingName = r.emergencyContact.trim();
        const existingLast = existingName.split(" ").slice(-1)[0].toLowerCase();
        const incomingLast = incomingName.split(" ").slice(-1)[0].toLowerCase();

        // Si le nom de famille est différent, c'est un conflit à signaler
        if (existingLast !== incomingLast && !existingName.toLowerCase().includes(incomingLast)) {
          if (!guardianConflicts.some((c) => c.phone === norm.formatted)) {
            guardianConflicts.push({
              phone: norm.formatted,
              existingName,
              incomingName,
              studentName: `${r.firstName} ${r.lastName}`,
            });
          }
        }
      }
    }
  }

  return {
    data: {
      totalRows: normalizedRows.length,
      validRows: validRows.length,
      invalidRows,
      classesCount: uniqueClassNames.length,
      classesDetected: uniqueClassNames,
      missingClasses,
      existingClasses: existingClasses.map((c) => c.name),
      duplicatesCount,
      duplicateNames,
      guardianConflicts,
      sampleRows: validRows.slice(0, 10),
    },
  };
}

export async function previewImport(rows: ImportRow[]): Promise<{ data?: ImportPreviewResult; error?: string }> {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  return executePreviewImport(auth.ctx.schoolId, rows);
}

// -------------------------------------------------------------
// EXÉCUTION DE L'IMPORTATION (PARTIEL TOUJOURS)
// -------------------------------------------------------------

export async function executeImportStudents(
  schoolId: string,
  rows: ImportRow[],
  options?: {
    skipDuplicates?: boolean;
    confirmedClasses?: MissingClassDef[];
    guardianDecisions?: Record<string, "MERGE" | "SEPARATE">;
  },
): Promise<ImportStudentResult> {
  const schoolDb = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, activeAcademicYear: true, dataProcessingAcceptedAt: true },
  });

  if (!schoolDb?.dataProcessingAcceptedAt) {
    return {
      success: false,
      importedCount: 0,
      classesCreated: [],
      cyclesCreated: [],
      importedStudents: [],
      rejectedRows: [],
      error:
        "Conformité légale : vous devez valider la convention de traitement des données (CDP Sénégal) avant d'importer des élèves.",
      needsDpa: true,
    };
  }

  if (!rows || rows.length === 0) {
    return {
      success: false,
      importedCount: 0,
      classesCreated: [],
      cyclesCreated: [],
      importedStudents: [],
      rejectedRows: [],
      error: "Le fichier ne contient aucune ligne à importer.",
    };
  }

  const skipDuplicates = options?.skipDuplicates ?? false;
  const confirmedClasses = options?.confirmedClasses || [];
  const guardianDecisions = options?.guardianDecisions || {};

  const year = currentAcademicYear(schoolDb);
  const rejectedRows: { rowNumber: number; data: ImportRow; reason: string }[] = [];
  const validRowsToProcess: { row: ImportRow; rowNumber: number }[] = [];

  // Filtrage préliminaire et vérifications des champs requis
  rows.forEach((r, idx) => {
    const rowNum = idx + 1;
    if (!r.firstName?.trim() && !r.lastName?.trim()) {
      rejectedRows.push({ rowNumber: rowNum, data: r, reason: "Nom et prénom manquants" });
      return;
    }
    if (!r.firstName?.trim()) {
      rejectedRows.push({ rowNumber: rowNum, data: r, reason: "Prénom manquant" });
      return;
    }
    if (!r.lastName?.trim()) {
      rejectedRows.push({ rowNumber: rowNum, data: r, reason: "Nom manquant" });
      return;
    }
    validRowsToProcess.push({ row: r, rowNumber: rowNum });
  });

  // 1. Création / Résolution des classes
  const classesCreated: string[] = [];
  const newCyclesSet = new Set<EducationalCycle>();
  const classMap = new Map<string, string>(); // className (lowercase) -> classId

  // Charger les classes existantes
  const existingClasses = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, cycle: true },
  });
  existingClasses.forEach((c) => classMap.set(c.name.toLowerCase().trim(), c.id));
  const existingCycles = new Set(existingClasses.map((c) => c.cycle));

  // Créer les classes manquantes confirmées
  for (const cDef of confirmedClasses) {
    const key = cDef.name.toLowerCase().trim();
    if (!classMap.has(key)) {
      const created = await prisma.class.create({
        data: {
          name: cDef.name.trim(),
          schoolId,
          cycle: cDef.cycle,
          serie: cDef.serie || null,
        },
      });
      classMap.set(key, created.id);
      classesCreated.push(created.name);
      if (!existingCycles.has(created.cycle)) {
        newCyclesSet.add(created.cycle);
      }
    }
  }

  // Si des cycles sont nouveaux pour cette école, appliquer les exigences officielles en batch
  const cyclesCreated = Array.from(newCyclesSet);
  if (cyclesCreated.length > 0) {
    const vises = cyclesCreated.filter((c) => OFFICIAL_REQUIREMENTS_BY_CYCLE[c]);
    if (vises.length > 0) {
      const existantes = await prisma.documentRequirement.findMany({
        where: { schoolId, cycle: { in: vises } },
        select: { cycle: true, label: true },
      });
      const cle = (cycle: string | null, label: string) =>
        `${cycle ?? ""}|${label.trim().toLowerCase().replace(/\s+/g, " ")}`;
      const deja = new Set(existantes.map((r) => cle(r.cycle, r.label)));

      const aCreer = vises.flatMap((cycle) =>
        (OFFICIAL_REQUIREMENTS_BY_CYCLE[cycle] ?? [])
          .filter((r) => !deja.has(cle(cycle, r.label)))
          .map((r, i) => ({
            label: r.label,
            category: r.category,
            cycle,
            source: r.source,
            required: r.required,
            pinned: r.pinned,
            conditional: r.conditional ?? null,
            studentKind: r.studentKind ?? null,
            validityMonths: null,
            position: r.order || i + 1,
            schoolId,
          })),
      );

      if (aCreer.length > 0) {
        await prisma.documentRequirement.createMany({ data: aCreer });
      }
    }
  }

  // 2. Gestion des doublons élèves si demandé
  let candidateRows = validRowsToProcess;
  if (skipDuplicates) {
    const existingStudents = await prisma.student.findMany({
      where: { schoolId },
      select: { firstName: true, lastName: true },
    });
    const existingStudentSet = new Set(
      existingStudents.map((s) => `${s.firstName.toLowerCase().trim()}|${s.lastName.toLowerCase().trim()}`),
    );

    candidateRows = validRowsToProcess.filter(({ row, rowNumber }) => {
      const key = `${row.firstName.toLowerCase().trim()}|${row.lastName.toLowerCase().trim()}`;
      if (existingStudentSet.has(key)) {
        rejectedRows.push({ rowNumber, data: row, reason: "Élève déjà existant dans l'établissement (doublon ignoré)" });
        return false;
      }
      return true;
    });
  }

  // 3. Déduplication et résolution des tuteurs
  const existingParents = await prisma.user.findMany({
    where: { schoolId, role: "PARENT" },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });

  // Map normalizedPhone -> liste des parents existants
  const parentByPhone = new Map<string, { id: string; firstName: string; lastName: string }[]>();
  for (const p of existingParents) {
    const norm = normalizePhone(p.phone);
    if (norm) {
      const list = parentByPhone.get(norm.normalizedDigits) || [];
      list.push({ id: p.id, firstName: p.firstName, lastName: p.lastName });
      parentByPhone.set(norm.normalizedDigits, list);
    }
  }

  const assignedParentIds = new Map<number, string>(); // rowNumber -> parentId

  for (const { row, rowNumber } of candidateRows) {
    const phoneNorm = normalizePhone(row.emergencyPhone);
    const rawContact = (row.emergencyContact || "").trim();

    const names = rawContact ? rawContact.split(/\s+/) : [];
    const pFirst = names.length > 1 ? names.slice(0, -1).join(" ") : names[0] || "Tuteur";
    const pLast = names.length > 1 ? names[names.length - 1] : "Famille";

    if (phoneNorm) {
      const candidates = parentByPhone.get(phoneNorm.normalizedDigits) || [];
      const incomingLastName = pLast.toLowerCase().trim();

      // Vérifier si un parent existant a un nom similaire
      const similarCandidate = candidates.find(
        (c) =>
          c.lastName.toLowerCase().trim() === incomingLastName ||
          c.firstName.toLowerCase().trim() === pFirst.toLowerCase().trim() ||
          rawContact.toLowerCase().includes(c.lastName.toLowerCase().trim()),
      );

      const userChoice = guardianDecisions[phoneNorm.formatted] || guardianDecisions[phoneNorm.normalizedDigits];

      if (similarCandidate || userChoice === "MERGE") {
        // Fusion automatique si nom similaire ou décision explicite
        const targetParent = similarCandidate || candidates[0];
        if (targetParent) {
          assignedParentIds.set(rowNumber, targetParent.id);
          continue;
        }
      }

      // Nom différent ou choix explicite SEPARATE ou pas de candidat existant -> créer un nouveau profil parent
      const placeholderEmail = `${phoneNorm.normalizedDigits}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}@parent.educom.local`;
      const newParent = await prisma.user.create({
        data: {
          firstName: pFirst,
          lastName: pLast,
          phone: phoneNorm.formatted,
          email: placeholderEmail,
          role: "PARENT",
          schoolId,
        },
        select: { id: true, firstName: true, lastName: true },
      });
      candidates.push(newParent);
      parentByPhone.set(phoneNorm.normalizedDigits, candidates);
      assignedParentIds.set(rowNumber, newParent.id);
    } else if (rawContact) {
      // Sans téléphone : créer un tuteur séparé, jamais fusionné
      const placeholderEmail = `tuteur_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}@parent.educom.local`;
      const newParent = await prisma.user.create({
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
      assignedParentIds.set(rowNumber, newParent.id);
    }
  }

  // 4. Création des élèves et inscriptions (Transaction par élève pour garantir l'import partiel)
  const importedStudents: { id: string; firstName: string; lastName: string; className: string }[] = [];

  for (const { row, rowNumber } of candidateRows) {
    try {
      const classId = row.className ? classMap.get(row.className.toLowerCase().trim()) : null;

      // Normalisation de la date de naissance
      let dobDate: Date | null = null;
      if (row.dateOfBirth?.trim()) {
        dobDate = parseFlexibleDate(row.dateOfBirth.trim());
        if (!dobDate) {
          rejectedRows.push({
            rowNumber,
            data: row,
            reason: `Date de naissance invalide : "${row.dateOfBirth}" (format attendu : JJ/MM/AAAA)`,
          });
          continue;
        }
      }

      // Normalisation du sexe
      let genderStr = "M";
      if (row.gender) {
        const g = row.gender.toUpperCase().trim();
        if (g.startsWith("F") || g.startsWith("W")) genderStr = "F";
      }

      const parentId = assignedParentIds.get(rowNumber) || null;

      const student = await prisma.student.create({
        data: {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          gender: genderStr,
          dateOfBirth: dobDate,
          schoolId,
          matricule: row.matricule?.trim() || null,
          parentId,
          status: "ENROLLED",
        },
        select: { id: true, firstName: true, lastName: true },
      });

      // Inscription dans la classe si définie
      if (classId) {
        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            classId,
            academicYear: year,
          },
        });
      }

      importedStudents.push({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: row.className?.trim() || "Sans classe",
      });
    } catch (err: any) {
      console.error(`Erreur import ligne ${rowNumber}:`, err);
      rejectedRows.push({
        rowNumber,
        data: row,
        reason: err?.message || "Erreur interne lors de la création",
      });
    }
  }

  return {
    success: true,
    importedCount: importedStudents.length,
    classesCreated,
    cyclesCreated,
    importedStudents,
    rejectedRows,
  };
}

export async function importStudents(
  rows: ImportRow[],
  options?: {
    skipDuplicates?: boolean;
    confirmedClasses?: MissingClassDef[];
    guardianDecisions?: Record<string, "MERGE" | "SEPARATE">;
  },
): Promise<ImportStudentResult> {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) {
    return {
      success: false,
      importedCount: 0,
      classesCreated: [],
      cyclesCreated: [],
      importedStudents: [],
      rejectedRows: [],
      error: auth.error,
    };
  }
  const { schoolId } = auth.ctx;
  const res = await executeImportStudents(schoolId, rows, options);
  if (res.success) {
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/classes");
  }
  return res;
}
