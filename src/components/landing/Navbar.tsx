"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EduComWordmark from "@/components/brand/EduComWordmark";
import {
  AppleChevronDownIcon,
  AppleMenuIcon,
  AppleXIcon,
} from "@/components/ui/apple-icons";

/**
 * Barre de navigation publique — Adaptative & Dynamique (Style Slack).
 *
 * 1. En haut de page (scrollY === 0) :
 *    Pleine largeur (End-to-End, rounded-none, px-0 pt-0), aucun espace blanc sur les bords.
 * 2. Au défilement (scroll) :
 *    Animation fluide vers une capsule flottante élégante (rounded-full, max-w-4xl, shadow lift).
 * 3. Persistance totale :
 *    Reste TOUJOURS visible et accessible sur l'ensemble de la landing page (ne disparaît jamais
 *    après la hero section grâce au positionnement fixed z-[100]).
 */
const PRODUIT_LIENS = [
  { nom: "EduCom en action", href: "/#parcours", description: "Inscriptions, notes, bulletins, factures, documents." },
  { nom: "Comment ça marche", href: "/#etapes", description: "Créez votre espace, importez votre liste, le reste suit." },
  { nom: "Le pilotage", href: "/#pilotage", description: "Ce que le directeur voit, sans le demander." },
];

export default function Navbar() {
  const [defile, setDefile] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [menuProduit, setMenuProduit] = useState(false);

  useEffect(() => {
    const onScroll = () => setDefile(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = ouvert ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  return (
    <>
      {/* Conteneur fixe viewport : reste visible sur TOUTE la page, sans jamais disparaître après la hero section */}
      <div
        className={`fixed top-0 inset-x-0 z-[100] flex justify-center pointer-events-none transition-all duration-300 ease-out ${
          defile ? "pt-2.5 sm:pt-3 px-3 sm:px-6" : "pt-0 px-0"
        }`}
      >
        <header
          className={`pointer-events-auto w-full transition-all duration-300 ease-out ${
            defile
              ? "max-w-4xl lg:max-w-5xl rounded-full bg-m-navy/95 text-white backdrop-blur-md border border-white/20 shadow-[0_16px_40px_-10px_rgba(0,18,40,0.7)]"
              : "max-w-full rounded-none bg-m-navy/[0.98] text-white backdrop-blur-md border-b border-white/10"
          }`}
        >
          <div
            className={`mx-auto flex items-center justify-between gap-4 transition-all duration-300 ${
              defile
                ? "h-12 sm:h-13 px-4 sm:px-6 max-w-full"
                : "h-14 px-4 sm:px-6 lg:px-8 max-w-7xl"
            }`}
          >
            {/* Logo */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5 transition-transform hover:opacity-95"
              aria-label="EduCom — accueil"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/educom-bouclier.png"
                alt=""
                width={26}
                height={30}
                className={`w-auto transition-all duration-300 ${defile ? "h-[24px]" : "h-[28px]"}`}
              />
              <EduComWordmark
                onDark
                className={`leading-none transition-all duration-300 ${
                  defile ? "text-[19px]" : "text-[22px]"
                }`}
              />
            </Link>

            {/* Navigation centrale */}
            <nav className="hidden items-center gap-1 md:flex">
              <div
                className="relative"
                onMouseEnter={() => setMenuProduit(true)}
                onMouseLeave={() => setMenuProduit(false)}
              >
                <button
                  type="button"
                  onClick={() => setMenuProduit((v) => !v)}
                  aria-expanded={menuProduit}
                  className="flex h-10 items-center gap-1 rounded-full px-3.5 text-[14.5px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Produit
                  <AppleChevronDownIcon
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      menuProduit ? "rotate-180 text-white" : "text-white/60"
                    }`}
                  />
                </button>

                {menuProduit && (
                  <div className="absolute left-1/2 top-full w-[340px] -translate-x-1/2 pt-2.5">
                    <div className="overflow-hidden rounded-[16px] border border-m-line bg-white p-2 shadow-2xl">
                      {PRODUIT_LIENS.map((l) => (
                        <Link
                          key={l.nom}
                          href={l.href}
                          onClick={() => setMenuProduit(false)}
                          className="block rounded-[10px] px-3.5 py-2.5 transition-colors hover:bg-slate-50"
                        >
                          <p className="text-[14px] font-semibold text-m-ink">{l.nom}</p>
                          <p className="mt-0.5 text-[12px] leading-snug text-m-ink-faint">
                            {l.description}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/#tarifs"
                className="flex h-10 items-center rounded-full px-3.5 text-[14.5px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Tarifs
              </Link>
            </nav>

            {/* Actions à droite */}
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-full px-3.5 text-[14px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[14px] font-semibold text-m-navy shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all hover:bg-m-sky hover:scale-[1.02] active:scale-[0.98]"
              >
                Créer mon école
              </Link>
            </div>

            {/* Bouton burger mobile */}
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              aria-expanded={ouvert}
              aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
            >
              {ouvert ? (
                <AppleXIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <AppleMenuIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>
      </div>

      {/* Menu Mobile Overlay Plein Écran */}
      {ouvert && (
        <div className="fixed inset-0 top-14 z-[95] bg-m-navy/95 backdrop-blur-xl md:hidden overflow-y-auto pointer-events-auto">
          <nav className="mx-auto max-w-lg px-6 py-6 flex flex-col gap-2">
            {[...PRODUIT_LIENS, { nom: "Tarifs", href: "/#tarifs", description: "" }].map((l) => (
              <Link
                key={l.nom}
                href={l.href}
                onClick={() => setOuvert(false)}
                className="flex min-h-12 items-center border-b border-white/10 text-base font-medium text-white transition-colors hover:text-m-sky"
              >
                {l.nom}
              </Link>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/register"
                onClick={() => setOuvert(false)}
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-base font-semibold text-m-navy shadow-md transition-colors hover:bg-m-sky"
              >
                Créer mon école
              </Link>
              <Link
                href="/login"
                onClick={() => setOuvert(false)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-5 text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                Se connecter
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
