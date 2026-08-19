import Link from "next/link";
import {
  Users, School, CreditCard, TriangleAlert, UserPlus,
  ClipboardCheck, FileQuestion, ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
// ⚠️ Composant SERVEUR : la notation pointée `DataTable.Head` est inutilisable
// ici. `DataTable` est un module `"use client"`, et ses propriétés statiques ne
// traversent pas la frontière RSC — elles valent `undefined`, ce qui produit
// « Element type is invalid ». Les exports nommés, eux, sont correctement
// transformés en références client.
import {
  DataTable, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmptyRow,
} from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import AttentionList, { type AttentionItem } from "@/components/dashboard/AttentionList";
import ActivityFeed, { type ActivityEvent } from "@/components/dashboard/ActivityFeed";
import PremiersPas from "@/components/dashboard/PremiersPas";

/**
 * Tableau de bord — supervision de l'établissement.
 *
 * ═══ TOUTE VALEUR AFFICHÉE VIENT D'UNE REQUÊTE RÉELLE ═══
 *
 * L'ancienne version portait quatre fictions :
 *   · `studentTarget = 500` — objectif inventé, commenté « mock objective »
 *   · `attendanceRate: 98` — aucune donnée de présence n'existe au schéma
 *   · `TodoListWidget` — trois tâches en dur, état en mémoire React, perdues au
 *     rechargement
 *   · `ActivityFeedWidget` — quatre événements et noms d'élèves inventés
 *
 * Plus `SchoolHealthWidget`, dont **trois filtres temporels sur quatre**
 * (Quotidien, Hebdo, Mensuel) lisaient une table `filterData` entièrement
 * simulée. Tous retirés — voir le rapport du lot 08.
 *
 * ═══ PERFORMANCE ═══
 *
 * Les requêtes partent en parallèle (`Promise.all`) au lieu d'être enchaînées.
 * La liste des factures sert **trois usages** — totaux, comptage des retards et
 * tableau des dernières factures — plutôt que d'être requêtée trois fois.
 *
 * ═══ PORTÉE PAR RÔLE ═══
 *
 * Le tableau de bord est accessible à six rôles (`/dashboard$`). Les blocs
 * financiers ne s'affichent que pour ceux qui ont accès à `/dashboard/payments`,
 * via `hasAccess()` — un enseignant n'a pas à lire le chiffre d'affaires de
 * l'établissement. Aucune permission n'est modifiée : la portée est décidée à
 * l'affichage, depuis la source de vérité existante.
 */
export default async function DashboardHome() {
  const { schoolId, school, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  const canSeeMoney = hasAccess(role, "/dashboard/payments");
  const canSeeValidation = hasAccess(role, "/dashboard/documents/validation");
  const canSeeStudents = hasAccess(role, "/dashboard/students");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    invoices,
    enrolledCount,
    pendingStudentsCount,
    newStudentsCount,
    classesCount,
    submittedReportCards,
    pendingDocRequests,
    recentPayments,
    recentStudents,
    recentInboundMessages,
  ] = await Promise.all([
    // Une seule lecture des factures : totaux, retards et tableau en découlent.
    prisma.invoice.findMany({
      where: { schoolId },
      select: {
        id: true, title: true, status: true, totalAmount: true, dueDate: true, createdAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({ where: { schoolId, status: "ENROLLED" } }),
    prisma.student.count({ where: { schoolId, status: "PENDING" } }),
    // Vraie comparaison temporelle : inscriptions des 30 derniers jours.
    prisma.student.count({ where: { schoolId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.reportCard.count({ where: { schoolId, status: "SUBMITTED" } }),
    prisma.documentRequest.count({ where: { schoolId, status: "PENDING" } }),
    prisma.payment.findMany({
      where: { schoolId },
      select: {
        id: true, amount: true, createdAt: true,
        invoice: { select: { student: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.student.findMany({
      where: { schoolId },
      select: { id: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.message.findMany({
      where: { schoolId, direction: "INBOUND" },
      select: {
        id: true, createdAt: true,
        parent: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  // ── Dérivations en mémoire, sur les factures déjà chargées ──
  const collected = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.totalAmount, 0);
  const outstanding = invoices
    .filter((i) => i.status === "PENDING" || i.status === "OVERDUE")
    .reduce((s, i) => s + i.totalAmount, 0);
  const overdue = invoices.filter((i) => i.status === "OVERDUE");
  const overdueTotal = overdue.reduce((s, i) => s + i.totalAmount, 0);
  const recentInvoices = invoices.slice(0, 5);

  // ── Priorité 1 : ce qui demande une action ──
  const attention: AttentionItem[] = [];
  if (canSeeMoney) {
    attention.push({
      label: "Factures en retard",
      detail: `${overdue.length} facture${overdue.length > 1 ? "s" : ""} · ${overdueTotal.toLocaleString("fr-FR")} FCFA à recouvrer`,
      count: overdue.length,
      href: "/dashboard/payments",
      cta: "Voir les paiements",
      icon: TriangleAlert,
      severity: "danger",
    });
  }
  if (canSeeStudents) {
    attention.push({
      label: "Admissions à valider",
      detail: `${pendingStudentsCount} dossier${pendingStudentsCount > 1 ? "s" : ""} en attente`,
      count: pendingStudentsCount,
      href: "/dashboard/students",
      cta: "Examiner",
      icon: UserPlus,
      severity: "warning",
    });
  }
  if (canSeeValidation) {
    attention.push({
      label: "Bulletins déposés à relire",
      detail: `${submittedReportCards} bulletin${submittedReportCards > 1 ? "s" : ""} transmis au secrétariat`,
      count: submittedReportCards,
      href: "/dashboard/documents/validation",
      cta: "Relire",
      icon: ClipboardCheck,
      severity: "warning",
    });
  }
  attention.push({
    label: "Demandes de documents",
    detail: `${pendingDocRequests} demande${pendingDocRequests > 1 ? "s" : ""} non traitée${pendingDocRequests > 1 ? "s" : ""}`,
    count: pendingDocRequests,
    href: "/dashboard/documents",
    cta: "Traiter",
    icon: FileQuestion,
    severity: "info",
  });

  // ── Priorité 3 : activité, fusionnée depuis trois sources réelles ──
  const events: ActivityEvent[] = [
    ...(canSeeMoney
      ? recentPayments.map((p) => ({
          id: `pay-${p.id}`,
          kind: "payment" as const,
          label: p.invoice?.student
            ? `Paiement de ${p.amount.toLocaleString("fr-FR")} FCFA — ${p.invoice.student.firstName} ${p.invoice.student.lastName}`
            : `Paiement de ${p.amount.toLocaleString("fr-FR")} FCFA reçu`,
          at: p.createdAt,
        }))
      : []),
    ...recentStudents.map((s) => ({
      id: `stu-${s.id}`,
      kind: "enrollment" as const,
      label: `Nouvel élève enregistré — ${s.firstName} ${s.lastName}`,
      at: s.createdAt,
    })),
    ...recentInboundMessages.map((m) => ({
      id: `msg-${m.id}`,
      kind: "message" as const,
      label: m.parent
        ? `Message reçu de ${m.parent.firstName} ${m.parent.lastName}`
        : "Message reçu d'une famille",
      at: m.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  // ── En-tête : vrai prénom, repli neutre et honnête ──
  const firstName = user.firstName?.trim();
  const greeting = firstName ? `Bonjour, ${firstName}` : "Bonjour";

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={greeting}
        description={school?.name ?? undefined}
      />

      {/* PRIORITÉ 0 — chantier PLG : tant qu'aucun élève n'existe, un mur de
          zéros n'apprend rien. Le panneau s'efface DE LUI-MÊME au premier élève,
          parce qu'il est piloté par une absence réelle et non par un drapeau. */}
      {enrolledCount === 0 && pendingStudentsCount === 0 && (
        <PremiersPas
          schoolName={school?.name ?? "Votre établissement"}
          classesCount={classesCount}
          canAddStudent={canSeeStudents}
        />
      )}

      {/* PRIORITÉ 1 — ce qui demande une action, avant tout chiffre. */}
      <AttentionList items={attention} />

      {/* PRIORITÉ 2 — indicateurs. Chacun répond à une question métier et
          provient d'une requête ; aucun pourcentage d'évolution inventé. */}
      <div className={`grid grid-cols-2 gap-4 ${canSeeMoney ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
        <Kpi
          icon={Users}
          label="Élèves inscrits"
          value={enrolledCount.toLocaleString("fr-FR")}
          hint={newStudentsCount > 0 ? `${newStudentsCount} enregistré${newStudentsCount > 1 ? "s" : ""} sur 30 jours` : "Aucune arrivée sur 30 jours"}
        />
        <Kpi
          icon={School}
          label="Classes"
          value={classesCount.toLocaleString("fr-FR")}
          hint={classesCount > 0 ? `${Math.round(enrolledCount / classesCount)} élèves par classe en moyenne` : "Aucune classe créée"}
        />
        {canSeeMoney && (
          <>
            <Kpi
              icon={CreditCard}
              label="Encaissé"
              value={collected.toLocaleString("fr-FR")}
              unit="FCFA"
              hint={`${invoices.filter((i) => i.status === "PAID").length} facture(s) réglée(s)`}
              tone="success"
            />
            <Kpi
              icon={TriangleAlert}
              label="Reste à encaisser"
              value={outstanding.toLocaleString("fr-FR")}
              unit="FCFA"
              hint={`dont ${overdueTotal.toLocaleString("fr-FR")} FCFA en retard`}
              tone={overdue.length > 0 ? "danger" : "neutral"}
            />
          </>
        )}
      </div>

      {/* PRIORITÉS 3 et 4 — lecture verticale : l'activité à gauche (plus
          large), les dernières factures à droite. Sur mobile, l'activité passe
          après les factures car elle est moins actionnable. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {canSeeMoney && (
          <div className="lg:col-span-3 lg:order-1">
            <Card
              flush
              title="Dernières factures"
              actions={
                <Link
                  href="/dashboard/payments"
                  className="inline-flex items-center gap-1 rounded-control text-role-meta font-medium text-text-soft transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Tout voir
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <DataTable caption="Cinq dernières factures émises">
                <TableHead>
                  <tr>
                    <TableHeadCell>Facture</TableHeadCell>
                    <TableHeadCell numeric>Montant</TableHeadCell>
                    <TableHeadCell className="hidden sm:table-cell">Émise le</TableHeadCell>
                    <TableHeadCell>Statut</TableHeadCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableEmptyRow colSpan={4}>
                      <EmptyState
                        icon={CreditCard}
                        title="Aucune facture"
                        description="Les factures émises apparaîtront ici."
                        size="sm"
                      />
                    </TableEmptyRow>
                  ) : (
                    recentInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <span className="font-medium text-text">{inv.title}</span>
                          <span className="block text-role-meta text-text-faint">
                            {inv.student
                              ? `${inv.student.firstName} ${inv.student.lastName}`
                              : "Destinataire non défini"}
                          </span>
                        </TableCell>
                        <TableCell numeric>
                          <span className="font-semibold text-text">
                            {inv.totalAmount.toLocaleString("fr-FR")}
                          </span>
                          <span className="ml-1 text-role-meta text-text-faint">FCFA</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap text-text-soft">
                          {inv.createdAt.toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge domain="invoice" status={inv.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </DataTable>
            </Card>
          </div>
        )}

        <div className={`${canSeeMoney ? "lg:col-span-2 lg:order-2" : "lg:col-span-5"} order-first lg:order-none`}>
          <ActivityFeed events={events} />
        </div>
      </div>
    </div>
  );
}

/**
 * Indicateur clé.
 *
 * Défini ici plutôt que dans `components/ui` : c'est une composition de `Card`
 * propre au tableau de bord, pas une primitive du socle. Les cinq écrans
 * opérationnels n'en ont pas besoin.
 */
function Kpi({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = "neutral",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  unit?: string;
  hint: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const hintTone =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text-faint";

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">
          {label}
        </p>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-text-faint" />
      </div>
      <p className="mt-2 text-role-page font-semibold tabular-nums leading-none text-text">
        {value}
        {unit && <span className="ml-1.5 text-role-body font-medium text-text-faint">{unit}</span>}
      </p>
      <p className={`mt-2 text-role-meta ${hintTone}`}>{hint}</p>
    </Card>
  );
}
