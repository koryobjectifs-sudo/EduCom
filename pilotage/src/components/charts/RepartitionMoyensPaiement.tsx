import { fcfa } from "@/lib/calculs";

export default function RepartitionMoyensPaiement({
  repartition,
}: {
  repartition: {
    wave: { montant: number; nombre: number };
    orangeMoney: { montant: number; nombre: number };
    manuel: { montant: number; nombre: number };
  };
}) {
  const total = repartition.wave.montant + repartition.orangeMoney.montant + repartition.manuel.montant;
  const pct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

  return (
    <div className="rounded-xl border border-rule bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-text">Moyens d&apos;encaissement</h3>
          <p className="text-[11px] text-text-soft">Paiements confirmés sur la période</p>
        </div>
        <span className="text-xs font-bold tabular-nums text-text">{fcfa(total)}</span>
      </div>

      {/* Barre segmentée */}
      <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-sunk">
        {repartition.wave.montant > 0 && (
          <div
            style={{ width: `${pct(repartition.wave.montant)}%` }}
            className="bg-sky-500"
            title={`Wave : ${fcfa(repartition.wave.montant)} (${pct(repartition.wave.montant)}%)`}
          />
        )}
        {repartition.orangeMoney.montant > 0 && (
          <div
            style={{ width: `${pct(repartition.orangeMoney.montant)}%` }}
            className="bg-amber-500"
            title={`Orange Money : ${fcfa(repartition.orangeMoney.montant)} (${pct(repartition.orangeMoney.montant)}%)`}
          />
        )}
        {repartition.manuel.montant > 0 && (
          <div
            style={{ width: `${pct(repartition.manuel.montant)}%` }}
            className="bg-slate-400"
            title={`Manuel : ${fcfa(repartition.manuel.montant)} (${pct(repartition.manuel.montant)}%)`}
          />
        )}
      </div>

      {/* Détail compact */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
          <div className="min-w-0 truncate">
            <span className="font-semibold text-text">Wave</span>
            <div className="text-[10px] tabular-nums text-text-faint truncate">
              {fcfa(repartition.wave.montant)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          <div className="min-w-0 truncate">
            <span className="font-semibold text-text">OM</span>
            <div className="text-[10px] tabular-nums text-text-faint truncate">
              {fcfa(repartition.orangeMoney.montant)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
          <div className="min-w-0 truncate">
            <span className="font-semibold text-text">Manuel</span>
            <div className="text-[10px] tabular-nums text-text-faint truncate">
              {fcfa(repartition.manuel.montant)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
