"use client";

import { useState, useMemo } from "react";
import type { AttendanceHistorySession } from "@/app/dashboard/attendance/actions";
import {
  Lock,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
} from "lucide-react";

interface AttendanceHistoryViewProps {
  sessions: AttendanceHistorySession[];
  availableClasses: { id: string; name: string }[];
  initialClassId?: string;
  initialDate?: string;
}

export function AttendanceHistoryView({
  sessions,
  availableClasses,
  initialClassId = "",
  initialDate = "",
}: AttendanceHistoryViewProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>(() => {
    // Par défaut, développer la première session si disponible
    if (sessions.length > 0) {
      return { [sessions[0].sessionId]: true };
    }
    return {};
  });

  const toggleSession = (sessionId: string) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const setQuickDate = (mode: "today" | "yesterday" | "week" | "all") => {
    const today = new Date();
    if (mode === "today") {
      setSelectedDate(today.toISOString().split("T")[0]);
    } else if (mode === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(yesterday.toISOString().split("T")[0]);
    } else if (mode === "all") {
      setSelectedDate("");
    }
  };

  // Filtrage côté client
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedClassId && s.classId !== selectedClassId) return false;
      if (selectedDate && s.date !== selectedDate) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesClass = s.className.toLowerCase().includes(query);
        const matchesTeacher = s.recordedBy.toLowerCase().includes(query);
        const matchesStudent = s.records.some(
          (r) =>
            r.firstName.toLowerCase().includes(query) ||
            r.lastName.toLowerCase().includes(query) ||
            (r.matricule && r.matricule.toLowerCase().includes(query))
        );
        if (!matchesClass && !matchesTeacher && !matchesStudent) return false;
      }
      return true;
    });
  }, [sessions, selectedClassId, selectedDate, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ── BANDEAU DE CONFORMITÉ & INALTÉRABILITÉ ── */}
      <div className="rounded-xl border border-rule/60 bg-surface p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text">Registre officiel & Historique d&apos;appel</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> Inaltérable
                </span>
              </div>
              <p className="text-xs text-text-soft mt-0.5">
                Chaque registre validé fait foi officielle et ne peut plus être altéré afin de garantir l&apos;intégrité des bulletins et bilans scolaires.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-semibold text-text-soft tabular-nums">
              {filteredSessions.length} séance{filteredSessions.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTRES (Classe, Date, Recherche) ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rule/60 bg-surface p-3.5 shadow-2xs">
        {/* Filtre Classe */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
          <Users className="h-4 w-4 text-text-soft shrink-0" />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-9 w-full rounded-control border border-rule bg-surface px-2.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
          >
            <option value="">Toutes les classes ({availableClasses.length})</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre Date */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[170px]">
          <Calendar className="h-4 w-4 text-text-soft shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 w-full rounded-control border border-rule bg-surface px-2.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
          />
        </div>

        {/* Raccourcis de date rapide */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQuickDate("today")}
            className="rounded-control border border-rule/60 bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-text hover:bg-rule/20 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={() => setQuickDate("yesterday")}
            className="rounded-control border border-rule/60 bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-text hover:bg-rule/20 transition-colors"
          >
            Hier
          </button>
          <button
            type="button"
            onClick={() => setQuickDate("all")}
            className="rounded-control border border-rule/60 bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-text hover:bg-rule/20 transition-colors"
          >
            Tout
          </button>
        </div>

        {/* Recherche par élève */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-soft" />
          <input
            type="text"
            placeholder="Rechercher un élève, classe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-control border border-rule bg-surface pl-8 pr-3 text-xs text-text placeholder:text-text-soft focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* ── LISTE DES SÉANCES D'APPEL ── */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rule bg-surface/50 p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-text-soft mb-2" />
          <h3 className="text-sm font-semibold text-text">Aucun registre d&apos;appel trouvé</h3>
          <p className="mt-1 text-xs text-text-soft">
            Aucun enregistrement ne correspond aux filtres sélectionnés. Modifiez la date ou la classe pour consulter d&apos;autres séances.
          </p>
          {(selectedClassId || selectedDate || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedClassId("");
                setSelectedDate("");
                setSearchTerm("");
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const isExpanded = !!expandedSessionIds[session.sessionId];
            const dateFormatted = new Date(session.date + "T00:00:00").toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const recordedTime = new Date(session.recordedAt).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={session.sessionId}
                className="overflow-hidden rounded-xl border border-rule/60 bg-surface shadow-2xs transition-all hover:border-rule/80"
              >
                {/* En-tête de la séance */}
                <div
                  onClick={() => toggleSession(session.sessionId)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text">{session.className}</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold text-text-soft border border-rule/50">
                        {session.cycle || "Enseignement"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Lock className="h-2.5 w-2.5" /> Scellé
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-soft">
                      <span className="capitalize font-medium text-text">{dateFormatted}</span>
                      <span>•</span>
                      <span>Enregistré à {recordedTime}</span>
                      <span>•</span>
                      <span>Par {session.recordedBy}</span>
                    </div>
                  </div>

                  {/* Résumé chiffré et toggle */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {session.presentCount} présent{session.presentCount > 1 ? "s" : ""}
                      </span>

                      {session.absentCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700">
                          <XCircle className="h-3 w-3" />
                          {session.absentCount} absent{session.absentCount > 1 ? "s" : ""}
                        </span>
                      )}

                      {session.lateCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700">
                          <Clock className="h-3 w-3" />
                          {session.lateCount} retard{session.lateCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="text-right hidden md:block">
                      <div className="text-xs font-bold text-text tabular-nums">{session.attendanceRate}%</div>
                      <div className="text-[10px] text-text-soft">Assiduité</div>
                    </div>

                    <button
                      type="button"
                      className="p-1 rounded-control text-text-soft hover:text-text hover:bg-rule/10 transition-colors"
                      aria-label={isExpanded ? "Masquer la liste" : "Afficher la liste"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Détail de la liste nominative (Inaltérable / Non modifiable) */}
                {isExpanded && (
                  <div className="border-t border-rule/40 bg-surface-subtle/30 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-text-soft">
                      <span className="font-semibold text-text uppercase tracking-wider text-[11px]">
                        Liste d&apos;appel officielle ({session.records.length} élèves inscrits)
                      </span>
                      <span className="italic text-[11px] text-text-soft hidden sm:inline">
                        Mode consultation active · Registre scellé
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-rule/50 bg-surface">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-rule/50 bg-surface-subtle/50 text-[11px] font-semibold text-text-soft uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Élève</th>
                            <th className="py-2.5 px-3">Matricule</th>
                            <th className="py-2.5 px-3">Statut officiel</th>
                            <th className="py-2.5 px-3">Motif / Justification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rule/30">
                          {session.records.map((r, i) => (
                            <tr key={r.id} className="hover:bg-surface-subtle/40 transition-colors">
                              <td className="py-2 px-3 text-text-soft tabular-nums">{i + 1}</td>
                              <td className="py-2 px-3 font-semibold text-text">
                                {r.lastName.toUpperCase()} {r.firstName}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-text-soft">
                                {r.matricule || "—"}
                              </td>
                              <td className="py-2 px-3">
                                {r.status === "PRESENT" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> Présent
                                  </span>
                                )}
                                {r.status === "ABSENT" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                                    <XCircle className="h-3 w-3" /> Absent
                                  </span>
                                )}
                                {r.status === "LATE" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                    <Clock className="h-3 w-3" /> En retard
                                  </span>
                                )}
                                {r.status === "EXCUSED" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                    <ShieldCheck className="h-3 w-3" /> Justifié
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-text-soft italic text-[11px]">
                                {r.reason || (r.status === "PRESENT" ? "Présence confirmée" : "Aucun motif enregistré")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-text-soft flex items-center gap-1.5 pt-1">
                      <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>
                        Ce registre d&apos;appel a été validé et scellé. Aucune modification ne peut y être apportée rétroactivement.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
