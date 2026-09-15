import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { getConseilContextWithActor } from "./actions";
import ConseilClient from "./ConseilClient";

export const metadata = {
  title: "Conseil de classe | EduCom",
  description: "Délibération administrative du conseil de classe, distinctions, sanctions et orientation",
};

export default async function ConseilDeClassePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { schoolId, user } = await requireSchoolContext();

  // Garde-fou de sécurité : OWNER et ADMIN uniquement
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect("/dashboard/grades");
  }

  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  let classId = one("class") ?? one("classId");
  const termId = one("term") ?? one("termId");

  if (!classId) {
    const firstClass = await prisma.class.findFirst({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    if (!firstClass) {
      redirect("/dashboard/grades");
    }
    classId = firstClass.id;
  }

  const ctx = await getConseilContextWithActor(
    { userId: user.id, role: user.role, schoolId },
    classId,
    termId,
  );

  return (
    <div className="flex-1 space-y-4 max-w-7xl">
      <Link
        href="/dashboard/grades"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à Notes & Évaluations
      </Link>

      {!ctx.ok ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          {ctx.error}
        </div>
      ) : (
        <ConseilClient key={`${ctx.classId}-${ctx.termId}`} ctx={ctx} />
      )}
    </div>
  );
}
