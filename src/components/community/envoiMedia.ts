"use client";

import { createClient } from "@/lib/supabase/client";
import { preparerMedia } from "@/app/dashboard/communications/communaute/actions";

/**
 * Envoi d'une photo / vidéo / PDF vers la Communauté — navigateur.
 *
 * 1. Photo : redimensionnée (1600 px max) et recompressée en JPEG — une photo
 *    de téléphone de 4 Mo tombe vers 300 Ko : moins de données mobiles pour
 *    les familles, affichage plus rapide.
 * 2. Le serveur délivre une URL d'envoi signée pour un chemin qu'IL choisit.
 * 3. Le fichier part directement au Storage (pas par le serveur EduCom).
 */
export const BUCKET_COMMUNAUTE = "community-media";
export const ACCEPT = "image/jpeg,image/png,image/webp,image/*,video/mp4,video/quicktime,video/webm,application/pdf";

export type MediaEnvoye = {
  mediaId: string;
  kind: "IMAGE" | "VIDEO" | "PDF";
  apercu: string;
  nom: string;
};

async function compresserImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("Cette photo n'a pas pu être lue. Essayez en JPEG ou PNG.");
  const max = 1600;
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
  if (!blob) throw new Error("La photo n'a pas pu être préparée.");
  return { blob, width: w, height: h };
}

function dureeVideo(file: File): Promise<number | undefined> {
  return new Promise((ok) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      ok(Number.isFinite(v.duration) ? v.duration : undefined);
    };
    v.onerror = () => ok(undefined);
    v.src = URL.createObjectURL(file);
  });
}

export async function envoyerMedia(file: File, usage: "PUBLICATION" | "MESSAGE" = "PUBLICATION"): Promise<MediaEnvoye> {
  let blob: Blob = file;
  let mime = file.type || "application/octet-stream";
  let width: number | undefined;
  let height: number | undefined;
  let durationSec: number | undefined;

  if (mime.startsWith("image/")) {
    const c = await compresserImage(file);
    blob = c.blob;
    mime = "image/jpeg";
    width = c.width;
    height = c.height;
  } else if (mime.startsWith("video/")) {
    durationSec = await dureeVideo(file);
  }

  const prep = await preparerMedia({ mime, size: blob.size, fileName: file.name, width, height, durationSec }, usage);
  if (!prep.ok) throw new Error(prep.error);

  const { error } = await createClient()
    .storage.from(BUCKET_COMMUNAUTE)
    .uploadToSignedUrl(prep.path, prep.token, blob, { contentType: mime });
  if (error) throw new Error("L'envoi a échoué. Vérifiez votre connexion et réessayez.");

  const kind = mime.startsWith("image/") ? "IMAGE" : mime.startsWith("video/") ? "VIDEO" : "PDF";
  return { mediaId: prep.mediaId, kind, apercu: kind === "PDF" ? "" : URL.createObjectURL(blob), nom: file.name };
}
