/**
 * Utilitaires universels de parsing de date et de calcul d'âge pour EduCom.
 * Supporte :
 * - JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA
 * - AAAA-MM-JJ, AAAA/MM/JJ
 * - Numéros de série de dates Excel (ex. 41234)
 * - Objets Date et chaînes ISO standard
 */

export function parseFlexibleDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  // Support des nombres de série Excel
  if (typeof raw === "number") {
    if (isNaN(raw) || raw <= 0) return null;
    // Format Excel serial date (offset 25569 = 1970-01-01)
    if (raw > 1000 && raw < 100000) {
      const utcDays = raw - 25569;
      const utcValue = utcDays * 86400 * 1000;
      const date = new Date(utcValue);
      return isNaN(date.getTime()) ? null : date;
    }
    // Unix timestamp en ms ou s
    if (raw > 100000000000) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }
    if (raw > 100000000) {
      const d = new Date(raw * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  if (typeof raw !== "string") return null;
  const str = raw.trim();
  if (!str) return null;

  // 1. Format JJ/MM/AAAA ou JJ-MM-AAAA ou JJ.MM.AAAA
  const frMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (frMatch) {
    const day = parseInt(frMatch[1], 10);
    const month = parseInt(frMatch[2], 10) - 1;
    let year = parseInt(frMatch[3], 10);
    if (year < 100) {
      year += year > 40 ? 1900 : 2000;
    }
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month, day);
      if (d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
  }

  // 2. Format AAAA-MM-JJ ou AAAA/MM/JJ
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month, day);
      if (d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
  }

  // 3. Fallback standard Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 1900 && y <= 2100) {
      return parsed;
    }
  }

  return null;
}

/**
 * Calcule l'âge d'un élève avec précision par rapport à une date de référence.
 * Renvoie null si la date est inconnue/invalide.
 */
export function calculateAge(
  dob: Date | string | number | null | undefined,
  refDate: Date = new Date()
): { age: number; formatted: string } | null {
  const birth = parseFlexibleDate(dob);
  if (!birth) return null;

  let age = refDate.getFullYear() - birth.getFullYear();
  const m = refDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 0 || age > 100) return null;

  if (age === 0) {
    return { age: 0, formatted: "< 1 an" };
  }
  if (age === 1) {
    return { age: 1, formatted: "1 an" };
  }
  return { age, formatted: `${age} ans` };
}

/**
 * Formatage lisible de l'âge pour l'interface utilisateur.
 * Quand la date est absente : renvoie "Âge inconnu" (jamais "0 ans").
 */
export function formatStudentAge(dob: Date | string | number | null | undefined): string {
  const res = calculateAge(dob);
  return res ? res.formatted : "Âge inconnu";
}
