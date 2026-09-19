import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
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
  const { user } = await requireSchoolContext();
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const classId = one("class") || one("classId");
  if (!classId) redirect("/dashboard/grades");

  const subjectId = one("subject") || one("subjectId");
  const termId = one("term") || one("termId");

  const ctx = await getSecondaireContext(classId, subjectId, termId);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/grades"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Mes classes
        </Link>

        {isAdmin && ctx.ok && (
          <Link
            href={`/dashboard/grades/conseil?class=${ctx.classId}&term=${ctx.termId}`}
            className="inline-flex items-center gap-1.5 rounded-control border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Conseil de classe &rarr;
          </Link>
        )}
      </div>

      {!ctx.ok ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{ctx.error}</p>
            {isAdmin && (
              <p className="text-xs text-amber-700 mt-1">
                Rattachez les matières de cette classe pour débloquer la saisie des devoirs, compositions et bulletins.
              </p>
            )}
          </div>
          {isAdmin && (
            <Link
              href="/dashboard/settings/pedagogie"
              className="inline-flex items-center gap-1.5 rounded-control bg-amber-800 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-900 transition-colors shrink-0 self-start sm:self-center"
            >
              Configurer les matières &rarr;
            </Link>
          )}
        </div>
      ) : (
        <SecondaireTable key={`${ctx.classId}-${ctx.subjectId}-${ctx.termId}`} ctx={ctx} />
      )}
    </div>
  );
}
