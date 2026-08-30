"use client";

import { useState } from "react";
import { justifyAbsence } from "./actions";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

export default function AbsenceForm({ attendanceId, studentName, dateStr }: { attendanceId: string, studentName: string, dateStr: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonType, setReasonType] = useState("Maladie");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    formData.append("attendanceId", attendanceId);
    
    const res = await justifyAbsence(formData);
    
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Une erreur est survenue.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center text-center p-6 space-y-4">
        <div className="rounded-full bg-success/10 p-3 text-success">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-text">Absence justifiée</h2>
        <p className="text-role-body text-text-soft">
          Merci, le motif de l'absence a bien été transmis au secrétariat. Vous pouvez fermer cette page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text mb-2">Justifier une absence</h2>
        <p className="text-role-body text-text-soft">
          Veuillez confirmer le motif de l'absence de <strong className="text-text">{studentName}</strong> pour la journée du <strong className="text-text">{dateStr}</strong>.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-control bg-danger/10 p-3 text-[13px] font-medium text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reasonType" className="block text-role-label font-medium text-text">
            Motif de l'absence <span className="text-danger">*</span>
          </label>
          <select
            id="reasonType"
            name="reasonType"
            value={reasonType}
            onChange={(e) => setReasonType(e.target.value)}
            className="w-full rounded-control border border-rule bg-surface px-3 py-2 text-role-body text-text placeholder-text-faint transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          >
            <option value="Maladie">Maladie / Santé</option>
            <option value="Raison familiale">Raison familiale</option>
            <option value="Transport / Intempérie">Transport / Intempérie</option>
            <option value="Autre">Autre motif</option>
          </select>
        </div>

        {reasonType === "Autre" && (
          <div className="space-y-1.5">
            <label htmlFor="reasonDetails" className="block text-role-label font-medium text-text">
              Précisez le motif
            </label>
            <input
              type="text"
              id="reasonDetails"
              name="reasonDetails"
              className="w-full rounded-control border border-rule bg-surface px-3 py-2 text-role-body text-text placeholder-text-faint transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Rendez-vous administratif"
            />
          </div>
        )}
      </div>

      <Button type="submit" loading={loading} block>
        Envoyer la justification
      </Button>

      <div className="flex items-center justify-center gap-2 pt-4 text-role-meta text-text-faint">
        <ShieldCheck className="h-4 w-4" />
        Lien sécurisé à usage unique
      </div>
    </form>
  );
}
