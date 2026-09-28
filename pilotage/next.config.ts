import type { NextConfig } from "next";
import path from "node:path";
import { existsSync } from "node:fs";

// ⚠️ Application SÉPARÉE logée dans le dépôt d'EduCom : sans ces deux lignes,
// Next prend la racine du dépôt pour la sienne et compile les fichiers
// d'EduCom (proxy.ts, etc.).
const ici = path.resolve(__dirname);
// En local, le pilotage peut réutiliser les dépendances d'EduCom (../node_modules)
// sans `npm install` à part : la racine Turbopack devient alors le dépôt.
// Sur Vercel (Root Directory = pilotage), ses propres dépendances sont installées.
const racine = existsSync(path.join(ici, "node_modules", "next")) ? ici : path.resolve(ici, "..");

const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: racine },
  outputFileTracingRoot: racine,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default config;
