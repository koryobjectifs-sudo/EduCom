"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Info } from "lucide-react";
import type { Severity } from "@/lib/dashboard";

/**
 * « Votre matinée » — **le hero** du poste de commandement.
 *
 * ═══ CE QUE LA DEUXIÈME PASSE A CORRIGÉ ═══
 *
 * ⚠️ **Le décompte mentait.** Le titre annonçait « 1 point nécessite votre
 * attention » et trois cartes s'affichaient dessous, dont « Nouvelles
 * inscriptions » — une bonne nouvelle présentée exactement comme une tâche.
 * Deux fautes en une : un nombre qui ne correspond pas à ce qu'on voit, et une
 * information peinte comme une action.
 *
 * Les priorités sont désormais **séparées à la source** : `actions`
 * (urgent + à surveiller) sont des cartes, `infos` est une ligne discrète en
 * dessous. Le décompte ne porte que sur `actions` — il ne peut plus diverger de
 * ce qui est affiché puisqu'il est calculé sur le même tableau.
 *
 * ═══ COULEUR ═══
 *
 * Le fond porte un voile de la couleur d'école à **3 %** — assez pour que le
 * bloc se détache du reste de la page, trop peu pour teinter le texte. Le reste
 * de l'écran est neutre ; les seules autres touches sont les pastilles de
 * sévérité, doublées par un mot.
 *
 * ⚠️ Le voile est dérivé de `--color-primary` en `color-mix`, jamais d'une
 * couleur écrite en dur : une école qui change sa charte n'a rien à modifier
 * ici, et le bloc ne peut pas se désaccorder du reste du produit.
 */

const DOT: Record<Severity, { ring: string; dot: string; word: string }> = {
  urgent: { ring: "bg-danger/10", dot: "bg-danger", word: "À traiter" },
  watch: { ring: "bg-warning/10", dot: "bg-warning", word: "À surveiller" },
  info: { ring: "bg-success/10", dot: "bg-success", word: "Information" },
};

export type BriefPriority = {
  severity: Severity;
  title: string;
  detail: string;
  href: string;
};

export default function MorningBrief({
  firstName,
  schoolName,
  summary,
  priorities,
  tone,
  counts,
}: {
  firstName: string | null;
  schoolName: string | null;
  summary: string;
  priorities: BriefPriority[];
  tone: "good" | "mixed" | "attention";
  counts: { urgent: number; watch: number; info: number };
}) {
  const reduce = useReducedMotion();

  // Le décompte et l'affichage lisent le MÊME tableau : ils ne peuvent plus
  // diverger, quelle que soit l'évolution des règles de priorité.
  const actions = priorities.filter((p) => p.severity !== "info");
  const infos = priorities.filter((p) => p.severity === "info");

  const hello = firstName ? `Bonjour, ${firstName}` : "Bonjour";

  /**
   * ⚠️ Le badge compte les **urgences réelles**, pas les cartes affichées.
   * Il annonçait « 3 interventions attendues » alors qu'une seule en était une
   * — les deux autres étaient « à surveiller ». Un badge rouge qui gonfle le
   * chiffre use la confiance : au bout d'une semaine, on ne le lit plus.
   */
  const totalActions = counts.urgent + counts.watch;
  const badge =
    tone === "attention"
      ? { text: `${counts.urgent} intervention${counts.urgent > 1 ? "s" : ""} attendue${counts.urgent > 1 ? "s" : ""}`, cls: "border-danger/20 bg-danger/10 text-danger", dot: "bg-danger" }
      : tone === "mixed"
        ? { text: `${counts.watch} situation${counts.watch > 1 ? "s" : ""} à surveiller`, cls: "border-warning/20 bg-warning/10 text-warning", dot: "bg-warning" }
        : { text: "Aucun point bloquant", cls: "border-success/20 bg-success/10 text-success", dot: "bg-success" };

  const hidden = totalActions - actions.length;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="brief-title"
      className="relative overflow-hidden rounded-surface border border-rule shadow-card"
      style={{ background: "color-mix(in oklab, var(--color-primary) 3%, white)" }}
    >
      <div aria-hidden="true" className="h-1 w-full bg-primary" />

      {/* Halo décoratif, très en dessous du seuil de perception consciente.
          `aria-hidden` et sans interaction : il ne peut rien masquer. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-pill opacity-[0.07] blur-3xl"
        style={{ background: "var(--color-primary)" }}
      />

      <div className="relative px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-role-meta font-semibold uppercase tracking-[0.12em] text-primary/70">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              Votre matinée
            </p>

            <h1 id="brief-title" className="mt-2.5 text-[32px] font-semibold leading-[1.15] tracking-tight text-text">
              {hello}
              <span aria-hidden="true"> 👋</span>
            </h1>

            {schoolName && (
              <p className="mt-1 text-role-label font-medium uppercase tracking-wide text-text-faint">
                {schoolName}
              </p>
            )}
          </div>

          {/* L'état du jour, lisible sans lire la phrase. */}
          <span
            className={`inline-flex shrink-0 items-center gap-2 self-start rounded-pill border px-3 py-1.5 text-role-meta font-semibold ${badge.cls}`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-pill ${badge.dot}`} />
            {badge.text}
          </span>
        </div>

        <p className="mt-5 max-w-3xl text-[17px] leading-relaxed text-text-soft">{summary}</p>

        {actions.length > 0 && (
          <>
            {/* Le titre annonce le TOTAL réel ; si toutes les cartes ne
                tiennent pas, un lien explicite dit combien manquent — jamais un
                nombre silencieusement tronqué. */}
            <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule/70 pt-6">
              <h2 className="text-role-card font-semibold text-text">
                {totalActions} point{totalActions > 1 ? "s" : ""} nécessite{totalActions > 1 ? "nt" : ""} votre attention
              </h2>
              {hidden > 0 && (
                <a
                  href="#a-traiter"
                  className="text-role-meta font-medium text-text-soft underline decoration-rule underline-offset-2 transition-colors hover:text-primary"
                >
                  {hidden} autre{hidden > 1 ? "s" : ""} dans « À traiter »
                </a>
              )}
            </div>

            <ul className="mt-3.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {actions.map((p, i) => {
                const t = DOT[p.severity];
                return (
                  <motion.li
                    key={p.title}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={p.href}
                      className="group flex h-full items-start gap-3 rounded-surface border border-rule bg-surface px-4 py-3.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill ${t.ring}`}>
                        <span className={`h-2 w-2 rounded-pill ${t.dot}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        {/* La sévérité est écrite, jamais portée par la seule teinte. */}
                        <span className="block text-role-meta font-semibold uppercase tracking-wide text-text-faint">
                          {t.word}
                        </span>
                        <span className="mt-0.5 block text-role-body font-semibold leading-snug text-text">
                          {p.title}
                        </span>
                        <span className="mt-1 block text-role-meta leading-relaxed text-text-soft">
                          {p.detail}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100"
                      />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </>
        )}

        {/* Aucune action : on le dit, et on ne meuble pas. */}
        {actions.length === 0 && (
          <p className="mt-6 inline-flex items-center gap-2.5 rounded-control border border-success/20 bg-success/10 px-3.5 py-2.5 text-role-body font-medium text-success">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Rien ne demande votre intervention ce matin.
          </p>
        )}

        {/* ⚠️ Les informations sont VOLONTAIREMENT secondaires : une ligne, pas
            une carte, et hors du décompte. Une bonne nouvelle ne se présente pas
            comme une tâche en retard. */}
        {infos.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-rule/70 pt-4">
            <span className="inline-flex items-center gap-1.5 text-role-meta font-semibold uppercase tracking-wide text-text-faint">
              <Info aria-hidden="true" className="h-3.5 w-3.5" />
              Bon à savoir
            </span>
            {infos.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                className="group inline-flex items-center gap-1.5 rounded-pill border border-rule bg-surface/70 px-2.5 py-1 text-role-meta text-text-soft transition-all duration-200 hover:border-success/30 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-success" />
                <span className="font-medium text-text">{p.title}</span>
                <span className="hidden sm:inline">— {p.detail}</span>
              </Link>
            ))}
          </div>
        )}

        {(actions.length > 0 || infos.length > 0) && (
          <div className="mt-6">
            <Link
              href="#a-traiter"
              className="group inline-flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 text-role-body font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-px hover:bg-primary-hover hover:shadow-overlay active:translate-y-0 active:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Voir les priorités
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
        )}
      </div>
    </motion.section>
  );
}
