"use client";

import { useState } from "react";
import { ROLE_LABELS, type RoleType } from "@/lib/permissions";
import { visibleItems } from "@/lib/navigation";

/**
 * « La bonne vue, pour chacun » — refonte visuelle du 5 septembre 2026 (v6).
 *
 * La mécanique ne change pas depuis le 4 septembre : les rôles sont LUS dans
 * `src/lib/permissions.ts`, et `visibleItems()` — la même fonction qui
 * construit la sidebar réelle du produit — calcule les rubriques
 * EFFECTIVEMENT visibles. Impossible de laisser dériver du vrai produit sans
 * faire échouer la compilation.
 *
 * ⚠️ Ce qui change avec la v6 : six cartes identiques deviennent un
 * sélecteur de rôle — un panneau, un rôle à la fois, en détail. Composant
 * client pour l'état de sélection ; le calcul lui-même reste synchrone et
 * pur, aucun appel réseau.
 *
 * ⚠️ Refonte v7 (6 septembre 2026) : le rail vertical de boutons rectangulaires
 * devient un contrôle segmenté en pilule, horizontal, centré — le même
 * langage visuel que le panneau produit de `ConnectedSystem` et le menu de
 * `Navbar`. Direction « INTERACTION » du rythme validé : le beat doit se
 * reconnaître au geste (choisir une pilule), pas à une nouvelle mise en page.
 */
const ORDRE: RoleType[] = ["OWNER", "SECRETARY", "TEACHER", "ACCOUNTANT", "ASSISTANT", "PARENT"];

export default function RolesSection() {
  const [role, setRole] = useState<RoleType>("OWNER");
  const rubriques = visibleItems(role);

  return (
    <section id="roles" className="scroll-mt-20 bg-m-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Les rôles
          </p>
          <h2 className="mt-4 font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
            Chacun ne voit que ce qui le concerne.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            Sept rôles, définis dans le produit et non sur cette page. Choisissez-en un : ce qui
            s&apos;affiche est calculé par le même moteur de permissions que le tableau de bord.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2 rounded-pill bg-m-paper p-1.5 sm:mx-auto sm:w-fit">
          {ORDRE.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={`shrink-0 rounded-pill px-4 py-2.5 text-[14px] font-semibold transition-colors ${
                role === r ? "bg-m-ink text-white shadow-m-lift" : "text-m-ink-soft hover:text-m-ink"
              }`}
            >
              {ROLE_LABELS[r].label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-6 max-w-2xl rounded-[16px] border border-m-line bg-m-paper p-6 text-center sm:p-8">
          <p className="text-[16px] leading-[1.65] text-m-ink-soft">{ROLE_LABELS[role].description}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-m-line pt-5">
            {rubriques.map((item) => (
              <span
                key={item.href}
                className="rounded-pill bg-m-card px-3.5 py-1.5 text-[13.5px] font-medium text-m-ink ring-1 ring-inset ring-m-line"
              >
                {item.short ?? item.name}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-10 max-w-3xl text-[14px] leading-[1.65] text-m-ink-soft">
          Le cloisonnement n&apos;est pas seulement un affichage : il est appliqué à chaque
          requête, et vérifié rôle par rôle par des contrôles automatiques avant chaque
          livraison. Un compte de parent qui demanderait le dossier d&apos;un autre enfant
          reçoit la même réponse que si cet enfant n&apos;existait pas.
        </p>
      </div>
    </section>
  );
}
