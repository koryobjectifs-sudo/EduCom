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
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
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

/**
 * Dev/Mock implementation of connecting Meta WhatsApp
 * In production, this would validate the Oauth token from Meta and fetch credentials.
 */
export async function simulateConnectWhatsApp() {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  try {
    await prisma.school.update({
      where: { id: auth.ctx.schoolId },
      data: {
        whatsappConnectionStatus: "CONNECTED",
        whatsappName: "EduCom " + Math.floor(Math.random() * 1000), // Mock data
        whatsappPhone: "+221 77 123 45 67", // Mock data
        whatsappConnectedAt: new Date(),
        whatsappAccessToken: "MOCK_TOKEN_" + Date.now(),
        whatsappPhoneNumberId: "MOCK_PHONE_ID_" + Date.now(),
        whatsappBusinessAccountId: "MOCK_WABA_ID_" + Date.now(),
      }
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to connect WhatsApp:", error);
    return { error: "Failed to connect to Meta." };
  }
}

/**
 * Validates the Meta Embedded Signup payload, fetches WABA info,
 * and securely saves the credentials to the school.
 */
export async function finalizeWhatsAppConnection(accessToken: string) {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  if (!process.env.NEXT_PUBLIC_META_APP_ID || !process.env.META_APP_SECRET) {
    return { error: "L'infrastructure Meta n'est pas encore configurée (META_APP_SECRET manquant)." };
  }

  try {
    // 1. Validate token via debug_token
    const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${process.env.NEXT_PUBLIC_META_APP_ID}|${process.env.META_APP_SECRET}`);
    const debugData = await debugRes.json();

    if (!debugData.data || !debugData.data.is_valid) {
      return { error: "Le jeton d'authentification Meta est invalide ou a expiré." };
    }

    // Extract WABA ID from granular_scopes (Embedded Signup standard)
    let wabaId: string | null = null;
    const scopes = debugData.data.granular_scopes;
    if (scopes && Array.isArray(scopes)) {
      const waScope = scopes.find((s: { scope: string; target_ids?: string[] }) => s.scope === "whatsapp_business_management" || s.scope === "whatsapp_business_messaging");
      if (waScope && waScope.target_ids && waScope.target_ids.length > 0) {
        wabaId = waScope.target_ids[0];
      }
    }

    // Fallback: If not in granular_scopes, try to fetch from user's business assets
    if (!wabaId) {
      const wabaRes = await fetch(`https://graph.facebook.com/v19.0/me/client_whatsapp_business_accounts?access_token=${accessToken}`);
      const wabaData = await wabaRes.json();
      if (wabaData.data && wabaData.data.length > 0) {
        wabaId = wabaData.data[0].id;
      }
    }

    if (!wabaId) {
      return { error: "Aucun compte WhatsApp Business (WABA) associé n'a été trouvé. Vérifiez les permissions." };
    }

    // 2. Get Phone Number ID
    const phonesRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`);
    const phonesData = await phonesRes.json();

    if (!phonesData.data || phonesData.data.length === 0) {
      return { error: "Aucun numéro de téléphone n'a été trouvé pour ce compte WhatsApp Business." };
    }

    // Select the first number
    const phoneData = phonesData.data[0];
    const phoneNumberId = phoneData.id;
    const whatsappName = phoneData.verified_name || phoneData.display_phone_number;
    const whatsappPhone = phoneData.display_phone_number;

    // 3. Atomic Database Update
    await prisma.school.update({
      where: { id: auth.ctx.schoolId },
      data: {
        whatsappConnectionStatus: "CONNECTED",
        whatsappName: whatsappName,
        whatsappPhone: whatsappPhone,
        whatsappConnectedAt: new Date(),
        whatsappAccessToken: accessToken, // Store the long-lived or valid system token
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: wabaId,
      }
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    // SECURITY: Never log the access token or sensitive API responses
    console.error("Failed to finalize WhatsApp connection (Error during Meta API calls)");
    return { error: "Erreur lors de la communication avec les serveurs de Meta." };
  }
}

/**
 * Disconnects the WhatsApp Business account from the school.
 */
export async function disconnectWhatsApp() {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  try {
    await prisma.school.update({
      where: { id: auth.ctx.schoolId },
      data: {
        whatsappConnectionStatus: "NOT_CONNECTED",
        whatsappName: null,
        whatsappPhone: null,
        whatsappConnectedAt: null,
        whatsappAccessToken: null,
        whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null,
      }
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect WhatsApp:", error);
    return { error: "Failed to disconnect." };
  }
}
