"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { createSurvey } from "./actions";

export default function NewSurveyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([
    { id: "q1", text: "", options: ["", ""] }
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: `q${Date.now()}`, text: "", options: ["", ""] }
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const updateOptionText = (questionId: string, optionIndex: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = text;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...q.options, ""] };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Clean empty questions/options
    const cleanQuestions = questions
      .filter(q => q.text.trim() !== "")
      .map(q => ({
        id: q.id,
        question: q.text,
        options: q.options.filter(opt => opt.trim() !== "")
      }));

    try {
      // L'action renvoie maintenant `{ error }` au lieu de lever : sans ce
      // contrôle, un refus d'autorisation redirigerait comme un succès.
      const res = await createSurvey({
        title,
        description,
        questions: cleanQuestions
      });
      if (res?.error) {
        console.error(res.error);
        setIsSubmitting(false);
        return;
      }
      router.push("/communications/surveys");
      router.refresh();
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/communications/surveys"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Nouveau Sondage
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Survey Meta */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-1">Titre du sondage</label>
            <input
              type="text"
              id="title"
              required
              placeholder="Ex: Réinscription pour l'année prochaine"
              className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-lg font-medium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optionnel)</label>
            <textarea
              id="description"
              rows={2}
              placeholder="Expliquez brièvement le but de ce sondage..."
              className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Question {qIndex + 1}</h3>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <input
                type="text"
                required
                placeholder="Votre question..."
                className="block w-full rounded-md border-0 py-2 px-3 mb-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                value={q.text}
                onChange={(e) => updateQuestionText(q.id, e.target.value)}
              />

              <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"></div>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${optIndex + 1}`}
                      className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                      value={opt}
                      onChange={(e) => updateOptionText(q.id, optIndex, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(q.id, optIndex)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => addOption(q.id)}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
                >
                  <Plus className="w-4 h-4" /> Ajouter une option
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-400 transition-all"
        >
          <Plus className="w-5 h-5" /> Ajouter une nouvelle question
        </button>

        <div className="flex justify-end gap-3 pt-6">
          <Link
            href="/dashboard/communications/surveys"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            {isSubmitting ? "Création..." : <><Save className="w-4 h-4" /> Enregistrer et Générer le Lien</>}
          </button>
        </div>
      </form>
    </div>
  );
}
