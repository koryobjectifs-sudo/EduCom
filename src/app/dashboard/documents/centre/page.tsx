import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CENTRE_PATH, CENTRE_MANAGE_PATH, listDocuments, listFolders, filterFacets, RECENT_DAYS,
} from "@/lib/schoolDocuments";
import { channels, DIFFUSION_CHANNELS } from "@/lib/channels";
import { diffusedDocumentIds } from "@/lib/diffusion";
import type { EducationalCycle, SchoolDocStatus } from "../../../../generated/prisma/client";
import { CentreClient } from "./CentreClient";

/**
 * Centre documentaire de l'établissement — lot 15.
 *
 * ⚠️ **Ce n'est pas le dossier élève.** On y trouve ce que l'école produit
 * (fournitures, manuels, règlements, formulaires), jamais les pièces
 * personnelles d'un enfant. Les deux écrans ne partagent aucune requête.
 *
 * ═══ LES FILTRES SONT DANS L'URL, ET C'EST VOULU ═══
 *
 * Rechercher et filtrer se font **côté serveur**, depuis `searchParams` : les
 * résultats sont réellement filtrés en base, pas masqués après coup. Un filtre
 * qui cache des lignes déjà chargées est décoratif — et il ment sur les
 * compteurs. Effet de bord utile : une vue filtrée s'envoie par lien.
 */
export default async function CentrePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, schoolId } = await requireSchoolContext();
  const role = user.role as RoleType;
  if (!hasAccess(role, CENTRE_PATH)) redirect(firstAllowedPath(role));

  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : null);

  const ctx = { userId: user.id, schoolId, role };
  const query = {
    q: one("q") ?? undefined,
    folderId: one("folder"),
    status: one("status") as SchoolDocStatus | null,
    audience: one("audience"),
    academicYear: one("year"),
    cycle: one("cycle") as EducationalCycle | null,
    classId: one("class"),
    recent: one("recent") === "1",
  };

  const [documents, folders, facets] = await Promise.all([
    listDocuments(ctx, query),
    listFolders(ctx),
    filterFacets(ctx),
  ]);

  const canManage = hasAccess(role, CENTRE_MANAGE_PATH);

  /**
   * ⚠️ Lot 17 — les capacités de diffusion sont résolues **ici**, sur le
   * serveur, et descendues en props. `src/lib/channels.ts` lit
   * `process.env` : un composant `"use client"` qui l'importerait embarquerait
   * du code serveur dans le bundle navigateur (le défaut du lot 13.1), et
   * surtout n'aurait aucun moyen de connaître la vérité.
   */
  const diffusionChannels = channels()
    .filter((c) => DIFFUSION_CHANNELS.includes(c.id))
    .map((c) => ({ id: c.id, label: c.label, state: c.state, canSend: c.canSend, canPrepare: c.canPrepare, reason: c.reason, missing: c.missing }));

  const diffused = await diffusedDocumentIds(ctx, "schoolDocument", documents.map((d) => d.id));

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Documents", href: "/dashboard/documents" },
          { label: "Centre documentaire" },
        ]}
        title="Centre documentaire"
        description={
          canManage
            ? "Les documents officiels de l'établissement : fournitures, manuels, règlements, formulaires. Vous seul pouvez les publier."
            : "Les documents officiels de l'établissement. Vous voyez ce qui vous concerne, une fois publié par la direction."
        }
      />

      <CentreClient
        folders={folders}
        documents={documents.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          status: String(d.status),
          audience: String(d.audience),
          scopeKind: String(d.scopeKind),
          cycle: d.cycle ? String(d.cycle) : null,
          className: d.class?.name ?? null,
          classId: d.classId,
          folderId: d.folderId,
          folderName: d.folder?.name ?? null,
          academicYear: d.academicYear,
          subject: d.subject,
          fileName: d.fileName,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          version: d.version,
          hasPreviousVersion: d.supersedesId !== null,
          publishedAt: d.publishedAt?.toISOString() ?? null,
          updatedAt: d.updatedAt.toISOString(),
        }))}
        facets={{ years: facets.years, classes: facets.classes.map((c) => ({ ...c, cycle: String(c.cycle) })) }}
        canManage={canManage}
        recentDays={RECENT_DAYS}
        channels={diffusionChannels}
        diffusedIds={[...diffused]}
      />
    </div>
  );
}
