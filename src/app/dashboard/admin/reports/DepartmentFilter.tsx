"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DepartmentFilter({ groups, currentDept }: { groups: { id: string, title: string }[], currentDept: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="relative">
      <label htmlFor="dept" className="sr-only">Filtrer par département</label>
      <select
        id="dept"
        name="dept"
        value={currentDept}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === "ALL") {
            params.delete("dept");
          } else {
            params.set("dept", e.target.value);
          }
          router.push(`?${params.toString()}`);
        }}
        className="block w-full appearance-none rounded-control border border-rule bg-surface py-2.5 pl-3 pr-10 text-role-body text-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
      >
        <option value="ALL">Tous les départements</option>
        {groups.map(g => (
          <option key={g.id} value={g.id}>{g.title}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg className="h-4 w-4 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
