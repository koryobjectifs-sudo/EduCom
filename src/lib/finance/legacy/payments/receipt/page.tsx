import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import ReceiptViewer from "./ReceiptViewer";
import ReceiptSelector from "./ReceiptSelector";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Reçu de Paiement - EduCom",
};

const PATH = "/dashboard/payments/receipt";

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string; studentId?: string }>;
}) {
  const { paymentId } = await searchParams;
  const { user, schoolId, school } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  // Cas 1 : paymentId fourni -> Rendu du reçu certifié réel
  if (paymentId) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        invoice: {
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
        },
      },
    });

    if (!payment) {
      return (
        <div className="max-w-md mx-auto py-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-text">Reçu introuvable</h1>
          <p className="text-xs text-text-soft">
            Ce versement n'existe pas ou n'appartient pas à votre établissement scolaire.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/payments/receipt"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Sélectionner un reçu
            </Link>
          </div>
        </div>
      );
    }

    return <ReceiptViewer payment={payment} school={school} />;
  }

  // Cas 2 : Pas de paymentId -> Pas de reçu inventé : affichage de la liste des encaissements réels pour impression
  const payments = await prisma.payment.findMany({
    where: { schoolId },
    include: {
      invoice: {
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <ReceiptSelector payments={payments} />;
}
