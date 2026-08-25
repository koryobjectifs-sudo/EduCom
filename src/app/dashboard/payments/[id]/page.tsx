import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import InvoiceViewerClient from "./InvoiceViewerClient";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Aperçu de la Facture - EduCom",
};

export default async function ViewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, schoolId, school } = await requireSchoolContext();

  const invoice = await prisma.invoice.findUnique({
    where: { id, schoolId },
    include: {
      items: true,
      student: true,
    }
  });

  if (!invoice) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4 print:hidden">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
          Retour
        </Link>
        <h1 className="text-xl font-semibold text-text">Détails de la facture</h1>
      </div>
      
      <InvoiceViewerClient invoice={invoice} school={school} />
    </div>
  );
}
