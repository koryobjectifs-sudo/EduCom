"use server";

import { prisma } from "@/lib/prisma";

export async function submitSurveyResponse(data: {
  surveyId: string;
  respondentName: string;
  answers: any;
}) {
  await prisma.surveyResponse.create({
    data: {
      surveyId: data.surveyId,
      respondentName: data.respondentName || null,
      answers: data.answers
    }
  });

  return { success: true };
}
