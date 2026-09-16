/**
 * Décomposition intelligente d'un nom complet en prénom et patronyme.
 * Adapté aux conventions ouest-africaines et sénégalaises.
 */
export function splitFullName(input: string): { firstName: string; lastName: string } {
  const clean = (input || "").trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", lastName: "" };

  const parts = clean.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "-" };
  }

  // Convention Afrique francophone / Sénégal :
  // Si un mot est en MAJUSCULES (ex: "DIOP Moussa" ou "Moussa DIOP"), c'est le nom patronymique.
  const upperIdx = parts.findIndex((p) => p.length > 1 && p === p.toUpperCase() && !/^\d+$/.test(p));
  if (upperIdx !== -1) {
    const lastName = parts[upperIdx];
    const firstName = parts.filter((_, idx) => idx !== upperIdx).join(" ");
    return { firstName, lastName };
  }

  // Format usuel : Prénom(s) Nom (dernier token = nom patronymique)
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}
