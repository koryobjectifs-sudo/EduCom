"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

/**
 * Barre de navigation — refonte v7 (6 septembre 2026).
 *
 * ═══ CE QUI CHANGE ═══
 *
 * Nav qui se transforme au scroll : bandeau plein-largeur en haut → pilule
 * flottante compacte, insérée avec une marge et ombrée, après ~80px de
 * défilement. Comportement observé en réel sur slack.com via Playwright
 * (plan validé, §Navigation) — pas une supposition. Un menu déroulant
 * simple apparaît sous « Produit » au survol/focus : 4 ancres réelles avec
 * une ligne de description chacune. Volontairement PAS un mega-menu
 * multi-colonnes — EduCom a un seul produit, un mega-menu enterprise
 * habillerait une fausse complexité (scope explicitement écarté dans le
 * plan).
 *
 * ═══ CE QUI NE CHANGE PAS ═══
 *
 * Le logotype réel, les seules ancres qui existent réellement sur la page,
 * les cibles tactiles ≥ 44px trouvées par la sonde de validation lors d'un
 * chantier précédent.
 */
const PRODUIT_LIENS = [
  { nom: "Le système", href: "/#systeme", description: "Facturation, notes, présences, admission — en direct." },
  { nom: "Le produit", href: "/#produit", description: "L'écran réel, pas une maquette." },
  { nom: "Les rôles", href: "/#roles", description: "Chacun ne voit que ce qui le concerne." },
  { nom: "Le pilotage", href: "/#pilotage", description: "Ce que le directeur voit, sans le demander." },
];

export default function Navbar() {
  const [defile, setDefile] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [menuProduit, setMenuProduit] = useState(false);

  useEffect(() => {
    const onScroll = () => setDefile(window.scrollY > 80);
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
    <div className="sticky top-0 z-50 flex justify-center px-0 pt-0 transition-[padding] duration-300" style={{ paddingTop: defile ? 12 : 0 }}>
      <header
        className={`w-full bg-m-paper/95 backdrop-blur-sm transition-[max-width,border-radius,box-shadow,border-color] duration-300 ${
          defile
            ? "max-w-4xl rounded-full border border-m-line shadow-[0_8px_28px_-14px_rgb(11_18_32_/_0.35)]"
            : "max-w-full rounded-none border-b border-transparent"
        }`}
      >
        <div className={`mx-auto flex h-14 items-center justify-between gap-4 px-4 transition-[max-width] duration-300 sm:px-6 lg:px-8 ${defile ? "max-w-4xl" : "max-w-6xl"}`}>
          <Link href="/" className="flex h-11 shrink-0 items-center" aria-label="EduCom — accueil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" width={156} height={28} className="h-7 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <div
              className="relative"
              onMouseEnter={() => setMenuProduit(true)}
              onMouseLeave={() => setMenuProduit(false)}
            >
              <button
                type="button"
                onClick={() => setMenuProduit(true)}
                aria-expanded={menuProduit}
                className="flex h-11 items-center gap-1 px-3 text-[15px] font-medium text-m-ink-soft transition-colors hover:text-m-ink"
              >
                Produit
                <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${menuProduit ? "rotate-180" : ""}`} />
              </button>

              {menuProduit && (
                <div className="absolute left-1/2 top-full w-[340px] -translate-x-1/2 pt-3">
                  <div className="overflow-hidden rounded-[14px] border border-m-line bg-m-card p-2 shadow-m-lift">
                    {PRODUIT_LIENS.map((l) => (
                      <Link
                        key={l.nom}
                        href={l.href}
                        onClick={() => setMenuProduit(false)}
                        className="block rounded-[10px] px-3.5 py-2.5 transition-colors hover:bg-m-paper"
                      >
                        <p className="text-[14px] font-semibold text-m-ink">{l.nom}</p>
                        <p className="mt-0.5 text-[12.5px] leading-snug text-m-ink-faint">{l.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link href="/#tarifs" className="flex h-11 items-center px-3 text-[15px] font-medium text-m-ink-soft transition-colors hover:text-m-ink">
              Tarifs
            </Link>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-control px-4 text-[15px] font-medium text-m-ink-soft transition-colors hover:bg-m-paper-deep hover:text-m-ink"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center rounded-control bg-m-ink px-5 text-[15px] font-semibold text-white transition-colors hover:bg-m-ink/85"
            >
              Commencer gratuitement
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-control text-m-ink transition-colors hover:bg-m-paper-deep md:hidden"
          >
            {ouvert ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {ouvert && (
          <div className="border-t border-m-line bg-m-paper md:hidden">
            <nav className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
              {[...PRODUIT_LIENS, { nom: "Tarifs", href: "/#tarifs", description: "" }].map((l) => (
                <Link
                  key={l.nom}
                  href={l.href}
                  onClick={() => setOuvert(false)}
                  className="flex min-h-12 items-center border-b border-m-line-soft text-base font-medium text-m-ink"
                >
                  {l.nom}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 pb-2">
                <Link
                  href="/register"
                  onClick={() => setOuvert(false)}
                  className="inline-flex h-12 items-center justify-center rounded-control bg-m-ink px-5 text-base font-semibold text-white"
                >
                  Commencer gratuitement
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOuvert(false)}
                  className="inline-flex h-12 items-center justify-center rounded-control border border-m-line bg-m-card px-5 text-base font-medium text-m-ink"
                >
                  Se connecter
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}
