"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, TriangleAlert, UserPlus, ClipboardCheck,
  FolderOpen, School, Phone, FileQuestion, GraduationCap, CalendarClock, type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DataState } from "./DataState";
import type { AttentionEntry, Severity } from "@/lib/dashboard";

/**
 * « À traiter » — la **boîte de décision** de la directrice.
 *
 * ═══ CE QUE LA DEUXIÈME PASSE A CHANGÉ ═══
 *
 * Le bloc lisait comme une liste ; il lit maintenant comme une file de
 * décisions. Chaque ligne suit le même ordre, toujours : **problème → contexte
 * → action**. Le problème en gras, le contexte en gris juste dessous, l'action
 * à droite sous forme de bouton discret mais évident. Une directrice doit
 * pouvoir balayer la colonne de gauche et savoir de quoi il s'agit, sans lire.
 *
 * ⚠️ **Le libellé du premier palier est « À traiter », pas « Urgent ».** Les
 * trois paliers nomment ce qu'on en fait — traiter, surveiller, savoir — et non
 * une température. « Urgent » invite à juger ; « À traiter » invite à agir.
 *
 * ⚠️ La table d'icônes vit ici, côté client : le serveur envoie une clé, pas un
 * composant. Une fonction React ne traverse pas la frontière RSC — elle vaut
 * `undefined` de l'autre côté et React lève « Element type is invalid ».
 */

const ICONS: Record<string, LucideIcon> = {
  alert: TriangleAlert,
  userPlus: UserPlus,
  clipboard: ClipboardCheck,
  folder: FolderOpen,
  school: School,
  phone: Phone,
  fileQuestion: FileQuestion,
  graduation: GraduationCap,
  calendar: CalendarClock,
};

const TIERS: {
  key: Severity; title: string; hint: string;
  dot: string; text: string; ring: string; bg: string;
}[] = [
  { key: "urgent", title: "À traiter", hint: "Une intervention est attendue", dot: "bg-danger", text: "text-danger", ring: "border-danger/20", bg: "bg-danger/10" },
  { key: "watch", title: "À surveiller", hint: "Important, mais pas bloquant", dot: "bg-warning", text: "text-warning", ring: "border-warning/20", bg: "bg-warning/10" },
  { key: "info", title: "Informations", hint: "Aucune action attendue", dot: "bg-success", text: "text-success", ring: "border-success/20", bg: "bg-success/10" },
];

export default function AttentionCenter({ items }: { items: AttentionEntry[] }) {
  const reduce = useReducedMotion();
  const groups = TIERS
    .map((t) => ({ ...t, rows: items.filter((i) => i.severity === t.key && i.count > 0) }))
    .filter((g) => g.rows.length > 0);

  const toAct = items.filter((i) => i.count > 0 && i.severity !== "info").length;
  const urgent = items.filter((i) => i.count > 0 && i.severity === "urgent").length;

  return (
    <Card
      flush
      className={urgent > 0 ? "border-t-2 border-t-danger" : undefined}
      title="À traiter"
      description={
        toAct > 0
          ? `${toAct} décision${toAct > 1 ? "s" : ""} vous attend${toAct > 1 ? "ent" : ""}`
          : "Rien ne demande votre attention"
      }
      actions={
        urgent > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger/10 px-2.5 py-1 text-role-meta font-semibold text-danger">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-danger" />
            {urgent} à traiter
          </span>
        ) : undefined
      }
    >
      {groups.length === 0 ? (
        <div className="p-4">
          <DataState
            kind="allClear"
            title="Tout est à jour"
            description="Aucun problème critique ni action urgente détectée dans votre établissement."
          />
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title}>
              <header className="flex items-baseline gap-2 border-y border-rule bg-ground/70 px-5 py-2">
                <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${g.dot}`} />
                <h3 className={`text-role-meta font-semibold uppercase tracking-wider ${g.text}`}>
                  {g.title}
                </h3>
                <span className="text-role-meta tabular-nums text-text-faint">({g.rows.length})</span>
                <span className="hidden text-role-meta text-text-faint sm:inline">· {g.hint}</span>
              </header>

              <ul className="divide-y divide-rule">
                {g.rows.map((item, i) => {
                  const Icon = ICONS[item.icon] ?? TriangleAlert;
                  return (
                    <motion.li
                      key={item.id}
                      initial={reduce ? false : { opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        href={item.href}
                        className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-200 hover:bg-sunk/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control border transition-transform duration-200 group-hover:scale-105 ${g.bg} ${g.ring} ${g.text}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        {/* problème → contexte, toujours dans cet ordre */}
                        <span className="min-w-0 flex-1">
                          <span className="block text-role-body font-semibold leading-snug text-text">
                            {item.label}
                          </span>
                          <span className="block text-role-meta leading-relaxed text-text-soft">
                            {item.detail}
                          </span>
                        </span>

                        {/* → action : évidente, mais elle ne crie pas */}
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-control border border-rule bg-surface px-2.5 py-1.5 text-role-meta font-medium text-text-soft transition-all duration-200 group-hover:border-primary/30 group-hover:text-primary">
                          <span className="hidden sm:inline">{item.cta}</span>
                          <ArrowRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          />
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
