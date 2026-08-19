"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { revalidatePath } from "next/cache";

/**
 * Met à jour l'identité de l'établissement.
 *
 * ⚠️ Cette action recevait auparavant `schoolId` **depuis le client** et
 * n'authentifiait pas l'appelant : n'importe qui pouvait réécrire le nom, le
 * logo, le **cachet et la signature** de n'importe quelle école en passant un
 * autre identifiant. Le cachet et la signature apparaissent sur les documents
 * officiels — certificats de scolarité, bulletins, factures.
 *
 * Le `schoolId` vient désormais de la session, et le paramètre correspondant a
 * été retiré de la signature pour qu'il ne puisse pas réapparaître.
 *
 * `hasAccess(role, "/dashboard/settings")` ne laisse passer que `OWNER` et
 * `ADMIN` : aucun autre rôle ne liste ce chemin dans `ROLE_PERMISSIONS`.
 */
export async function updateSchoolSettings(data: {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  stamp?: string;
  signature?: string;
}) {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  try {
    await prisma.school.update({
      where: { id: auth.ctx.schoolId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logo: data.logo,
        stamp: data.stamp,
        signature: data.signature,
      },
    });

    revalidatePath("/"); // Revalidate all dashboard pages
    return { success: true };
  } catch (error) {
    console.error("Failed to update school settings:", error);
    return { error: "Échec de la mise à jour des paramètres de l'école." };
  }
}
