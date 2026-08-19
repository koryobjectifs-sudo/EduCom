"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck, Undo2, Printer, Check, Loader2, X, TriangleAlert,
  Inbox, User, Clock,
} from "lucide-react";
import { returnReportCardsToTeacher, approveReportCards } from "../../grades/actions";

type Submission = {
  key: string;
  classId: string;
  className: string;
  termId: string;
  termName: string;
  evaluationId: string;
  evaluationName: string;
  teacher: string;
  submittedAt: string | null;
  returnedReason: string | null;
  counts: Record<string, number>;
  total: number;
};

function StatusBadge({ s }: { s: Submission }) {
  if (s.counts.SUBMITTED > 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
        À relire
      </span>
    );
  if (s.counts.RETURNED > 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
        Renvoyé
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
      Validé
    </span>
  );
}

export default function ValidationClient({ submissions }: { submissions: Submission[] }) {
  const router = useRouter();
  const [returning, setReturning] = useState<Submission | null>(null);
  const [reason, setReason] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const doReturn = async () => {
    if (!returning) return;
    setIsBusy(true);
    setError(null);
    const res = await returnReportCardsToTeacher(returning.classId, returning.evaluationId, reason);
    setIsBusy(false);
    if (res?.error) { setError(res.error); return; }
    setNotice(`${res.count} bulletin(s) renvoyés à l'enseignant.`);
    setReturning(null);
    setReason("");
    router.refresh();
  };

  const doApprove = async (s: Submission) => {
    setIsBusy(true);
    setNotice(null);
    const res = await approveReportCards(s.classId, s.evaluationId);
    setIsBusy(false);
    if (res?.error) { setNotice(res.error); return; }
    setNotice(`${res.count} bulletin(s) validés, prêts à imprimer.`);
    router.refresh();
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            Validation des bulletins
          </h1>
          <p className="mt-1 text-sm text-gray-500 max-w-2xl">
            Le travail déposé par les enseignants. Relisez, renvoyez pour correction si nécessaire,
            puis validez pour autoriser l'impression.
          </p>
        </div>
        <Link
          href="/dashboard/documents"
          className="text-sm text-gray-500 hover:text-gray-900 shrink-0"
        >
          ← Documents
        </Link>
      </div>

      {notice && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-2.5">
          <Check className="w-4 h-4 shrink-0" /> {notice}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">Aucun dépôt pour le moment.</p>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Les bulletins apparaîtront ici dès qu'un enseignant aura terminé sa saisie et déposé
            sa classe depuis l'écran de notes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => {
            const pending = s.counts.SUBMITTED > 0;
            const approved = s.counts.APPROVED > 0 && !pending && !s.counts.RETURNED;
            return (
              <div
                key={s.key}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-gray-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{s.className}</h3>
                    <StatusBadge s={s} />
                    <span className="text-sm text-gray-400">
                      {s.termName} · {s.evaluationName}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" /> {s.teacher}
                    </span>
                    <span>{s.total} bulletin(s)</span>
                    {s.submittedAt && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(s.submittedAt).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {s.returnedReason && s.counts.RETURNED > 0 && (
                    <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                      Motif du renvoi : {s.returnedReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pending && (
                    <>
                      <button
                        onClick={() => { setReturning(s); setReason(""); setError(null); }}
                        disabled={isBusy}
                        className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <Undo2 className="w-3.5 h-3.5" /> Renvoyer
                      </button>
                      <button
                        onClick={() => doApprove(s)}
                        disabled={isBusy}
                        className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Valider
                      </button>
                    </>
                  )}
                  {approved && (
                    <Link
                      href={`/dashboard/documents/validation/impression?classId=${s.classId}&termId=${s.termId}&evaluationId=${s.evaluationId}`}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimer
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogue de renvoi */}
      {returning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <h3 className="text-base font-semibold text-gray-900">Renvoyer pour correction</h3>
              <button onClick={() => setReturning(null)} className="text-gray-400 hover:bg-gray-200 hover:text-gray-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm text-gray-600">
              <p>
                Les <strong>{returning.total} bulletins</strong> de{" "}
                <strong>{returning.className}</strong> redeviendront modifiables par{" "}
                <strong>{returning.teacher}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motif du renvoi
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(null); }}
                  placeholder="Ex : moyennes de mathématiques à revoir en CM2…"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {error && (
                  <p className="mt-2 text-[13px] text-red-600 flex items-center gap-1.5">
                    <TriangleAlert className="w-3.5 h-3.5 shrink-0" /> {error}
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/40">
              <button
                onClick={() => setReturning(null)}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={doReturn}
                disabled={isBusy || !reason.trim()}
                className="px-4 py-2 text-[13px] font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-40 flex items-center gap-2"
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                Renvoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
