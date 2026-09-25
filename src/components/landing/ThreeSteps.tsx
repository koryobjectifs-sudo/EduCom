"use client";

import { motion, useReducedMotion } from "framer-motion";
import EduComWordmark from "@/components/brand/EduComWordmark";
import {
  AppleSchoolIcon,
  AppleSettingsIcon,
  AppleAutoSyncIcon,
  AppleCheckIcon,
} from "@/components/ui/apple-icons";

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
    icon: AppleSchoolIcon,
    titre: "Créez votre école",
    texte: "Votre espace est prêt en quelques minutes. Importez votre fichier Excel tel qu'il est\u00a0: élèves, classes et parents sont créés et rattachés automatiquement.",
  },
  {
    n: "02",
    icon: AppleSettingsIcon,
    titre: "Paramétrez votre identité",
    texte: "Dans les paramètres, ajoutez votre logo, votre cachet et votre signature\u00a0: ils figurent sur chaque bulletin, facture et certificat.",
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
    <section id="etapes" className="scroll-mt-20 bg-m-sky">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-blue">Comment ça marche</p>
          <h2 className="mt-4 font-display text-[1.7rem] font-bold leading-[1.15] text-m-navy sm:text-[2.15rem]">
            Deux étapes de votre côté.
            <br />
            <span className="text-m-blue"><EduComWordmark /> fait le reste.</span>
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
              <motion.div
                key={e.n}
                {...appear(i)}
                className="relative rounded-2xl bg-white p-7 ring-1 ring-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:ring-slate-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F5F9] text-m-blue ring-1 ring-slate-200/70 shadow-xs">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-[16px] font-semibold tracking-wider text-slate-400">{e.n}</span>
                  </div>
                </div>
                <h3 className="mt-6 font-display text-[1.25rem] font-bold text-m-navy">{e.titre}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-m-ink-soft">{e.texte}</p>
              </motion.div>
            );
          })}

          <motion.div
            {...appear(2)}
            className="relative rounded-2xl bg-white p-7 text-m-navy ring-2 ring-m-blue/30 shadow-[0_20px_45px_-20px_rgba(10,35,66,0.25)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-m-blue text-white shadow-md shadow-m-blue/25">
                  <AppleAutoSyncIcon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="font-mono text-[16px] font-semibold tracking-wider text-m-blue">03</span>
              </div>
            </div>
            <h3 className="mt-6 font-display text-[1.25rem] font-bold">Le reste suit</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {AUTOMATIQUE.map((a, i) => (
                <motion.li
                  key={a}
                  className="flex items-center gap-2.5 text-[15px] text-m-navy"
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.35 }}
                >
                  <AppleCheckIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-m-signal" />
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
