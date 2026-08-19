import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import ReceiptGenerator from "./Generator";

const PATH = "/dashboard/documents/receipt";

/**
 * ⚠️ **Garde ajoutée au lot 11.1.** Même fuite que le générateur de factures :
 * `PARENT` y accédait par préfixe et voyait tous les élèves de l'établissement.
 * Le reçu est un document que l'école émet, pas que la famille produit.
 */
export default async function ReceiptPage({
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
    <ReceiptGenerator
      students={students}
      school={school}
      initialStudentId={studentId ?? null}
    />
  );
}
