import type { EducationalCycle } from "@/generated/prisma/client";

export type EduComFieldKey =
  | "firstName"
  | "lastName"
  | "className"
  | "dateOfBirth"
  | "gender"
  | "emergencyContact"
  | "emergencyPhone"
  | "matricule";

export const FIELD_DEFINITIONS: { key: EduComFieldKey; label: string; required: boolean; description: string }[] = [
  { key: "firstName", label: "Prénom", required: true, description: "Prénom(s) de l'élève" },
  { key: "lastName", label: "Nom de famille", required: true, description: "Nom patronymique" },
  { key: "className", label: "Classe", required: true, description: "Niveau ou nom de la classe" },
  { key: "dateOfBirth", label: "Date de naissance", required: false, description: "Format JJ/MM/AAAA ou AAAA-MM-JJ" },
  { key: "gender", label: "Sexe", required: false, description: "M (Masculin) ou F (Féminin)" },
  { key: "emergencyContact", label: "Nom du tuteur", required: false, description: "Nom complet du parent/tuteur" },
  { key: "emergencyPhone", label: "Téléphone tuteur", required: false, description: "Numéro de contact (ex: +221 77...)" },
  { key: "matricule", label: "Matricule", required: false, description: "Identifiant ou code élève" },
];

export type ImportRow = {
  matricule?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  className?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status?: string;
  [key: string]: any;
};

export type MissingClassDef = {
  name: string;
  cycle: EducationalCycle;
  serie: string | null;
};

export type GuardianConflictDef = {
  phone: string;
  existingName: string;
  incomingName: string;
  studentName: string;
};

export type ImportPreviewResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  classesCount: number;
  classesDetected: string[];
  missingClasses: MissingClassDef[];
  existingClasses: string[];
  duplicatesCount: number;
  duplicateNames: string[];
  guardianConflicts: GuardianConflictDef[];
  sampleRows: ImportRow[];
};

export type ImportStudentResult = {
  success: boolean;
  importedCount: number;
  classesCreated: string[];
  cyclesCreated: string[];
  importedStudents: { id: string; firstName: string; lastName: string; className: string }[];
  rejectedRows: { rowNumber: number; data: ImportRow; reason: string }[];
  error?: string;
  needsDpa?: boolean;
};

/**
 * Déduit automatiquement le cycle scolaire officiel sénégalais et la série secondaire
 * d'après le nom de la classe.
 */
export function deduceCycleAndSerie(
  className: string,
): { cycle: EducationalCycle; serie: string | null } {
  const n = className
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // 1. PRÉSCOLAIRE
  if (
    n.includes("petite section") ||
    n.includes("moyenne section") ||
    n.includes("grande section") ||
    n.startsWith("tps") ||
    n.startsWith("ps") ||
    n.startsWith("ms") ||
    n.startsWith("gs") ||
    n.includes("maternelle") ||
    n.includes("prescolaire")
  ) {
    return { cycle: "PRESCOLAIRE", serie: null };
  }

  // 2. ÉLÉMENTAIRE (CI, CP, CE1, CE2, CM1, CM2)
  const elemPrefixes = ["ci", "cp", "ce1", "ce2", "cm1", "cm2"];
  if (
    elemPrefixes.some(
      (p) =>
        n === p ||
        n.startsWith(`${p} `) ||
        n.startsWith(`${p}-`) ||
        n.startsWith(`${p}_`) ||
        n.startsWith(`${p}.`),
    )
  ) {
    return { cycle: "ELEMENTAIRE", serie: null };
  }

  // 3. MOYEN (6ème, 5ème, 4ème, 3ème)
  const moyenPrefixes = ["6eme", "6e", "5eme", "5e", "4eme", "4e", "3eme", "3e"];
  if (
    moyenPrefixes.some(
      (p) =>
        n === p ||
        n.startsWith(`${p} `) ||
        n.startsWith(`${p}-`) ||
        n.startsWith(`${p}_`) ||
        n.includes("college"),
    )
  ) {
    return { cycle: "MOYEN", serie: null };
  }

  // 4. SECONDAIRE (2nde, 1ère, Terminale)
  const secPrefixes = ["2nde", "seconde", "2nd", "1ere", "premiere", "1er", "terminale", "tle"];
  const isSec =
    secPrefixes.some(
      (p) =>
        n === p ||
        n.startsWith(`${p} `) ||
        n.startsWith(`${p}-`) ||
        n.startsWith(`${p}_`) ||
        n.includes("lycee") ||
        n.includes("secondaire"),
    ) ||
    n.includes("terminale") ||
    n.includes("seconde") ||
    n.includes("premiere");

  if (isSec) {
    let serie: string | null = null;
    const upper = className.toUpperCase();
    if (upper.includes("S1")) serie = "S1";
    else if (upper.includes("S2")) serie = "S2";
    else if (upper.includes("L1")) serie = "L1";
    else if (upper.includes("L2")) serie = "L2";
    else if (upper.includes("STEG")) serie = "STEG";
    else if (upper.includes("STIDD")) serie = "STIDD";
    else if (upper.includes("L'")) serie = "L2";
    else if (upper.includes("S")) serie = "S2";
    else if (upper.includes("L")) serie = "L2";
    return { cycle: "SECONDAIRE", serie };
  }

  return { cycle: "AUTRE", serie: null };
}

/**
 * Normalisation robuste des numéros de téléphone sénégalais (avec ou sans +221, espaces, points).
 */
export function normalizePhone(raw: string | null | undefined): { normalizedDigits: string; formatted: string } | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;

  let local = digits;
  if (digits.startsWith("221") && digits.length === 12) {
    local = digits.slice(3);
  } else if (digits.startsWith("00221") && digits.length === 14) {
    local = digits.slice(5);
  }

  // Numéro sénégalais classique : 9 chiffres (ex: 77 123 45 67)
  if (local.length === 9) {
    const formatted = `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
    return { normalizedDigits: local, formatted };
  }

  if (local.length >= 7) {
    return { normalizedDigits: local, formatted: raw.trim() };
  }

  return null;
}

/**
 * Reconnaissance intelligente des en-têtes usuels.
 * Insensible à la casse, aux accents, aux espaces et aux parenthèses.
 */
export function detectFieldForHeader(
  rawHeader: string,
  savedMapping?: Record<string, string> | null,
): EduComFieldKey | null {
  if (savedMapping && savedMapping[rawHeader]) {
    return savedMapping[rawHeader] as EduComFieldKey;
  }

  const norm = rawHeader
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\(\)\[\]_\-\.\:\;\/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Téléphone tuteur (vérifié avant nom pour éviter les faux positifs)
  if (
    norm.includes("tel") ||
    norm.includes("phone") ||
    norm.includes("mobile") ||
    norm.includes("cellulaire") ||
    norm.includes("contact tuteur") ||
    norm.includes("tel parent")
  ) {
    return "emergencyPhone";
  }

  // 2. Nom du tuteur / parent (vérifié avant nom élève)
  if (
    norm.includes("tuteur") ||
    norm.includes("parent") ||
    norm.includes("responsable") ||
    norm.includes("pere") ||
    norm.includes("mere") ||
    norm.includes("guardian")
  ) {
    return "emergencyContact";
  }

  // 3. Prénom de l'élève
  if (
    norm === "prenom" ||
    norm === "prenoms" ||
    norm.includes("prenom") ||
    norm.includes("firstname") ||
    norm.includes("first name") ||
    norm.includes("given name")
  ) {
    return "firstName";
  }

  // 4. Nom patronymique de l'élève
  if (
    norm === "nom" ||
    norm === "noms" ||
    norm.includes("nom de famille") ||
    norm.includes("lastname") ||
    norm.includes("last name") ||
    norm.includes("family name") ||
    norm.includes("patronyme") ||
    norm.startsWith("nom ") ||
    norm.includes("nom eleve") ||
    norm.includes("nom apprenant")
  ) {
    return "lastName";
  }

  // 5. Classe / Division / Niveau
  if (
    norm.includes("classe") ||
    norm.includes("class") ||
    norm.includes("niveau") ||
    norm.includes("division") ||
    norm.includes("section") ||
    norm.includes("grade")
  ) {
    return "className";
  }

  // 6. Date de naissance
  if (
    norm.includes("date") ||
    norm.includes("naissance") ||
    norm.includes("dob") ||
    norm.includes("birth") ||
    norm.includes("ne e le") ||
    norm.includes("nee le") ||
    norm.includes("ne le") ||
    norm.startsWith("ne ") ||
    norm.startsWith("nee ")
  ) {
    return "dateOfBirth";
  }

  // 7. Sexe / Genre
  if (
    norm === "sexe" ||
    norm === "genre" ||
    norm === "gender" ||
    norm === "sex" ||
    norm === "m f" ||
    norm.includes("sexe") ||
    norm.includes("genre")
  ) {
    return "gender";
  }

  // 8. Matricule / IEN
  if (
    norm.includes("matricule") ||
    norm.includes("identifiant") ||
    norm === "id" ||
    norm.includes("ien") ||
    norm.includes("code")
  ) {
    return "matricule";
  }

  return null;
}

export function normalizeRawRow(row: Record<string, any>): ImportRow {
  const normalized: Record<string, any> = {};

  for (const [rawKey, val] of Object.entries(row)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val).trim();
    if (!strVal) continue;

    const detected = detectFieldForHeader(rawKey);
    if (detected && !normalized[detected]) {
      normalized[detected] = strVal;
    }
  }

  return {
    firstName: normalized.firstName || row.firstName || "",
    lastName: normalized.lastName || row.lastName || "",
    className: normalized.className || row.className || "",
    dateOfBirth: normalized.dateOfBirth || row.dateOfBirth || "",
    gender: normalized.gender || row.gender || "",
    emergencyContact: normalized.emergencyContact || row.emergencyContact || "",
    emergencyPhone: normalized.emergencyPhone || row.emergencyPhone || "",
    matricule: normalized.matricule || row.matricule || "",
    status: normalized.status || row.status || "",
  };
}
