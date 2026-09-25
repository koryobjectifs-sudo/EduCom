import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { teacherClassIds } from "@/lib/studentScope";
import { getAttendanceForClass } from "../actions";
import { TakeAttendanceClient } from "./TakeAttendanceClient";
import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

export default async function TakeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const { schoolId, user } = await requireSchoolContext();
  const sp = await searchParams;
  
  if (!sp.classId) {
    redirect("/dashboard/attendance");
  }

  const classId = sp.classId;

  if (user.role === "TEACHER") {
    const teacherClasses = await teacherClassIds({
      schoolId,
      userId: user.id,
      role: user.role,
    });
    if (!teacherClasses.includes(classId)) {
      redirect("/dashboard/attendance");
    }
  }

  const targetClass = await prisma.class.findFirst({
    where: { id: classId, schoolId }
  });

  if (!targetClass) {
    redirect("/dashboard/attendance");
  }

  const date = sp.date ? new Date(sp.date) : new Date();
  date.setHours(0, 0, 0, 0);
  
  const data = await getAttendanceForClass(classId, date);

  // Vérifier si l'appel a déjà été enregistré pour ce jour
  const isAlreadyRecorded = data.length > 0 && data.some((d) => d.attendance !== null);

  if (isAlreadyRecorded) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-20 pt-8">
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-surface p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 ring-4 ring-emerald-500/10">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              <Lock className="h-3 w-3" /> Registre validé &amp; inaltérable
            </span>
            <h1 className="text-lg font-bold text-text pt-2">
              L&apos;appel de {targetClass.name} a déjà été validé
            </h1>
            <p className="text-xs text-text-soft max-w-md mx-auto">
              L&apos;appel pour le {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} a déjà été enregistré. Conformément au règlement scolaire, ce registre est scellé et ne peut plus être modifié.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href={`/dashboard/attendance?tab=history&classId=${classId}`}
              className="inline-flex items-center gap-2 rounded-control bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" />
              Consulter dans l&apos;historique
            </Link>

            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center gap-2 rounded-control border border-rule bg-surface px-4 py-2.5 text-xs font-medium text-text hover:bg-surface-subtle transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux classes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-text">Saisie des présences</h1>
        <p className="mt-1 text-[13px] text-text-soft">
          Classe : <span className="font-semibold text-text">{targetClass.name}</span> — {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <TakeAttendanceClient 
        classId={classId} 
        className={targetClass.name}
        date={date.toISOString()}
        initialData={data} 
      />
    </div>
  );
}
