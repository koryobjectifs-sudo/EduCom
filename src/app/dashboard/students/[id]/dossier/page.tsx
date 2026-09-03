import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { auditForEntity, type AuditRecord } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { studentFile } from "@/lib/studentFile";
import { canSeeHealthData, canSeeCategory } from "@/lib/studentScope";
import { channels, DIFFUSION_CHANNELS } from "@/lib/channels";
import { DossierClient } from "./DossierClient";

const PATH = "/dashboard/students";
const REVIEW_PATH = "/dashboard/documents/validation";

/**
 * Dossier numérique d'un élève — lot 13.
 *
 * ⚠️ **Trois vérifications, dans cet ordre** : la session, le droit d'accès au
 * chemin, puis l'appartenance de l'élève à l'école de la session. L'identifiant
 * vient de l'URL et ne prouve rien — `studentFile()` renvoie `null` si l'élève
 * relève d'un autre établissement, et l'écran répond 404. Pas « accès refusé » :
 * un message distinct confirmerait l'existence de l'élève.
 *
 * Le droit de VALIDER est décidé ici depuis `hasAccess()` et transmis au
 * composant client, qui n'en décide rien lui-même — les actions le revérifient
 * de toute façon côté serveur.
 */
export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, schoolId } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const { id } = await params;
  const ctx = { userId: user.id, schoolId, role: user.role };

  const file = await studentFile(ctx, id);
  if (!file) notFound();

  // Historique : aucune table dédiée — `AuditLog` porte déjà tout.
  const docIds = [...file.lines.map((l) => l.document?.id), ...file.loose.map((d) => d.id)]
    .filter((v): v is string => Boolean(v));

  const events: AuditRecord[] = docIds.length
    ? (await Promise.all(docIds.map((d) => auditForEntity(ctx, "studentDocument", d, 20))))
        .flat()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 40)
    : [];

  const actorIds = [...new Set(events.map((e) => e.userId))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { schoolId, id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    : [];

  const fullName = `${file.student.firstName} ${file.student.lastName}`;

  /**
   * Les rayons du dossier, résolus **côté serveur**.
   *
   * ⚠️ Le hub montre TOUS les rayons, y compris vides : un dossier qui
   * n'apparaît que lorsqu'il contient déjà quelque chose est un dossier qu'on
   * ne peut pas remplir. Mais un enseignant n'a rien à faire d'un rayon
   * « Santé » qu'il ne pourra pas ouvrir : la liste est donc filtrée par
   * `canSeeCategory()`, la même règle que le téléchargement et la diffusion.
   * Le composant client n'en décide rien — il reçoit la liste déjà bornée.
   */
  const categories = (["IDENTITE", "INSCRIPTION", "SCOLARITE", "SANTE", "EXAMENS", "TRANSFERT", "AUTRES"] as const)
    .filter((c) => canSeeCategory(ctx, c));

  /**
   * Rayons personnalisés de l'école — « Bourse », « Cantine »…
   *
   * ⚠️ Ils appartiennent à l'ÉTABLISSEMENT, pas à cet élève : un classeur par
   * enfant serait ingérable dès la troisième inscription. Ils s'ajoutent aux
   * sept catégories officielles sans jamais les remplacer.
   */
  const folders = await prisma.studentDocFolder.findMany({
    where: { schoolId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Élèves", href: "/dashboard/students" },
          { label: fullName, href: `/dashboard/students/${id}` },
          { label: "Dossier" },
        ]}
        /* ⚠️ Le `<h1>` dit « Dossier », le nom de l'élève vient dessous. Le titre
           répondait aux deux questions à la fois (« Dossier — Pape Mbaye ») et
           n'en posait aucune nettement : on lit d'abord OÙ l'on est, puis DE QUI
           il s'agit. Le fil d'Ariane et le bouton « Fiche élève » ramènent à
           l'élève ; aucune destination n'a été inventée. */
        title="Dossier"
        description={
          <>
            <span className="block text-role-card font-semibold text-text">{fullName}</span>
            <span className="mt-1 block text-role-meta text-text-soft">
              Les fichiers sont stockés de façon privée et ne sont accessibles qu&apos;après contrôle des droits.
            </span>
          </>
        }
        actions={
          /* ⚠️ Scanner, Importer et Exporter ne sont PLUS ici : ils vivent dans
             la barre d'outils du hub, avec les dossiers sur lesquels ils
             agissent. Un « Exporter » en haut de page ET un dans le hub, c'était
             deux boutons pour un seul geste — le défaut relevé sur l'annuaire.
             Ne reste ici que la navigation. */
          <Link
            href={`/dashboard/students/${id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Fiche élève
          </Link>
        }
      />

      <DossierClient
        categories={categories}
        folders={folders}
        /* ⚠️ Capacités résolues côté SERVEUR : `channels()` lit `process.env`.
           Un composant client qui l'importerait embarquerait du code serveur
           dans le bundle navigateur — le défaut exact du lot 13.1. */
        channels={channels().filter((c) => DIFFUSION_CHANNELS.includes(c.id))
          .map((c) => ({ id: c.id, label: c.label, canSend: c.canSend, reason: c.reason }))}
        studentId={id}
        student={{
          firstName: file.student.firstName,
          lastName: file.student.lastName,
          status: String(file.student.status),
          dateOfBirth: file.student.dateOfBirth?.toISOString() ?? null,
          address: file.student.address,
          // Donnée médicale : masquée à qui n'a pas accès aux pièces de santé.
          // Elle n'est pas seulement cachée à l'affichage, elle n'entre pas dans
          // la page — un champ « masqué en CSS » reste lisible dans la source.
          bloodGroup: canSeeHealthData(ctx) ? file.student.bloodGroup : null,
          emergencyContact: file.student.emergencyContact,
          emergencyPhone: file.student.emergencyPhone,
          createdAt: file.student.createdAt.toISOString(),
          parent: file.student.parent
            ? {
                name: `${file.student.parent.firstName} ${file.student.parent.lastName}`,
                email: file.student.parent.email,
                phone: file.student.parent.phone,
              }
            : null,
        }}
        kind={file.kind}
        kindDeclared={file.student.kindOverride !== null}
        year={file.year}
        enrollments={file.student.enrollments.map((e) => ({
          academicYear: e.academicYear,
          className: e.class.name,
          cycle: String(e.class.cycle),
        }))}
        restricted={file.restricted}
        notice={file.notice}
        lines={file.lines.map((l) => ({
          requirementId: l.requirementId,
          label: l.label,
          category: String(l.category),
          validityMonths: l.validityMonths,
          status: String(l.status),
          needsUpdate: l.needsUpdate,
          document: l.document
            ? {
                id: l.document.id,
                fileName: l.document.fileName,
                mimeType: l.document.mimeType,
                sizeBytes: l.document.sizeBytes,
                uploadedAt: l.document.uploadedAt.toISOString(),
                expiresAt: l.document.expiresAt?.toISOString() ?? null,
                reviewNote: l.document.reviewNote,
                academicYear: l.document.academicYear,
                previousVersions: l.document.previousVersions,
              }
            : null,
        }))}
        loose={file.loose.map((d) => ({
          id: d.id,
          label: d.label,
          category: String(d.category),
          folderId: d.folderId,
          status: String(d.status),
          fileName: d.fileName,
          sizeBytes: d.sizeBytes,
          uploadedAt: d.createdAt.toISOString(),
        }))}
        completeness={file.completeness}
        canReview={hasAccess(user.role, REVIEW_PATH)}
        events={events.map((e) => {
          const a = actors.find((x) => x.id === e.userId);
          return {
            id: e.id,
            action: e.action,
            at: e.createdAt.toISOString(),
            who: a ? `${a.firstName} ${a.lastName}` : "Compte supprimé",
            label: typeof e.details.label === "string" ? e.details.label : null,
          };
        })}
      />
    </div>
  );
}
