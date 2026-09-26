"use client";

import {
  Users,
  Trophy,
  Scale,
  Smile,
  AlertTriangle,
  MessageSquareQuote,
  Megaphone,
  Timer,
  UsersRound,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { Constat, Icone, LectureEchelle, LectureNps, LectureChoix, Rythme } from "@/lib/interpretation";

/**
 * Briques visuelles des résultats — 26 sept. 2026 (espace Résultats,
 * résultats des formulaires et des sondages). Une seule teinte pour les
 * grandeurs ; les couleurs d'état (vert / orange / rouge) ne servent qu'aux
 * avis positifs / négatifs et sont toujours doublées d'un libellé.
 */

const ICONES: Record<Icone, typeof Users> = {
  participation: Users,
  consensus: Trophy,
  partage: Scale,
  satisfaction: Smile,
  alerte: AlertTriangle,
  mots: MessageSquareQuote,
  nps: Megaphone,
  rythme: Timer,
  profil: UsersRound,
};

const TON = {
  positif: { bord: "border-l-success", pastille: "bg-success/12 text-success", libelle: "Bon signe", Marque: CheckCircle2 },
  neutre: { bord: "border-l-primary-ink", pastille: "bg-primary-ink/10 text-primary-ink", libelle: "À noter", Marque: Info },
  alerte: { bord: "border-l-danger", pastille: "bg-danger/10 text-danger", libelle: "À traiter", Marque: AlertTriangle },
} as const;

/** « Ce qu'il faut retenir » : cartes de constats, du plus important au moins important. */
export function Constats({ constats, titre = "Ce qu'il faut retenir" }: { constats: Constat[]; titre?: string }) {
  if (!constats.length) return null;
  return (
    <section aria-label={titre}>
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">{titre}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {constats.map((c, i) => {
          const Ic = ICONES[c.icone];
          const t = TON[c.ton];
          return (
            <li key={i} className={`flex gap-3 rounded-2xl border border-l-4 border-rule ${t.bord} bg-surface p-3.5`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.pastille}`}>
                <Ic aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-snug text-text">{c.titre}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-text-soft">{c.texte}</p>
                <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.pastille}`}>
                  <t.Marque aria-hidden="true" className="h-3 w-3" /> {t.libelle}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Anneau de pourcentage (participation, indice). */
export function Anneau({ valeur, taille = 72, libelle, sousLibelle }: { valeur: number; taille?: number; libelle?: string; sousLibelle?: string }) {
  const r = (taille - 8) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valeur));
  return (
    <div className="inline-flex items-center gap-3">
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} role="img" aria-label={`${v} %${libelle ? ` — ${libelle}` : ""}`}>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" strokeWidth="6" className="stroke-sunk" />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
          className="stroke-primary-ink transition-[stroke-dasharray] duration-700"
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-text text-[15px] font-bold tabular-nums">
          {v}%
        </text>
      </svg>
      {(libelle || sousLibelle) && (
        <span className="min-w-0">
          {libelle && <span className="block text-sm font-bold text-text">{libelle}</span>}
          {sousLibelle && <span className="block text-xs text-text-soft">{sousLibelle}</span>}
        </span>
      )}
    </div>
  );
}

/** Classement des réponses (choix unique, cases, sondage) : barres horizontales, gagnant mis en avant. */
export function Classement({ choix, noms }: { choix: LectureChoix; noms?: Map<string, string[] | null> }) {
  const max = Math.max(1, ...choix.classement.map((o) => o.votes));
  return (
    <div>
      <ul className="space-y-2">
        {choix.classement.map((o, i) => {
          const premier = i === 0 && o.votes > 0 && choix.verdict !== "egalite" && choix.verdict !== "trop-tot";
          const liste = noms?.get(o.label);
          return (
            <li key={o.label} title={`${o.label} : ${o.votes} (${o.part} %)`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`min-w-0 truncate ${premier ? "font-bold text-text" : "text-text"}`}>
                  {premier && <Trophy aria-label="En tête" className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-primary-ink" />}
                  {o.label}
                </span>
                <span className="shrink-0 tabular-nums text-text-soft">
                  <strong className="text-text">{o.part} %</strong> · {o.votes}
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sunk">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${premier ? "bg-primary-ink" : "bg-primary-ink/45"}`}
                  style={{ width: `${(o.votes / max) * 100}%` }}
                />
              </div>
              {liste && liste.length > 0 && <p className="mt-1 text-xs text-text-faint">{liste.join(", ")}</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded-xl bg-sunk/70 px-3 py-2 text-[13px] text-text">💡 {choix.phrase}</p>
    </div>
  );
}

const NOTES = [
  { note: 1, classe: "bg-danger", texte: "text-danger" },
  { note: 2, classe: "bg-danger/60", texte: "text-danger" },
  { note: 3, classe: "bg-slate-300", texte: "text-text-soft" },
  { note: 4, classe: "bg-success/60", texte: "text-success" },
  { note: 5, classe: "bg-success", texte: "text-success" },
];

/** Échelle 1 à 5 : humeur, moyenne, barre empilée « mécontents | neutres | satisfaits ». */
export function Echelle({ e, parProfil = [] }: { e: LectureEchelle; parProfil?: { profil: string; moyenne: number; n: number }[] }) {
  if (e.moyenne === null) return <p className="text-sm text-text-soft">{e.phrase}</p>;
  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="text-4xl" aria-hidden="true">
          {e.humeur}
        </span>
        <div>
          <p className="text-3xl font-bold tabular-nums text-text">
            {e.moyenne.toFixed(1).replace(".", ",")}
            <span className="text-base font-semibold text-text-soft"> / 5</span>
          </p>
          <p className="text-xs text-text-soft">
            <span className="font-semibold text-success">{e.satisfaits} % satisfaits</span> · <span className="font-semibold text-danger">{e.mecontents} % peu satisfaits</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Répartition des notes : ${e.repartition.map((n, i) => `${i + 1} : ${n}`).join(", ")}`}>
        {e.repartition.map((n, i) =>
          n ? <div key={i} title={`Note ${i + 1} : ${n}`} className={`${NOTES[i].classe} first:rounded-l-full last:rounded-r-full`} style={{ flexGrow: n }} /> : null,
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-5 text-center text-[11px] tabular-nums text-text-soft">
        {e.repartition.map((n, i) => (
          <span key={i}>
            <span className={`font-bold ${NOTES[i].texte}`}>{i + 1}</span> · {n}
          </span>
        ))}
      </div>
      {parProfil.length >= 2 && (
        <ul className="mt-3 space-y-1 border-t border-rule pt-3">
          {parProfil.map((p) => (
            <li key={p.profil} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 truncate text-text-soft">{p.profil}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                <span className="block h-full rounded-full bg-primary-ink" style={{ width: `${((p.moyenne - 1) / 4) * 100}%` }} />
              </span>
              <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-text">{p.moyenne.toFixed(1).replace(".", ",")} / 5</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 rounded-xl bg-sunk/70 px-3 py-2 text-[13px] text-text">💡 {e.phrase}</p>
    </div>
  );
}

/** Recommandation 0 à 10 : score de -100 à +100 et les trois groupes. */
export function Nps({ n }: { n: LectureNps }) {
  if (n.score === null) return <p className="text-sm text-text-soft">{n.phrase}</p>;
  const position = (n.score + 100) / 2;
  return (
    <div>
      <div className="flex items-end gap-3">
        <p className="text-4xl font-bold tabular-nums text-text">
          {n.score > 0 ? "+" : ""}
          {n.score}
        </p>
        <p className="pb-1 text-xs text-text-soft">score de recommandation (de −100 à +100)</p>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-danger/70 via-slate-300 to-success/80">
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-text shadow"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-danger/8 py-2">
          <p className="text-lg font-bold tabular-nums text-danger">{n.detracteurs} %</p>
          <p className="text-text-soft">Déçus (0-6)</p>
        </div>
        <div className="rounded-xl bg-sunk py-2">
          <p className="text-lg font-bold tabular-nums text-text">{n.passifs} %</p>
          <p className="text-text-soft">Neutres (7-8)</p>
        </div>
        <div className="rounded-xl bg-success/10 py-2">
          <p className="text-lg font-bold tabular-nums text-success">{n.promoteurs} %</p>
          <p className="text-text-soft">Ambassadeurs (9-10)</p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-sunk/70 px-3 py-2 text-[13px] text-text">💡 {n.phrase}</p>
    </div>
  );
}

/** Nuage des mots les plus cités (taille = fréquence). */
export function NuageMots({ mots }: { mots: { mot: string; n: number }[] }) {
  if (!mots.length) return null;
  const max = Math.max(...mots.map((m) => m.n));
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 rounded-xl bg-sunk/50 px-4 py-3" aria-label="Mots les plus cités">
      {mots.map((m) => {
        const k = m.n / max;
        return (
          <span
            key={m.mot}
            title={`${m.mot} : cité ${m.n} fois`}
            className="font-bold text-primary-ink"
            style={{ fontSize: `${12 + k * 14}px`, opacity: 0.45 + k * 0.55 }}
          >
            {m.mot}
          </span>
        );
      })}
    </div>
  );
}

/** Réponses par jour (petit histogramme). */
export function RythmeJours({ r }: { r: Rythme }) {
  if (r.parJour.length < 2) return r.phrase ? <p className="text-xs text-text-soft">{r.phrase}</p> : null;
  const max = Math.max(...r.parJour.map((j) => j.n));
  return (
    <div>
      <div className="flex h-16 items-end gap-1" role="img" aria-label={`Réponses par jour : ${r.parJour.map((j) => `${j.jour} ${j.n}`).join(", ")}`}>
        {r.parJour.map((j) => (
          <div
            key={j.jour}
            title={`${new Date(`${j.jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} : ${j.n}`}
            className="min-w-1.5 flex-1 rounded-t-[4px] bg-primary-ink/70 hover:bg-primary-ink"
            style={{ height: `${Math.max(8, (j.n / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-text-faint">
        <span>{new Date(`${r.parJour[0].jour}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        <span>{new Date(`${r.parJour[r.parJour.length - 1].jour}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
      </div>
      {r.phrase && <p className="mt-2 text-xs text-text-soft">{r.phrase}</p>}
    </div>
  );
}
