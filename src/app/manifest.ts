import type { MetadataRoute } from "next";

/**
 * Manifeste de l'application — 25 sept. 2026 (Communauté, phase 4).
 * Permet « Ajouter à l'écran d'accueil » : EduCom s'ouvre comme une appli, et
 * sur iPhone c'est la condition pour recevoir les notifications push.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduCom",
    short_name: "EduCom",
    description: "L'école et les familles, dans une seule application.",
    start_url: "/login",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#001D3F",
    lang: "fr",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
