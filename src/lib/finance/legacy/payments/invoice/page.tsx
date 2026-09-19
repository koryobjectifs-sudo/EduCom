import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import InvoiceViewer from "./InvoiceViewer";
import InvoiceSelector from "./InvoiceSelector";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Facture Officielle - EduCom",
};

const PATH = "/dashboard/payments/invoice";

export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string; studentId?: string }>;
}) {
  const { invoiceId, studentId } = await searchParams;
  const { user, schoolId, school } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  // Règle 4 : Un lien d'intention d'émission depuis un élève mène vers /payments/new
  if (!invoiceId && studentId) {
    redirect(`/dashboard/payments/new?studentId=${studentId}`);
  }

  // Cas 1 : invoiceId fourni -> Affichage et impression de la facture officielle réelle
  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: {
        items: true,
        student: {
          include: {
            enrollments: {
              include: { class: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        payments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!invoice) {
      return (
        <div className="max-w-md mx-auto py-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-text">Facture introuvable</h1>
          <p className="text-xs text-text-soft">
            Cette facture n'existe pas ou n'appartient pas à votre établissement scolaire.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/payments/invoice"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Sélectionner une facture
            </Link>
          </div>
        </div>
      );
    }

    return <InvoiceViewer invoice={invoice} school={school} />;
  }

  // Cas 2 : Pas d'invoiceId -> L'écran ne compose plus rien en mémoire, il permet de choisir une facture existante ou d'en créer une
  const invoices = await prisma.invoice.findMany({
    where: { schoolId },
    include: {
      student: {
        include: {
          enrollments: {
            include: { class: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <InvoiceSelector invoices={invoices} />;
}
