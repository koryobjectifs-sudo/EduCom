import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const classId = one("class") ?? one("classId");
  if (!classId) redirect("/dashboard/grades");

  const ctx = await getElementaireContext(classId, one("term") ?? one("termId"));

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
        <ElementaireGrid key={`${ctx.classId}-${ctx.termId}`} ctx={ctx} />
      )}
    </div>
  );
}
