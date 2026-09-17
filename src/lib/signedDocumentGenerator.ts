import crypto from "crypto";

export type SignedDocumentPayload = {
  schoolName: string;
  academicYear: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    className?: string | null;
    cycle?: string | null;
    dateOfBirth?: string | null;
  };
  requirementLabel: string;
  docVersion: string;
  timestampIso: string;
  timestampFormatted: string;
  ip: string;
  userAgent: string;
  signer: {
    name: string;
    role: string;
    email?: string | null;
    phone?: string | null;
  };
  signatureImageBase64: string;
  signatureType: "DRAWN" | "SCANNED";
  formData?: {
    authorizedPersons?: Array<{
      lastName: string;
      firstName: string;
      relationship: string;
      phone: string;
      idCardNumber: string;
    }>;
    attestationConfirmed?: boolean;
    notes?: string;
  };
};

/**
 * Calcule l'empreinte SHA-256 garantissant l'intégrité du document signé.
 */
export function computeSignatureSha256(payload: Omit<SignedDocumentPayload, "signatureImageBase64"> & { signatureSnippet: string }): string {
  const serialized = JSON.stringify(payload);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * Génère le document HTML officiel certifié et scellé pour archivage probatoire.
 */
export function generateSignedDocumentHtml(payload: SignedDocumentPayload, sha256: string): string {
  const isAuthorizedPersons = payload.requirementLabel.toLowerCase().includes("personne") ||
    payload.requirementLabel.toLowerCase().includes("récupérer") ||
    payload.requirementLabel.toLowerCase().includes("recuperer");

  const isRules = payload.requirementLabel.toLowerCase().includes("règlement") ||
    payload.requirementLabel.toLowerCase().includes("reglement");

  const isInfoSheet = payload.requirementLabel.toLowerCase().includes("renseignement");

  let specificContent = "";

  if (isAuthorizedPersons && payload.formData?.authorizedPersons && payload.formData.authorizedPersons.length > 0) {
    const rows = payload.formData.authorizedPersons.map((p, idx) => `
      <tr>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569;">${idx + 1}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${p.lastName.toUpperCase()} ${p.firstName}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155;">${p.relationship || "Non précisé"}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-family: monospace; color: #0f172a;">${p.phone || "—"}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-family: monospace; color: #334155;">${p.idCardNumber || "—"}</td>
      </tr>
    `).join("");

    specificContent = `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
          Personnes expressément autorisées à récupérer l'élève
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px 12px; border: 1px solid #cbd5e1; width: 40px; text-align: center; color: #475569;">#</th>
              <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; color: #475569;">Nom & Prénom</th>
              <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; color: #475569;">Lien / Qualité</th>
              <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; color: #475569;">Téléphone</th>
              <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; color: #475569;">N° Pièce d'identité</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p style="margin-top: 14px; font-size: 12.5px; color: #334155; line-height: 1.6; background: #f8fafc; padding: 12px 14px; border-left: 3px solid #0f172a; border-radius: 4px;">
          <strong>Attestation d'autorisation :</strong> Je soussigné(e), parent ou représentant légal de l'élève, déclare sous mon entière responsabilité autoriser formellement les personnes ci-dessus mentionnées à récupérer mon enfant à la sortie des cours ou des activités scolaires et périscolaires de l'établissement.
        </p>
      </div>
    `;
  } else if (isRules) {
    specificContent = `
      <div style="margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.65;">
        <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
          Adhésion au règlement intérieur de l'établissement
        </h3>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 14px;">
          <p style="margin: 0 0 10px 0;"><strong>Article 1 — Assiduité et ponctualité :</strong> La présence à tous les cours inscrits à l'emploi du temps est obligatoire. Tout retard ou absence doit être immédiatement justifié auprès de la vie scolaire.</p>
          <p style="margin: 0 0 10px 0;"><strong>Article 2 — Discipline et tenue :</strong> L'élève s'engage à respecter les consignes du corps enseignant, le personnel de l'école et ses camarades, ainsi que le port de la tenue réglementaire.</p>
          <p style="margin: 0 0 10px 0;"><strong>Article 3 — Matériel et biens :</strong> Toute dégradation volontaire des biens de l'établissement engagera la responsabilité financière directe des parents ou tuteurs.</p>
          <p style="margin: 0;"><strong>Article 4 — Utilisation des technologies :</strong> L'usage du téléphone portable en classe sans autorisation pédagogique expresse est strictement prohibé.</p>
        </div>
        <p style="font-size: 12.5px; color: #0f172a; font-weight: 600; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 14px; border-radius: 4px;">
          ✓ Engagement formel : Le signataire atteste avoir pris connaissance de l'intégralité du règlement intérieur de l'établissement pour l'année ${payload.academicYear} et s'engage à veiller à son strict respect par l'élève.
        </p>
      </div>
    `;
  } else if (isInfoSheet) {
    specificContent = `
      <div style="margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.65;">
        <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
          Fiche de renseignements généraux et attestations
        </h3>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 14px;">
          <p style="margin: 0 0 8px 0;"><strong>Élève :</strong> ${payload.student.firstName} ${payload.student.lastName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Classe :</strong> ${payload.student.className || "Non affectée"} (${payload.student.cycle || "Scolarité standard"})</p>
          <p style="margin: 0 0 8px 0;"><strong>Représentant légal :</strong> ${payload.signer.name} (${payload.signer.role})</p>
          <p style="margin: 0 0 8px 0;"><strong>Contact :</strong> ${payload.signer.phone || "—"} · ${payload.signer.email || "—"}</p>
        </div>
        <p style="font-size: 12.5px; color: #0f172a; font-weight: 600; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 14px; border-radius: 4px;">
          ✓ Certification sur l'honneur : Je certifie sur l'honneur l'exactitude des renseignements portés au dossier administratif de l'élève auprès de ${payload.schoolName}.
        </p>
      </div>
    `;
  } else {
    specificContent = `
      <div style="margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.65;">
        <p style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px;">
          Document officiel « ${payload.requirementLabel} » validé et signé électroniquement par le représentant légal pour l'année scolaire ${payload.academicYear}.
        </p>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${payload.requirementLabel} — ${payload.student.firstName} ${payload.student.lastName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #e2e8f0;
      color: #0f172a;
      border-radius: 4px;
    }
    .cartouche {
      margin-top: 32px;
      border: 2px solid #0f172a;
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      page-break-inside: avoid;
    }
    .cartouche-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0f172a;
      margin-bottom: 14px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 20px;
      font-size: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-weight: 600;
      color: #64748b;
      font-size: 10.5px;
      text-transform: uppercase;
    }
    .meta-value {
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .signature-box {
      margin-top: 16px;
      display: flex;
      align-items: center;
      gap: 20px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .sig-img {
      max-height: 70px;
      max-width: 220px;
      object-fit: contain;
    }
    .legal-footer {
      margin-top: 14px;
      font-size: 10px;
      color: #64748b;
      text-align: justify;
      line-height: 1.4;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">${payload.schoolName}</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">Dossier administratif de l'élève · Année scolaire ${payload.academicYear}</p>
      </div>
      <div style="text-align: right;">
        <span class="badge">Document certifié</span>
        <p style="margin: 6px 0 0 0; font-size: 11px; font-family: monospace; color: #64748b;">Réf: ${payload.student.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>

    <div style="margin-bottom: 24px; padding: 14px 18px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Élève concerné(e)</span>
        <h2 style="margin: 2px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">${payload.student.firstName} ${payload.student.lastName}</h2>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Classe</span>
        <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">${payload.student.className || "Élève inscrit"} ${payload.student.cycle ? `(${payload.student.cycle})` : ""}</p>
      </div>
    </div>

    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
      ${payload.requirementLabel}
    </h2>

    ${specificContent}

    <!-- CARTOUCHE DE PREUVE JURIDIQUE ET TRAÇABILITÉ -->
    <div class="cartouche">
      <div class="cartouche-title">
        <span>Preuve et traçabilité de signature électronique</span>
        <span style="font-size: 10px; font-weight: 700; color: #0284c7;">Conforme audit probatoire</span>
      </div>

      <div class="grid-meta">
        <div class="meta-item">
          <span class="meta-label">Signataire certifié</span>
          <span class="meta-value">${payload.signer.name} (${payload.signer.role})</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Horodatage certifié (ISO / UTC)</span>
          <span class="meta-value" style="font-family: monospace;">${payload.timestampIso}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Adresse IP source</span>
          <span class="meta-value" style="font-family: monospace;">${payload.ip}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Version du document signé</span>
          <span class="meta-value">Version ${payload.docVersion}</span>
        </div>
        <div class="meta-item" style="grid-column: 1 / -1;">
          <span class="meta-label">Empreinte cryptographique d'intégrité (SHA-256)</span>
          <span class="meta-value" style="font-family: monospace; font-size: 11px; word-break: break-all; color: #0369a1;">${sha256}</span>
        </div>
        <div class="meta-item" style="grid-column: 1 / -1;">
          <span class="meta-label">Agent utilisateur (Navigateur / Système)</span>
          <span class="meta-value" style="font-size: 10.5px; color: #475569; word-break: break-all;">${payload.userAgent}</span>
        </div>
      </div>

      <div class="signature-box">
        <div>
          <span class="meta-label">Signature apposée (${payload.signatureType === "DRAWN" ? "Tracée à l'écran" : "Scan téléversé"})</span>
          <div style="margin-top: 6px;">
            <img src="${payload.signatureImageBase64}" alt="Signature" class="sig-img" />
          </div>
        </div>
        <div style="margin-left: auto; text-align: right;">
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #0f172a;">Signé le ${payload.timestampFormatted}</p>
          <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #64748b;">Par ${payload.signer.name}</p>
        </div>
      </div>

      <div class="legal-footer">
        Ce document a été signé électroniquement conformément aux exigences de preuve des actes sous seing privé. L'empreinte SHA-256 ci-dessus lie de manière indissociable le contenu du document, l'identité du signataire, l'horodatage universel certifié et l'adresse IP de transmission. Ce document électronique original est conservé dans le coffre-fort numérique de l'établissement ${payload.schoolName} sur EduCom SaaS.
      </div>
    </div>
  </div>
</body>
</html>`;
}
