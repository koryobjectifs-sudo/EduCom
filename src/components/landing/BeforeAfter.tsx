"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AppleCalculatorIcon,
  AppleFileTextIcon,
  AppleImportDocIcon,
  AppleMessageIcon,
  AppleNotebookIcon,
  AppleArrowRightIcon,
} from "@/components/ui/apple-icons";
import EduComWordmark from "@/components/brand/EduComWordmark";

/**
 * Avant → Avec EduCom — 23 septembre 2026.
 *
 * Fusionne `Convergence` (le constat) et `Gain` (avant/après) : la page les
 * disait deux fois, à deux endroits. Et la scène de convergence finissait sur
 * des pastilles à 40 % d'opacité autour d'un disque — une fois l'animation
 * jouée, la section paraissait vide.
 *
 * Ici chaque ligne raconte une transformation précise : l'outil d'aujourd'hui,
 * barré, puis ce qu'EduCom fait à la place. Les textes « après » reprennent
 * ceux de `Gain`, validés par Kory. L'animation n'est pas décorative : elle
 * joue la transformation, ligne par ligne, une seule fois.
 */
const LIGNES = [
  {
    icon: AppleCalculatorIcon,
    avant: "Moyennes calculées à la calculatrice",
    apres: "Moyennes et bulletins calculés, mis en page",
  },
  {
    icon: AppleFileTextIcon,
    avant: "Certificats retapés sous Word à chaque demande",
    apres: "Certificat généré depuis la fiche de l'élève",
  },
  {
    icon: AppleImportDocIcon,
    avant: "Élèves, parents et paiements dans plusieurs fichiers Excel",
    apres: "Une information, au même endroit",
  },
  {
    icon: AppleMessageIcon,
    avant: "Un contact cherché dans un groupe WhatsApp",
    apres: "Un message envoyé depuis la fiche de l'élève",
  },
  {
    icon: AppleNotebookIcon,
    avant: "Absences reconstituées depuis un cahier",
    apres: "Une présence enregistrée, visible immédiatement",
  },
] as const;

export default function BeforeAfter() {
  const reduce = useReducedMotion();

  return (
    <section className="bg-m-sky">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-blue">Le constat</p>
          <h2 className="mt-4 font-display text-[1.7rem] font-bold leading-[1.15] text-m-navy sm:text-[2.15rem]">
            Chaque trimestre, votre équipe refait le même travail à la main.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.65] text-m-ink-soft sm:text-[17px]">
            <EduComWordmark /> ne remplace personne. Il supprime la ressaisie, et les erreurs qui vont avec.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl ring-1 ring-m-line">
          <div className="hidden grid-cols-[1fr_auto_1fr] bg-m-paper px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] sm:grid">
            <span className="text-m-ink-faint">Aujourd&apos;hui</span>
            <span />
            <span className="text-m-blue">Avec <EduComWordmark /></span>
          </div>

          {LIGNES.map((l, i) => {
            const Icon = l.icon;
            return (
              <motion.div
                key={l.avant}
                className="grid grid-cols-1 items-center gap-2 border-t border-m-line-soft bg-m-card px-6 py-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-6"
                initial={reduce ? false : "hidden"}
                whileInView="shown"
                viewport={{ once: true, margin: "-80px" }}
                transition={{ staggerChildren: 0.25, delayChildren: i * 0.12 }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m-paper text-m-ink-faint">
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <span className="relative text-[15px] text-m-ink-soft">
                    {l.avant}
                    <motion.span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-[1.5px] w-full origin-left bg-m-ink-faint"
                      variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </span>
                </div>

                <AppleArrowRightIcon aria-hidden="true" className="hidden h-4 w-4 text-m-ink-faint sm:block" />

                <motion.p
                  className="flex items-center gap-2 pl-12 text-[15px] font-semibold text-m-ink sm:pl-0"
                  variants={{ hidden: { opacity: 0, x: -10 }, shown: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-m-signal" />
                  {l.apres}
                </motion.p>
              </motion.div>
            );
          })}
        </div>

        <p className="mx-auto mt-14 max-w-2xl text-center font-display text-[1.5rem] font-bold leading-[1.2] text-m-navy sm:text-[1.9rem]">
          Moins de temps à administrer.
          <br />
          <span className="text-m-blue">Plus de temps pour diriger.</span>
        </p>
      </div>
    </section>
  );
}
