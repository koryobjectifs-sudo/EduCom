import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n/context";
import { resolveLocale } from "@/lib/i18n";

const lato = Lato({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "EduCom SaaS",
  description: "Plateforme de gestion pour les écoles",
  // ═══ Icônes officielles (bouclier) — 23 septembre 2026 ═══
  //
  // Fichiers dans `public/` UNIQUEMENT : favicon.ico (16/32/48), icon.png
  // (192), apple-icon.png (180, fond blanc plein — iOS arrondit lui-même).
  //
  // ⚠️ Ne JAMAIS remettre d'icône dans `src/app/` (favicon.ico, icon.*,
  // apple-icon.*). Une icône « fichier » y est prioritaire sur cet objet
  // (doc Next 16, generate-metadata : « file-based metadata has the higher
  // priority ») : cette configuration serait ignorée sans un mot. C'est ce
  // qui se passait — et l'ancien `src/app/icon.svg` (symbole « E » d'août)
  // restait servi en SVG, format que Chrome et Firefox PRÉFÈRENT au .ico :
  // l'onglet affichait l'ancien logo malgré le nouveau favicon.
  //
  // `?v=` : incrémenter à chaque changement d'icône (cache navigateur tenace).
  icons: {
    icon: [
      { url: "/favicon.ico?v=educom-3", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon.png?v=educom-3", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico?v=educom-3",
    apple: [
      { url: "/apple-icon.png?v=educom-3", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const density = cookieStore.get("educom_density")?.value || "normal";
  const cookieLocale = cookieStore.get("educom_locale")?.value;
  
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");

  const locale = resolveLocale({ cookieLocale, acceptLanguage });

  return (
    <html lang={locale} dir="ltr" className={`h-full ${lato.variable}`} data-density={density}>
      <body className={`${lato.className} h-full flex flex-col text-text bg-ground font-sans antialiased selection:bg-primary/20 selection:text-primary`}>
        <I18nProvider locale={locale}>
          {children}
        </I18nProvider>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            className: "bg-white/95 backdrop-blur-md border border-rule text-text shadow-overlay rounded-surface p-3.5 font-medium text-xs",
          }} 
        />
      </body>
    </html>
  );
}
