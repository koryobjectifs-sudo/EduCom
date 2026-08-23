import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { resolveEntryContext } from "@/lib/gradeEntry";
import { DataState } from "@/components/dashboard/DataState";
import FastEntry from "@/components/grades/FastEntry";

export const metadata = {
  title: "Saisie | EduCom",
};

/**
 * L'écran de saisie — **tout ce qui peut être déduit l'a déjà été**.
 *
 * Seul `class` est requis. `subject`, `term` et `eval` ne servent qu'aux cas
 * exceptionnels : ils viennent des sélecteurs discrets de l'en-tête, jamais
 * d'une configuration imposée à l'arrivée.
 *
 * ⚠️ Sans classe, on renvoie à la liste plutôt que d'afficher un écran vide :
 * l'URL est peut-être tapée à la main ou héritée d'un signet.
 */
export default async function SaisiePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { schoolId, user } = await requireSchoolContext();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const classId = one("class");
  if (!classId) redirect("/dashboard/grades");

  const res = await resolveEntryContext(
    { schoolId, userId: user.id, role: user.role },
    { classId, subjectId: one("subject"), termId: one("term"), evaluationId: one("eval") },
  );

  if (!res.ok) {
    return (
      <div className="space-y-4 pb-12">
        <Link
          href="/dashboard/grades"
          className="inline-flex items-center gap-1.5 text-role-meta font-medium text-text-soft transition-colors hover:text-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Mes classes
        </Link>
        {/* La raison vient du serveur et s'affiche telle quelle : l'enseignant
            doit savoir quoi faire, pas seulement que ça ne marche pas. */}
        <DataState
          kind="empty"
          icon={ClipboardList}
          title="La saisie ne peut pas s'ouvrir"
          description={res.reason}
          action={{ label: "Configuration", href: "/dashboard/grades/bulletin" }}
        />
      </div>
    );
  }

  /**
   * ⚠️ La `key` fait le remontage quand le contexte change. Sans elle, il
   * faudrait un effet de resynchronisation dans `FastEntry` — et cet effet
   * écrasait la saisie en cours après chaque sauvegarde automatique.
   */
  const c = res.context;
  return <FastEntry key={`${c.subject.id}-${c.term.id}-${c.evaluation.id}`} ctx={c} />;
}
