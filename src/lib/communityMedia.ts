import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActorContext } from "@/lib/audit";

/**
 * Médias de la Communauté — phase 2, 25 sept. 2026.
 *
 * ═══ POURQUOI UNE URL D'ENVOI SIGNÉE ═══
 * Les server actions plafonnent le corps à 1 Mo : une photo de téléphone ou
 * une vidéo n'y passe pas. Le serveur délivre donc une URL d'envoi signée,
 * valable pour UN chemin précis qu'il a lui-même choisi, et le navigateur
 * envoie le fichier directement au Storage. Le client ne choisit jamais le
 * chemin : il ne peut ni écraser un fichier existant ni écrire chez une autre
 * école.
 *
 * ═══ BUCKET PRIVÉ ═══
 * `community-media` n'est jamais public : on lit par URL signée d'une heure.
 * Créé automatiquement au premier envoi s'il n'existe pas.
 */
export const BUCKET_COMMUNAUTE = "community-media";

const TYPES: Record<string, { kind: "IMAGE" | "VIDEO" | "PDF"; ext: string }> = {
  "image/jpeg": { kind: "IMAGE", ext: "jpg" },
  "image/png": { kind: "IMAGE", ext: "png" },
  "image/webp": { kind: "IMAGE", ext: "webp" },
  "video/mp4": { kind: "VIDEO", ext: "mp4" },
  "video/quicktime": { kind: "VIDEO", ext: "mov" },
  "video/webm": { kind: "VIDEO", ext: "webm" },
  "application/pdf": { kind: "PDF", ext: "pdf" },
};

/** Tailles maximales (octets). Les photos sont compressées dans le navigateur avant l'envoi. */
export const TAILLE_MAX = { IMAGE: 8 * 1024 * 1024, VIDEO: 50 * 1024 * 1024, PDF: 15 * 1024 * 1024 } as const;
export const DUREE_VIDEO_MAX_S = 120;
const MEDIAS_LIBRES_MAX_PAR_HEURE = 40;

let bucketPret = false;
async function assurerBucket() {
  if (bucketPret) return;
  const admin = createAdminClient();
  const { data } = await admin.storage.getBucket(BUCKET_COMMUNAUTE);
  if (!data) {
    const { error } = await admin.storage.createBucket(BUCKET_COMMUNAUTE, {
      public: false,
      fileSizeLimit: TAILLE_MAX.VIDEO,
      allowedMimeTypes: Object.keys(TYPES),
    });
    if (error && !/already exists/i.test(error.message)) throw new Error(`Bucket Communauté : ${error.message}`);
  }
  bucketPret = true;
}

export type DemandeEnvoi = {
  mime: string;
  size: number;
  fileName?: string;
  width?: number;
  height?: number;
  durationSec?: number;
};

export async function preparerEnvoiMedia(
  actor: ActorContext,
  d: DemandeEnvoi,
): Promise<{ ok: true; mediaId: string; path: string; token: string } | { ok: false; error: string }> {
  const type = TYPES[d.mime];
  if (!type) return { ok: false, error: "Format non accepté : photo (JPEG, PNG, WebP), vidéo (MP4, MOV, WebM) ou PDF." };
  const size = Math.floor(Number(d.size));
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "Fichier vide." };
  if (size > TAILLE_MAX[type.kind]) {
    return { ok: false, error: `Fichier trop lourd (maximum ${Math.round(TAILLE_MAX[type.kind] / 1024 / 1024)} Mo).` };
  }
  if (type.kind === "VIDEO" && d.durationSec && d.durationSec > DUREE_VIDEO_MAX_S) {
    return { ok: false, error: `Vidéo trop longue (maximum ${DUREE_VIDEO_MAX_S / 60} minutes).` };
  }
  const recents = await prisma.communityMedia.count({
    where: {
      schoolId: actor.schoolId,
      uploaderId: actor.userId,
      postId: null,
      messageId: null,
      createdAt: { gt: new Date(Date.now() - 3600_000) },
    },
  });
  if (recents >= MEDIAS_LIBRES_MAX_PAR_HEURE) return { ok: false, error: "Trop d'envois en attente. Publiez ou réessayez plus tard." };

  await assurerBucket();
  const path = `${actor.schoolId}/${randomUUID()}.${type.ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_COMMUNAUTE).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "L'envoi n'a pas pu être préparé. Réessayez." };

  const media = await prisma.communityMedia.create({
    data: {
      schoolId: actor.schoolId,
      uploaderId: actor.userId,
      kind: type.kind,
      storagePath: path,
      mime: d.mime,
      sizeBytes: size,
      fileName: d.fileName?.slice(0, 200) ?? null,
      width: d.width ? Math.round(d.width) : null,
      height: d.height ? Math.round(d.height) : null,
      durationSec: d.durationSec ? Math.round(d.durationSec) : null,
    },
    select: { id: true },
  });
  return { ok: true, mediaId: media.id, path, token: data.token };
}

/**
 * Médias libres de l'acteur, réellement présents dans le Storage, prêts à
 * être rattachés. Renvoie `null` si un seul identifiant est invalide : on ne
 * publie pas à moitié.
 */
export async function mediasRattachables(actor: ActorContext, ids: string[]) {
  const uniques = [...new Set(ids)].slice(0, 10);
  if (uniques.length === 0) return [];
  const medias = await prisma.communityMedia.findMany({
    where: { id: { in: uniques }, schoolId: actor.schoolId, uploaderId: actor.userId, postId: null, messageId: null },
    select: { id: true, storagePath: true },
  });
  if (medias.length !== uniques.length) return null;
  const store = createAdminClient().storage.from(BUCKET_COMMUNAUTE);
  for (const m of medias) {
    const { data } = await store.exists(m.storagePath);
    if (!data) return null;
  }
  return uniques;
}

export type MediaVue = {
  id: string;
  kind: "IMAGE" | "VIDEO" | "PDF";
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
  fileName: string | null;
};

/** URLs de lecture signées (1 h), en un seul appel au Storage. */
export async function signerMedias(
  medias: { id: string; kind: string; storagePath: string; mime: string; width: number | null; height: number | null; fileName: string | null }[],
): Promise<Map<string, MediaVue>> {
  const res = new Map<string, MediaVue>();
  if (medias.length === 0) return res;
  const { data } = await createAdminClient()
    .storage.from(BUCKET_COMMUNAUTE)
    .createSignedUrls(
      medias.map((m) => m.storagePath),
      3600,
    );
  const parChemin = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  for (const m of medias) {
    const url = parChemin.get(m.storagePath);
    if (!url) continue;
    res.set(m.id, {
      id: m.id,
      kind: m.kind as MediaVue["kind"],
      url,
      mime: m.mime,
      width: m.width,
      height: m.height,
      fileName: m.fileName,
    });
  }
  return res;
}
