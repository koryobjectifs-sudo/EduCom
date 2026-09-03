"use server";

import { prisma } from "@/lib/prisma";

export async function justifyAbsence(formData: FormData) {
  const attendanceId = formData.get("attendanceId") as string;
  const reasonType = formData.get("reasonType") as string;
  const reasonDetails = formData.get("reasonDetails") as string;

  if (!attendanceId || !reasonType) {
    return { success: false, error: "Informations manquantes." };
  }

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
  });

  if (!attendance) {
    return { success: false, error: "Absence introuvable." };
  }

  if (attendance.status !== "ABSENT" && attendance.status !== "LATE") {
    return { success: false, error: "Cette absence a déjà été traitée." };
  }

  const fullReason = reasonType === "Autre" && reasonDetails
    ? `Autre : ${reasonDetails}`
    : reasonType;

  try {
    await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: "EXCUSED",
        reason: fullReason,
      },
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Une erreur est survenue." };
  }
}
