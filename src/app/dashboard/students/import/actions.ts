"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { currentAcademicYear } from "@/lib/studentFile";

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

export async function importStudents(rows: ImportRow[]) {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  if (!rows || rows.length === 0) {
    return { error: "Le fichier ne contient aucune donnée valide." };
  }

  try {
    const year = currentAcademicYear();
    let importedCount = 0;

    const validRows = rows.filter(r => r.firstName && r.lastName);
    if (validRows.length === 0) {
      return { error: "Aucun élève valide n'a été trouvé dans le fichier." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Gérer les classes en masse
      const uniqueClassNames = Array.from(new Set(validRows.map(r => r.className?.trim()).filter(Boolean))) as string[];
      const allClassMap = new Map<string, string>();

      if (uniqueClassNames.length > 0) {
        const existingClasses = await tx.class.findMany({
          where: { schoolId, name: { in: uniqueClassNames } }
        });
        const existingClassNames = new Set(existingClasses.map(c => c.name));
        existingClasses.forEach(c => allClassMap.set(c.name, c.id));

        const missingClassNames = uniqueClassNames.filter(name => !existingClassNames.has(name));
        
        if (missingClassNames.length > 0) {
          const newClasses = await tx.class.createManyAndReturn({
            data: missingClassNames.map(name => ({
              name,
              schoolId,
              cycle: "AUTRE" // Default cycle
            }))
          });
          
          newClasses.forEach(c => allClassMap.set(c.name, c.id));
          
          await tx.auditLog.createMany({
            data: newClasses.map(c => ({
              action: "CREATED",
              entity: "Class",
              entityId: c.id,
              userId,
              schoolId,
              details: JSON.stringify({ name: c.name, source: "bulk_import" })
            }))
          });
        }
      }

      // 2. Préparer les données des élèves
      const studentsData = validRows.map(row => {
        let dateOfBirth: Date | null = null;
        if (row.dateOfBirth) {
          const parsed = new Date(row.dateOfBirth);
          if (!isNaN(parsed.getTime())) {
            dateOfBirth = parsed;
          }
        }

        const statusStr = row.status?.trim().toLowerCase() || "actif";
        const mappedStatus = statusStr === "inactif" ? "INACTIVE" 
          : statusStr === "diplomé" ? "GRADUATED" 
          : statusStr === "en attente" ? "PENDING" 
          : "ENROLLED";

        return {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          matricule: row.matricule?.trim() || null,
          gender: row.gender?.trim() || null,
          dateOfBirth,
          emergencyContact: row.emergencyContact?.trim() || null,
          emergencyPhone: row.emergencyPhone?.trim() || null,
          status: mappedStatus as "PENDING" | "ENROLLED" | "GRADUATED" | "INACTIVE",
          schoolId,
        };
      });

      // 3. Créer les élèves en masse
      const createdStudents = await tx.student.createManyAndReturn({
        data: studentsData
      });

      // 4. Lier les inscriptions et générer l'historique
      const enrollmentsData: any[] = [];
      const auditLogsData: any[] = [];

      for (let i = 0; i < createdStudents.length; i++) {
        const student = createdStudents[i];
        const row = validRows[i];

        auditLogsData.push({
          action: "CREATED",
          entity: "Student",
          entityId: student.id,
          userId,
          schoolId,
          details: JSON.stringify({ source: "bulk_import" })
        });

        if (row.className) {
          const className = row.className.trim();
          const classId = allClassMap.get(className);
          if (classId) {
            enrollmentsData.push({
              studentId: student.id,
              classId,
              academicYear: year,
            });
          }
        }
      }

      // 5. Insérer les inscriptions et historiques en masse
      if (enrollmentsData.length > 0) {
        await tx.enrollment.createMany({ data: enrollmentsData });
      }

      if (auditLogsData.length > 0) {
        await tx.auditLog.createMany({ data: auditLogsData });
      }

      importedCount = createdStudents.length;
    }, {
      timeout: 30000,
    });

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/classes");
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error("Erreur lors de l'import:", error);
    return { error: "Une erreur est survenue lors de l'importation. Veuillez vérifier le format de votre fichier." };
  }
}
