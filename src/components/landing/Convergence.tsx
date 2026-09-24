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
  { nom: "Fichiers Excel", constat: "Données dispersées", x: -35, y: -10, rot: -6 },
  { nom: "Calculs manuels", constat: "Moyennes & coefficients à la main", x: 32, y: -14, rot: 5 },
  { nom: "Groupes WhatsApp", constat: "Communications éparpillées", x: -24, y: 14, rot: 3 },
  { nom: "Documents Word", constat: "Attestations retapées à chaque fois", x: 26, y: 16, rot: -4 },
  { nom: "Carnets & Papier", constat: "Reçus et dossiers égarés", x: 0, y: -24, rot: 0 },
] as const;

export default function Convergence() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-m-warm via-white to-m-paper">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
          Le constat quotidien
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-[1.625rem] font-semibold leading-[1.2] tracking-[-0.02em] text-m-ink sm:text-[2.125rem]">
          Votre école passe encore trop d&apos;heures sur des tâches administratives manuelles.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.65] text-m-ink-soft">
          Calculer les notes et moyennes à la calculatrice, ressaisir les bulletins un par un,
          recréer les attestations sous Word et chercher les contacts dans WhatsApp...
          Gérer ces opérations à la main prend un temps précieux sur la direction de votre école.
        </p>

        {/* Scène de convergence — les outils dispersés convergent vers EduCom */}
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

          {/* Le point d'arrivée — EduCom */}
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

        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-m-line bg-m-card/80 p-4 backdrop-blur-xs">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-m-accent-deep">
            Le flux connecté EduCom
          </p>
          <p className="mt-2 text-[13.5px] font-medium text-m-ink">
            Admissions <span className="text-m-ink-faint">→</span> Annuaire <span className="text-m-ink-faint">→</span> Notes <span className="text-m-ink-faint">→</span> Bulletins <span className="text-m-ink-faint">→</span> Facturation <span className="text-m-ink-faint">→</span> Documents <span className="text-m-ink-faint">→</span> Familles
          </p>
          <p className="mt-2 text-[12px] text-m-ink-soft">
            L&apos;information n&apos;est saisie qu&apos;une seule fois. Tout le reste s&apos;enchaîne automatiquement.
          </p>
        </div>
      </div>
    </section>
  );
}
