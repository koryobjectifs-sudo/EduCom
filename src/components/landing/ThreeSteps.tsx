"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, FileSpreadsheet, Sparkles, SquarePen } from "lucide-react";

/**
 * « Trois étapes » — 23 septembre 2026, demande directe de Kory :
 * « un directeur qui arrive doit comprendre qu'il crée son espace, importe sa
 * liste, et que tout le reste suit : bulletins, documents, certificats,
 * factures, présences ».
 *
 * ⚠️ « Créez votre espace », pas « téléchargez » : EduCom est une application
 * web, rien ne s'installe. « Télécharger » ferait imaginer une installation,
 * un poste dédié, un technicien — la friction qu'on veut effacer.
 *
 * ⚠️ « Le reste suit » est borné par la liste qui l'accompagne : chaque puce
 * correspond à un écran qui existe. Les notes et l'appel restent saisis par
 * l'équipe (dit dans le hero).
 */
const AUTOMATIQUE = [
  "Bulletins officiels",
  "Factures et reçus",
  "Certificats de scolarité",
  "Attestations et documents",
  "Suivi des présences",
];

const ETAPES = [
  {
    n: "01",
    icon: SquarePen,
    titre: "Créez votre espace",
    texte: "En ligne, en quelques minutes. Rien à télécharger ni à installer : votre nom, votre logo, votre cachet.",
  },
  {
    n: "02",
    icon: FileSpreadsheet,
    titre: "Importez votre liste",
    texte: "Votre fichier Excel d'élèves, tel qu'il est. Les classes et les parents sont rattachés automatiquement.",
  },
] as const;

export default function ThreeSteps() {
  const reduce = useReducedMotion();
  const appear = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 18 } as const),
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.5, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section id="etapes" className="scroll-mt-20 bg-m-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-accent-deep">Comment ça marche</p>
          <h2 className="mt-4 font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-m-ink sm:text-[2.75rem]">
            Deux étapes de votre côté.
            <br />
            <span className="text-m-accent-deep">EduCom fait le reste.</span>
          </h2>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Fil qui relie les étapes — se trace au défilement */}
          <motion.div
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-[52px] hidden h-px origin-left bg-m-line lg:block"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />

          {ETAPES.map((e, i) => {
            const Icon = e.icon;
            return (
              <motion.div key={e.n} {...appear(i)} className="relative rounded-2xl bg-m-card p-7 ring-1 ring-m-line">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-m-accent-wash text-m-accent-deep">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="font-display text-[15px] font-semibold text-m-ink-faint">{e.n}</span>
                </div>
                <h3 className="mt-6 font-display text-[1.375rem] font-semibold tracking-[-0.02em] text-m-ink">{e.titre}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-m-ink-soft">{e.texte}</p>
              </motion.div>
            );
          })}

          <motion.div {...appear(2)} className="relative rounded-2xl bg-m-ink p-7 text-white shadow-[0_24px_48px_-24px_rgba(11,18,32,0.6)]">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-m-accent-bright">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="font-display text-[15px] font-semibold text-white/40">03</span>
            </div>
            <h3 className="mt-6 font-display text-[1.375rem] font-semibold tracking-[-0.02em]">Le reste suit</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {AUTOMATIQUE.map((a, i) => (
                <motion.li
                  key={a}
                  className="flex items-center gap-2.5 text-[15px] text-white/90"
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.35 }}
                >
                  <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-400" />
                  {a}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
