"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceBatch, type AttendanceInput } from "../actions";
import { type AttendanceStatus } from "@/generated/prisma/client";
import { Check, X, Clock, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// For the UI, we only support PRESENT, ABSENT, LATE.
// EXCUSED is a sub-state we can add later if needed.

type DataRow = {
  student: { id: string; firstName: string; lastName: string; matricule: string | null };
  attendance: { status: string; reason: string | null } | null;
};

export function TakeAttendanceClient({
  classId,
  className,
  date,
  initialData
}: {
  classId: string;
  className: string;
  date: string;
  initialData: DataRow[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [records, setRecords] = useState<Record<string, AttendanceInput>>(() => {
    const init: Record<string, AttendanceInput> = {};
    for (const row of initialData) {
      if (row.attendance) {
        init[row.student.id] = {
          studentId: row.student.id,
          status: row.attendance.status as AttendanceStatus,
          reason: row.attendance.reason
        };
      } else {
        // Default to PRESENT for speedy entry
        init[row.student.id] = {
          studentId: row.student.id,
          status: "PRESENT" as AttendanceStatus,
          reason: null
        };
      }
    }
    return init;
  });

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    const next = { ...records };
    for (const key in next) {
      next[key].status = status;
    }
    setRecords(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const arr = Object.values(records) as AttendanceInput[];
      await saveAttendanceBatch(classId, new Date(date), arr);
      toast.success("Présences enregistrées avec succès");
      router.push("/dashboard/attendance");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/attendance" className="inline-flex items-center gap-2 text-[13px] font-medium text-text-soft hover:text-text">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => markAll("PRESENT" as AttendanceStatus)} className="rounded-control bg-surface px-3 py-1.5 text-[12px] font-medium border hover:bg-rule/10 transition-colors">
            Tous présents
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-rule/40 bg-surface shadow-sm">
        <div className="divide-y divide-rule/20">
          {initialData.map((row) => {
            const current = records[row.student.id];
            
            return (
              <div key={row.student.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors hover:bg-rule/5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${current.status === "PRESENT" ? "bg-success/10 text-success" : current.status === "ABSENT" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning-dark"}`}>
                    {row.student.firstName[0]}{row.student.lastName[0]}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-text">{row.student.firstName} {row.student.lastName}</div>
                    {row.student.matricule && <div className="text-[12px] text-text-soft">Matricule: {row.student.matricule}</div>}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => updateStatus(row.student.id, "PRESENT" as AttendanceStatus)}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${current.status === "PRESENT" ? "border-success bg-success/10 text-success" : "border-rule/40 text-text-soft hover:bg-rule/10"}`}
                  >
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Présent</span>
                  </button>
                  <button
                    onClick={() => updateStatus(row.student.id, "ABSENT" as AttendanceStatus)}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${current.status === "ABSENT" ? "border-danger bg-danger/10 text-danger" : "border-rule/40 text-text-soft hover:bg-rule/10"}`}
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Absent</span>
                  </button>
                  <button
                    onClick={() => updateStatus(row.student.id, "LATE" as AttendanceStatus)}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${current.status === "LATE" ? "border-warning-dark bg-warning/10 text-warning-dark" : "border-rule/40 text-text-soft hover:bg-rule/10"}`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Retard</span>
                  </button>
                </div>
              </div>
            );
          })}

          {initialData.length === 0 && (
            <div className="p-8 text-center text-[13px] text-text-soft">
              Aucun élève inscrit dans cette classe.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving || initialData.length === 0}
          className="flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-6 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enregistrer les présences
        </button>
      </div>
    </div>
  );
}
