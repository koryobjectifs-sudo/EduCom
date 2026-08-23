"use client";

import { motion, useReducedMotion, animate } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Les deux seules briques d'animation du tableau de bord.
 *
 * ═══ ⚠️ PIÈGE CORRIGÉ LE 21 AOÛT 2026 — NE PAS REVENIR À `useInView` ═══
 *
 * La première version déclenchait l'apparition à l'entrée dans le champ de
 * vision (`useInView`, `once: true`). Mesuré au pilote Chrome : **tout ce qui
 * se trouvait sous « À traiter » restait à `opacity: 0`** — santé de l'école,
 * journée, résumés, activité, factures. Six blocs invisibles sur un écran dont
 * la promesse est « comprendre en cinq secondes ».
 *
 * Deux défauts, pas un :
 *   1. Le contenu sous la ligne de flottaison n'apparaissait qu'au défilement,
 *      alors que la demande était une apparition progressive **des sections**.
 *   2. Surtout : si le JavaScript tarde ou échoue, `initial: {opacity: 0}` fige
 *      la page à moitié vide. Le HTML était pourtant complet et correct.
 *
 * L'animation se joue donc **au montage**, en cascade par `delay`. Elle ponctue
 * l'arrivée du contenu ; elle ne décide plus de sa visibilité.
 *
 * ⚠️ `prefers-reduced-motion` est respecté partout — et ce n'est pas une
 * politesse. Les écoles travaillent sur des machines modestes, et une directrice
 * qui a réduit les animations au niveau système ne doit rien voir bouger : les
 * deux composants rendent alors l'état final immédiatement.
 *
 * ⚠️ Aucune animation ne porte d'information. Retirez-les, l'écran dit
 * exactement la même chose. C'est la limite entre la finition et le gadget.
 */

/** Apparition progressive, au montage, décalée par `delay`. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Compteur qui monte jusqu'à sa valeur.
 *
 * ⚠️ La valeur finale est présente **dès le premier rendu** dans un nœud lisible
 * par les lecteurs d'écran ; seul le texte visible est animé. Un chiffre qui
 * défile n'est pas annonçable, et une directrice pressée ne doit jamais prendre
 * une valeur intermédiaire pour le résultat.
 */
export function CountUp({
  value,
  duration = 0.9,
  format = (n: number) => n.toLocaleString("fr-FR"),
  className = "",
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduce) { setShown(value); return; }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={className}>
      <span aria-hidden="true">{format(Math.round(shown))}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
