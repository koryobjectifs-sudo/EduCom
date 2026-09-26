"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * « Les papiers se rangent » — 25 sept. 2026.
 *
 * Remplace l'idée « Paper Carousel » de Higgsfield (payant, et l'IA déforme les
 * textes) par une animation codée : les feuilles de l'école — bulletin,
 * facture, reçu, certificat, attestation — flottent en désordre, se
 * rassemblent en carrousel puis se rangent dans le bouclier EduCom. Boucle de
 * 7 s, jouée seulement quand la section est visible ; image fixe (feuilles
 * rangées en éventail) si l'appareil demande moins d'animations.
 *
 * Les feuilles sont des silhouettes : seul leur nom est écrit, aucun contenu
 * inventé (ni note, ni montant).
 */
const FEUILLES = [
  { nom: "Bulletin", bande: "#1F4E8C", x: -190, y: -40, r: -14 },
  { nom: "Facture", bande: "#A30001", x: -95, y: 55, r: 9 },
  { nom: "Reçu", bande: "#0E7C5A", x: 0, y: -70, r: -4 },
  { nom: "Certificat", bande: "#B7791F", x: 95, y: 50, r: 12 },
  { nom: "Attestation", bande: "#5B6B82", x: 190, y: -35, r: -10 },
] as const;

const DUREE = 7;
/** Jalons de la boucle (fractions de DUREE). */
const T = [0, 0.3, 0.55, 0.72, 0.82, 1];

export default function PapiersRanges() {
  const reduce = useReducedMotion();
  const zone = useRef<HTMLDivElement>(null);
  const visible = useInView(zone, { margin: "-60px" });
  const joue = visible && !reduce;

  return (
    <div
      ref={zone}
      role="img"
      aria-label="Les documents de l'école — bulletins, factures, reçus, certificats, attestations — se rangent dans EduCom."
      className="relative mx-auto h-[280px] w-full max-w-[560px] overflow-hidden"
    >
      {/* Halo du bouclier */}
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-m-blue/20 blur-2xl"
        animate={joue ? { scale: [0.8, 0.8, 0.9, 1.25, 0.95, 0.8], opacity: [0.3, 0.3, 0.45, 0.9, 0.5, 0.3] } : undefined}
        transition={{ duration: DUREE, times: T, repeat: Infinity, ease: "easeInOut" }}
      />

      {FEUILLES.map((f, i) => {
        // Carrousel : les feuilles se resserrent en éventail autour du centre.
        const angle = (i - 2) * 11;
        return (
          <motion.div
            key={f.nom}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -ml-[50px] -mt-[60px] h-[120px] w-[100px] rounded-[10px] bg-white p-2.5 shadow-[0_14px_30px_-16px_rgba(10,35,66,0.45)] ring-1 ring-m-line"
            initial={false}
            animate={
              joue
                ? {
                    x: [f.x, f.x * 1.04, (i - 2) * 22, 0, 0, f.x],
                    y: [f.y, f.y - 8, -6, 0, 0, f.y],
                    rotate: [f.r, f.r + 3, angle, 0, 0, f.r],
                    scale: [1, 1, 0.95, 0.22, 0.22, 1],
                    opacity: [1, 1, 1, 0, 0, 1],
                  }
                : { x: (i - 2) * 26, y: 0, rotate: angle, scale: 0.95, opacity: 1 }
            }
            transition={{ duration: DUREE, times: T, repeat: Infinity, ease: [0.45, 0, 0.2, 1], delay: i * 0.04 }}
          >
            <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: f.bande }} />
            <p className="mt-2 truncate text-[9px] font-bold uppercase tracking-[0.04em] text-m-navy">{f.nom}</p>
            <div className="mt-2 space-y-1.5">
              <div className="h-1 w-full rounded-full bg-m-line" />
              <div className="h-1 w-4/5 rounded-full bg-m-line" />
              <div className="h-1 w-full rounded-full bg-m-line" />
              <div className="h-1 w-3/5 rounded-full bg-m-line" />
            </div>
            <div className="absolute bottom-2.5 right-2.5 h-4 w-4 rounded-full ring-1" style={{ borderColor: f.bande, boxShadow: `inset 0 0 0 1px ${f.bande}55` }} />
          </motion.div>
        );
      })}

      {/* Bouclier EduCom : il « reçoit » les feuilles */}
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -ml-[30px] -mt-[35px]"
        animate={joue ? { scale: [0.9, 0.9, 0.95, 1.18, 1, 0.9], opacity: [0, 0, 0.6, 1, 1, 0] } : { scale: 1, opacity: 0 }}
        transition={{ duration: DUREE, times: T, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/educom-bouclier.png" alt="" width={60} height={70} className="h-[70px] w-auto drop-shadow-[0_10px_20px_rgba(10,35,66,0.35)]" />
      </motion.div>
    </div>
  );
}
