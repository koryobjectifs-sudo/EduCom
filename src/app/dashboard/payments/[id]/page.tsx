import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import InvoiceViewerClient from "./InvoiceViewerClient";
import { Button } from "@/components/ui/Button";
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
        <Button
          variant="ghost"
          href="/dashboard/payments"
          icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        >
          Retour
        </Button>
        <h1 className="text-xl font-semibold text-text">Détails de la facture</h1>
      </div>
      
      <InvoiceViewerClient invoice={invoice} school={school} />
    </div>
  );
}
