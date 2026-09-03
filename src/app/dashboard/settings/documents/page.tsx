import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import { RequirementsClient } from "./RequirementsClient";

const PATH = "/dashboard/settings";

/**
 * Checklist documentaire — écran de la direction. Lot 13.
 *
 * ⚠️ Garde côté serveur : `/dashboard/settings` n'est listé par aucun rôle,
 * seuls OWNER et ADMIN l'atteignent via `"*"`.
 *
 * ⚠️ **Rien n'est imposé, mais une proposition existe.** Le référentiel
 * officiel sénégalais (`src/lib/officialRequirements.ts`) peut être appliqué
 * cycle par cycle depuis `RequirementsClient` — jamais automatiquement, jamais
 * sans confirmation. Une école qui préfère partir de zéro peut toujours le
 * faire : les cases ne sont pas cochées par défaut.
 */
export default async function RequirementsPage() {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const [requirements, classes] = await Promise.all([
    prisma.documentRequirement.findMany({
      where: { schoolId },
      orderBy: [{ position: "asc" }, { label: "asc" }],
      include: { class: { select: { name: true } }, _count: { select: { documents: true } } },
    }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Réglages", href: "/dashboard/settings" },
          { label: "Pièces du dossier" },
        ]}
        title="Pièces du dossier élève"
        description="Vous définissez les pièces exigées par votre établissement. Rien n'est imposé : sans configuration, aucune complétude n'est calculée."
      />

      {requirements.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Aucune exigence configurée"
          description="Cochez un ou plusieurs cycles dans le référentiel officiel ci-dessous pour démarrer, ou ajoutez vos propres pièces."
        />
      )}

      <RequirementsClient
        requirements={requirements.map((r) => ({
          id: r.id,
          label: r.label,
          category: String(r.category),
          cycle: r.cycle ? String(r.cycle) : null,
          classId: r.classId,
          className: r.class?.name ?? null,
          academicYear: r.academicYear,
          studentKind: r.studentKind ? String(r.studentKind) : null,
          validityMonths: r.validityMonths,
          active: r.active,
          documentCount: r._count.documents,
        }))}
        classes={classes}
      />
    </div>
  );
}
