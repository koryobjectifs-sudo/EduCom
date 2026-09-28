import { Resend } from "resend";
import { roleLabel } from "@/lib/permissions";

/**
 * Service d'envoi d'e-mails transactionnels EduCom.
 * Utilise Resend (SDK officiel).
 * Clé requise : RESEND_API_KEY dans .env.local
 */
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Expéditeur officiel utilisant le domaine vérifié educom.school
const SENDER = process.env.EMAIL_FROM || "EduCom <invitation@educom.school>";

export type ParametresEmailInvitation = {
  destinataire: string;
  nomDestinataire: string;
  nomEcole: string;
  role: string;
  lien: string;
  inviteurNom?: string;
};

/**
 * Évite que les filtres de messagerie (Gmail, Outlook) ne classent l'e-mail en spam :
 * les liens vers "localhost" ou "127.0.0.1" sont automatiquement transformés
 * en URL sécurisée HTTPS sous le domaine officiel educom.school.
 */
function securiserLienPourEmail(lien: string): string {
  if (lien.includes("localhost") || lien.includes("127.0.0.1")) {
    return lien.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, "https://www.educom.school");
  }
  return lien;
}

export async function envoyerEmailInvitation(params: ParametresEmailInvitation): Promise<{ success: boolean; id?: string; error?: string }> {
  const { destinataire, nomDestinataire, nomEcole, role, lien, inviteurNom } = params;
  const roleAffiche = roleLabel(role as any);
  const lienSecurise = securiserLienPourEmail(lien);
  const inviteur = inviteurNom?.trim() || "La direction";
  const salutation = nomDestinataire?.trim() ? `Bonjour ${nomDestinataire.trim()},` : "Bonjour,";

  if (!resend) {
    console.warn("[email] RESEND_API_KEY n'est pas configurée dans .env.local. Aucun e-mail n'a été émis.");
    return {
      success: false,
      error: "Clé RESEND_API_KEY absente dans .env.local.",
    };
  }

  const sujet = `Invitation officielle à rejoindre ${nomEcole} sur EduCom`;

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sujet}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; color: #0F172A;">
  
  <!-- En-tête invisible pour aperçu dans la boîte de réception (pre-header anti-spam) -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #fff;">
    ${inviteur} vous invite à rejoindre l'équipe de ${nomEcole} sur la plateforme EduCom. Activez votre compte sécurisé dès maintenant.
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 40px 16px;">
    <tr>
      <td align="center">
        
        <!-- CARTE PRINCIPALE -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);">
          
          <!-- BANNIÈRE ROYALE ÉDUCOM AVEC LOGO OFFICIEL -->
          <tr>
            <td style="background-color: #581C87; background: linear-gradient(135deg, #3B0764 0%, #581C87 60%, #7E22CE 100%); padding: 32px 36px; border-bottom: 3px solid #9333EA;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="48" valign="middle" style="padding-right: 14px;">
                    <!-- Bouclier officiel EduCom -->
                    <img src="https://www.educom.school/brand/educom-bouclier.png" width="40" height="46" alt="Bouclier EduCom" style="display: block; border: 0; outline: none; text-decoration: none;" />
                  </td>
                  <td valign="middle" align="left">
                    <!-- Wordmark officiel : Edu en blanc, Com en rouge contrasté avec empattements -->
                    <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.1;">
                      <span>Edu</span><span style="color: #FF6B6F;">Com</span>
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1.8px; color: #E9D5FF; font-weight: 600; margin-top: 4px;">
                      Plateforme de gouvernance scolaire
                    </div>
                  </td>
                  <td valign="middle" align="right" class="hide-mobile">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.28); color: #FFFFFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 5px 12px; border-radius: 9999px;">
                      Accès Membre
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CORPS DE LA CARTE -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              
              <!-- Badge statut -->
              <div style="margin-bottom: 18px;">
                <span style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D5FF; color: #6B21A8; font-size: 11.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; padding: 5px 14px; border-radius: 9999px;">
                  ✨ Invitation officielle
                </span>
              </div>

              <!-- Titre d'accueil -->
              <h1 style="margin: 0 0 14px 0; font-size: 23px; font-weight: 800; color: #0F172A; line-height: 1.3; letter-spacing: -0.3px;">
                ${salutation}
              </h1>

              <!-- Texte d'introduction -->
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.65; color: #334155;">
                <strong>${inviteur}</strong> vous invite à rejoindre l'équipe de l'établissement <strong>${nomEcole}</strong> sur la plateforme de gestion scolaire EduCom.
              </p>

              <!-- CARTE RÉCAPITULATIVE DE CONFIGURATION (ENCADRÉ ÉLÉGANT) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 12px; margin-bottom: 26px; overflow: hidden;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 13.5px; color: #64748B;" width="40%">
                          🏫 Établissement :
                        </td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 700; color: #0F172A;" width="60%">
                          ${nomEcole}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 13.5px; color: #64748B;">
                          👔 Fonction attribuée :
                        </td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 700; color: #581C87;">
                          ${roleAffiche}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 13.5px; color: #64748B;">
                          👤 Rattaché par :
                        </td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #334155;">
                          ${inviteur}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13.5px; color: #64748B;">
                          ⚡ Vos accès :
                        </td>
                        <td style="font-size: 13px; font-weight: 600; color: #059669;">
                          Prêts dès la 1ère connexion
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 28px 0; font-size: 14.5px; line-height: 1.6; color: #475569;">
                Vos classes, matières et permissions ont déjà été préparées par votre établissement. Cliquez ci-dessous pour choisir votre mot de passe et commencer à utiliser votre espace.
              </p>

              <!-- BOUTON D'ACTION PRINCIPAL (CTA VIBRANT) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 10px 0 24px 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${lienSecurise}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="24%" stroke="f" fillcolor="#581C87">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Activer mon accès →</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${lienSecurise}" target="_blank" style="mso-hide:all; display: inline-block; background-color: #581C87; background: linear-gradient(135deg, #6B21A8 0%, #581C87 100%); color: #FFFFFF; font-size: 15.5px; font-weight: 700; text-decoration: none; padding: 15px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(88, 28, 135, 0.35); text-align: center; letter-spacing: 0.2px;">
                      Activer mon accès &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span style="font-size: 12px; color: #94A3B8;">
                      🔒 Lien sécurisé à usage personnel · Valide pendant 7 jours
                    </span>
                  </td>
                </tr>
              </table>

              <!-- LIEN ALTERNATIF DE SECOURS -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px dashed #CBD5E1;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748B;">
                  Le bouton ne s'ouvre pas ? Copiez ce lien sécurisé dans votre navigateur :
                </p>
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 11.5px; color: #475569; word-break: break-all; line-height: 1.4;">
                  ${lienSecurise}
                </div>
              </div>

            </td>
          </tr>

          <!-- PIED DE PAGE ANTI-SPAM ET SÉCURITÉ -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 36px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748B;">
                EduCom · Plateforme de gestion et gouvernance scolaire
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #94A3B8; line-height: 1.5;">
                Cet e-mail a été envoyé automatiquement à la demande de l'administration de <strong>${nomEcole}</strong>.<br />
                Si vous n'êtes pas collaborateur de cet établissement, vous pouvez ignorer ce message.
              </p>
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">
                Dakar, Sénégal · <a href="https://www.educom.school" style="color: #6B21A8; text-decoration: none;">www.educom.school</a> · <a href="mailto:contact@educom.school" style="color: #6B21A8; text-decoration: none;">contact@educom.school</a>
              </p>
            </td>
          </tr>

        </table>
        
        <!-- MICRO-TEXTE SOUS LA CARTE -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin-top: 14px;">
          <tr>
            <td align="center" style="font-size: 11.5px; color: #94A3B8;">
              Transmission chiffrée SSL/TLS 256 bits · EduCom Technologies
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const texte = `
EDUCOM — PLATEFORME DE GOUVERNANCE SCOLAIRE
------------------------------------------------------------
${sujet}

${salutation}

${inviteur} vous invite à rejoindre l'équipe de l'établissement ${nomEcole} sur la plateforme EduCom.

RÉCAPITULATIF DE VOTRE COMPTE :
• Établissement : ${nomEcole}
• Fonction : ${roleAffiche}
• Invité par : ${inviteur}
• Configuration : Vos classes et accès sont déjà préparés

POUR ACTIVER VOTRE ACCÈS :
Ouvrez le lien sécurisé suivant dans votre navigateur :
${lienSecurise}

Ce lien est strictement personnel et valide pendant 7 jours.
------------------------------------------------------------
EduCom Technologies · Dakar, Sénégal
Support : contact@educom.school · https://www.educom.school
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: SENDER,
      to: [destinataire],
      replyTo: "contact@educom.school",
      subject: sujet,
      html,
      text: texte,
      headers: {
        "X-Entity-Ref-ID": `invite-${Date.now()}`,
      },
    });

    if (error) {
      console.error("[email] Erreur renvoyée par Resend :", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[email] Exception lors de l'envoi Resend :", err);
    return { success: false, error: err?.message || "Erreur de connexion au service d'e-mails." };
  }
}
