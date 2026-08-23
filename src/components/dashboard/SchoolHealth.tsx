"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CountUp } from "./Motion";
import type { HealthAxis, Signal } from "@/lib/dashboard";

/**
 * « Santé de l'école » — une **progression**, pas un bulletin de notes.
 *
 * ═══ LA RÈGLE QUI GOUVERNE CE FICHIER ═══
 *
 * ⚠️ **Un axe non mesuré n'est jamais peint comme un mauvais résultat.** Pas de
 * rouge, pas de barre pleine, pas de 0 %. Il est estompé et porte la mention
 * « Non mesuré ». La première passe donnait une impression de système en panne
 * là où il n'y a qu'une école qui vient d'ouvrir.
 *
 * ⚠️ **Le score global n'est publié qu'à partir de 3 axes sur 5**
 * (`HEALTH_MIN_AXES`, côté serveur). En dessous, l'écran affiche l'avancement de
 * la mesure — « 2 axes sur 5 » — et non un chiffre qui aurait l'air d'un
 * diagnostic complet en n'en regardant qu'un cinquième.
 *
 * ═══ CE QUE LA DEUXIÈME PASSE A CHANGÉ ═══
 *
 * Chaque axe mène désormais une phrase compréhensible plutôt qu'un pourcentage
 * nu : « 0 / 6 classes avec responsable » au lieu de « Personnel — 0 % ». Le
 * pourcentage reste, mais en second rang, pour la barre. Et un axe mesuré ET
 * insuffisant porte son action : c'est là que la statistique devient décision.
 */

function verdict(score: number): { label: string; tone: string; ring: string } {
  if (score >= 80) return { label: "École en bonne santé", tone: "text-success", ring: "stroke-success" };
  if (score >= 60) return { label: "Situation correcte, à surveiller", tone: "text-warning", ring: "stroke-warning" };
  return { label: "Plusieurs points à redresser", tone: "text-danger", ring: "stroke-danger" };
}

function axisTone(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-danger";
}

export default function SchoolHealth({
  score,
  axes,
}: {
  score: Signal<number>;
  axes: HealthAxis[];
}) {
  const measured = axes.filter((a) => a.score !== null);

  return (
    <Card
      title="Santé de l'école"
      description={
        score.ok
          ? "Moyenne des axes réellement mesurés"
          : "Votre tableau de santé se construit au fil des données de l'établissement."
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {score.ok
          ? <Dial value={score.value} />
          : <Progress measured={measured.length} total={axes.length} />}

        <ul className="min-w-0 flex-1 divide-y divide-rule/70">
          {axes.map((a, i) => (
            <Axis key={a.id} axis={a} index={i} />
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Axis({ axis, index }: { axis: HealthAxis; index: number }) {
  const reduce = useReducedMotion();
  const measured = axis.score !== null;

  return (
    <li className={`py-2.5 first:pt-0 last:pb-0 ${measured ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-3">
        <span className={`shrink-0 text-role-body ${measured ? "font-semibold text-text" : "font-medium text-text-soft"}`}>
          {axis.label}
        </span>

        <span className="min-w-0 flex-1 truncate text-role-meta text-text-soft" title={axis.display ?? axis.caption}>
          {/* La phrase prime sur le pourcentage : c'est elle qu'on comprend. */}
          {axis.display ?? axis.caption}
        </span>

        {measured ? (
          <span className="shrink-0 text-role-body font-semibold tabular-nums text-text">
            {axis.score} %
          </span>
        ) : (
          // ⚠️ Neutre. Ni rouge, ni « 0 % » : l'absence de mesure n'est pas un échec.
          <span className="shrink-0 rounded-pill bg-sunk px-2 py-0.5 text-role-meta font-medium text-text-faint">
            Non mesuré
          </span>
        )}

        {axis.action && (
          <Link
            href={axis.action.href}
            className="group hidden shrink-0 items-center gap-1 rounded-control border border-rule bg-surface px-2.5 py-1 text-role-meta font-medium text-text-soft transition-all duration-200 hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:inline-flex"
          >
            {axis.action.label}
            <ArrowRight aria-hidden="true" className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* La piste n'apparaît QUE pour un axe mesuré. Une piste vide se lit comme
          un zéro, et un zéro se lit comme un échec. */}
      {measured && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-pill bg-sunk">
          <motion.div
            className={`h-full rounded-pill ${axisTone(axis.score as number)}`}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, axis.score as number))}%` }}
            transition={{ duration: 0.7, delay: 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}
    </li>
  );
}

function Dial({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const v = verdict(value);
  const R = 48;
  const C = 2 * Math.PI * R;
  const filled = C * (Math.min(100, Math.max(0, value)) / 100);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 lg:w-[168px]">
      <div className="relative h-[120px] w-[120px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={R} className="fill-none stroke-sunk" strokeWidth="9" />
          <motion.circle
            cx="60" cy="60" r={R}
            className={`fill-none ${v.ring}`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={reduce ? { strokeDashoffset: C - filled } : { strokeDashoffset: C }}
            animate={{ strokeDashoffset: C - filled }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[30px] font-semibold tabular-nums leading-none tracking-tight text-text">
            <CountUp value={value} />
          </span>
          <span className="mt-0.5 text-role-meta text-text-faint">sur 100</span>
        </div>
      </div>
      <p className={`text-center text-role-meta font-semibold ${v.tone}`}>{v.label}</p>
    </div>
  );
}

/**
 * L'avancement de la mesure — le remplaçant de l'anneau.
 *
 * Il dit « ça se construit », pas « il manque des choses ». La nuance décide de
 * ce que la directrice ressent en ouvrant son école le premier mois.
 */
function Progress({ measured, total }: { measured: number; total: number }) {
  const reduce = useReducedMotion();
  const pct = Math.round((measured / total) * 100);

  return (
    <div className="flex shrink-0 flex-col justify-center gap-2.5 rounded-surface border border-rule bg-ground px-4 py-4 lg:w-[168px]">
      <p className="text-[26px] font-semibold leading-none tracking-tight text-text">
        {measured}
        <span className="text-role-section font-medium text-text-faint"> / {total}</span>
      </p>
      <p className="text-role-meta font-medium text-text-soft">axes mesurés</p>

      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-sunk">
        <motion.div
          className="h-full rounded-pill bg-primary"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <p className="text-role-meta leading-relaxed text-text-faint">
        Le score global apparaîtra dès 3 axes mesurés.
      </p>
    </div>
  );
}
