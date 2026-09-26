"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Fond d'ambiance de l'appel final — 25 sept. 2026.
 *
 * Remplace l'idée « Slow ambient » de Higgsfield (payant) : trois halos
 * flous aux couleurs EduCom (bleu nuit, bleu institutionnel, bleu ciel)
 * dérivent lentement derrière la carte « Créer mon école ». Aucun texte,
 * aucun objet : seulement de la lumière. Figé si l'appareil demande moins
 * d'animations.
 */
const HALOS = [
  { c: "bg-m-navy/15", t: "-10%", l: "-8%", s: 420, dx: [0, 80, -30, 0], dy: [0, 40, 70, 0], d: 22 },
  { c: "bg-m-blue/30", t: "35%", l: "60%", s: 460, dx: [0, -90, -20, 0], dy: [0, -50, 30, 0], d: 26 },
  { c: "bg-[#9CC3F0]/40", t: "55%", l: "5%", s: 380, dx: [0, 60, 120, 0], dy: [0, -40, 10, 0], d: 30 },
] as const;

export default function FondAmbiance() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {HALOS.map((h, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${h.c}`}
          style={{ top: h.t, left: h.l, width: h.s, height: h.s }}
          animate={reduce ? undefined : { x: [...h.dx], y: [...h.dy] }}
          transition={{ duration: h.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
