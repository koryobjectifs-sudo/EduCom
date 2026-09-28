"use client";

import { useState } from "react";

export type PointCourbe = {
  date: string;
  label: string;
  valeur: number;
};

/**
 * Graphique de tendance lissé (Courbe Bézier + Dégradé SVG) ultra-léger et stable.
 * Zéro fonction passée en prop (évite le crash de sérialisation Client/Server).
 */
export default function CourbeTendance({
  points,
  titre,
  sousTitre,
  modeValeur = "fcfa", // "fcfa" | "nombre"
  couleur = "violet", // "violet" | "emeraude" | "bleu"
}: {
  points: PointCourbe[];
  titre?: string;
  sousTitre?: string;
  modeValeur?: "fcfa" | "nombre";
  couleur?: "violet" | "emeraude" | "bleu";
}) {
  const [pointSurvol, setPointSurvol] = useState<PointCourbe | null>(null);

  const formater = (n: number) => {
    if (modeValeur === "nombre") return `${n.toLocaleString("fr-FR")}`;
    return `${n.toLocaleString("fr-FR")} F CFA`;
  };

  if (!points || points.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-rule bg-surface text-xs text-text-faint">
        Aucune donnée sur la période sélectionnée
      </div>
    );
  }

  const palettes = {
    violet: {
      ligne: "#7e22ce",
      degradeHaut: "#a855f7",
      degradeBas: "#a855f700",
      accent: "text-purple-700",
      bgPill: "bg-purple-50 text-purple-700 border border-purple-200",
    },
    emeraude: {
      ligne: "#059669",
      degradeHaut: "#10b981",
      degradeBas: "#10b98100",
      accent: "text-emerald-700",
      bgPill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    bleu: {
      ligne: "#2563eb",
      degradeHaut: "#3b82f6",
      degradeBas: "#3b82f600",
      accent: "text-blue-700",
      bgPill: "bg-blue-50 text-blue-700 border border-blue-200",
    },
  };

  const pColor = palettes[couleur];
  const maxVal = Math.max(...points.map((p) => p.valeur), 1);
  const total = points.reduce((acc, p) => acc + p.valeur, 0);

  const W = 600;
  const H = 140;
  const paddingX = 12;
  const paddingTop = 16;
  const paddingBottom = 20;
  const chartW = W - paddingX * 2;
  const chartH = H - paddingTop - paddingBottom;

  const coordonnees = points.map((p, i) => {
    const x = paddingX + (i / Math.max(1, points.length - 1)) * chartW;
    const y = paddingTop + chartH - (p.valeur / maxVal) * chartH;
    return { x, y, point: p };
  });

  let cheminLigne = `M ${coordonnees[0].x},${coordonnees[0].y}`;
  for (let i = 0; i < coordonnees.length - 1; i++) {
    const p0 = coordonnees[i];
    const p1 = coordonnees[i + 1];
    const cx1 = p0.x + (p1.x - p0.x) / 2;
    const cy1 = p0.y;
    const cx2 = p0.x + (p1.x - p0.x) / 2;
    const cy2 = p1.y;
    cheminLigne += ` C ${cx1},${cy1} ${cx2},${cy2} ${p1.x},${p1.y}`;
  }

  const dernier = coordonnees[coordonnees.length - 1];
  const premier = coordonnees[0];
  const cheminAire = `${cheminLigne} L ${dernier.x},${H - paddingBottom} L ${premier.x},${H - paddingBottom} Z`;
  const gradId = `grad-${couleur}`;

  return (
    <div className="rounded-xl border border-rule bg-surface p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          {titre && <h3 className="text-xs font-semibold text-text">{titre}</h3>}
          {sousTitre && <p className="text-[11px] text-text-soft">{sousTitre}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-text-faint">Total :</span>
          <span className="text-xs font-bold tabular-nums text-text">{formater(total)}</span>
          {pointSurvol && (
            <div className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${pColor.bgPill}`}>
              {pointSurvol.label} : {formater(pointSurvol.valeur)}
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height: "140px" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={pColor.degradeHaut} stopOpacity="0.22" />
              <stop offset="100%" stopColor={pColor.degradeBas} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1={paddingX} y1={paddingTop} x2={W - paddingX} y2={paddingTop} stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
          <line x1={paddingX} y1={paddingTop + chartH / 2} x2={W - paddingX} y2={paddingTop + chartH / 2} stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
          <line x1={paddingX} y1={H - paddingBottom} x2={W - paddingX} y2={H - paddingBottom} stroke="#e2e8f0" strokeWidth="1" />

          <path d={cheminAire} fill={`url(#${gradId})`} />
          <path d={cheminLigne} fill="none" stroke={pColor.ligne} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {coordonnees.map((c, i) => {
            const estActif = pointSurvol?.date === c.point.date;
            return (
              <g key={i}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={estActif ? 5 : c.point.valeur > 0 ? 3 : 1.5}
                  fill={estActif ? pColor.ligne : "#ffffff"}
                  stroke={pColor.ligne}
                  strokeWidth="2"
                  className="transition-all"
                  onMouseEnter={() => setPointSurvol(c.point)}
                  onMouseLeave={() => setPointSurvol(null)}
                />
                <rect
                  x={c.x - 10}
                  y={0}
                  width={20}
                  height={H}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setPointSurvol(c.point)}
                  onMouseLeave={() => setPointSurvol(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-1 flex justify-between px-1 text-[10px] text-text-faint">
        <span>{points[0]?.label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.label}</span>}
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
