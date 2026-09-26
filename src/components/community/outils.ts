/** Petits utilitaires d'affichage partagés par la Communauté (refonte du 26 sept. 2026). */

export function ilYa(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const a = Math.abs(s);
  if (a < 60) return "à l'instant";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 7 * 86400) return rtf.format(Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function jour(iso: string) {
  const d = new Date(iso);
  const auj = new Date();
  const hier = new Date(Date.now() - 86400_000);
  if (d.toDateString() === auj.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === hier.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export const heureOuJour = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? heure(iso)
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export const initiales = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "·";

/** Couleur d'avatar stable par personne : on reconnaît quelqu'un d'un coup d'œil. */
const TEINTES = [
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-indigo-100 text-indigo-800",
];
export function teinte(nom: string) {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TEINTES[h % TEINTES.length];
}

/** Téléchargement CSV lisible par Excel (séparateur « ; », BOM UTF-8). */
export function telechargerCSV(nom: string, lignes: (string | number)[][]) {
  const echapper = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = lignes.map((l) => l.map(echapper).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "export"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lignes CSV d'un sondage : une ligne par réponse, et les noms quand le vote n'est pas anonyme. */
export function lignesSondage(s: { question: string; votants: number; options: { label: string; votes: number; noms: string[] | null }[] }) {
  const total = s.options.reduce((t, o) => t + o.votes, 0);
  return [
    [s.question],
    [`${s.votants} participant(s)`],
    [],
    ["Réponse", "Votes", "Part", "Qui"],
    ...s.options.map((o) => [o.label, o.votes, `${total ? Math.round((o.votes / total) * 100) : 0} %`, o.noms ? o.noms.join(", ") : ""]),
  ];
}
