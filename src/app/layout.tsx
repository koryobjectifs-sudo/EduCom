import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EduCom SaaS",
  description: "Plateforme de gestion pour les écoles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full bg-[#f8fafc]">
      <body className={`${inter.className} h-full flex flex-col text-slate-900 selection:bg-blue-100 selection:text-blue-900`}>
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            className: 'bg-white/90 backdrop-blur-xl border border-border/50 text-text-primary shadow-lg rounded-2xl p-4 font-medium',
            style: {
              borderRadius: '24px',
              padding: '16px 20px',
            },
            classNames: {
              toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-text-primary group-[.toaster]:border-border/50 group-[.toaster]:shadow-lg',
              description: 'group-[.toast]:text-text-secondary',
              actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-white',
              cancelButton: 'group-[.toast]:bg-secondary group-[.toast]:text-text-primary',
            },
          }} 
        />
      </body>
    </html>
  );
}
