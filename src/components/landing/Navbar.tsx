"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/**
 * Barre de navigation publique — addendum PLG.
 *
 * ═══ CE QUI ÉTAIT AFFICHÉ ═══
 *
 * ⚠️ **Un « E » blanc dans un carré bleu**, dessiné en HTML, en guise de logo —
 * alors que `public/brand/` contient dix-neuf fichiers de marque finis, dont un
 * logotype horizontal complet. Le seul endroit où la marque devait être
 * irréprochable affichait un substitut.
 *
 * ⚠️ Quatre liens vers des ancres (`/#features`, `/#solutions`,
 * `/#how-it-works`, `/#pricing`) dont **deux n'existaient sur aucune page** :
 * `#solutions` n'était l'identifiant d'aucune section de l'accueil. Cliquer ne
 * faisait rien — le défaut le plus démoralisant d'une page d'accueil, parce
 * qu'il ne produit aucun message d'erreur.
 *
 * ⚠️ `bg-transparent` en haut de page puis `backdrop-blur-lg` au défilement :
 * la barre changeait de nature en cours de lecture, et le texte du hero passait
 * dessous. Elle reste maintenant sur le papier, et ne gagne qu'un filet.
 *
 * ⚠️ Refonte du 4 septembre 2026 : le bouton d'action passe du bleu produit
 * (`--m-primary`, hérité de la charte tenant) au marine de marque (`--m-ink`),
 * pour se raccorder à la bannière du hero et au filet du footer plutôt que de
 * réintroduire une troisième couleur d'accent.
 */
const LIENS = [
  { nom: "Le produit", href: "/#produit" },
  { nom: "Déroulé", href: "/#deroule" },
  { nom: "Écoles", href: "/#ecoles" },
  { nom: "Tarifs", href: "/#tarifs" },
];

export default function Navbar() {
  const [defile, setDefile] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    const onScroll = () => setDefile(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Le tiroir ouvert fige le fond : sans cela, la page continue de défiler
  // derrière le menu et on ne sait plus où l'on est en le refermant.
  useEffect(() => {
    document.body.style.overflow = ouvert ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  return (
    <header
      className={`sticky top-0 z-50 bg-m-paper/90 backdrop-blur-sm transition-shadow ${
        defile ? "border-b border-m-line shadow-[0_1px_0_0_var(--m-line),0_8px_24px_-16px_rgb(11_31_58_/_0.22)]" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* ⚠️ La zone cliquable épousait la hauteur de l'image (28 px) : sous
            les 40 px nécessaires au doigt, alors que c'est le lien de retour
            à l'accueil, celui qu'on cherche quand on s'est perdu. */}
        <Link href="/" className="flex h-11 shrink-0 items-center" aria-label="EduCom — accueil">
          {/* Le vrai logotype, pas une lettre dans un carré. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/educom-logo-officiel.jpg"
            alt="EduCom"
            width={156}
            height={28}
            className="h-7 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LIENS.map((l) => (
            <Link
              key={l.nom}
              href={l.href}
              className="text-[15px] font-medium text-m-ink-soft transition-colors hover:text-m-ink"
            >
              {l.nom}
            </Link>
          ))}
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
            className="inline-flex h-10 items-center rounded-control bg-m-ink px-5 text-[15px] font-semibold text-white shadow-m-lift transition-colors hover:bg-m-ink-deep"
          >
            Créer mon école
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
            {LIENS.map((l) => (
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
                Créer mon école
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
  );
}
