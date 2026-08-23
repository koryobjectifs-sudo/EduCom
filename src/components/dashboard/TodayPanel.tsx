"use client";

import { CalendarCheck, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CountUp } from "./Motion";
import { DataState } from "./DataState";
import type { Signal, TodayFacts } from "@/lib/dashboard";

/**
 * « Aujourd'hui » — niveau 4.
 *
 * ⚠️ **Aucune donnée de présence n'existe au schéma Prisma.** Ni appel, ni
 * absence, ni retard. Ce composant sait afficher `TodayFacts` — quatre
 * indicateurs et les anomalies de classe — mais le serveur lui renvoie
 * aujourd'hui un signal indisponible, avec sa raison.
 *
 * ⚠️ **L'état indisponible tient sur une seule ligne.** À la première passe, il
 * occupait un grand pavé au milieu de l'écran : le vide dominait la page alors
 * qu'il n'avait rien à dire. Un état qui n'apporte aucune information ne doit
 * pas coûter la place d'un qui en apporte.
 *
 * ═══ LE JOUR OÙ LA PRÉSENCE ARRIVE ═══
 *
 * Seul `todaySignal()` dans `src/lib/dashboard.ts` change. Cet écran est déjà
 * capable de tout afficher : ne pas le réécrire, le brancher.
 */
export default function TodayPanel({ today }: { today: Signal<TodayFacts> }) {
  const d = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Card title="Aujourd'hui" description={d.charAt(0).toUpperCase() + d.slice(1)}>
      {today.ok ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Élèves présents" value={today.value.presentRate} tone="success" />
            <Stat label="Absents" value={today.value.absentRate} tone={today.value.absentRate > 10 ? "danger" : "neutral"} />
            <Stat label="Retards" value={today.value.lateCount} tone="neutral" raw />
            <Stat label="Enseignants présents" value={today.value.staffPresentRate} tone="success" />
          </div>

          {today.value.anomalies.length > 0 && (
            <ul className="mt-4 space-y-2">
              {today.value.anomalies.map((a) => (
                <li
                  key={a}
                  className="flex items-start gap-2.5 rounded-control border border-warning/20 bg-warning/10 px-3.5 py-2.5 text-role-body text-warning"
                >
                  <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <DataState
          kind="inactive"
          icon={CalendarCheck}
          title="Présence — suivi non activé"
          description={today.reason}
          action={{ label: "Voir les classes", href: "/dashboard/classes" }}
        />
      )}
    </Card>
  );
}

function Stat({
  label, value, tone, raw = false,
}: {
  label: string; value: number; tone: "success" | "danger" | "neutral"; raw?: boolean;
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <div>
      <p className={`text-[26px] font-semibold tabular-nums leading-none tracking-tight ${toneClass}`}>
        <CountUp value={value} />
        {!raw && <span className="ml-0.5 text-role-section font-medium">%</span>}
      </p>
      <p className="mt-1.5 text-role-meta text-text-soft">{label}</p>
    </div>
  );
}
