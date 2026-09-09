"use client";

import { motion } from "framer-motion";

/**
 * « Convergence » — refonte v7 (6 septembre 2026).
 *
 * Remplace DEUX choses de la v6, pas une : `ProblemSection.tsx` (retiré du
 * dépôt — son constat migre dans l'amorce ci-dessous) et le bandeau statique
 * « avant/après » qu'aucune version récente n'avait. Kory, après avoir
 * rejeté un premier jet trop proche d'un calque décoratif : la composition
 * elle-même doit changer, pas seulement le fond. Ici, le problème n'est plus
 * énoncé en texte puis résolu plus bas — il est MONTRÉ en train de se
 * résoudre, dans le même geste visuel (direction « COULEUR » du rythme
 * validé : CALME → PRODUIT → COULEUR → ...).
 *
 * Les outils dispersés convergent visuellement vers un point qui devient,
 * juste en dessous, le premier écran de `ConnectedSystem` — les deux
 * sections doivent se lire comme une seule idée continue, pas deux blocs.
 *
 * ⚠️ Fond chaud (`--m-warm`), pas gris-froid comme le reste de la page à ce
 * stade : c'est le seul moment de couleur chaude avant le système connecté,
 * et il doit se sentir comme un vrai geste, pas une nuance de plus.
 */
const OUTILS = [
  { nom: "Excel", constat: "L'administration est dispersée", x: -34, y: -8, rot: -6 },
  { nom: "Google Sheets", constat: "L'administration est dispersée", x: 30, y: -14, rot: 4 },
  { nom: "WhatsApp", constat: "La communication est fragmentée", x: -22, y: 12, rot: 3 },
  { nom: "Cahiers", constat: "Le suivi est difficile", x: 26, y: 16, rot: -4 },
  { nom: "Papier", constat: "Le suivi est difficile", x: 0, y: -22, rot: 0 },
] as const;

export default function Convergence() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-m-warm via-white to-m-paper">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
          Le point de départ
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
          Votre école tient déjà sur dix outils différents.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-[1.65] text-m-ink-soft">
          L&apos;information existe déjà. Elle est seulement dispersée — et la retrouver est
          devenu un travail à part entière.
        </p>

        {/* Scène de convergence — les chips convergent vers le centre au scroll. */}
        <div className="relative mx-auto mt-10 h-[220px] max-w-lg sm:h-[260px]">
          {OUTILS.map((o, i) => (
            <motion.div
              key={o.nom}
              initial={{ x: `${o.x}%`, y: `${o.y}%`, rotate: o.rot, opacity: 1, scale: 1 }}
              whileInView={{ x: `${o.x * 0.22}%`, y: `${o.y * 0.22}%`, rotate: 0, opacity: 0.4, scale: 0.6 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.3, delay: i * 0.1, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="whitespace-nowrap rounded-pill border border-m-line bg-m-card px-4 py-2 text-[13px] font-semibold text-m-ink-soft shadow-m-lift">
                  {o.nom}
                </span>
                <span className="max-w-[140px] text-[11px] leading-snug text-m-ink-faint">{o.constat}</span>
              </div>
            </motion.div>
          ))}

          {/* Le point d'arrivée — devient le premier écran de ConnectedSystem. */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-m-ink shadow-m-lift"
          >
            <span className="font-display text-[13px] font-semibold text-white">EduCom</span>
          </motion.div>
        </div>

        <p className="mx-auto mt-6 max-w-md text-[13px] leading-relaxed text-m-ink-faint">
          Une fois connectée, cette même information alimente tout ce qui suit — sans
          ressaisie.
        </p>
      </div>
    </section>
  );
}
