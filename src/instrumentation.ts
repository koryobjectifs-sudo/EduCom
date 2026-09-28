import type { Instrumentation } from "next";

/**
 * Capture des erreurs serveur pour l'outil de pilotage (27 sept. 2026).
 * `onRequestError` (Next 16) : chaque erreur de rendu, d'action ou d'API
 * est inscrite dans `ErrorEvent`, lue par l'outil de pilotage (application séparée `pilotage/`, écran Erreurs).
 *
 * ⚠️ Jamais d'en-têtes ni de cookies (sessions, jetons) : seulement le chemin
 * (sans paramètres), le type de route, le message tronqué et le digest.
 * Ne lève jamais : un échec d'écriture ne doit pas aggraver l'erreur d'origine.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 2000);
    const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest).slice(0, 100) : null;
    // Les redirections et 404 de Next passent parfois par ici : ce ne sont pas des erreurs.
    if (/NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK/.test(message) || (digest && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test(digest))) return;
    const { prisma } = await import("@/lib/prisma");
    await prisma.errorEvent.create({
      data: { path: request.path.split("?")[0].slice(0, 300), routeType: context.routeType, message, digest },
    });
  } catch {
    /* table absente ou base indisponible : on ignore */
  }
};
