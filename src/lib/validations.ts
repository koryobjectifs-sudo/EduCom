import { z } from "zod";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

// ── 1. DOMAINES JETABLES / TEMPORAIRES INTERDITS ──
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf", "courriel.fr.nf",
  "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf", "hide.biz.st", "mymail.infos.st",
  "mailinator.com", "mailinator.net", "mailinator2.com", "tempmail.com", "temp-mail.org",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "sharklasers.com", "grr.la", "guerrillamail.biz", "guerrillamail.de",
  "10minutemail.com", "10minutemail.net", "10minmail.com", "trashmail.com", "trashmail.net",
  "dispostable.com", "fakeinbox.com", "getairmail.com", "mohmal.com", "throwawaymail.com",
  "burnermail.io", "crazymailing.com", "generator.email", "tempail.com", "mytemp.email",
  "dropmail.me", "nada.ltd", "getnada.com", "emailondeck.com", "inboxkitten.com"
]);

export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@").pop()?.trim().toLowerCase();
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}

// ── 2. SCHÉMA E-MAIL STRICT ──
const REAL_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emailSchema = z
  .string()
  .trim()
  .min(5, "Cette adresse ne semble pas valide.")
  .regex(REAL_EMAIL_REGEX, "Cette adresse ne semble pas valide.")
  .refine((val) => {
    const parts = val.split("@");
    if (parts.length !== 2) return false;
    const domain = parts[1];
    const dotIndex = domain.lastIndexOf(".");
    if (dotIndex === -1 || domain.slice(dotIndex + 1).length < 2) return false;
    return true;
  }, "Cette adresse ne semble pas valide.")
  .refine((val) => !isDisposableEmail(val), "Les adresses e-mails temporaires ou jetables ne sont pas autorisées.");

// ── 3. VALIDATION TÉLÉPHONE PAR PAYS ──
const COUNTRY_NAMES: Record<string, string> = {
  SN: "sénégalais",
  FR: "français",
  CI: "ivoirien",
  ML: "malien",
  GN: "guinéen",
  MR: "mauritanien",
  GM: "gambien",
  BF: "burkinabé",
  BJ: "béninois",
  TG: "togolais",
  US: "américain",
  CA: "canadien",
};

const COUNTRY_FORMAT_EXAMPLES: Record<string, string> = {
  SN: "77 123 45 67",
  FR: "06 12 34 56 78",
  CI: "07 12 34 56 78",
  ML: "70 12 34 56",
  GN: "620 12 34 56",
  MR: "45 12 34 56",
  GM: "701 2345",
};

export function getPhoneValidationError(phoneStr: string): string | null {
  const clean = (phoneStr || "").trim();
  if (!clean) return "Numéro de téléphone requis.";

  try {
    const hasPlus = clean.startsWith("+");
    const defaultCountry = !hasPlus && (clean.startsWith("7") || clean.length === 9) ? "SN" : undefined;

    if (!isValidPhoneNumber(clean, defaultCountry)) {
      let parsed = null;
      try {
        parsed = parsePhoneNumber(clean, defaultCountry);
      } catch {}
      const countryCode = parsed?.country || defaultCountry || (clean.startsWith("+221") || clean.startsWith("7") ? "SN" : undefined);
      const countryAdj = countryCode && COUNTRY_NAMES[countryCode] ? COUNTRY_NAMES[countryCode] : "international";
      const example = countryCode && COUNTRY_FORMAT_EXAMPLES[countryCode] ? ` Format attendu : ${COUNTRY_FORMAT_EXAMPLES[countryCode]}.` : "";
      return `Ce numéro n'est pas un numéro ${countryAdj} valide.${example}`;
    }

    const parsed = parsePhoneNumber(clean, defaultCountry);
    if (parsed?.country === "SN") {
      // Vérification spécifique Sénégal : 9 chiffres nationaux, commence par 7
      const nat = parsed.nationalNumber;
      if (!nat.startsWith("7") || nat.length !== 9) {
        return "Ce numéro n'est pas un numéro sénégalais valide. Format attendu : 77 123 45 67.";
      }
    }
  } catch {
    return "Ce numéro de téléphone n'est pas valide.";
  }

  return null;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(4, "Numéro de téléphone requis.")
  .superRefine((val, ctx) => {
    const err = getPhoneValidationError(val);
    if (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err,
      });
    }
  })
  .transform((val) => {
    try {
      const hasPlus = val.startsWith("+");
      const defaultCountry = !hasPlus && (val.startsWith("7") || val.length === 9) ? "SN" : undefined;
      const parsed = parsePhoneNumber(val, defaultCountry);
      return parsed ? parsed.number : val;
    } catch {
      return val;
    }
  });

// ── 4. NOMS, PRÉNOMS, ÉCOLES & MOTS DE PASSE ──
// Lettres (y compris accents Unicode), espaces, tirets et apostrophes. Zéro chiffre.
const PERSON_NAME_REGEX = /^[\p{L}\s'-]+$/u;

export const personNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom doit comporter au moins 2 caractères.")
  .max(60, "Le nom est trop long (maximum 60 caractères).")
  .regex(PERSON_NAME_REGEX, "Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes (aucun chiffre).");

export const nameSchema = personNameSchema;

export const schoolNameSchema = z
  .string()
  .trim()
  .min(3, "Le nom de l'établissement doit comporter au moins 3 caractères.")
  .max(100, "Le nom de l'établissement est trop long.");

export const addressSchema = z
  .string()
  .trim()
  .min(3, "L'adresse doit comporter au moins 3 caractères.");

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit comporter au moins 8 caractères.");

// ── 5. INDICATEUR DE ROBUSTESSE DU MOT DE PASSE ──
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  percentage: number;
};

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Vide", color: "bg-rule", percentage: 0 };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Très faible", color: "bg-danger", percentage: 25 };
    case 2:
      return { score: 2, label: "Moyen", color: "bg-amber-500", percentage: 50 };
    case 3:
      return { score: 3, label: "Bon", color: "bg-sky-500", percentage: 75 };
    case 4:
      return { score: 4, label: "Robuste", color: "bg-emerald-500", percentage: 100 };
    default:
      return { score: 0, label: "Trop court (min. 8 car.)", color: "bg-danger", percentage: 10 };
  }
}
