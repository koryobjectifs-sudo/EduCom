"use client";

import { useState } from "react";
import {
  X,
  Star,
  CheckCircle2,
  Sparkles,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import {
  METIERS_FORM,
  MODULES_FORM,
  CHOIX_FACILITE,
  CHOIX_QUALITE,
  CHOIX_CONFUSION,
} from "@/lib/tester-quiz";
import { submitTesterFeedbackAction } from "@/app/dashboard/settings/feedback-actions";
import { toast } from "sonner";

interface ModalQuizTesteurProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: string;
  onSubmitted?: () => void;
}

export default function ModalQuizTesteur({
  isOpen,
  onClose,
  defaultRole = "DIRECTEUR",
  onSubmitted,
}: ModalQuizTesteurProps) {
  const [role, setRole] = useState(defaultRole);
  const [testerName, setTesterName] = useState("");
  const [moduleTeste, setModuleTeste] = useState("pedagogie");
  const [facilite, setFacilite] = useState("tres_facile");
  const [qualite, setQualite] = useState("excellent");
  const [confusions, setConfusions] = useState<string[]>(["aucune"]);
  const [overallRating, setOverallRating] = useState(5);
  const [suggestion, setSuggestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const metierLabel =
    METIERS_FORM.find((m) => m.role === role)?.label || "Directeur / Fondateur";

  const toggleConfusion = (id: string) => {
    if (id === "aucune") {
      setConfusions(["aucune"]);
    } else {
      const sansAucune = confusions.filter((c) => c !== "aucune");
      if (sansAucune.includes(id)) {
        const reste = sansAucune.filter((c) => c !== id);
        setConfusions(reste.length === 0 ? ["aucune"] : reste);
      } else {
        setConfusions([...sansAucune, id]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await submitTesterFeedbackAction({
        role,
        testerName: testerName.trim() || undefined,
        metierLabel,
        overallRating,
        generalVerdict:
          CHOIX_FACILITE.find((f) => f.id === facilite)?.label.split("(")[0].trim() ||
          "Très facile",
        topPriorityChange: suggestion.trim() || undefined,
        modulesFeedback: {
          [moduleTeste]: {
            rating: overallRating,
            facilite,
            qualite,
            confusions,
            suggestion: suggestion.trim() || undefined,
          },
        },
      });

      if (res.success) {
        setIsFinished(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("educom_quiz_completed", "true");
        }
        toast.success("Merci pour vos réponses !", {
          description: "Votre retour a bien été enregistré.",
        });
        if (onSubmitted) onSubmitted();
      } else {
        toast.error(res.error || "Erreur lors de l'envoi.");
      }
    } catch {
      toast.error("Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* En-tête type Google Form épuré */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-purple-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Évaluation Testeur</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  1 min chrono
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Quelques questions rapides pour perfectionner l&apos;application
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenu Formulaire ou Célébration */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 relative">
          {isFinished ? (
            <div className="py-6 text-center space-y-4 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Particules Confettis festives en cascade */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                {[...Array(28)].map((_, i) => {
                  const left = (i * 3.7) % 100;
                  const delay = (i * 0.08) % 1.5;
                  const colors = [
                    "bg-amber-400",
                    "bg-purple-600",
                    "bg-emerald-500",
                    "bg-pink-500",
                    "bg-sky-400",
                    "bg-indigo-500",
                  ];
                  const color = colors[i % colors.length];
                  return (
                    <span
                      key={i}
                      className={`absolute top-0 w-2.5 h-2.5 rounded-full ${color} opacity-80 animate-bounce`}
                      style={{
                        left: `${left}%`,
                        animationDelay: `${delay}s`,
                        animationDuration: `${1.2 + (i % 5) * 0.3}s`,
                        transform: `rotate(${i * 25}deg)`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Trophée étincelant avec halo doré */}
              <div className="relative inline-flex items-center justify-center h-20 w-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 shadow-xl ring-8 ring-amber-100/70">
                <span className="text-3xl select-none">🏆</span>
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold shadow-md">
                  ✨
                </span>
              </div>

              {/* Titre et Message de Gratitude & Motivation */}
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">
                  Félicitations & Grand Merci !
                </h4>
                <p className="text-xs text-purple-950 font-semibold bg-purple-50/80 px-3 py-1 rounded-full inline-block border border-purple-200/70">
                  Votre retour en tant que {metierLabel} est précieux
                </p>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Grâce à votre contribution, EduCom devient chaque jour plus simple, plus rapide et parfaitement adapté aux exigences réelles de nos écoles au Sénégal.
                </p>
              </div>

              {/* Carte Récapitulative Valorisante */}
              <div className="max-w-sm mx-auto p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-left text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Statut de votre avis :</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                    <CheckCircle2 className="h-3 w-3" /> Transmis & Enregistré
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Note globale accordée :</span>
                  <div className="flex items-center text-amber-500">
                    {[...Array(overallRating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                    ))}
                    <span className="ml-1 font-bold text-slate-800 text-[11px]">({overallRating}/5)</span>
                  </div>
                </div>
              </div>

              {/* Bouton de clôture festif */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Continuer sur EduCom →
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Question 1 : Rôle / Métier (Dropdown + Nom) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <label htmlFor="user-role-select" className="block text-xs font-bold text-slate-800">
                  1. Votre rôle dans l&apos;établissement <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    id="user-role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
                  >
                    {METIERS_FORM.map((m) => (
                      <option key={m.role} value={m.role}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={testerName}
                    onChange={(e) => setTesterName(e.target.value)}
                    placeholder="Votre nom (optionnel)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>

              {/* Question 2 : Module testé (Dropdown simple) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <label htmlFor="module-tested-select" className="block text-xs font-bold text-slate-800">
                  2. Quel module avez-vous principalement testé ? <span className="text-rose-500">*</span>
                </label>
                <select
                  id="module-tested-select"
                  value={moduleTeste}
                  onChange={(e) => setModuleTeste(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
                >
                  {MODULES_FORM.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question 3 : Facilité de prise en main (Multiple choice) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  3. Comment jugez-vous la facilité de prise en main ? <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {CHOIX_FACILITE.map((c) => {
                    const estChoisi = facilite === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFacilite(c.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                          estChoisi
                            ? "bg-purple-50/80 border-purple-600 text-purple-950 font-bold ring-1 ring-purple-600"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60"
                        }`}
                      >
                        <span>{c.label}</span>
                        {estChoisi && <Check className="h-4 w-4 text-purple-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 4 : Qualité perçue (Multiple choice) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  4. Quelle est votre impression sur la qualité et le design ? <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {CHOIX_QUALITE.map((c) => {
                    const estChoisi = qualite === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setQualite(c.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                          estChoisi
                            ? "bg-purple-50/80 border-purple-600 text-purple-950 font-bold ring-1 ring-purple-600"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60"
                        }`}
                      >
                        <span>{c.label}</span>
                        {estChoisi && <Check className="h-4 w-4 text-purple-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 5 : Points de confusion (Checkboxes / Multiple Answers) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  5. Avez-vous rencontré des confusions ou des difficultés ?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CHOIX_CONFUSION.map((c) => {
                    const estCoche = confusions.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleConfusion(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition-all cursor-pointer ${
                          estCoche
                            ? c.id === "aucune"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold ring-1 ring-emerald-400"
                              : "bg-amber-50 text-amber-900 border-amber-300 font-bold ring-1 ring-amber-400"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 6 : Note globale 1 à 5 */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  6. Votre note globale pour EduCom :
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOverallRating(val)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        overallRating === val
                          ? "bg-purple-600 border-purple-600 text-white shadow-xs scale-105"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Star className={`h-3.5 w-3.5 ${overallRating === val ? "fill-white" : ""}`} />
                      <span>{val} / 5</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 7 : Suggestion libre */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  7. Une remarque ou suggestion d&apos;amélioration ? (optionnel)
                </label>
                <input
                  type="text"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Ex: Rendre le bouton plus visible, simplifier le formulaire..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              {/* Bouton de validation type Google Form */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Envoyer mes réponses</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
