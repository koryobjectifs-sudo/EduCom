"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Users, BookOpen, Info } from "lucide-react";
import type { ClassCard } from "@/lib/gradeEntry";

/**
 * « Vos classes » — le point de départ unique de la saisie.
 *
 * ═══ UNE SEULE DÉCISION ═══
 *
 * L'ancien écran demandait classe, trimestre **et** évaluation avant la première
 * note. Ici l'enseignant choisit sa classe ; le reste est déjà résolu et
 * s'affiche en clair sur la carte, pour qu'il sache où il retombe avant même de
 * cliquer. Le lien porte déjà matière, trimestre et évaluation : il n'y a rien
 * à reconfigurer de l'autre côté.
 *
 * ⚠️ **Une carte bloquée dit POURQUOI.** Pas de « 0 / 0 » ni de carte grisée
 * muette : la raison vient du serveur et s'affiche telle quelle (« Aucune
 * évaluation n'est ouverte sur T1 »). On doit pouvoir agir sur ce qu'on lit.
 */

function href(c: ClassCard): string {
  const p = new URLSearchParams({ class: c.classId });
  if (c.progress) {
    p.set("term", c.progress.termId);
    p.set("eval", c.progress.evaluationId);
  }
  if (c.subjects.length === 1) p.set("subject", c.subjects[0].id);
  return `/dashboard/grades/saisie?${p.toString()}`;
}

export default function ClassCards({ cards }: { cards: ClassCard[] }) {
  const reduce = useReducedMotion();

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c, i) => {
        const done = c.progress ? c.progress.entered >= c.progress.total : false;
        const pct = c.progress && c.progress.total > 0
          ? Math.round((c.progress.entered / c.progress.total) * 100)
          : 0;
        const remaining = c.progress ? Math.max(0, c.progress.total - c.progress.entered) : 0;

        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-role-section font-semibold leading-tight tracking-tight text-text">
                  {c.className}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-role-meta text-text-soft">
                  <BookOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-faint" />
                  <span className="truncate">
                    {c.subjects.length === 0
                      ? "Aucune matière"
                      : c.coversAll && c.subjects.length > 3
                        ? `Toutes les matières (${c.subjects.length})`
                        : c.subjects.map((s) => s.name).join(" · ")}
                  </span>
                </p>
              </div>

              {done && (
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-success/20 bg-success/10 text-success"
                >
                  <Check className="h-4 w-4" />
                </span>
              )}
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-role-meta text-text-faint">
              <Users aria-hidden="true" className="h-3.5 w-3.5" />
              {c.studentCount} élève{c.studentCount > 1 ? "s" : ""}
            </p>

            {c.progress ? (
              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="truncate text-role-meta font-medium text-text-soft"
                    title={`${c.progress.termName} · ${c.progress.evaluationName}`}
                  >
                    {c.progress.evaluationName}
                  </span>
                  <span className="shrink-0 text-role-meta font-semibold tabular-nums text-text">
                    {c.progress.entered} / {c.progress.total}
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-pill bg-sunk">
                  <motion.div
                    className={`h-full rounded-pill ${done ? "bg-success" : "bg-primary"}`}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <p className="mt-1.5 text-role-meta text-text-faint">
                  {done
                    ? "Toutes les notes sont saisies"
                    : `${remaining} note${remaining > 1 ? "s" : ""} à saisir`}
                </p>
              </div>
            ) : (
              <p className="mt-4 flex items-start gap-1.5 rounded-control border border-dashed border-rule bg-ground px-3 py-2 text-role-meta leading-relaxed text-text-soft">
                <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-faint" />
                {c.blocked}
              </p>
            )}
          </>
        );

        // Une carte bloquée n'est pas cliquable : proposer une saisie
        // impossible est une promesse que l'écran suivant ne tiendra pas.
        const clickable = c.progress !== null;

        return (
          <motion.li
            key={c.classId}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            {clickable ? (
              <Link
                href={href(c)}
                className="group flex h-full flex-col rounded-surface border border-rule bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {body}
                <span className="mt-4 inline-flex items-center gap-1.5 text-role-body font-semibold text-primary">
                  {done ? "Voir les notes" : "Continuer"}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            ) : (
              <div className="flex h-full flex-col rounded-surface border border-rule bg-surface p-5 opacity-75 shadow-card">
                {body}
              </div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
