"use server";

import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emailSchema, schoolNameSchema } from "@/lib/validations";
import { isValidHexColor } from "@/lib/theme";

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
  logoSize?: number | null;
  stampSize?: number | null;
  signatureSize?: number | null;
  primaryColor?: string | null;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
}) {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  const schema = z.object({
    name: schoolNameSchema,
    email: z.union([emailSchema, z.literal(""), z.null()]).optional(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    logo: z.string().optional().nullable(),
    stamp: z.string().optional().nullable(),
    signature: z.string().optional().nullable(),
    logoSize: z.number().int().min(20).max(300).optional().nullable(),
    stampSize: z.number().int().min(20).max(300).optional().nullable(),
    signatureSize: z.number().int().min(20).max(300).optional().nullable(),
    primaryColor: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { error: "Données invalides : " + parsed.error.issues[0].message };
  }

  try {
    try {
      await prisma.school.update({
        where: { id: auth.ctx.schoolId },
        data: {
          name: parsed.data.name,
          email: parsed.data.email || "",
          phone: parsed.data.phone?.trim() || "",
          address: parsed.data.address || "",
          logo: parsed.data.logo || null,
          stamp: parsed.data.stamp || null,
          signature: parsed.data.signature || null,
          logoSize: parsed.data.logoSize ?? undefined,
          stampSize: parsed.data.stampSize ?? undefined,
          signatureSize: parsed.data.signatureSize ?? undefined,
          primaryColor: parsed.data.primaryColor?.trim() || null,
        },
      });
    } catch (updateErr: any) {
      if (
        updateErr?.message?.includes("logoSize") ||
        updateErr?.message?.includes("stampSize") ||
        updateErr?.message?.includes("signatureSize") ||
        updateErr?.message?.includes("Unknown argument")
      ) {
        await prisma.school.update({
          where: { id: auth.ctx.schoolId },
          data: {
            name: parsed.data.name,
            email: parsed.data.email || "",
            phone: parsed.data.phone?.trim() || "",
            address: parsed.data.address || "",
            logo: parsed.data.logo || null,
            stamp: parsed.data.stamp || null,
            signature: parsed.data.signature || null,
            primaryColor: parsed.data.primaryColor?.trim() || null,
          },
        });
      } else {
        throw updateErr;
      }
    }

    revalidatePath("/", "layout"); // Revalidate all dashboard pages & shell layout
    return { success: true };
  } catch (error) {
    console.error("Failed to update school settings:", error);
    return { error: "Échec de la mise à jour des paramètres de l'école." };
  }
}

/**
 * Met à jour directement la couleur des cadres de l'établissement sans nécessiter
 * la validation complète de l'identité de l'école. Accepte `null` pour réinitialiser
 * à la couleur EduCom officielle (#581C87).
 */
export async function updateSchoolPrimaryColor(primaryColor: string | null) {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  if (primaryColor === null || primaryColor === "" || primaryColor === "default") {
    try {
      await prisma.school.update({
        where: { id: auth.ctx.schoolId },
        data: { primaryColor: "#581C87" },
      });
      revalidatePath("/", "layout");
      return { success: true, primaryColor: "#581C87" };
    } catch (error) {
      console.error("Failed to reset school primary color:", error);
      return { error: "Échec de la réinitialisation de la couleur." };
    }
  }

  const trimmed = primaryColor.trim();
  if (!isValidHexColor(trimmed)) {
    return { error: "Code hexadécimal invalide. Format attendu : #RRGGBB (ex: #581C87)." };
  }

  try {
    await prisma.school.update({
      where: { id: auth.ctx.schoolId },
      data: {
        primaryColor: trimmed,
      },
    });

    revalidatePath("/", "layout"); // Revalide la TopBar, Rail et tout le shell
    return { success: true, primaryColor: trimmed };
  } catch (error) {
    console.error("Failed to update school primary color:", error);
    return { error: "Échec de l'application de la couleur." };
  }
}

/**
 * Définit l'année scolaire active de l'établissement.
 *
 * RÈGLE FONDAMENTALE : L'année active est une donnée déclarée par l'école,
 * lue comme source unique de vérité par tous les modules.
 */
export async function updateActiveAcademicYear(newYear: string) {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  const trimmedYear = newYear?.trim();
  if (!trimmedYear || !/^\d{4}-\d{4}$/.test(trimmedYear)) {
    return { error: "Format d'année scolaire invalide. Exemple attendu : 2026-2027." };
  }

  try {
    await prisma.school.update({
      where: { id: auth.ctx.schoolId },
      data: {
        activeAcademicYear: trimmedYear,
      },
    });

    revalidatePath("/dashboard", "layout");
    return { success: true, activeAcademicYear: trimmedYear };
  } catch (error) {
    console.error("Failed to update active academic year:", error);
    return { error: "Échec de la mise à jour de l'année scolaire active." };
  }
}

/*
 * 26 sept. 2026 — Connexion WhatsApp (Meta) ARCHIVÉE : `simulateConnectWhatsApp`,
 * `finalizeWhatsAppConnection` et `disconnectWhatsApp` vivent désormais dans
 * `src/lib/communication/legacy/whatsappActions.ts` (voir communication-archive.md).
 * Retirées d'ici, elles ne sont plus appelables comme server actions.
 */

/**
 * Récupère le modèle officiel de déclaration préalable CDP pré-rempli.
 */
export async function getCdpDeclarationDataAction() {
  const auth = await requireActionContext("/dashboard/settings", { lecture: true });
  if (!auth.ok) return { error: auth.error };
  const { schoolId, userId } = auth.ctx;

  const [school, user] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
        activeAcademicYear: true,
        dataProcessingAcceptedAt: true,
        waveTermsAcceptedAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    }),
  ]);

  if (!school) return { error: "Établissement introuvable." };

  const { generateCdpDeclarationDocument } = await import("@/lib/legal/cdpDeclaration");
  const doc = generateCdpDeclarationDocument({
    schoolName: school.name,
    address: school.address,
    phone: school.phone,
    email: school.email,
    directorName: user ? `${user.firstName} ${user.lastName}`.trim() : "Direction",
    activeAcademicYear: school.activeAcademicYear,
  });

  return {
    data: doc,
    isDpaAccepted: Boolean(school.dataProcessingAcceptedAt),
    dpaAcceptedAt: school.dataProcessingAcceptedAt?.toISOString() || null,
    isWaveTermsAccepted: Boolean(school.waveTermsAcceptedAt),
    waveTermsAcceptedAt: school.waveTermsAcceptedAt?.toISOString() || null,
  };
}

/**
 * Acceptation bloquante des conditions financières Wave au moment de la connexion.
 */
export async function acceptWaveTermsAction() {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };
  const { schoolId, emailVerified } = auth.ctx;

  if (!emailVerified) {
    return { error: "Veuillez vérifier votre adresse e-mail avant de connecter Wave et d'activer les paiements." };
  }

  const { headers } = await import("next/headers");
  const entetes = await headers();
  const clientIp = entetes.get("x-forwarded-for")?.split(",")[0]?.trim() || entetes.get("x-real-ip") || "127.0.0.1";

  await prisma.school.update({
    where: { id: schoolId },
    data: {
      waveTermsAcceptedAt: new Date(),
      waveTermsVersion: "2026-09-v1",
      waveTermsIp: clientIp,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
