"use client";

import { useState } from "react";
import { Mail, Copy, Check, Sparkles, ExternalLink, Send, ShieldCheck, Eye, Code } from "lucide-react";
import { Bloc } from "@/components/ui";

const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation officielle aux tests EduCom</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Conteneur Carte Email (Max 600px) -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- En-tête Corporate Violet #581C87 -->
          <tr>
            <td style="background-color: #581C87; padding: 36px 32px; text-align: center; background-image: linear-gradient(135deg, #581C87 0%, #3B0764 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Badge Programme Testeur -->
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); color: #f5f3ff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 14px; border-radius: 9999px; margin-bottom: 16px;">
                      ✦ Programme Pilote Privilégié ✦
                    </span>
                    <!-- Logo / Nom de marque -->
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
                      EduCom<span style="color: #c084fc;">.</span>
                    </h1>
                    <p style="color: #e9d5ff; font-size: 13px; margin: 6px 0 0; font-weight: 500;">
                      Le logiciel de gestion scolaire conçu pour l'Afrique
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 36px 32px 24px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #1e1b4b; margin: 0 0 16px; line-height: 1.3;">
                Bonjour Madame, Monsieur le Chef d'Établissement,
              </h2>

              <p style="font-size: 14.5px; line-height: 1.65; color: #334155; margin: 0 0 16px;">
                Dans le cadre du lancement officiel de la nouvelle génération d'<strong>EduCom</strong>, nous avons le privilège de vous convier à tester en exclusivité notre plateforme de pilotage scolaire tout-en-un.
              </p>

              <p style="font-size: 14.5px; line-height: 1.65; color: #334155; margin: 0 0 24px;">
                Notre mission : faire disparaître le calvaire des inscriptions sur papier, le casse-tête de la saisie des notes et les retards d'écolages, grâce à une solution ultra-fluide pensée pour vos équipes (Direction, Secrétariat, Enseignants, Comptabilité et Parents).
              </p>

              <!-- Encadré des 3 atouts phares -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 14px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-weight: 700; font-size: 13.5px; color: #581C87;">
                            🎓 1. Bulletins scolaires en 1 clic
                          </div>
                          <div style="font-size: 12.5px; color: #475569; margin-top: 2px;">
                            Conformes aux normes de l'inspection académique, avec calcul automatique des rangs et moyennes pondérées.
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-weight: 700; font-size: 13.5px; color: #581C87;">
                            💳 2. Paiements d'écolage Wave & Orange Money
                          </div>
                          <div style="font-size: 12.5px; color: #475569; margin-top: 2px;">
                            Reçus de scolarité instantanés avec cachet et signature numériques, et suivi des impayés sans erreurs.
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div style="font-weight: 700; font-size: 13.5px; color: #581C87;">
                            📱 3. Espace Famille & WhatsApp
                          </div>
                          <div style="font-size: 12.5px; color: #475569; margin-top: 2px;">
                            Information immédiate des parents par SMS et WhatsApp sur l'assiduité et les notes de leurs enfants.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bouton Call-to-action Principal -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="https://educom.sn/dashboard?quiz_reminder=true" target="_blank" style="display: inline-block; background-color: #581C87; color: #ffffff; font-size: 14.5px; font-weight: 700; text-decoration: none; padding: 15px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(88, 28, 135, 0.25);">
                      Découvrir la Plateforme & Tester (Accès Gratuit) →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Section Quiz Testeur 2 min -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                      ⏱️ Votre avis en 2 minutes chrono
                    </div>
                    <div style="font-size: 12.5px; color: #475569; line-height: 1.5;">
                      Après votre tour d'horizon, un court questionnaire de 3 questions rapides vous sera proposé directement sur l'écran pour nous partager vos impressions directes. Votre regard professionnel guidera nos prochains développements.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 8px;">
                Toute l'équipe se tient à vos côtés pour vous assister à la moindre question.
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #1e1b4b; font-weight: 600; margin: 0 0 24px;">
                Bien cordialement,<br>
                <strong>Kory & L'Équipe EduCom</strong><br>
                <span style="font-size: 12px; color: #64748b; font-weight: normal;">Dakar, Sénégal · support@educom.sn · WhatsApp : +221 77 000 00 00</span>
              </p>
            </td>
          </tr>

          <!-- Pied de page officiel -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11.5px; color: #64748b; margin: 0; line-height: 1.5;">
                © 2026 EduCom SaaS. Tous droits réservés.<br>
                Vous recevez cette invitation car votre établissement a été sélectionné pour participer au programme pilote officiel.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const TEMPLATE_TEXT = `Bonjour Madame, Monsieur le Chef d'Établissement,

Dans le cadre du lancement officiel de la nouvelle version d'EduCom, nous avons le plaisir de vous convier à tester en avant-première notre plateforme de pilotage scolaire tout-en-un.

🎓 Ce que vous pouvez tester immédiatement :
1. Bulletins scolaires en 1 clic (conformes MEN, calculs de rangs automatiques)
2. Gestion des élèves et inscriptions sans paperasse
3. Encaissement Wave & Orange Money avec reçus cachetés en temps réel
4. Suivi des impayés et relances automatiques par WhatsApp

👉 Lien d'accès testeur direct :
https://educom.sn/dashboard?quiz_reminder=true

⏱️ Votre avis compte énormément :
Après votre découverte, un court quiz de 2 minutes chrono vous sera proposé directement sur l'écran pour recueillir votre évaluation et vos suggestions.

Bien cordialement,
Kory & L'Équipe EduCom
Dakar, Sénégal · WhatsApp : +221 77 000 00 00`;

export default function TemplateEmailTesteurs() {
  const [copieHtml, setCopieHtml] = useState(false);
  const [copieText, setCopieText] = useState(false);
  const [vueCode, setVueCode] = useState(false);

  const handleCopierHtml = () => {
    navigator.clipboard.writeText(TEMPLATE_HTML);
    setCopieHtml(true);
    setTimeout(() => setCopieHtml(false), 2500);
  };

  const handleCopierText = () => {
    navigator.clipboard.writeText(TEMPLATE_TEXT);
    setCopieText(true);
    setTimeout(() => setCopieText(false), 2500);
  };

  return (
    <Bloc
      titre={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-purple-700" />
            <span>Kit de Recrutement Testeurs · Template E-mail Corporate (#581C87)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVueCode(!vueCode)}
              className="inline-flex items-center gap-1 rounded-lg border border-rule px-2 py-1 text-[11px] font-semibold text-text-soft hover:bg-sunk transition-colors cursor-pointer"
            >
              {vueCode ? <Eye className="h-3 w-3" /> : <Code className="h-3 w-3" />}
              <span>{vueCode ? "Voir Aperçu" : "Voir Code HTML"}</span>
            </button>
            <button
              type="button"
              onClick={handleCopierHtml}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-frame-bg,#581C87)] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              {copieHtml ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copieHtml ? "Copié !" : "Copier HTML"}</span>
            </button>
            <button
              type="button"
              onClick={handleCopierText}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rule px-2.5 py-1 text-[11px] font-semibold text-text hover:bg-sunk transition-colors cursor-pointer"
            >
              {copieText ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copieText ? "Copié !" : "Copier Texte"}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-[12px] text-text-soft leading-relaxed">
          E-mail responsive haute définition prêt à l'emploi. Intègre les couleurs institutionnelles EduCom (<span className="font-mono text-purple-800 font-bold">#581C87</span>), l'argumentaire clé, le lien direct avec activation du quiz de 2 minutes et la signature officielle.
        </p>

        {vueCode ? (
          <div className="relative">
            <pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-[11px] text-slate-200 font-mono leading-relaxed border border-slate-800">
              {TEMPLATE_HTML}
            </pre>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-4 overflow-hidden">
            {/* Visualisation Iframe sécurisée de l'email */}
            <div className="mx-auto max-w-[620px] rounded-2xl bg-white shadow-md border border-slate-200 overflow-hidden">
              <iframe
                title="Aperçu e-mail invitation"
                srcDoc={TEMPLATE_HTML}
                className="w-full h-[520px] border-none"
              />
            </div>
          </div>
        )}
      </div>
    </Bloc>
  );
}
