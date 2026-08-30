import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import InvoiceGenerator from "./Generator";

export const metadata = {
  title: "Générateur de Factures - EduCom",
};

const PATH = "/dashboard/payments/invoice";

/**
 * ⚠️ **Garde ajoutée au lot 11.1.** `PARENT` héritait de cet écran par le
 * préfixe `/dashboard/documents` et y voyait la liste complète des élèves de
 * l'établissement, classes comprises. Un parent consulte ses factures ; il n'en
 * émet pas. Le générateur n'est pas modifié (zone du lot 09).
 */
export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const { user, schoolId, school } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  const students = await prisma.student.findMany({
    where: { schoolId },
    include: { enrollments: { include: { class: true } } },
    orderBy: { lastName: "asc" },
  });

  return (
    <InvoiceGenerator
      students={students}
      school={school}
      initialStudentId={studentId ?? null}
    />
  );
}
