import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { loadBulletin } from "@/lib/gradeEntry";
import PrintClient from "./PrintClient";

export const metadata = { title: "Impression des bulletins | EduCom" };

/**
 * Impression des bulletins déposés au secrétariat.
 *
 * ⚠️ Contrôle par `hasAccess()`, seule source de vérité : cette page expose des
 * notes non encore relues, le contrôle serveur reste indispensable.
 *
 * ⚠️ Le chargement passe désormais par `loadBulletin()`, partagé avec le
 * générateur. Cette page construisait auparavant sa propre agrégation
 * (regroupements, moyennes, statuts) — une seconde vérité pour le même document.
 */
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; termId?: string; evaluationId?: string }>;
}) {
  const { classId, termId, evaluationId } = await searchParams;
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  if (!hasAccess(role, "/dashboard/documents/validation")) redirect("/dashboard/documents");
  if (!classId || !termId || !evaluationId) redirect("/dashboard/documents/validation");

  const loaded = await loadBulletin({ schoolId, userId: user.id, role }, { classId, termId, evaluationId });
  if (!loaded) redirect("/dashboard/documents/validation");

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, logo: true, signature: true, stamp: true },
  });

  return (
    <PrintClient
      bulletin={loaded.bulletin}
      school={school}
      className={loaded.klass.name}
      termName={loaded.term.name}
      evaluationName={loaded.evaluation?.name ?? loaded.term.name}
      isComposition={loaded.evaluation?.isComposition ?? true}
      academicYear={loaded.academicYear}
    />
  );
}
