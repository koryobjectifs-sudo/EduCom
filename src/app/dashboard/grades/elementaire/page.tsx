import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { getElementaireContext } from "./actions";
import ElementaireGrid from "./ElementaireGrid";

export const metadata = { title: "Saisie élémentaire | EduCom" };

/**
 * Saisie élémentaire — grille élève × sous-discipline, groupée par domaine.
 * Le titulaire saisit tout : pas de sélecteur de matière ici (voir
 * `assertCanEditElementaireClass`).
 */
export default async function ElementairePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSchoolContext();
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const classId = one("class") ?? one("classId");
  if (!classId) redirect("/dashboard/grades");

  const ctx = await getElementaireContext(classId, one("term") ?? one("termId"));

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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{ctx.error}</div>
      ) : (
        <ElementaireGrid key={`${ctx.classId}-${ctx.termId}`} ctx={ctx} />
      )}
    </div>
  );
}
