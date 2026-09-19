import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export interface NormalizedPhone {
  isValid: boolean;
  e164: string; // ex: +221770001303
  national: string; // ex: 77 000 13 03
  digits: string; // ex: 770001303 (sans indicatif pays)
  fullDigits: string; // ex: 221770001303
  raw: string;
}

/**
 * Normalise un numéro de téléphone avec priorité Sénégal (SN) par défaut.
 * Accepte les formats internationaux (+221...), locaux (77...), avec espaces ou tirets.
 */
export function normalizePhone(rawPhone: string, defaultCountry: CountryCode = "SN"): NormalizedPhone {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      e164: "",
      national: "",
      digits: "",
      fullDigits: "",
      raw: rawPhone || "",
    };
  }

  const cleaned = rawPhone.trim();
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);

  if (parsed && parsed.isValid()) {
    const e164 = parsed.format("E.164");
    const national = parsed.formatNational();
    const fullDigits = parsed.number.replace(/\D/g, "");
    const countryCallingCode = parsed.countryCallingCode || "221";
    const digits = fullDigits.startsWith(countryCallingCode)
      ? fullDigits.slice(countryCallingCode.length)
      : fullDigits;

    return {
      isValid: true,
      e164,
      national,
      digits,
      fullDigits,
      raw: cleaned,
    };
  }

  // Repli gracieux si libphonenumber échoue sur un format local brut (ex. 9 chiffres sénégalais)
  const onlyDigits = cleaned.replace(/\D/g, "");
  if (onlyDigits.length === 9 && /^(77|78|76|75|70)/.test(onlyDigits)) {
    const e164 = `+221${onlyDigits}`;
    const national = `${onlyDigits.slice(0, 2)} ${onlyDigits.slice(2, 5)} ${onlyDigits.slice(5, 7)} ${onlyDigits.slice(7, 9)}`;
    return {
      isValid: true,
      e164,
      national,
      digits: onlyDigits,
      fullDigits: `221${onlyDigits}`,
      raw: cleaned,
    };
  }

  return {
    isValid: false,
    e164: "",
    national: "",
    digits: onlyDigits,
    fullDigits: onlyDigits,
    raw: cleaned,
  };
}

/**
 * Génère toutes les variantes courantes de représentation pour la recherche en base de données.
 * Permet de faire matcher n'importe quel format historique en une seule requête SQL.
 */
export function getPhoneSearchVariants(phone: string): string[] {
  const norm = normalizePhone(phone);
  if (!norm.isValid) {
    const rawClean = phone.trim();
    return rawClean ? [rawClean] : [];
  }

  const variants = new Set<string>();
  variants.add(norm.e164); // +221770001303
  variants.add(norm.national); // 77 000 13 03
  variants.add(norm.digits); // 770001303
  variants.add(norm.fullDigits); // 221770001303
  variants.add(`+221 ${norm.national}`); // +221 77 000 13 03 (format fréquent dans les imports)
  variants.add(`00221${norm.digits}`); // 00221770001303
  variants.add(phone.trim());

  return Array.from(variants).filter(Boolean);
}
