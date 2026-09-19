import type { Prisma } from "@/generated/prisma/client";
import writtenNumber from "written-number";

/**
 * Génère le numéro séquentiel officiel d'une facture pour un établissement donné.
 * Format : FAC-YYYY-0001 (incrément atomique par école et par année).
 */
export async function getNextInvoiceNumber(
  tx: Prisma.TransactionClient,
  schoolId: string,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const seq = await tx.documentSequence.upsert({
    where: {
      schoolId_type_year: {
        schoolId,
        type: "INVOICE",
        year,
      },
    },
    update: {
      lastNumber: { increment: 1 },
    },
    create: {
      schoolId,
      type: "INVOICE",
      year,
      lastNumber: 1,
    },
    select: {
      lastNumber: true,
    },
  });

  const padded = String(seq.lastNumber).padStart(4, "0");
  return `FAC-${year}-${padded}`;
}

/**
 * Prévisualise le prochain numéro séquentiel d'une facture sans incrémenter la séquence.
 */
export async function peekNextInvoiceNumber(
  client: any,
  schoolId: string,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const seq = await client.documentSequence.findUnique({
    where: {
      schoolId_type_year: {
        schoolId,
        type: "INVOICE",
        year,
      },
    },
    select: {
      lastNumber: true,
    },
  });
  const nextNumber = (seq?.lastNumber ?? 0) + 1;
  const padded = String(nextNumber).padStart(4, "0");
  return `FAC-${year}-${padded}`;
}

/**
 * Génère le numéro séquentiel officiel d'un reçu pour un établissement donné.
 * Format : REC-YYYY-0001 (incrément atomique par école et par année).
 */
export async function getNextReceiptNumber(
  tx: Prisma.TransactionClient,
  schoolId: string,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const seq = await tx.documentSequence.upsert({
    where: {
      schoolId_type_year: {
        schoolId,
        type: "RECEIPT",
        year,
      },
    },
    update: {
      lastNumber: { increment: 1 },
    },
    create: {
      schoolId,
      type: "RECEIPT",
      year,
      lastNumber: 1,
    },
    select: {
      lastNumber: true,
    },
  });

  const padded = String(seq.lastNumber).padStart(4, "0");
  return `REC-${year}-${padded}`;
}

/**
 * Formatage monétaire XOF strict sans décimales.
 * Ex : 45000 -> "45 000 FCFA"
 */
export function formatXOF(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return `${rounded.toLocaleString("fr-FR")} FCFA`;
}

/**
 * Conversion d'un montant XOF en toutes lettres en français.
 * Ex : 45000 -> "quarante-cinq mille francs CFA"
 */
export function amountInWordsXOF(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  const words = writtenNumber(rounded, { lang: "fr" });
  return `${words} francs CFA`;
}
