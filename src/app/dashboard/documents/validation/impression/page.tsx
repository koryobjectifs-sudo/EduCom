import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { loadOfficialBulletin } from "@/lib/bulletin/loadOfficialBulletin";
import PrintClient from "./PrintClient";

export const metadata = { title: "Impression des bulletins | EduCom" };

/**
 * Impression des bulletins déposés au secrétariat.
 *
 * ⚠️ Le chargement passe désormais par `loadOfficialBulletin()`, unifié avec le
 * générateur et les gabarits officiels sénégalais (v18).
 */
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; termId?: string; studentId?: string }>;
}) {
  const { classId, termId, studentId } = await searchParams;
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as RoleType;

  if (!hasAccess(role, "/dashboard/documents/validation")) redirect("/dashboard/documents");
  if (!classId || !termId) redirect("/dashboard/documents/validation");

  const data = await loadOfficialBulletin({
    schoolId,
    classId,
    termId,
    studentId: studentId ?? null,
  });
  if (!data) redirect("/dashboard/documents/validation");

  return <PrintClient data={data} focusStudentId={studentId ?? null} />;
}
