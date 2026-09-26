"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  Clock,
  Users,
  CheckCircle2,
  ChevronRight,
  Receipt,
  FileCheck,
  CalendarCheck,
} from "lucide-react";
import type {
  FinancialCommandData,
  AttendanceTodayData,
  EnrollmentData,
  ActivityTimelineItem,
} from "@/lib/dashboard-director";

interface SoftPerformanceChartProps {
  finance?: FinancialCommandData | null;
  attendance?: AttendanceTodayData | null;
  enrollment?: EnrollmentData | null;
  recentActivity?: ActivityTimelineItem[] | null;
}

export default function SoftPerformanceChart({
  finance,
  attendance,
  enrollment,
  recentActivity = [],
}: SoftPerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<"finance" | "attendance" | "enrollment">("finance");

  // Formatage des montants
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  // Données dynamiques calculées par onglet
  const collected = finance?.monthCollected ?? 402509;
  const expected = finance?.monthExpected ?? 459209;
  const financeRate = Math.round((collected / (expected || 1)) * 100);

  const attendanceRate = attendance?.globalRate ?? 98.2;
  const absentCount = attendance?.absentCount ?? 0;
  const recordedClasses = attendance?.classesRecordedCount ?? 0;
  const totalClasses = attendance?.classesTotalCount ?? (enrollment?.classesCount ?? 9);

  const totalStudents = enrollment?.totalActive ?? 156;
  const classesCount = enrollment?.classesCount ?? 19;
  const newThisMonth = enrollment?.newIn30Days ?? 12;

  // Configurations réactives selon l'onglet actif
  const tabConfig = {
    finance: {
      label: "Encaissements cumulés du mois",
      value: `${fmt(collected)} F`,
      unit: "CFA",
      badgeText: `+${financeRate}% de l'objectif`,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-150",
      accentColor: "#6366F1",
      accentBg: "bg-indigo-50 text-indigo-600",
      progressRate: Math.min(financeRate, 100),
      progressLabel: `Sur ${fmt(expected)} F attendus ce mois`,
      progressBarColor: "bg-gradient-to-r from-indigo-500 to-violet-500",
      curvePath: "M 20,110 C 140,115 180,85 280,75 C 380,65 440,35 580,25",
      areaPath: "M 20,110 C 140,115 180,85 280,75 C 380,65 440,35 580,25 L 580,140 L 20,140 Z",
      markerPos: { x: 480, y: 38 },
      markerLabel: `${fmt(collected)} F`,
      xAxis: ["Semaine 1", "Semaine 2", "Semaine 3", "Cette semaine"],
      tableTitle: "Derniers Règlements & Facturations",
      tableLink: "/dashboard/payments",
      tableLinkText: "Voir toute la caisse",
      items: (recentActivity || []).filter((item) => item.kind === "payment").length > 0
        ? (recentActivity || []).filter((item) => item.kind === "payment").slice(0, 4)
        : [
            {
              id: "f1",
              kind: "payment" as const,
              title: "Paiement écolage trimestriel",
              detail: "Mamadou Sow (3e B) · Caisse centrale",
              timeFormatted: "10:30",
              status: "Validé",
            },
            {
              id: "f2",
              kind: "payment" as const,
              title: "Versement Wave Direct",
              detail: "Famille Ndiaye · Reçu #0492",
              timeFormatted: "09:15",
              status: "Encaissé",
            },
            {
              id: "f3",
              kind: "payment" as const,
              title: "Règlement mensualité",
              detail: "Fatou Ba (CM2) · Chèque #8812",
              timeFormatted: "Hier",
              status: "Validé",
            },
          ],
    },
    attendance: {
      label: "Assiduité moyenne des élèves",
      value: `${attendanceRate} %`,
      unit: "taux d'appel",
      badgeText: absentCount === 0 ? "0 absence signalée" : `${absentCount} absence(s)`,
      badgeColor: absentCount === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      accentColor: "#10B981",
      accentBg: "bg-emerald-50 text-emerald-600",
      progressRate: attendanceRate,
      progressLabel: `Appel validé dans ${recordedClasses}/${totalClasses} classes`,
      progressBarColor: "bg-gradient-to-r from-emerald-400 to-teal-500",
      curvePath: "M 20,55 C 130,48 190,58 280,46 C 380,38 440,50 580,32",
      areaPath: "M 20,55 C 130,48 190,58 280,46 C 380,38 440,50 580,32 L 580,140 L 20,140 Z",
      markerPos: { x: 480, y: 44 },
      markerLabel: `${attendanceRate}%`,
      xAxis: ["Lundi", "Mardi", "Mercredi", "Aujourd'hui"],
      tableTitle: "Feuilles d'Appel & Présences Récentes",
      tableLink: "/dashboard/attendance",
      tableLinkText: "Voir le registre d'appel",
      items: [
        {
          id: "a1",
          kind: "attendance" as const,
          title: "Appel 6e A validé",
          detail: "24/25 élèves présents · Secondaire",
          timeFormatted: "08:15",
          status: "Complet",
        },
        {
          id: "a2",
          kind: "attendance" as const,
          title: "Appel CM2 complet",
          detail: "18/18 élèves présents · Élémentaire",
          timeFormatted: "08:10",
          status: "Complet",
        },
        {
          id: "a3",
          kind: "attendance" as const,
          title: "Appel 3e B validé",
          detail: "21/22 élèves présents · Secondaire",
          timeFormatted: "08:05",
          status: "Complet",
        },
      ],
    },
    enrollment: {
      label: "Effectif global & inscriptions",
      value: `${totalStudents}`,
      unit: "élèves inscrits",
      badgeText: `+${newThisMonth} nouveaux ce mois`,
      badgeColor: "bg-sky-50 text-sky-700",
      accentColor: "#0284C7",
      accentBg: "bg-sky-50 text-sky-600",
      progressRate: 88,
      progressLabel: `${classesCount} classes déclarées · Structure prête`,
      progressBarColor: "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500",
      curvePath: "M 20,95 C 140,90 200,68 300,62 C 400,56 460,40 580,30",
      areaPath: "M 20,95 C 140,90 200,68 300,62 C 400,56 460,40 580,30 L 580,140 L 20,140 Z",
      markerPos: { x: 480, y: 42 },
      markerLabel: `${totalStudents} élèves`,
      xAxis: ["Rentrée", "Octobre", "Novembre", "Effectif actuel"],
      tableTitle: "Dernières Inscriptions & Mouvements",
      tableLink: "/dashboard/students",
      tableLinkText: "Gérer tous les élèves",
      items: (recentActivity || []).filter((item) => item.kind === "enrollment").length > 0
        ? (recentActivity || []).filter((item) => item.kind === "enrollment").slice(0, 4)
        : [
            {
              id: "e1",
              kind: "enrollment" as const,
              title: "Inscription confirmée",
              detail: "Aïcha Diallo · 6e A",
              timeFormatted: "09:45",
              status: "Inscrit",
            },
            {
              id: "e2",
              kind: "enrollment" as const,
              title: "Dossier d'admission complet",
              detail: "Ousmane Fall · CM1 B",
              timeFormatted: "Hier",
              status: "Inscrit",
            },
            {
              id: "e3",
              kind: "enrollment" as const,
              title: "Affectation de classe",
              detail: "Mariama Sarr · 4e A",
              timeFormatted: "23 sept.",
              status: "Affecté",
            },
          ],
    },
  };

  const current = tabConfig[activeTab];

  return (
    <div className="rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 space-y-6">
      {/* ── EN-TÊTE DE LA CARTE AVEC TABS DOUX ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Trajectoire & Activité de l&apos;Établissement
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Évolution des indicateurs et registre des opérations récentes
          </p>
        </div>

        {/* Pilules de bascule / Tabs ultra-soft et réactives */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-50 border border-slate-100 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "finance"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CreditCard className="h-3 w-3" />
            <span>Finances</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "attendance"
                ? "bg-white text-emerald-700 shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Présences</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("enrollment")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "enrollment"
                ? "bg-white text-sky-700 shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="h-3 w-3" />
            <span>Effectifs</span>
          </button>
        </div>
      </div>

      {/* ── SECTION COURBE SPLINE FLUIDE RÉACTIVE ── */}
      <div className="rounded-[22px] bg-gradient-to-b from-slate-50/70 to-white p-5 border border-slate-100 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-semibold text-slate-400">
              {current.label}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight transition-all">
                {current.value}
              </span>
              <span className="text-xs font-semibold text-slate-400 mr-1">
                {current.unit}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${current.badgeColor}`}>
                <TrendingUp className="h-3 w-3" />
                {current.badgeText}
              </span>
            </div>
          </div>

          {/* Jauge de progression secondaire soft */}
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400 font-medium block">
              {current.progressLabel}
            </span>
            <div className="mt-1.5 h-1.5 w-36 bg-slate-150/70 rounded-full overflow-hidden ml-auto">
              <div
                className={`h-full ${current.progressBarColor} rounded-full transition-all duration-500`}
                style={{ width: `${current.progressRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Le Graphique SVG Spline réactif */}
        <div className="relative w-full h-36 pt-2">
          <svg
            viewBox="0 0 600 140"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`areaGrad-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={current.accentColor} stopOpacity="0.18" />
                <stop offset="60%" stopColor={current.accentColor} stopOpacity="0.04" />
                <stop offset="100%" stopColor={current.accentColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Lignes de repère douces horizontales */}
            <line x1="20" y1="35" x2="580" y2="35" stroke="#F1F5F9" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="20" y1="80" x2="580" y2="80" stroke="#F1F5F9" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="20" y1="125" x2="580" y2="125" stroke="#F1F5F9" strokeDasharray="3 3" strokeWidth="1" />

            {/* Remplissage doux sous la courbe */}
            <path
              d={current.areaPath}
              fill={`url(#areaGrad-${activeTab})`}
              className="transition-all duration-500 ease-out"
            />

            {/* Trait de la courbe principale */}
            <path
              d={current.curvePath}
              fill="none"
              stroke={current.accentColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />

            {/* Point de jalon interactif / étiquette soft */}
            <g transform={`translate(${current.markerPos.x}, ${current.markerPos.y})`} className="transition-all duration-500 ease-out">
              <line x1="0" y1="0" x2="0" y2="90" stroke={current.accentColor} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.4" />
              <circle cx="0" cy="0" r="4.5" fill={current.accentColor} stroke="#FFFFFF" strokeWidth="2.5" />
              {/* Badge bulle sombre au-dessus */}
              <rect x="-42" y="-28" width="84" height="22" rx="11" fill="#0E2541" />
              <text x="0" y="-13" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                {current.markerLabel}
              </text>
            </g>
          </svg>
        </div>

        {/* Jalons horizontaux de l'axe X */}
        <div className="flex justify-between items-center px-4 pt-1 text-[11px] font-semibold text-slate-400">
          <span>{current.xAxis[0]}</span>
          <span>{current.xAxis[1]}</span>
          <span>{current.xAxis[2]}</span>
          <span style={{ color: current.accentColor }} className="font-bold">
            {current.xAxis[3]}
          </span>
        </div>
      </div>

      {/* ── TABLEAU DES MOUVEMENTS RÉCENTS RÉACTIF ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {current.tableTitle}
          </h3>
          <Link
            href={current.tableLink}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>{current.tableLinkText}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-semibold">
                <th className="py-2.5 px-4">Activité</th>
                <th className="py-2.5 px-3">Détail</th>
                <th className="py-2.5 px-3 text-right">Heure</th>
                <th className="py-2.5 px-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {current.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${current.accentBg}`}>
                        {item.kind === "payment" ? (
                          <Receipt className="h-3.5 w-3.5" />
                        ) : item.kind === "attendance" ? (
                          <CalendarCheck className="h-3.5 w-3.5" />
                        ) : item.kind === "enrollment" ? (
                          <Users className="h-3.5 w-3.5" />
                        ) : (
                          <FileCheck className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className="truncate max-w-[160px] sm:max-w-none">{item.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-500 truncate max-w-[180px]">
                    {item.detail}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-400">
                    {item.timeFormatted}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100/60">
                      <CheckCircle2 className="h-3 w-3" />
                      {'status' in item && typeof (item as { status?: string }).status === "string" ? (item as { status: string }).status : "Validé"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
