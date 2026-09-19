import { redirect } from "next/navigation";

/**
 * ⚠️ Redirection : Impression des bulletins validés déplacée dans
 * Pédagogie (/dashboard/grades/validation/impression).
 */
export default async function LegacyPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; termId?: string; studentId?: string }>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams();
  if (sp.classId) p.set("classId", sp.classId);
  if (sp.termId) p.set("termId", sp.termId);
  if (sp.studentId) p.set("studentId", sp.studentId);
  redirect(`/dashboard/grades/validation/impression?${p.toString()}`);
}
