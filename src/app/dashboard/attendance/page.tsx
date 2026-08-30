import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { getSchoolAttendanceStats } from "./actions";
import Link from "next/link";
import { ClipboardCheck, FileWarning, Clock, Users } from "lucide-react";
import { hasAccess } from "@/lib/permissions";
import NotifyAbsenceButton from "./NotifyAbsenceButton";

export default async function AttendancePage() {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as any;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // If TEACHER, we show their assigned classes
  if (role === "TEACHER") {
    const assignments = await prisma.teachingAssignment.findMany({
      where: { teacherId: user.id },
      include: { class: true }
    });
    
    // Also consider them as a main teacher if Class.teacherId = user.id
    const primaryClasses = await prisma.class.findMany({
      where: { teacherId: user.id, schoolId }
    });

    const classMap = new Map();
    assignments.forEach(a => classMap.set(a.classId, a.class));
    primaryClasses.forEach(c => classMap.set(c.id, c));
    
    const classes = Array.from(classMap.values());

    return (
      <div className="mx-auto max-w-3xl space-y-8 pb-20">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-text">Présence du jour</h1>
          <p className="mt-1 text-[13px] text-text-soft">Sélectionnez une classe pour enregistrer l'appel.</p>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map(c => (
            <Link key={c.id} href={`/dashboard/attendance/take?classId=${c.id}`} className="group relative rounded-xl border border-rule/40 bg-surface p-5 shadow-sm transition-all hover:border-rule/80 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text">{c.name}</h3>
                  <p className="text-[13px] text-text-soft">Prendre l'appel</p>
                </div>
              </div>
            </Link>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full rounded-xl border border-rule/40 p-8 text-center bg-surface/50">
              <p className="text-[13px] text-text-soft">Vous n'avez aucune classe assignée.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Otherwise, DIRECTOR / SECRETARY View
  const stats = await getSchoolAttendanceStats(now);
  const isComplete = stats.classesRecorded >= stats.totalClasses && stats.totalClasses > 0;

  // Let's also fetch pending classes for Attention
  const allClasses = await prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
  
  const recordedClassIds = (await prisma.attendance.groupBy({
    by: ["classId"],
    where: { schoolId, date: now }
  })).map(x => x.classId);
  
  const pendingClasses = allClasses.filter(c => !recordedClassIds.includes(c.id));

  const dailyAbsences = await prisma.attendance.findMany({
    where: { schoolId, date: now, status: "ABSENT" },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      class: { select: { name: true } },
    },
    orderBy: [
      { class: { name: "asc" } },
      { student: { lastName: "asc" } }
    ]
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-text">Opérations Quotidiennes</h1>
        <p className="mt-1 text-[13px] text-text-soft">
          Situation des présences pour aujourd'hui ({now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-rule/40 bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-text-soft">Complétion</span>
            <span className="text-2xl font-bold text-text">
              {stats.totalClasses > 0 ? Math.round((stats.classesRecorded / stats.totalClasses) * 100) : 0}%
            </span>
            <span className="text-[12px] text-text-soft">{stats.classesRecorded} / {stats.totalClasses} classes</span>
          </div>
        </div>
        
        <div className="rounded-xl border border-rule/40 bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-success">Présents</span>
            <span className="text-2xl font-bold text-success">{stats.stats.present}</span>
          </div>
        </div>

        <div className="rounded-xl border border-danger/20 bg-danger/5 p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-danger">Absents</span>
            <span className="text-2xl font-bold text-danger">{stats.stats.absent}</span>
          </div>
        </div>

        <div className="rounded-xl border border-warning/20 bg-warning/5 p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-warning-dark">Retards</span>
            <span className="text-2xl font-bold text-warning-dark">{stats.stats.late}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-text-soft">Classes en attente ({pendingClasses.length})</h2>
          <div className="space-y-2">
            {pendingClasses.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-rule/30 bg-surface/50 p-3">
                <span className="text-[13px] font-semibold text-text">{c.name}</span>
                <Link href={`/dashboard/attendance/take?classId=${c.id}`} className="text-[12px] font-medium text-primary hover:underline">
                  Prendre l'appel
                </Link>
              </div>
            ))}
            {pendingClasses.length === 0 && (
              <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-center text-success">
                <ClipboardCheck className="mx-auto mb-2 h-6 w-6" />
                <p className="text-[13px] font-semibold">Toutes les classes ont terminé.</p>
              </div>
            )}
          </div>
        </div>

        <div>
           <h2 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-text-soft">Détail des Absences</h2>
           <div className="space-y-2">
             {dailyAbsences.map(a => (
               <div key={a.id} className="flex items-center justify-between rounded-lg border border-rule/30 bg-surface/50 p-3">
                 <div className="flex items-center gap-3">
                   <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${a.status === "ABSENT" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning-dark"}`}>
                     {a.student.firstName[0]}{a.student.lastName[0]}
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[13px] font-semibold text-text">{a.student.firstName} {a.student.lastName}</span>
                     <span className="text-[11px] font-medium text-text-soft">{a.class.name} • Absent</span>
                   </div>
                 </div>
                 <NotifyAbsenceButton 
                   attendanceId={a.id} 
                   studentName={`${a.student.firstName} ${a.student.lastName}`}
                   dateStr={now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                 />
               </div>
             ))}
             {dailyAbsences.length === 0 && (
               <div className="rounded-xl border border-rule/40 p-8 text-center bg-surface/50">
                 <p className="text-[13px] text-text-soft">Aucune absence signalée pour le moment aujourd'hui.</p>
               </div>
             )}
           </div>
        </div>
      </div>

    </div>
  );
}
