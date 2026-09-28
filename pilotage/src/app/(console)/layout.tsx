import type { ReactNode } from "react";
import { exigerPilotePage } from "@/lib/acces";
import { badgesPilotage } from "@/lib/donnees";
import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";

/**
 * Outil de pilotage EduCom — application séparée d'EduCom, même base.
 * Toute page de ce groupe exige une session du pilotage (`lib/acces.ts`).
 */
export default async function LayoutConsole({ children }: { children: ReactNode }) {
  const p = await exigerPilotePage();
  const badges = await badgesPilotage();
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <TopBar badges={badges} email={p.email} />
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}

