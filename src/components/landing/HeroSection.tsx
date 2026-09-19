import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileText, MessageSquare, ShieldCheck } from "lucide-react";

/**
 * Hero Section — Inspirée de la composition équilibrée moderne avec image humaine de référence.
 *
 * - Colonne gauche : Titre percutant, proposition de valeur claire pour les écoles du Sénégal,
 *   CTA principal contrasté et cartes de preuve produit en bas (Bulletins & Liaison WhatsApp).
 * - Colonne droite : Photographie authentique d'une directrice / enseignante sénégalaise
 *   utilisant la tablette en situation réelle, avec badge flottant de réassurance.
 */
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-m-warm via-m-paper to-m-accent-wash">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-8 lg:pt-16 lg:pb-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          
          {/* Colonne Gauche : Pitch & Appel à l'action */}
          <div className="lg:col-span-7 xl:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-m-accent-wash px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-m-accent-deep border border-m-accent/20">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-m-accent-deep animate-pulse" />
              Écoles privées du Sénégal
            </div>

            <h1 className="mt-5 font-display text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.03em] text-m-ink sm:text-[3.25rem] lg:text-[3.6rem] xl:text-[4.1rem]">
              Une école plus simple à gérer commence par sa{" "}
              <span className="text-m-red">digitalisation</span>.
            </h1>

            <p className="mt-5 max-w-xl text-[16px] leading-[1.65] text-m-ink-soft sm:text-[17px]">
              Tout part de votre annuaire élèves. Dossiers complets, notes,
              bulletins conformes et liaison directe avec les familles par WhatsApp et SMS.
            </p>

            <div className="mt-7 flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-control bg-m-ink px-7 text-[15px] font-semibold text-white transition-all hover:bg-m-ink/85 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/40 focus-visible:ring-offset-2"
              >
                Commencer gratuitement
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="#systeme"
                className="inline-flex h-12 items-center justify-center rounded-control border border-m-line bg-m-card px-6 text-[15px] font-semibold text-m-ink transition-colors hover:bg-m-paper-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m-ink/30 focus-visible:ring-offset-2"
              >
                Découvrir le produit
              </Link>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-m-ink-faint">
              14 jours d&apos;essai gratuit · Sans engagement · Données sécurisées au Sénégal
            </p>

            {/* Rangée de fonctionnalités phares sous le CTA (modèle BeeBook) */}
            <div className="mt-10 grid grid-cols-1 gap-4 pt-8 border-t border-m-line sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-m-line text-m-accent shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-m-ink">Bulletins Officiels Sénégal</h4>
                  <p className="text-[13px] text-m-ink-soft leading-snug">
                    Format officiel primaire & secondaire, calcul des moyennes en 1 clic.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-m-line text-emerald-600 shadow-xs">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-m-ink">Liaison Famille Directe</h4>
                  <p className="text-[13px] text-m-ink-soft leading-snug">
                    Notifications, relances et signatures mobiles sans mot de passe.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Droite : L'Image Réelle & Inspirante */}
          <div className="lg:col-span-5 xl:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[480px] lg:max-w-none">
              
              {/* Cadre de l'image avec angles arrondis élégants et ombre douce */}
              <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-m-card shadow-[0_20px_50px_-15px_rgba(11,18,32,0.18)]">
                <Image
                  src="/marketing/hero-educom.jpg"
                  alt="Direction et corps enseignant utilisant la plateforme EduCom à Dakar"
                  width={960}
                  height={720}
                  priority
                  className="h-auto w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  sizes="(min-width: 1024px) 40vw, 90vw"
                />

                {/* Badge flottant en superposition sur la photo (Proof point SaaS) */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-xs rounded-xl bg-white/95 backdrop-blur-md p-3.5 border border-m-line shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-m-ink uppercase tracking-wide">
                        Plateforme Déployée à Dakar
                      </p>
                      <p className="text-[11px] text-m-ink-soft">
                        Annuaire, bulletins & pièces certifiés conformes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mention discrète sous l'image */}
              <p className="mt-3 text-center text-[12px] text-m-ink-faint lg:text-right">
                Conçu pour les directeurs, secrétaires et enseignants d&apos;Afrique de l&apos;Ouest
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
