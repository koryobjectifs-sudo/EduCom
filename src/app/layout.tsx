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
