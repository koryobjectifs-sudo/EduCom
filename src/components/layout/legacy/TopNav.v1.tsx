"use client";

import { LogOut, Globe, ChevronDown, Shield } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { changeTestRole } from "@/app/dashboard/actions";
import MobileNav from "../MobileNav";

/**
 * Barre supérieure du tableau de bord.
 *
 * ═══ CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ═══
 *
 * L'audit avait relevé trois contrôles qui **n'avaient aucun handler** et
 * donnaient l'illusion de fonctionner :
 *
 * 1. **Le champ « Rechercher… »** — aucun `onChange`, `onSubmit` ni `router`.
 *    Il occupait la place la plus visible de la barre. Retiré : une recherche
 *    globale demande un index côté serveur, c'est une fonctionnalité à part
 *    entière, pas un habillage.
 * 2. **La cloche de notification** — aucun handler, et une **pastille rouge
 *    écrite en dur** qui ne s'éteignait jamais. C'était le pire des trois :
 *    elle apprenait à l'utilisateur à ignorer un signal d'alerte, ce qui
 *    dévalue tous les vrais signaux du produit.
 * 3. **« Mon Profil »** — entrée de menu sans handler, aucune page de profil
 *    n'existant dans l'application.
 *
 * Ils reviendront quand la fonction existera. Afficher la coquille avant le
 * contenu est exactement ce que le cahier des charges interdit.
 *
 * ═══ CE QUI RESTE, PARCE QUE C'EST RÉEL ═══
 *
 * - le **tiroir de navigation** sous `lg` ;
 * - la **date du jour**, information gratuite et utile en contexte scolaire ;
 * - le lien **Site public**, qui pointe vers une route existante ;
 * - le **profil** avec déconnexion — la seule action du menu qui marchait ;
 * - le **sélecteur de rôle de test**, correctement verrouillé hors production.
 *
 * ⚠️ L'avatar chargeait auparavant une image depuis `ui-avatars.com`, en
 * transmettant le nom de l'utilisateur à un tiers à chaque affichage de page.
 * Remplacé par des initiales rendues localement : pas d'appel réseau, pas de
 * fuite, et cela fonctionne hors ligne.
 */

const ALL_TEST_ROLES = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

export default function TopNav({
  schoolName,
  schoolLogo,
  userRole = "OWNER",
  userName,
}: {
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
  userName?: string;
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileMenuOpen(false);
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayName = userName?.trim() || "Mon compte";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  const roleLabel = userRole.charAt(0) + userRole.slice(1).toLowerCase();

  return (
    <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center border-b border-rule bg-surface print:hidden">
      <div className="flex w-full items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
        {/* Gauche : tiroir mobile + contexte */}
        <div className="flex min-w-0 items-center gap-2.5">
          <MobileNav schoolName={schoolName} schoolLogo={schoolLogo} userRole={userRole} />

          <span
            data-tronque-volontaire
            title={schoolName ?? "EduCom"}
            className="truncate text-xs font-semibold text-text lg:hidden"
          >
            {schoolName ?? "EduCom"}
          </span>

          <span className="hidden text-role-meta capitalize text-text-soft lg:inline">
            {today}
          </span>
        </div>

        {/* Droite : actions réelles */}
        <div className="flex shrink-0 items-center gap-1.5">
          {process.env.NODE_ENV !== "production" && (
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-expanded={roleMenuOpen}
                aria-haspopup="menu"
                title="Changer de rôle (développement)"
                className="inline-flex h-7.5 items-center gap-1.5 rounded-control border border-warning/30 bg-warning/10 px-2 text-role-meta font-medium text-warning transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Shield aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{roleLabel}</span>
                <ChevronDown aria-hidden="true" className={`h-3 w-3 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {roleMenuOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay">
                  <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
                    Tester en tant que
                  </p>
                  {ALL_TEST_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setRoleMenuOpen(false);
                        const res = await changeTestRole(r);
                        if (res.success) window.location.reload();
                        else alert("Erreur de changement de rôle : " + res.error);
                      }}
                      className={`flex w-full items-center rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        userRole === r
                          ? "bg-warning/10 text-warning"
                          : "text-text-soft hover:bg-sunk hover:text-text"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link
            href="/"
            title="Site public"
            className="inline-flex h-7.5 items-center gap-1.5 rounded-control px-2 text-role-meta font-medium text-text-soft transition-colors hover:bg-sunk hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Globe aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Site public</span>
          </Link>

          <div aria-hidden="true" className="hidden h-4 w-px bg-rule sm:block" />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label={`Compte de ${displayName}`}
              className="flex items-center gap-2 rounded-control py-0.5 pl-0.5 pr-1 transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:pr-2"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-xs font-semibold text-primary"
              >
                {initials || "?"}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-xs font-semibold text-text">{displayName}</span>
                <span className="text-[10.5px] text-text-faint">{roleLabel}</span>
              </span>
              <ChevronDown aria-hidden="true" className={`hidden h-3 w-3 text-text-faint transition-transform sm:block ${profileMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {profileMenuOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-surface border border-rule bg-surface p-1 shadow-overlay">
                <div className="px-2.5 py-1.5">
                  <p className="truncate text-xs font-semibold text-text">{displayName}</p>
                  <p className="text-[10.5px] text-text-faint">{roleLabel}</p>
                </div>
                <div aria-hidden="true" className="mx-2 my-1 h-px bg-rule" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    const { logout } = await import("@/app/login/actions");
                    await logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
