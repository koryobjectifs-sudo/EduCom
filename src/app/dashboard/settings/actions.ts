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
export async function finalizeWhatsAppConnection(code: string) {
  const auth = await requireActionContext("/dashboard/settings");
  if (!auth.ok) return { error: auth.error };

  if (!process.env.NEXT_PUBLIC_META_APP_ID || !process.env.META_APP_SECRET) {
    return { error: "L'infrastructure Meta n'est pas encore configurée (META_APP_SECRET manquant)." };
  }

  try {
    // 0. Échanger le code d'Embedded Signup contre le jeton métier du client.
    //
    // ⚠️ Avec `response_type: 'code'`, Meta ne renvoie PAS de jeton au navigateur :
    // il renvoie un code à usage unique, qui ne vit que 30 secondes et doit être
    // échangé de serveur à serveur. Le code lisait auparavant
    // `authResponse.accessToken`, toujours `undefined` dans ce mode — la
    // connexion échouait donc systématiquement.
    //
    // Forme des paramètres vérifiée directement auprès du Graph API : ni
    // `redirect_uri` ni `grant_type` ne sont attendus pour ce flux.
    const exchangeRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
        `?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
        `&client_secret=${process.env.META_APP_SECRET}` +
        `&code=${encodeURIComponent(code)}`
    );
    const exchangeData = await exchangeRes.json();

    if (!exchangeData.access_token) {
      // ══════════════════════════════════════════════════════════════════════
      // DIAGNOSTIC TEMPORAIRE — LOT 18B. À RETIRER une fois la cause trouvée.
      //
      // Le message d'erreur générique renvoyé à l'écran ne permettait pas de
      // distinguer « code périmé » de « mauvais paramètres » ni de « ce n'est
      // pas un code ». On journalise donc ce que Meta répond RÉELLEMENT.
      //
      // ⚠️ Aucun secret : ni le code complet, ni le jeton, ni le client_secret.
      // Le code est à usage unique et vit 30 secondes ; on n'en garde que la
      // longueur et les 4 premiers caractères, ce qui suffit à reconnaître un
      // jeton d'accès (`EAA…`, ~200+ caractères) glissé à la place d'un code.
      // ══════════════════════════════════════════════════════════════════════
      const e = exchangeData?.error ?? {};
      console.error("── DIAGNOSTIC Embedded Signup ─────────────────────────");
      console.error("  HTTP                :", exchangeRes.status);
      console.error("  valeur reçue du front : longueur =", code?.length ?? 0,
                    "| début =", (code ?? "").slice(0, 4) + "…",
                    "| ressemble à un jeton EAA =", (code ?? "").startsWith("EAA"));
      console.error("  app_id utilisé      :", process.env.NEXT_PUBLIC_META_APP_ID);
      console.error("  Meta error.message  :", e.message ?? "(aucun)");
      console.error("  Meta error.type     :", e.type ?? "(aucun)");
      console.error("  Meta error.code     :", e.code ?? "(aucun)");
      console.error("  Meta error.subcode  :", e.error_subcode ?? "(aucun)");
      console.error("  Meta fbtrace_id     :", e.fbtrace_id ?? "(aucun)");
      console.error("  clés de la réponse  :", Object.keys(exchangeData ?? {}).join(", "));
      console.error("───────────────────────────────────────────────────────");

      return { error: "Le code de connexion Meta est invalide ou a expiré (durée de vie : 30 secondes). Relancez la connexion." };
    }

    const accessToken: string = exchangeData.access_token;

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
    //
    // ⚠️ Cette écriture a son PROPRE `catch`. Elle était auparavant dans le bloc
    // qui entoure les appels Meta, si bien qu'un échec de base — typiquement le
    // rejet de l'index unique sur `whatsappPhoneNumberId` — était annoncé à
    // l'écran comme « erreur de communication avec les serveurs de Meta ».
    // On cherchait alors du côté de Meta un problème qui n'y était pas.
    try {
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
    } catch (dbError: unknown) {
      // P2002 : violation d'unicité. Le seul cas réaliste est un numéro déjà
      // rattaché à un autre établissement — la cause exacte du cloisonnement
      // multi-locataire posé au lot précédent.
      const code = (dbError as { code?: string })?.code;
      if (code === "P2002") {
        return { error: "Ce numéro WhatsApp est déjà relié à un autre établissement. Déconnectez-le de cet établissement avant de le rattacher ici." };
      }
      // SÉCURITÉ : ne jamais journaliser l'erreur brute, elle peut porter les valeurs écrites.
      console.error("Embedded Signup: échec de l'enregistrement en base (code:", code ?? "inconnu", ")");
      return { error: "La connexion à Meta a réussi, mais l'enregistrement dans EduCom a échoué. Réessayez." };
    }

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
