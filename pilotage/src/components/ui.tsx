import type { ReactNode } from "react";
import Link from "next/link";
import type { Statut, EtapeAdoption, InfoAdoption } from "@/lib/calculs";
import { LIBELLE_STATUT } from "@/lib/calculs";

/** Petits éléments visuels de l'outil de pilotage (serveur). */
export function ilYa(d: Date | null | undefined, maintenant = new Date()): string {
  if (!d) return "jamais";
  const s = Math.round((maintenant.getTime() - d.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const j = Math.floor(s / 86400);
  return j === 1 ? "hier" : `il y a ${j} j`;
}

/** Vrai si la date est absente ou plus ancienne que `jours`. */
export function plusVieuxQue(d: Date | null | undefined, jours: number): boolean {
  return !d || Date.now() - d.getTime() > jours * 86_400_000;
}

const TON: Record<Statut, string> = {
  PAYANTE: "bg-emerald-50 text-emerald-700",
  ESSAI: "bg-purple-50 text-purple-700",
  EN_RETARD: "bg-amber-50 text-amber-700",
  PERDUE: "bg-rose-50 text-rose-700",
  NON_CONVERTIE: "bg-sunk text-text-soft",
  INCONNU: "bg-sunk text-text-faint",
};

export function PastilleStatut({ statut, joursRestants }: { statut: Statut; joursRestants?: number | null }) {
  const suffixe =
    statut === "ESSAI" && joursRestants != null
      ? ` · J-${Math.max(0, joursRestants)}`
      : statut === "PAYANTE" && joursRestants != null
      ? ` · ${joursRestants} j`
      : "";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TON[statut]}`}>
      {LIBELLE_STATUT[statut]}
      {suffixe}
    </span>
  );
}

export function Kpi({
  libelle,
  valeur,
  detail,
  ton,
  href,
}: {
  libelle: string;
  valeur: ReactNode;
  detail?: ReactNode;
  ton?: "ok" | "bad" | "warn";
  href?: string;
}) {
  const c =
    ton === "ok"
      ? "text-emerald-700"
      : ton === "bad"
      ? "text-rose-700"
      : ton === "warn"
      ? "text-amber-700"
      : "text-text-faint";

  const contenu = (
    <div
      className={`rounded-xl border border-rule bg-surface px-3 py-2.5 transition-all ${
        href ? "hover:border-primary hover:bg-sunk/40" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-text-soft">{libelle}</p>
        {href && <span className="text-[10px] text-text-faint group-hover:text-primary">→</span>}
      </div>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-text">{valeur}</p>
      {detail && <p className={`text-[11px] ${c}`}>{detail}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block focus:outline-none">
        {contenu}
      </Link>
    );
  }
  return contenu;
}

export function PastilleAdoption({ adoption }: { adoption: InfoAdoption }) {
  if (adoption.estChampionne) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
        <span>🚀</span> Championne
      </span>
    );
  }
  const couleurs = {
    INSCRITE: "bg-rose-50 text-rose-700",
    STRUCTURE: "bg-amber-50 text-amber-700",
    ELEVES: "bg-blue-50 text-blue-700",
    PEDAGOGIE: "bg-purple-50 text-purple-700",
    VALEUR: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${couleurs[adoption.etapeActuelle]}`}>
      <span className="tabular-nums font-bold">{adoption.score}/5</span>
      <span className="text-[10px] opacity-75">· {adoption.labelEtape}</span>
    </span>
  );
}

export function EntonnoirVisuel({
  etapes,
  ecolesTotal,
}: {
  etapes: { id: EtapeAdoption; label: string; nombre: number; pourcentage: number; bloqueesIci: number }[];
  ecolesTotal: number;
}) {
  return (
    <div className="space-y-2">
      {etapes.map((e, idx) => {
        const estDerniere = idx === etapes.length - 1;
        return (
          <div
            key={e.id}
            className="group rounded-xl border border-rule/70 bg-surface/60 p-2.5 transition-colors hover:border-primary/50 hover:bg-sunk/40"
          >
            <div className="flex items-center justify-between gap-2 text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-bold text-primary">
                  {idx + 1}
                </span>
                <span className="font-semibold text-text">{e.label}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="tabular-nums font-bold text-text">
                  {e.nombre} <span className="text-[11px] font-normal text-text-faint">({e.pourcentage} %)</span>
                </span>
                {e.bloqueesIci > 0 && !estDerniere ? (
                  <Link
                    href={`/ecoles?etape=${e.id}`}
                    className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 hover:bg-amber-500/20"
                    title="Voir les écoles bloquées à cette étape"
                  >
                    {e.bloqueesIci} bloquée{e.bloqueesIci > 1 ? "s" : ""} ici →
                  </Link>
                ) : (
                  <span className="text-[11px] text-text-faint">—</span>
                )}
              </div>
            </div>
            {/* Barre de conversion */}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-rule/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  e.pourcentage >= 80 ? "bg-emerald-500" : e.pourcentage >= 40 ? "bg-primary" : "bg-amber-500"
                }`}
                style={{ width: `${e.pourcentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Bloc({
  titre,
  actions,
  children,
  className = "",
}: {
  titre?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-rule bg-surface p-3 ${className}`}>
      {(titre || actions) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {titre && <h3 className="text-[13px] font-semibold text-text">{titre}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EnTete({ titre, sous, actions }: { titre: ReactNode; sous?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-lg font-bold text-text">{titre}</h1>
        {sous && <p className="text-[12.5px] text-text-soft">{sous}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Barres verticales simples (montants ou comptes), valeur au survol et en clair. */
export function Barres({
  points,
  format = (n: number) => String(n),
}: {
  points: { libelle: string; valeur: number }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.valeur));
  return (
    <div>
      <div className="flex h-24 items-end gap-1.5">
        {points.map((p, i) => (
          <div
            key={p.libelle + i}
            className="flex flex-1 flex-col items-center justify-end gap-0.5"
            title={`${p.libelle} : ${format(p.valeur)}`}
          >
            <span className="text-[10px] tabular-nums text-text-faint">
              {p.valeur ? format(p.valeur) : ""}
            </span>
            <div
              className={`w-full rounded-t ${
                i === points.length - 1 ? "bg-primary" : "bg-primary/25"
              }`}
              style={{ height: `${Math.max(p.valeur ? 6 : 2, (p.valeur / max) * 72)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {points.map((p, i) => (
          <span key={p.libelle + i} className="flex-1 text-center text-[10px] text-text-faint">
            {p.libelle}
          </span>
        ))}
      </div>
    </div>
  );
}
