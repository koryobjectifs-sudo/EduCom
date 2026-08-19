import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileStack, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { DOCUMENT_KINDS, documentHref } from "@/lib/documents";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import RequestDocumentDialog from "./RequestDocumentDialog";

/**
 * Hub Documents — point d'entrée de la génération.
 *
 * ═══ CE QUI EST CORRIGÉ ═══
 *
 * 1. **Deux générateurs étaient absents du hub** : lettre de relance et reçu de
 *    paiement. Fonctionnels tous les deux, atteignables seulement en tapant
 *    l'URL. Le catalogue vit maintenant dans `src/lib/documents.ts`, et un
 *    contrôle de vérification le compare aux dossiers réellement présents.
 *
 * 2. **Le bouton « Options d'impression » était factice** : il affichait un
 *    toast « Configuration du serveur d'impression en cours… » alors qu'aucun
 *    serveur d'impression n'existe. Retiré — l'impression se fait par le
 *    navigateur, depuis chaque générateur.
 *
 * 3. **Les modèles demandés n'étaient jamais affichés.** La table
 *    `DocumentRequest` était écrite mais nulle part lue : l'utilisateur envoyait
 *    une demande dans le vide. Elle est désormais listée, avec son statut.
 *
 * ═══ CE QUI DEVIENT SERVEUR ═══
 *
 * La page était `"use client"` alors qu'elle n'avait aucun état, ce qui
 * interdisait toute lecture de données. Elle est maintenant un composant
 * serveur ; seule la boîte de dialogue de demande reste cliente.
 */
export default async function DocumentsHub() {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  const canValidate = hasAccess(role, "/dashboard/documents/validation");

  const requests = await prisma.documentRequest.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // ⚠️ Lot 11.1 : trois générateurs (facture, reçu, relance) sont désormais
  // refusés à `PARENT`. Sans ce filtre, le hub lui proposerait des cartes qui
  // redirigent — exactement les liens morts que le lot 06 a supprimés. Le
  // catalogue reste unique ; c'est `hasAccess()` qui décide, comme partout.
  const visibleKinds = DOCUMENT_KINDS.filter((d) => hasAccess(role, documentHref(d)));

  const primary = visibleKinds.filter((d) => d.primary);
  const secondary = visibleKinds.filter((d) => !d.primary);
  const pending = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Documents" }]}
        title="Documents"
        // Le décompte suit ce qui est réellement offert au rôle : annoncer sept
        // modèles à qui n'en voit que quatre serait un mensonge d'interface.
        description={`${visibleKinds.length} modèle${visibleKinds.length > 1 ? "s" : ""} disponible${visibleKinds.length > 1 ? "s" : ""} · vos informations d'établissement, cachet et signature sont insérés automatiquement`}
        actions={
          <>
            <Link
              href="/dashboard/documents/drafts"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              <FileStack aria-hidden="true" className="h-4 w-4" />
              Brouillons
            </Link>
            {canValidate && (
              <Link
                href="/dashboard/documents/validation"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
                Bulletins à valider
              </Link>
            )}
          </>
        }
      />

      {/* Documents les plus utilisés */}
      <section aria-labelledby="docs-primary" className="space-y-3">
        <h2 id="docs-primary" className="text-role-meta font-semibold uppercase tracking-wider text-text-faint">
          Les plus utilisés
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {primary.map((doc) => {
            const Icon = doc.icon;
            return (
              <Link
                key={doc.id}
                href={documentHref(doc)}
                className="group flex h-full flex-col rounded-surface border border-rule bg-surface p-5 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft group-hover:text-primary"
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  {/* Ce que l'utilisateur devra sélectionner : information utile
                      avant d'ouvrir l'écran, pas une décoration. */}
                  <span className="text-role-meta text-text-faint">par {doc.subject}</span>
                </div>
                <h3 className="mt-3 text-role-card font-semibold text-text group-hover:text-primary">
                  {doc.name}
                </h3>
                <p className="mt-1 flex-1 text-role-body leading-relaxed text-text-soft">
                  {doc.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-role-meta font-semibold text-text-soft group-hover:text-primary">
                  Créer
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Autres modèles */}
      <section aria-labelledby="docs-secondary" className="space-y-3">
        <h2 id="docs-secondary" className="text-role-meta font-semibold uppercase tracking-wider text-text-faint">
          Autres modèles
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {secondary.map((doc) => {
            const Icon = doc.icon;
            return (
              <Link
                key={doc.id}
                href={documentHref(doc)}
                className="group flex items-center gap-3 rounded-surface border border-rule bg-surface p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft group-hover:text-primary"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-role-body font-semibold text-text group-hover:text-primary">
                    {doc.name}
                  </span>
                  <span className="block text-role-meta text-text-faint">par {doc.subject}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Modèles demandés — la table DocumentRequest était écrite mais jamais lue. */}
      <Card
        flush
        title="Modèles demandés"
        description="Besoins de documents enregistrés par votre équipe"
        actions={
          <div className="flex items-center gap-2">
            {pending > 0 && (
              <Badge variant="warning">{pending} en attente</Badge>
            )}
            <RequestDocumentDialog />
          </div>
        }
      >
        {requests.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Inbox}
              title="Aucun modèle demandé"
              description="Si un document vous manque, enregistrez le besoin — il restera visible ici."
              size="sm"
            />
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-role-body font-semibold text-text">{r.name}</p>
                  {r.description && (
                    <p className="mt-0.5 text-role-meta text-text-soft">{r.description}</p>
                  )}
                  <p className="mt-1 text-role-meta text-text-faint">
                    demandé le {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {/* `DocumentRequest.status` est un `String` libre au schéma
                    (PENDING / IN_PROGRESS / COMPLETED), pas une énumération
                    Prisma : il n'entre donc pas dans `status.ts`, qui est
                    cloisonné par domaine typé. Traduit ici, sans table
                    parallèle. */}
                <Badge
                  variant={
                    r.status === "COMPLETED" ? "success" : r.status === "IN_PROGRESS" ? "info" : "warning"
                  }
                  className="shrink-0"
                >
                  {r.status === "COMPLETED" ? "Disponible" : r.status === "IN_PROGRESS" ? "En cours" : "En attente"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
