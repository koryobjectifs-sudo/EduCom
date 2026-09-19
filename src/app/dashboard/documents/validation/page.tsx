import { redirect } from "next/navigation";

/**
 * ⚠️ Redirection permanente : La validation des bulletins a été déplacée dans
 * Pédagogie (/dashboard/grades/validation) conformément à sa nature d'acte pédagogique.
 */
export default function LegacyValidationPage() {
  redirect("/dashboard/grades/validation");
}
