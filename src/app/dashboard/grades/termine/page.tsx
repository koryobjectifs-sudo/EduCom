import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getClassCompletionSummary } from "../actions";
import CompletionClient from "./CompletionClient";

export const metadata = {
  title: "Saisie terminée | EduCom",
};

export default async function CompletionPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; termId?: string; evaluationId?: string }>;
}) {
  const { classId, termId, evaluationId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  if (!classId || !termId || !evaluationId) redirect("/dashboard/grades");

  const res = await getClassCompletionSummary(classId, termId, evaluationId);
  if (!res.data) redirect("/dashboard/grades");

  return (
    <CompletionClient
      summary={res.data}
      classId={classId}
      termId={termId}
      evaluationId={evaluationId}
    />
  );
}
