import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSecondaireContext } from "./actions";
import SecondaireTable from "./SecondaireTable";

export const metadata = { title: "Saisie secondaire | EduCom" };

/**
 * Saisie secondaire — une matière, un trimestre : Devoir 1/2/3, Composition,
 * MM en lecture seule, appréciation. `class` et `subject` sont requis :
 * contrairement à l'élémentaire, la matière n'est jamais déductible seule
 * (un professeur peut en couvrir plusieurs dans la même classe).
 */
export default async function SecondairePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const classId = one("class") || one("classId");
  if (!classId) redirect("/dashboard/grades");

  const subjectId = one("subject") || one("subjectId");
  const termId = one("term") || one("termId");

  const ctx = await getSecondaireContext(classId, subjectId, termId);

  return (
    <div className="flex-1 space-y-4">
      <Link
        href="/dashboard/grades"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Mes classes
      </Link>

      {!ctx.ok ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{ctx.error}</div>
      ) : (
        <SecondaireTable ctx={ctx} />
      )}
    </div>
  );
}
