import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getConseilContext } from "./actions";
import ConseilClient from "./ConseilClient";

export const metadata = { title: "Conseil de classe | EduCom" };

/**
 * Bloc conseil de classe — administration uniquement (`hasAccess()` referme
 * ce chemin à `TEACHER` via `ROLE_DENIALS`, et les autres rôles n'ont de
 * toute façon aucun accès à `/dashboard/grades/*`).
 */
export default async function ConseilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const classId = one("class");
  const termId = one("term");
  const cycle = one("cycle") === "ELEMENTAIRE" ? "ELEMENTAIRE" : "SECONDAIRE";
  if (!classId || !termId) redirect("/dashboard/grades");

  const ctx = await getConseilContext(classId, termId, cycle);

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
        <ConseilClient ctx={ctx} />
      )}
    </div>
  );
}
