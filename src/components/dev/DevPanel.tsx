"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DevPanel() {
  const router = useRouter();
  const [role, setRole] = useState("OWNER");
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState("");

  if (process.env.NODE_ENV !== "development") return null;

  const handleSetup = async () => {
    await fetch("/api/dev/setup", {
      method: "POST",
      body: JSON.stringify({ role, simulatedDate: date, simulatedPeriod: period }),
      headers: { "Content-Type": "application/json" }
    });
    router.push("/dashboard"); // Redirect to dashboard to see the context
  };

  const handleReset = async () => {
    await fetch("/api/dev/setup", {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
      headers: { "Content-Type": "application/json" }
    });
    router.refresh();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-50 flex flex-wrap gap-4 items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-sm font-bold text-yellow-400">LOCAL TEST MODE</div>
        
        <select className="bg-slate-800 border-slate-700 text-sm rounded px-2 py-1" value={role} onChange={e => setRole(e.target.value)}>
          <option value="OWNER">Director</option>
          <option value="SECRETARY">Secretary</option>
          <option value="TEACHER">Teacher</option>
          <option value="ACCOUNTANT">Accounting</option>
        </select>

        <select className="bg-slate-800 border-slate-700 text-sm rounded px-2 py-1" value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="">Auto Period (from Date)</option>
          <option value="Admission">Admission</option>
          <option value="Teaching">Teaching</option>
          <option value="Assessment">Assessment</option>
          <option value="Grade Entry">Grade Entry</option>
          <option value="Report Cards">Report Cards</option>
          <option value="Re-registration">Re-registration</option>
        </select>

        <input 
          type="date" 
          className="bg-slate-800 border-slate-700 text-sm rounded px-2 py-1" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleReset} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">↻ Reset</button>
        <button onClick={handleSetup} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-bold">Start Test &rarr; Dashboard</button>
      </div>
    </div>
  );
}
