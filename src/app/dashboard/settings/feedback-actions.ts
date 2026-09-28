"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface FeedbackSubmissionData {
  role: string;
  testerName?: string;
  metierLabel: string;
  overallRating: number;
  generalVerdict?: string;
  topPriorityChange?: string;
  // Données des retours stockées en JSON souple
  modulesFeedback: Record<string, Record<string, unknown>>;
}

export async function submitTesterFeedbackAction(data: FeedbackSubmissionData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let schoolId: string | null = null;
    let userId: string | null = null;

    if (user) {
      userId = user.id;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { schoolId: true, role: true, firstName: true, lastName: true },
      });
      schoolId = dbUser?.schoolId || null;
    }

    if (!schoolId) {
      const firstSchool = await prisma.school.findFirst({ select: { id: true } });
      schoolId = firstSchool?.id || "demo-school";
    }

    const feedback = await prisma.testerFeedback.create({
      data: {
        schoolId,
        userId,
        role: data.role || "OWNER",
        testerName: data.testerName || "Testeur Établissement",
        metierLabel: data.metierLabel || "Directeur",
        overallRating: Math.max(1, Math.min(5, data.overallRating || 5)),
        generalVerdict: data.generalVerdict || "Validé",
        topPriorityChange: data.topPriorityChange || null,
        modulesFeedback: (data.modulesFeedback || {}) as unknown as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, id: feedback.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer le retour.";
    console.error("Erreur enregistrement quiz testeur:", error);
    return { success: false, error: message };
  }
}

export async function getTesterFeedbacksAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let schoolId: string | undefined = undefined;
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { schoolId: true },
      });
      if (dbUser?.schoolId) schoolId = dbUser.schoolId;
    }

    const feedbacks = await prisma.testerFeedback.findMany({
      where: schoolId ? { schoolId } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const total = feedbacks.length;
    const avgOverall = total > 0 ? (feedbacks.reduce((acc, f) => acc + f.overallRating, 0) / total).toFixed(1) : "0.0";

    return {
      success: true,
      total,
      avgOverall,
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        role: f.role,
        testerName: f.testerName,
        metierLabel: f.metierLabel,
        overallRating: f.overallRating,
        generalVerdict: f.generalVerdict,
        topPriorityChange: f.topPriorityChange,
        modulesFeedback: (f.modulesFeedback || {}) as Record<string, { rating: number; ceQuiMarche?: string; ceQuiBloque?: string; suggestions?: string }>,
        createdAt: f.createdAt.toISOString(),
      })),
    };
  } catch (error: unknown) {
    console.error("Erreur récupération quiz testeur:", error);
    return { success: false, feedbacks: [], total: 0, avgOverall: "0.0" };
  }
}
