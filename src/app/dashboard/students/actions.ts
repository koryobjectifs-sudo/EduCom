"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { currentAcademicYear } from "@/lib/studentFile";

/**
 * Admission d'un élève.
 *
 * ⚠️ Cette action n'authentifiait pas l'appelant et résolvait l'établissement
 * par `prisma.school.findFirst()` **sans `orderBy`** — le piège déjà rencontré
 * sur `seed-senegal.ts` : Postgres ne garantit aucun ordre, l'élève et son
 * parent pouvaient donc être créés dans un établissement arbitraire. Le
 * `schoolId` vient maintenant de la session.
 */
export async function createStudent(formData: FormData) {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  // Déclarés hors du `try` : ils servent APRÈS, au moment de la redirection.
  let premierEleve = false;
  let nouvelEleveId: string | null = null;

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const dateOfBirth = formData.get("dateOfBirth") as string;
  const classId = formData.get("classId") as string;
  
  const parentFirstName = formData.get("parentFirstName") as string;
  const parentLastName = formData.get("parentLastName") as string;
  const parentPhone = formData.get("parentPhone") as string;
  const parentEmail = formData.get("parentEmail") as string;
  
  const address = formData.get("address") as string;
  const bloodGroup = formData.get("bloodGroup") as string;
  const medicalNotes = formData.get("medicalNotes") as string;
  const emergencyContact = formData.get("emergencyContact") as string;
  const emergencyPhone = formData.get("emergencyPhone") as string;

  const existingParentId = formData.get("existingParentId") as string;

  const submittedData = {
    firstName, lastName, dateOfBirth, classId, parentFirstName, parentLastName, parentPhone, parentEmail,
    address, bloodGroup, medicalNotes, emergencyContact, emergencyPhone
  };

  if (!firstName || !lastName || !classId || !parentFirstName || !parentLastName || !parentPhone) {
    return { error: "Les champs marqués d'un * sont obligatoires.", formData: submittedData };
  }

  try {
    // La classe vient du formulaire : sans ce contrôle, un élève pourrait être
    // inscrit dans la classe d'un autre établissement.
    const targetClass = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });
    if (!targetClass) {
      return { error: "Classe introuvable dans votre établissement.", formData: submittedData };
    }

    let parentIdToUse = existingParentId;

    // Un `existingParentId` transmis par le client doit être vérifié : sans ce
    // contrôle, on rattacherait l'élève à un parent d'un autre établissement.
    if (parentIdToUse) {
      const candidate = await prisma.user.findFirst({
        where: { id: parentIdToUse, schoolId },
        select: { id: true },
      });
      if (!candidate) {
        return { error: "Parent introuvable dans votre établissement.", formData: submittedData };
      }
    }

    if (!parentIdToUse) {
      // 2. Check if parent already exists
      const parentEmailToUse = parentEmail || `${parentPhone}@placeholder.educom.com`;
      
      const existingParent = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: parentPhone },
            // Only check email if it's not the placeholder
            ...(parentEmail ? [{ email: parentEmail }] : [])
          ],
          schoolId,
        }
      });

      if (existingParent) {
        return {
          requiresConfirmation: true,
          existingParentId: existingParent.id,
          existingParentName: `${existingParent.firstName} ${existingParent.lastName}`,
          formData: submittedData
        };
      }

      // Create a new parent record
      const parent = await prisma.user.create({
        data: {
          firstName: parentFirstName,
          lastName: parentLastName,
          phone: parentPhone,
          email: parentEmailToUse,
          role: "PARENT",
          schoolId,
        }
      });
      parentIdToUse = parent.id;
    }

    // 3. Create the Student linked to the Parent
    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address,
        bloodGroup,
        medicalNotes,
        emergencyContact,
        emergencyPhone,
        schoolId,
        parentId: parentIdToUse,
        status: "ENROLLED"
      }
    });

    // 4. Inscription pour l'année scolaire EN COURS.
    //
    // ⚠️ L'année était figée à « 2023-2024 », commentée « Hardcoded for MVP ».
    // Conséquence directe et visible : le certificat de scolarité — le premier
    // document que produit une école — sortait avec une année scolaire fausse.
    // `currentAcademicYear()` existe depuis le lot 13 et sert déjà partout
    // ailleurs ; c'est la même source de vérité qui est utilisée ici.
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classId: classId,
        academicYear: currentAcademicYear(),
      }
    });

    // Premier élève de l'établissement : c'est le moment où EduCom devient utile.
    // On mène directement au premier document réel plutôt qu'à une liste d'un
    // seul nom. Vrai une seule fois, puis le parcours ordinaire reprend.
    premierEleve = (await prisma.student.count({ where: { schoolId } })) === 1;
    nouvelEleveId = student.id;

  } catch (error: any) {
    console.error("Erreur lors de l'admission:", error);
    if (error.code === 'P2002') {
      return { error: "Un utilisateur avec cet email ou numéro existe déjà.", formData: submittedData };
    }
    return { error: "Une erreur est survenue lors de la création de l'élève.", formData: submittedData };
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
  if (premierEleve && nouvelEleveId) {
    redirect(`/dashboard/documents/certificate?studentId=${nouvelEleveId}&premier=1`);
  }
  redirect("/dashboard/students");
}

export async function deleteStudent(id: string) {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  try {
    await prisma.student.delete({
      where: {
        id,
        schoolId,
      },
    });
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/directory");
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'élève:", error);
    return { error: "Erreur lors de la suppression de l'élève." };
  }
}

export async function deleteStudents(ids: string[]) {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };
  const { schoolId } = auth.ctx;

  if (!ids || ids.length === 0) {
    return { error: "Aucun élève sélectionné." };
  }

  try {
    const result = await prisma.student.deleteMany({
      where: {
        id: { in: ids },
        schoolId,
      },
    });
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/directory");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Erreur lors de la suppression massive:", error);
    return { error: "Erreur lors de la suppression des élèves." };
  }
}

export async function assignStudentToClass(studentId: string, classId: string) {
  const auth = await requireActionContext("/dashboard/students");
  if (!auth.ok) return { error: auth.error };

  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: auth.ctx.schoolId }
    });
    if (!student) return { error: "Élève introuvable." };

    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: auth.ctx.schoolId }
    });
    if (!cls) return { error: "Classe introuvable." };

    const academicYear = currentAcademicYear();

    await prisma.enrollment.create({
      data: {
        studentId,
        classId,
        academicYear,
      }
    });

    revalidatePath("/dashboard/students");
    return { success: true };
  } catch (error) {
    console.error("Error assigning student to class:", error);
    return { error: "Erreur lors de l'assignation." };
  }
}
