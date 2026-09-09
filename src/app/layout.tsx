import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";

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

  return (
    <html lang="fr" className={`h-full ${lato.variable}`} data-density={density}>
      <body className={`${lato.className} h-full flex flex-col text-text bg-ground font-sans antialiased selection:bg-primary/20 selection:text-primary`}>
        {children}
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
