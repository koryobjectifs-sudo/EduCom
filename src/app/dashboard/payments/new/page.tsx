import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath } from "@/lib/permissions";
import { NewInvoiceForm } from "./form";

const PATH = "/dashboard/payments/new";

/**
 * Émission d'une facture.
 *
 * ═══ DEUX CORRECTIFS DU LOT 11.1 ═══
 *
 * 1. **Aucun contrôle de rôle.** `PARENT` a accès à `/dashboard/payments` : il
 *    atteignait donc ce formulaire par l'URL et y voyait **la liste de tous les
 *    élèves inscrits** de l'établissement. Le chemin lui est désormais refusé
 *    dans `ROLE_DENIALS`, et la garde est appliquée ici, côté serveur — masquer
 *    un lien n'a jamais empêché d'ouvrir une adresse.
 *
 * 2. **`schoolId: dbUser?.schoolId`.** Si `dbUser` était nul, l'optional
 *    chaining produisait `undefined` — et Prisma **ignore alors le filtre**,
 *    renvoyant les élèves de tous les établissements de la base. C'est
 *    exactement le motif corrigé au lot 00 sur d'autres écrans, resté ici.
 *    `requireSchoolContext()` garantit un `schoolId` non nul, ou redirige.
 */
export default async function NewInvoicePage() {
  const { user, schoolId, school } = await requireSchoolContext();
  if (!hasAccess(user.role, PATH)) redirect(firstAllowedPath(user.role));

  // On ne facture que des élèves inscrits, et uniquement ceux de l'établissement.
  const students = await prisma.student.findMany({
    where: { schoolId, status: "ENROLLED" },
    select: { 
      id: true, 
      firstName: true, 
      lastName: true,
      enrollments: { include: { class: true } },
      invoices: { select: { status: true } }
    },
    orderBy: { lastName: "asc" },
  });

  return <NewInvoiceForm students={students} school={school} />;
}
