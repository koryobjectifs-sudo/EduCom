"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PartyPopper, Printer, Send, Lock, ArrowLeft, Check, TriangleAlert,
  Loader2, X, ShieldCheck, CircleDashed,
} from "lucide-react";
import { submitClassWithPassword } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

type Summary = {
  className: string;
  termName: string;
  evaluationName: string;
  subjectCount: number;
  students: { id: string; firstName: string; lastName: string; status: string; filled: number }[];
  classAverage: number | null;
  alreadySubmitted: boolean;
};

/** Petites pastilles de confettis, purement décoratives. */
function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="absolute block rounded-sm animate-[confetti_2.6s_ease-in_forwards]"
          style={{
            left: `${(i * 37) % 100}%`,
            top: "-8%",
            width: i % 3 === 0 ? 8 : 6,
            height: i % 4 === 0 ? 12 : 6,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.12}s`,
            transform: `rotate(${(i * 47) % 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0%   { opacity: 0; transform: translateY(-10px) rotate(0deg); }
          10%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(80vh) rotate(540deg); }
        }
      `}</style>
    </div>
  );
}

export default function CompletionClient({
  summary, classId, termId, evaluationId,
}: {
  summary: Summary; classId: string; termId: string; evaluationId: string;
}) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(summary.alreadySubmitted);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3200);
    return () => clearTimeout(t);
  }, []);

  const total = summary.students.length;
  const validated = summary.students.filter((s) =>
    ["VALIDATED", "SUBMITTED", "APPROVED"].includes(s.status)
  ).length;
  const incomplete = summary.students.filter((s) => s.filled < summary.subjectCount);
  const allValidated = total > 0 && validated === total;

  const confirmSubmit = async () => {
    setIsBusy(true);
    setError(null);
    const res = await submitClassWithPassword(classId, termId, evaluationId, password);
    setIsBusy(false);
    if (res?.error) { setError(res.error); return; }
    setPassword("");
    setDialog(false);
    setSubmitted(true);
    setShowConfetti(true);
    router.refresh();
  };

  return (
    <div className="relative min-h-full pb-12">
      {showConfetti && <Confetti />}

      <div className="max-w-3xl mx-auto pt-10">
        {/* En-tête de célébration */}
        <div className="text-center mb-8">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
            submitted ? "bg-emerald-50" : "bg-indigo-50"
          }`}>
            {submitted ? (
              <ShieldCheck className="w-10 h-10 text-emerald-600" />
            ) : (
              <PartyPopper className="w-10 h-10 text-indigo-600" />
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            {submitted ? "Bulletins déposés au secrétariat" : "Saisie terminée, bravo !"}
          </h1>
          <p className="mt-2 text-gray-500">
            {submitted ? (
              <>Le secrétariat peut désormais relire et imprimer. Vos bulletins sont verrouillés.</>
            ) : (
              <>
                Vous avez parcouru les <strong>{total} élèves</strong> de{" "}
                <strong>{summary.className}</strong>.
              </>
            )}
          </p>
        </div>

        {/* Chiffres clés */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-gray-900 tabular-nums">{validated}<span className="text-lg text-gray-300">/{total}</span></div>
            <div className="mt-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Bulletins validés</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-indigo-600 tabular-nums">
              {summary.classAverage === null ? "--" : summary.classAverage.toFixed(2)}
            </div>
            <div className="mt-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Moyenne de classe</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-gray-900 tabular-nums">{summary.subjectCount}</div>
            <div className="mt-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Matières</div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mb-8">
          {summary.className} · {summary.termName} · {summary.evaluationName}
        </p>

        {/* Avertissements avant dépôt */}
        {!submitted && !allValidated && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-900">
            <TriangleAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>{total - validated} bulletin(s) ne sont pas validés.</strong>
              <p className="mt-0.5 text-amber-800">
                Le dépôt au secrétariat exige que tous les élèves soient validés. Reprenez la saisie
                pour verrouiller les bulletins restants.
              </p>
            </div>
          </div>
        )}

        {!submitted && incomplete.length > 0 && (
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 text-sm text-gray-700">
            <CircleDashed className="w-5 h-5 shrink-0 text-gray-400 mt-0.5" />
            <div>
              <strong>{incomplete.length} élève(s) ont des matières non saisies.</strong>
              <p className="mt-0.5 text-gray-500">
                {incomplete.slice(0, 5).map((s) => `${s.firstName} ${s.lastName}`).join(", ")}
                {incomplete.length > 5 && ` et ${incomplete.length - 5} autre(s)`}. Ces bulletins
                resteront signalés comme incomplets à l'impression.
              </p>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setDialog(true)}
            disabled={!allValidated || submitted}
            className="group bg-gray-900 text-white rounded-2xl p-5 text-left hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            title={submitted ? "Déjà déposé" : allValidated ? undefined : "Validez d'abord tous les élèves"}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <Send className="w-5 h-5" />
              <span className="font-semibold">
                {submitted ? "Déjà envoyé" : "Envoyer au secrétariat"}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              Dépôt signé par mot de passe. Les bulletins deviennent non modifiables.
            </p>
          </button>

          <Link
            href={`/dashboard/grades/report-card?classId=${classId}&termId=${termId}`}
            className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-1.5">
              <Printer className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-900">Imprimer les bulletins</span>
            </div>
            <p className="text-sm text-gray-500">
              Ouvrir le générateur de bulletins pour cette classe.
            </p>
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          <Link href="/dashboard/grades" className="text-gray-500 hover:text-gray-900 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Retour à la saisie
          </Link>
        </div>
      </div>

      {/* Dialogue de dépôt signé */}
      <Modal
        open={dialog}
        onClose={() => { setDialog(false); setError(null); }}
        title="Confirmer le dépôt"
        dismissible={!isBusy}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDialog(false); setError(null); }} disabled={isBusy}>
              Annuler
            </Button>
            <Button
              onClick={confirmSubmit}
              loading={isBusy}
              disabled={isBusy || !password}
              icon={<Check aria-hidden="true" className="w-4 h-4" />}
            >
              Signer et déposer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>
            Vous déposez les <strong>{total} bulletins</strong> de <strong>{summary.className}</strong>{" "}
            ({summary.termName} · {summary.evaluationName}) au secrétariat.
          </p>
          <div className="bg-warning/10 border border-warning/30 rounded-control p-3.5 text-warning text-role-label">
            Après ce dépôt, <strong>plus personne ne peut modifier ces bulletins</strong> — vous
            y compris. Seule la direction pourra vous les renvoyer pour correction.
          </div>

          {/* `error` est passé au champ : le message est relié par
              aria-describedby au lieu d'être un paragraphe rouge isolé. */}
          <Input
            label="Saisissez votre mot de passe pour signer"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && password && !isBusy) confirmSubmit(); }}
            placeholder="••••••••"
            error={error}
          />
        </div>
      </Modal>
    </div>
  );
}
