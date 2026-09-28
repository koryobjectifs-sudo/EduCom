"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar } from "lucide-react";
import type { ClePeriode } from "@/lib/periode";

const PRESETS: { cle: ClePeriode; label: string }[] = [
  { cle: "jour", label: "Aujourd'hui" },
  { cle: "hier", label: "Hier" },
  { cle: "7j", label: "7 j" },
  { cle: "30j", label: "30 j" },
  { cle: "mois", label: "Ce mois" },
  { cle: "annee", label: "Année" },
];

export default function FiltrePeriode({
  periodeActuelle = "30j",
  debutActuel,
  finActuel,
}: {
  periodeActuelle?: ClePeriode;
  debutActuel?: string;
  finActuel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [modePerso, setModePerso] = useState(periodeActuelle === "perso");
  const [dateDebut, setDateDebut] = useState(debutActuel || "");
  const [dateFin, setDateFin] = useState(finActuel || "");

  const changerPreset = (cle: ClePeriode) => {
    setModePerso(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("periode", cle);
    params.delete("debut");
    params.delete("fin");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const appliquerPerso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateDebut) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("periode", "perso");
    params.set("debut", dateDebut);
    if (dateFin) params.set("fin", dateFin);
    else params.delete("fin");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {/* Barre de segmented controls compacts */}
      <div className="inline-flex items-center rounded-lg border border-rule bg-surface p-0.5 shadow-xs">
        {PRESETS.map((p) => {
          const actif = !modePerso && periodeActuelle === p.cle;
          return (
            <button
              key={p.cle}
              type="button"
              onClick={() => changerPreset(p.cle)}
              disabled={isPending}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                actif
                  ? "bg-primary text-white font-semibold shadow-xs"
                  : "text-text-soft hover:bg-sunk hover:text-text"
              }`}
            >
              {p.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setModePerso(!modePerso)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors ${
            modePerso
              ? "bg-primary text-white font-semibold shadow-xs"
              : "text-text-soft hover:bg-sunk hover:text-text"
          }`}
          title="Sélectionner une plage de dates"
        >
          <Calendar className="h-3 w-3" />
          <span>Dates</span>
        </button>
      </div>

      {/* Formulaire de dates personnalisées si actif */}
      {modePerso && (
        <form
          onSubmit={appliquerPerso}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-surface px-2 py-1 shadow-xs"
        >
          <span className="text-[11px] text-text-soft">Du</span>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            required
            className="rounded border border-rule bg-sunk px-1.5 py-0.5 text-[11px] text-text focus:outline-none focus:border-primary"
          />
          <span className="text-[11px] text-text-soft">au</span>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="rounded border border-rule bg-sunk px-1.5 py-0.5 text-[11px] text-text focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-primary px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-primary-fonce"
          >
            OK
          </button>
        </form>
      )}
    </div>
  );
}
