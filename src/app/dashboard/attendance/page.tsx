import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { getSchoolAttendanceStats, getAttendanceHistory } from "./actions";
import Link from "next/link";
import { ClipboardCheck, Users, CheckCircle2, Lock, ArrowRight, Sparkles } from "lucide-react";
import NotifyAbsenceButton from "./NotifyAbsenceButton";
import { teacherClassIds } from "@/lib/studentScope";
import { sortClasses } from "@/lib/classOrder";
import { AttendanceCelebration } from "@/components/attendance/AttendanceCelebration";
import { AttendanceHistoryView } from "@/components/attendance/AttendanceHistoryView";

export const metadata = {
  title: "Présences & Appel | EduCom",
  description: "Pointage quotidien de présence et registre d'appel inaltérable",
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    classId?: string;
    date?: string;
    celebrate?: string;
  }>;
}) {
  const { schoolId, user } = await requireSchoolContext();
  const role = user.role as any;
  const sp = await searchParams;

  const currentTab = sp.tab === "history" ? "history" : "today";

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // ── CHARGEMENT DE L'HISTORIQUE SI L'ONGLET HISTORIQUE EST DEMANDÉ ──
  if (currentTab === "history") {
    let allowedClassIds: string[] | null = null;
    if (role === "TEACHER") {
      allowedClassIds = await teacherClassIds({ schoolId, userId: user.id, role });
    }

    const [sessions, availableClasses] = await Promise.all([
      getAttendanceHistory({
        classId: sp.classId,
        date: sp.date,
      }),
      prisma.class.findMany({
        where: {
          schoolId,
          ...(allowedClassIds ? { id: { in: allowedClassIds } } : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const sortedClasses = sortClasses(availableClasses as any) as unknown as { id: string; name: string }[];

    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-20">
        <AttendanceCelebration />

        {/* En-tête et commutateur d'onglets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/60 pb-4">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text">Registre des Présences</h1>
            <p className="mt-1 text-[13px] text-text-soft">
              Historique inaltérable et officiel des registres d&apos;appel.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-rule/60 bg-surface-subtle p-1 shrink-0">
            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-text-soft hover:text-text transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
              <span>Appel du jour</span>
            </Link>

            <Link
              href="/dashboard/attendance?tab=history"
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs border border-rule/60 transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Historique inaltérable</span>
            </Link>
          </div>
        </div>

        <AttendanceHistoryView
          sessions={sessions}
          availableClasses={sortedClasses}
          initialClassId={sp.classId}
          initialDate={sp.date}
        />
      </div>
    );
  }

  // ── VUE ENSEIGNANT (Appel du jour avec disparition des classes validées) ──
  if (role === "TEACHER") {
    const classIds = await teacherClassIds({ schoolId, userId: user.id, role });
    const classes = classIds.length > 0
      ? sortClasses(await prisma.class.findMany({ where: { id: { in: classIds }, schoolId } }))
      : [];

    // Détection stricte des classes dont l'appel est DÉJÀ complété aujourd'hui
    const recordedToday = await prisma.attendance.groupBy({
      by: ["classId"],
      where: {
        schoolId,
        date: now,
        classId: { in: classIds },
      },
    });
    const recordedSet = new Set(recordedToday.map((r) => r.classId));

    // La classe validée disparaît pour le jour-même !
    const pendingClasses = classes.filter((c) => !recordedSet.has(c.id));
    const completedClasses = classes.filter((c) => recordedSet.has(c.id));

    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-20">
        <AttendanceCelebration />

        {/* En-tête et commutateur d'onglets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/60 pb-4">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text">Appel du jour</h1>
            <p className="mt-1 text-[13px] text-text-soft">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-rule/60 bg-surface-subtle p-1 shrink-0">
            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs border border-rule/60 transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
              <span>Appel du jour</span>
              {pendingClasses.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary tabular-nums">
                  {pendingClasses.length}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/attendance?tab=history"
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-text-soft hover:text-text transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Historique inaltérable</span>
            </Link>
          </div>
        </div>

        {/* Classes en attente d'appel */}
        {pendingClasses.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-soft">
                Classes en attente ({pendingClasses.length})
              </h2>
              <span className="text-[11px] text-text-soft">Chaque classe validée disparaît du jour</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {pendingClasses.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/attendance/take?classId=${c.id}`}
                  className="group relative rounded-xl border border-rule/60 bg-surface p-5 shadow-2xs transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="rounded-xl bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text group-hover:text-primary transition-colors">
                          {c.name}
                        </h3>
                        <p className="text-[12px] text-text-soft mt-0.5">Pointage en attente</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      Faire l&apos;appel →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : classes.length > 0 ? (
          /* Célébration complète quand toutes les classes du jour sont terminées */
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-surface p-8 text-center shadow-sm space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 ring-4 ring-emerald-500/10 animate-pulse">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-lg font-bold text-text">Tous les appels sont terminés aujourd&apos;hui ! 🎉</h2>
              <p className="text-xs text-text-soft">
                Bravo, l&apos;appel a été validé pour vos {classes.length} classes. Toutes les présences sont enregistrées et scellées dans l&apos;historique officiel.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard/attendance?tab=history"
                className="inline-flex items-center gap-2 rounded-control bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                Consulter l&apos;historique inaltérable
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-rule/40 p-8 text-center bg-surface/50">
            <p className="text-[13px] text-text-soft">Vous n&apos;avez aucune classe assignée.</p>
          </div>
        )}

        {/* Classes déjà complétées aujourd'hui (scellées) */}
        {completedClasses.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-rule/50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-soft">
                Appels déjà validés aujourd&apos;hui ({completedClasses.length})
              </h3>
              <Link
                href="/dashboard/attendance?tab=history"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Voir le registre officiel</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {completedClasses.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-text">{c.name}</span>
                      <p className="text-[11px] text-emerald-700 font-medium">Validé · Scellé</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Lock className="h-2.5 w-2.5" /> Inaltérable
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── VUE DIRECTION & SECRÉTARIAT (Appel du jour + Synthèse + Absences) ──
  const stats = await getSchoolAttendanceStats(now);
  const allClasses = sortClasses(
    await prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } })
  );

  const recordedClassIds = (
    await prisma.attendance.groupBy({
      by: ["classId"],
      where: { schoolId, date: now },
    })
  ).map((x) => x.classId);

  // Les classes validées disparaissent de la liste d'attente
  const pendingClasses = allClasses.filter((c) => !recordedClassIds.includes(c.id));
  const completedClasses = allClasses.filter((c) => recordedClassIds.includes(c.id));

  const dailyAbsences = await prisma.attendance.findMany({
    where: { schoolId, date: now, status: "ABSENT" },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      class: { select: { name: true } },
    },
    orderBy: [
      { class: { name: "asc" } },
      { student: { lastName: "asc" } },
    ],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <AttendanceCelebration />

      {/* En-tête et commutateur d'onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/60 pb-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-text">Opérations Quotidiennes</h1>
          <p className="mt-1 text-[13px] text-text-soft">
            Situation des présences pour aujourd&apos;hui ({now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })})
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-rule/60 bg-surface-subtle p-1 shrink-0">
          <Link
            href="/dashboard/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs border border-rule/60 transition-colors"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
            <span>Appel du jour</span>
            {pendingClasses.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary tabular-nums">
                {pendingClasses.length}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/attendance?tab=history"
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-text-soft hover:text-text transition-colors"
          >
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Historique inaltérable</span>
          </Link>
        </div>
      </div>

      {/* KPIs du jour */}
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
        {/* Classes en attente (disparaissent une fois validées) */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-text-soft">
              Classes en attente ({pendingClasses.length})
            </h2>
            <span className="text-[11px] text-text-soft">Disparaît après l&apos;appel</span>
          </div>

          <div className="space-y-2">
            {pendingClasses.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-rule/30 bg-surface/50 p-3">
                <span className="text-[13px] font-semibold text-text">{c.name}</span>
                <Link
                  href={`/dashboard/attendance/take?classId=${c.id}`}
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  Faire l&apos;appel →
                </Link>
              </div>
            ))}
            {pendingClasses.length === 0 && (
              <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-center text-success">
                <ClipboardCheck className="mx-auto mb-2 h-6 w-6" />
                <p className="text-[13px] font-semibold">Toutes les classes ont terminé pour aujourd&apos;hui !</p>
                <Link
                  href="/dashboard/attendance?tab=history"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-success hover:underline font-bold"
                >
                  <span>Consulter l&apos;historique officiel</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Détail des absences */}
        <div>
          <h2 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-text-soft">Détail des Absences</h2>
          <div className="space-y-2">
            {dailyAbsences.map((a) => (
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
                <p className="text-[13px] text-text-soft">Aucune absence signalée pour le moment aujourd&apos;hui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
