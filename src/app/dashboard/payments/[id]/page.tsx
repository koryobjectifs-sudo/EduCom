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

  if (!invoice) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <InvoiceViewerClient invoice={invoice} school={school} />
    </div>
  );
}
