"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal, X } from "lucide-react";
import { type NavSpace, type NavSpaceKey, getActiveNavItemHref } from "@/lib/navigation";
import { roleLabel } from "@/lib/permissions";
import { AppleDashboardIcon } from "@/components/ui/apple-icons";
import { getNavIcon } from "./nav-icons";

/**
 * Barre d'onglets mobile (bas d'écran) — 24 septembre 2026.
 *
 * ═══ POURQUOI ELLE REVIENT ═══
 *
 * Kory : sur téléphone, les fonctionnalités doivent être alignées en bas et
 * accessibles d'un geste, pas cachées derrière un menu qui glisse depuis la
 * gauche. Et en profil admin, les options du bas de la colonne (profil,
 * déconnexion) étaient inaccessibles : `AppRail` est `hidden md:flex`, et le
 * tiroir `MobileNav` ne les reprenait pas.
 *
 * L'ancienne `BottomNav` (retirée le 8 sept., commit b3cd43a) avait deux
 * défauts, évités ici :
 *   1. liens codés en dur, sans `/dashboard` → 404. Ici tout vient de
 *      `spaces` (= `getVisibleSpaces(role)`, la même source que le rail) : un
 *      rôle ne voit jamais un espace qu'il n'a pas le droit d'ouvrir.
 *   2. dix destinations impossibles à tenir dans une barre. Ici la barre porte
 *      les ESPACES (6 au plus), pas les pages : Accueil + 3 espaces + « Plus ».
 *      Les pages d'un espace sont en onglets défilants en haut
 *      (`MobileSpaceTabs`), et « Plus » ouvre un panneau avec les autres
 *      espaces, le profil et la déconnexion.
 *
 * Libellés toujours visibles (l'ancienne barre n'affichait que celui de
 * l'onglet actif). Cibles ≥ 48 px. Marge de sécurité iPhone (home indicator).
 */
const PRINCIPAUX = 3;

export default function MobileTabBar({
  spaces,
  activeSpaceId,
  userRole,
  userName,
  schoolName,
  pathnameOverride,
}: {
  spaces: NavSpace[];
  /** Vitrine de la landing (`/vitrine/*`) : simule la page affichée. */
  pathnameOverride?: string;
  activeSpaceId: NavSpaceKey | null;
  userRole: string;
  userName?: string;
  schoolName?: string;
}) {
  const realPathname = usePathname();
  const pathname = pathnameOverride ?? realPathname;
  const [plusOuvert, setPlusOuvert] = useState(false);
  const panneauRef = useRef<HTMLDivElement>(null);

  const principaux = spaces.slice(0, PRINCIPAUX);
  const autres = spaces.slice(PRINCIPAUX);
  const accueilActif = pathname === "/dashboard";
  const plusActif = plusOuvert || (activeSpaceId !== null && autres.some((s) => s.id === activeSpaceId));

  useEffect(() => {
    if (!plusOuvert) return;
    document.body.style.overflow = "hidden";
    panneauRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPlusOuvert(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [plusOuvert]);

  const onglet = (actif: boolean) =>
    `relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold transition-colors ${
      actif ? "text-primary" : "text-text-faint active:text-text"
    }`;
  const pastille = (actif: boolean) =>
    `flex h-7 w-12 items-center justify-center rounded-full transition-colors ${actif ? "bg-primary/12" : ""}`;

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 backdrop-blur-md md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch gap-1 px-1.5">
          <Link href="/dashboard" aria-current={accueilActif ? "page" : undefined} className={onglet(accueilActif)}>
            <span className={pastille(accueilActif)}>
              <AppleDashboardIcon aria-hidden="true" className="h-5 w-5" />
            </span>
            Accueil
          </Link>

          {principaux.map((space) => {
            const Icon = getNavIcon(space.icon);
            const actif = space.id === activeSpaceId;
            return (
              <Link
                key={space.id}
                href={space.defaultHref}
                aria-current={actif ? "page" : undefined}
                className={onglet(actif)}
              >
                <span className={pastille(actif)}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate px-0.5">{space.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setPlusOuvert((v) => !v)}
            aria-expanded={plusOuvert}
            aria-haspopup="dialog"
            className={onglet(plusActif)}
          >
            <span className={pastille(plusActif)}>
              <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
            </span>
            Plus
          </button>
        </div>
      </nav>

      {plusOuvert && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden">
          <div aria-hidden="true" onClick={() => setPlusOuvert(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

          <div
            ref={panneauRef}
            role="dialog"
            aria-modal="true"
            aria-label="Plus d'options"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-surface shadow-overlay focus:outline-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
              <span aria-hidden="true" className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-rule" />
              <p className="pt-3 text-sm font-bold text-text">Plus</p>
              <button
                type="button"
                onClick={() => setPlusOuvert(false)}
                aria-label="Fermer"
                className="mt-2 flex h-11 w-11 items-center justify-center rounded-full text-text-soft hover:bg-sunk"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {autres.map((space) => {
                const Icon = getNavIcon(space.icon);
                const items = space.sections.flatMap((s) => s.items);
                const hrefActif = getActiveNavItemHref(items, pathname);
                return (
                  <div key={space.id} className="mb-4">
                    <p className="flex items-center gap-2 px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-soft">
                      <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
                      {space.fullLabel ?? space.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((item) => {
                        const ItemIcon = getNavIcon(item.icon);
                        const actif = item.href === hrefActif;
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            aria-current={actif ? "page" : undefined}
                            onClick={() => setPlusOuvert(false)}
                            className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-[13px] font-medium transition-colors ${
                              actif ? "border-primary/30 bg-primary/10 text-primary" : "border-rule bg-ground text-text active:bg-sunk"
                            }`}
                          >
                            <ItemIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.short ?? item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Compte — ce que la colonne de gauche offrait en bas sur ordinateur */}
              <div className="mt-2 rounded-2xl border border-rule bg-ground p-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-bold text-primary">
                    {(userName ?? schoolName ?? "E").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{userName ?? "Mon compte"}</p>
                    <p className="truncate text-xs text-text-faint">
                      {roleLabel(userRole)}
                      {schoolName ? ` · ${schoolName}` : ""}
                    </p>
                  </div>
                </div>
                <form action="/auth/signout" method="post" className="mt-3">
                  <button
                    type="submit"
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger/25 bg-surface text-sm font-semibold text-danger active:bg-danger/10"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
