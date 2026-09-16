"use client";

import { useRouter } from "next/navigation";

export function ClassFilterSelect({
  selectedClassId,
  selectedTermId,
  classes,
}: {
  selectedClassId: string;
  selectedTermId?: string;
  classes: { id: string; name: string; cycle: string | null }[];
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Filtrer par classe"
      value={selectedClassId}
      onChange={(e) => {
        const classId = e.target.value;
        const termQuery = selectedTermId ? `termId=${selectedTermId}&` : "";
        router.push(`/dashboard/grades/difficultes?${termQuery}classId=${classId}`);
      }}
      className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0E2541]"
    >
      <option value="ALL">Toutes les classes</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} {c.cycle ? `(${c.cycle})` : ""}
        </option>
      ))}
    </select>
  );
}
