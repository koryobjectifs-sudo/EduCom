"use client";

import { useState } from "react";
import { submitSurveyResponse } from "./actions";
import { CheckCircle } from "lucide-react";

export default function ClientSurvey({ survey }: { survey: any }) {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [respondentName, setRespondentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const questions = survey.questions as { id: string, question: string, options: string[] }[];

  const handleOptionChange = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await submitSurveyResponse({
        surveyId: survey.id,
        respondentName,
        answers
      });
      setHasSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-semibold text-gray-900">Merci !</h2>
        <p className="text-gray-600">Votre réponse a bien été enregistrée.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
        <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-1">
          Votre Prénom et Nom (Optionnel)
        </label>
        <input
          type="text"
          id="name"
          placeholder="Ex: Parent de Aminata Fall"
          className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
          value={respondentName}
          onChange={(e) => setRespondentName(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        {questions.map((q, idx) => (
          <div key={q.id}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {idx + 1}. {q.question}
            </h3>
            <div className="space-y-3">
              {q.options.map((opt, optIdx) => (
                <label 
                  key={optIdx} 
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    answers[q.id] === opt 
                      ? "border-blue-600 bg-blue-50" 
                      : "border-gray-100 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    required
                    checked={answers[q.id] === opt}
                    onChange={() => handleOptionChange(q.id, opt)}
                    className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="font-medium text-gray-900">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting || Object.keys(answers).length !== questions.length}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "Envoi en cours..." : "Envoyer ma réponse"}
        </button>
      </div>
    </form>
  );
}
