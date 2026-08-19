/**
 * Limites d'import des pièces du dossier — **module utilisable côté navigateur**.
 *
 * ⚠️ Extrait de `src/lib/studentFile.ts` au lot 14, pour la raison établie au
 * lot 13.1 : `studentFile.ts` importe Prisma, et l'écran de scan est un
 * composant `"use client"`.
 *
 * ⚠️ **Le déplacement n'est pas cosmétique : il supprime un risque de
 * divergence.** L'écran de scan doit refuser un fichier trop lourd ou d'un
 * format non prévu *avant* de l'envoyer — sur une connexion mobile, laisser
 * partir 12 Mo pour recevoir un refus est cruel. Sans ce module, il aurait fallu
 * réécrire les règles côté client, avec la certitude qu'un jour les deux copies
 * ne diraient plus la même chose. Ici, **c'est exactement le même code qui
 * s'exécute des deux côtés** — le client pour être aimable, le serveur pour
 * décider.
 */

/**
 * Types acceptés — pièces administratives et photos de pièces.
 *
 * ⚠️ Liste **fermée**. Refuser par liste blanche et non par liste noire : une
 * liste noire laisse toujours passer le format qu'on n'a pas prévu. Les mêmes
 * types sont déclarés sur le bucket, donc Supabase refuse aussi côté serveur —
 * deux verrous, comme pour l'isolation financière.
 */
export const ALLOWED_MIME: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
};

/** 10 Mo — une photo de pièce d'identité prise au téléphone tient largement. */
export const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Nettoie un nom de fichier venu du navigateur.
 *
 * ⚠️ Retire les séparateurs de chemin : un nom contenant `../` permettrait
 * d'écrire hors du dossier de l'élève. Les accents sont conservés (les pièces
 * s'appellent « Extrait de naissance.pdf »), seuls les caractères dangereux ou
 * de contrôle sautent.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "document";
  return base
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 120) || "document";
}

export type FileCheck = { ok: true; extension: string } | { ok: false; error: string };

/**
 * Valide un fichier avant tout envoi.
 *
 * ⚠️ **L'extension seule ne fait jamais foi** : elle vient du navigateur et se
 * renomme en deux secondes. Le type MIME décide, et l'extension doit être
 * *cohérente* avec lui — un `.exe` renommé `.pdf` échoue sur le MIME, un PDF
 * renommé `.exe` échoue sur la cohérence.
 */
export function checkFile(mimeType: string, fileName: string, sizeBytes: number): FileCheck {
  const allowed = ALLOWED_MIME[mimeType];
  if (!allowed) {
    return { ok: false, error: `Type de fichier non autorisé (${mimeType || "inconnu"}). Formats acceptés : PDF, JPEG, PNG, WEBP, HEIC.` };
  }
  if (sizeBytes <= 0) return { ok: false, error: "Fichier vide." };
  if (sizeBytes > MAX_BYTES) {
    return { ok: false, error: `Fichier trop volumineux (${(sizeBytes / 1048576).toFixed(1)} Mo). Maximum : 10 Mo.` };
  }
  const ext = (sanitizeFileName(fileName).split(".").pop() ?? "").toLowerCase();
  if (!allowed.includes(ext)) {
    return { ok: false, error: `L'extension « .${ext} » ne correspond pas au type réel du fichier (${mimeType}).` };
  }
  return { ok: true, extension: ext };
}
