/**
 * Formatage et assainissement des titres de pièces documentaires.
 * 
 * Règle UX / Sécurité : Aucun identifiant technique (hash MD5/SHA, UUID,
 * nom de fichier généré par smartphone ou appareil photo) ne doit jamais
 * être affiché comme titre à l'utilisateur.
 */

export function isTechnicalIdentifier(str?: string | null): boolean {
  if (!str) return true;
  const s = str.trim();
  // Hexadécimal de 12 caractères ou plus (ex: 0bcb337a51bc5f1b58e7ec567033b4f7)
  if (/^[0-9a-fA-F]{12,}$/.test(s)) return true;
  // UUID standard avec ou sans tirets
  if (/^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/i.test(s)) return true;
  // Noms bruts de caméras mobiles, scans et captures
  if (/^(IMG_|DOC_|FILE_|SCAN_|PHOTO_|PIECE_|UPLOAD_)[0-9a-zA-Z_-]+/i.test(s)) return true;
  // Nom de fichier se terminant par une extension
  if (/\.(jpg|jpeg|png|pdf|webp|heic|doc|docx)$/i.test(s)) return true;
  return false;
}

export function humanizeDocumentLabel(
  label?: string | null,
  requirementLabel?: string | null,
  category?: string | null
): string {
  // 1. Priorité absolue au libellé officiel de l'exigence réglementaire
  if (requirementLabel && requirementLabel.trim()) {
    return requirementLabel.trim();
  }

  // 2. Libellé saisi s'il est significatif et non technique
  if (label && !isTechnicalIdentifier(label)) {
    return label.trim();
  }

  // 3. Fallback métier intelligible selon la catégorie
  switch (category) {
    case "INSCRIPTION":
      return "Pièce d'inscription";
    case "MEDICAL":
      return "Fiche médicale";
    case "FINANCIER":
      return "Justificatif financier";
    case "PEDAGOGIQUE":
      return "Document scolaire";
    case "OFFICIAL":
      return "Document officiel";
    default:
      return "Pièce du dossier élève";
  }
}
