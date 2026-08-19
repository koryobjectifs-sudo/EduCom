import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROTOTYPE ISOLÉ — HERO PHOTOGRAPHIQUE
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ CE DOSSIER N'EST PAS LE PRODUIT. Il existe pour qu'on puisse REGARDER une
 * direction artistique avant de décider si on la garde.
 *
 * Tout le prototype tient dans `src/app/prototype/hero/` + les deux photos de
 * `public/prototype/hero/`. Rien d'autre au dépôt n'en dépend, et rien d'autre
 * au dépôt n'a été modifié pour lui. Le supprimer = supprimer ces deux
 * dossiers ; la landing actuelle ne bouge pas d'un pixel.
 *
 * ⚠️ POURQUOI UNE MISE EN PAGE LOCALE, ET PAS `(marketing)/layout.tsx`.
 * Réutiliser la mise en page marketing aurait branché le prototype sur le
 * `Navbar` et le `Footer` réels : le moindre ajustement fait ici pour le
 * prototype serait alors devenu une modification de la landing en production.
 * Cette mise en page recharge donc Fraunces pour son propre compte. C'est
 * quinze lignes dupliquées, contre zéro risque de contaminer l'existant.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Prototype — Hero photographique · EduCom",
  // Un prototype ne doit jamais finir indexé à côté de la vraie page d'accueil.
  robots: { index: false, follow: false },
};

export default function PrototypeHeroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} flex min-h-screen flex-col bg-m-paper text-m-ink-soft`}>
      {children}
    </div>
  );
}
