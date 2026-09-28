import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";

export default function Carte({ titre, sous, children }: { titre: string; sous: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#18082a] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl border border-rule/50">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/educom-bouclier.png"
            alt="EduCom"
            width={24}
            height={28}
            className="h-6 w-auto"
          />
          <span
            className="font-bold text-[17px] tracking-tight leading-none"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            <span className="text-[#001D3F]">Edu</span>
            <span className="text-[#A30001]">Com</span>
          </span>
          <span className="rounded-md border border-purple-500/25 bg-purple-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary">
            Pilotage
          </span>
        </div>
        <h1 className="mt-4 text-lg font-bold text-text">{titre}</h1>
        <p className="mb-4 text-[13px] text-text-soft">{sous}</p>
        {children}
      </div>
    </main>
  );
}
