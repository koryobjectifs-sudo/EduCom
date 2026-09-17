import Link from "next/link";
import { FileStack, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { DocumentsTabs } from "./DocumentsTabs";
import DocumentsLibraryClient, { type LibraryDocumentItem } from "./DocumentsLibraryClient";
import { formatDate } from "@/lib/dateUtils";

export const metadata = {
  title: "Bibliothèque de documents | EduCom",
};

export default async function DocumentsHub({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  const sp = searchParams ? await searchParams : null;
  const initialFilter = sp?.filter || null;

  const canValidate = hasAccess(role, "/dashboard/documents/validation");
  const canManage = hasAccess(role, "/dashboard/documents/centre/gestion");

  // Charger les documents administratifs de l'établissement (SchoolDocument)
  const schoolDocs = await prisma.schoolDocument.findMany({
    where: { schoolId },
    include: {
      class: { select: { name: true } },
      folder: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Charger les documents scolaires des élèves (StudentDocument)
  const studentDocs = await prisma.studentDocument.findMany({
    where: {
      student: { schoolId },
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          enrollments: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { class: { select: { name: true } } },
          },
        },
      },
      requirement: { select: { label: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Charger les reçus récents (Payment)
  const recentPayments = await prisma.payment.findMany({
    where: { schoolId },
    include: {
      invoice: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              enrollments: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: { class: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  // Mapper en items unifiés de la bibliothèque
  const items: LibraryDocumentItem[] = [];

  // 1. Documents administratifs
  for (const sd of schoolDocs) {
    items.push({
      id: `school-doc-${sd.id}`,
      title: sd.title,
      category: "administratif",
      categoryLabel: "Administratif",
      docKind: sd.folder?.name || "Document officiel",
      targetName: sd.class?.name ? `Classe ${sd.class.name}` : "Établissement",
      targetClassName: sd.class?.name || undefined,
      date: formatDate(sd.updatedAt || sd.createdAt),
      fileUrl: sd.storagePath,
      viewUrl: `/dashboard/documents/centre`,
      statusLabel: String(sd.status),
    });
  }

  // 2. Documents élèves
  for (const std of studentDocs) {
    const student = std.student;
    const currentClass = student.enrollments[0]?.class?.name;
    items.push({
      id: `student-doc-${std.id}`,
      title: std.label || std.requirement?.label || "Pièce du dossier élève",
      category: "scolaire",
      categoryLabel: "Scolaire",
      docKind: "Dossier élève",
      targetName: `${student.firstName} ${student.lastName}`,
      targetClassName: currentClass,
      date: formatDate(std.createdAt),
      fileUrl: std.storagePath,
      viewUrl: `/dashboard/students/${student.id}/dossier`,
    });
  }

  // 3. Reçus récents
  for (const pay of recentPayments) {
    const student = pay.invoice?.student;
    const currentClass = student?.enrollments[0]?.class?.name;
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Élève";
    items.push({
      id: `payment-${pay.id}`,
      title: `Reçu de paiement ${pay.receiptNumber || pay.id.slice(0, 8).toUpperCase()}`,
      category: "scolaire",
      categoryLabel: "Paiement",
      docKind: "Reçu de versement",
      targetName: studentName,
      targetClassName: currentClass,
      date: formatDate(pay.createdAt),
      viewUrl: `/dashboard/payments/receipt?paymentId=${pay.id}`,
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Documents" }]}
        title="Documents"
        description="Bibliothèque des documents officiels et scolaires de l'établissement · Recherche, consultation et re-téléchargement"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/documents/drafts"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-4 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              <FileStack aria-hidden="true" className="h-4 w-4" />
              Brouillons
            </Link>
          </div>
        }
      />

      <DocumentsTabs canValidate={canValidate} />

      <DocumentsLibraryClient
        initialDocuments={items}
        initialFilter={initialFilter}
        canManage={canManage}
      />
    </div>
  );
}
