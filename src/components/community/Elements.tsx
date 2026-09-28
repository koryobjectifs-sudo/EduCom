"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import type { MediaVue } from "@/lib/communityMedia";
import { initiales, teinte } from "./outils";

export function Avatar({
  nom,
  avatar,
  taille = "md",
}: {
  nom: string;
  avatar?: string | null;
  taille?: "sm" | "md" | "lg";
}) {
  const [erreur, setErreur] = useState(false);
  const t = taille === "sm" ? "h-6 w-6 text-[10px]" : taille === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  if (avatar && !erreur) {
    return (
      <span aria-hidden="true" className={`relative flex shrink-0 overflow-hidden rounded-full ${t} shadow-2xs border border-rule/50 bg-sunk`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt=""
          loading="lazy"
          onError={() => setErreur(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-bold select-none ${t} ${teinte(nom)}`}>
      {initiales(nom)}
    </span>
  );
}

/** Photos et vidéos en grille (visionneuse plein écran), PDF en liste. */
export function GrilleMedias({ medias }: { medias: MediaVue[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const visuels = medias.filter((m) => m.kind !== "PDF");
  const pdfs = medias.filter((m) => m.kind === "PDF");
  const affiches = visuels.slice(0, 4);
  const reste = visuels.length - affiches.length;
  const media = visuels.find((m) => m.id === ouvert);

  return (
    <div className="space-y-2">
      {affiches.length > 0 && (
        <div className={`grid gap-1 overflow-hidden rounded-xl ${affiches.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {affiches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOuvert(m.id)}
              aria-label={m.kind === "VIDEO" ? "Lire la vidéo" : "Agrandir la photo"}
              className={`relative block overflow-hidden bg-sunk ${affiches.length === 1 ? "max-h-[440px]" : "aspect-square"} ${
                affiches.length === 3 && i === 0 ? "row-span-2 aspect-auto" : ""
              }`}
            >
              {m.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <video src={`${m.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
              )}
              {m.kind === "VIDEO" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-xl text-white">▶</span>
                </span>
              )}
              {i === affiches.length - 1 && reste > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-bold text-white">+{reste}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {pdfs.map((m) => (
        <a
          key={m.id}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center gap-3 rounded-xl border border-rule bg-sunk/60 px-3 text-sm font-medium text-text hover:bg-sunk"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface ring-1 ring-rule">
            <FileText aria-hidden="true" className="h-4 w-4 text-primary-ink" />
          </span>
          <span className="min-w-0 flex-1 truncate">{m.fileName ?? "Document PDF"}</span>
          <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-xs font-semibold text-text-soft ring-1 ring-rule">Ouvrir</span>
        </a>
      ))}
      {media && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Média"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3"
          onClick={() => setOuvert(null)}
        >
          <button type="button" aria-label="Fermer" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            {media.kind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt="" className="max-h-[90dvh] max-w-full object-contain" />
            ) : (
              <video src={media.url} controls autoPlay playsInline className="max-h-[90dvh] max-w-full" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pièces jointes en cours d'envoi, avant publication. */
export function ApercuPieces({
  medias,
  envois,
  retirer,
}: {
  medias: { mediaId: string; kind: string; apercu: string; nom: string }[];
  envois: number;
  retirer: (id: string) => void;
}) {
  if (medias.length === 0 && envois === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {medias.map((m) => (
        <li key={m.mediaId} className="relative h-16 w-16 overflow-hidden rounded-lg bg-sunk ring-1 ring-rule">
          {m.kind === "IMAGE" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.apercu} alt="" className="h-full w-full object-cover" />
          )}
          {m.kind === "VIDEO" && <video src={m.apercu} muted playsInline className="h-full w-full object-cover" />}
          {m.kind === "PDF" && (
            <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-1 text-center text-[9px] text-text-soft">
              <FileText aria-hidden="true" className="h-4 w-4 text-primary-ink" />
              <span className="line-clamp-2">{m.nom}</span>
            </span>
          )}
          <button
            type="button"
            aria-label="Retirer"
            onClick={() => retirer(m.mediaId)}
            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        </li>
      ))}
      {Array.from({ length: envois }).map((_, i) => (
        <li key={`e${i}`} className="flex h-16 w-16 items-center justify-center rounded-lg bg-sunk ring-1 ring-rule">
          <span aria-label="Envoi en cours" className="h-4 w-4 animate-spin rounded-full border-2 border-primary-ink border-t-transparent" />
        </li>
      ))}
    </ul>
  );
}
