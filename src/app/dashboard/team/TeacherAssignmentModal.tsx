"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { X, Save, Plus, Trash2, BookOpen } from "lucide-react";
import { updateTeacherAssignments } from "./actions";

type ClassData = { id: string; name: string; cycle: string };
type SubjectData = { id: string; name: string };
type TeachingAssignment = { classId: string; subjectId: string };

interface TeacherAssignmentModalProps {
  teacher: { id: string; firstName: string; lastName: string };
  classes: ClassData[];
  subjects: SubjectData[];
  initialMainClassIds: string[];
  initialAssignments: TeachingAssignment[];
  onClose: () => void;
}

export default function TeacherAssignmentModal({
  teacher,
  classes,
  subjects,
  initialMainClassIds,
  initialAssignments,
  onClose,
}: TeacherAssignmentModalProps) {
  const [mainClassIds, setMainClassIds] = useState<string[]>(initialMainClassIds);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>(initialAssignments);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const toggleMainClass = (classId: string) => {
    setMainClassIds(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const addAssignment = () => {
    setAssignments([...assignments, { classId: classes[0]?.id || "", subjectId: subjects[0]?.id || "" }]);
  };

  const updateAssignment = (index: number, field: "classId" | "subjectId", value: string) => {
    const newAssignments = [...assignments];
    newAssignments[index][field] = value;
    setAssignments(newAssignments);
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setError("");
    startTransition(async () => {
      // Filter out invalid assignments just in case
      const validAssignments = assignments.filter(a => a.classId && a.subjectId);
      
      const res = await updateTeacherAssignments(teacher.id, mainClassIds, validAssignments);
      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  const cycles = useMemo(() => {
    const grouped = classes.reduce((acc, c) => {
      if (!acc[c.cycle]) acc[c.cycle] = [];
      acc[c.cycle].push(c);
      return acc;
    }, {} as Record<string, ClassData[]>);
    return Object.entries(grouped);
  }, [classes]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-surface shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-rule px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text">Assigner des classes</h2>
            <p className="text-sm text-text-soft">
              {teacher.firstName} {teacher.lastName}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-text-faint hover:bg-sunk hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Professeur Principal Section */}
          <section className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-text">Professeur Principal (Titulaire)</h3>
              <p className="text-sm text-text-soft">
                Cochez les classes dont cet enseignant est le responsable principal.
              </p>
            </div>
            
            <div className="space-y-4">
              {cycles.map(([cycleName, cycleClasses]) => (
                <div key={cycleName} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-text-faint tracking-wider">
                    {cycleName === "AUTRE" ? "Autres" : cycleName}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {cycleClasses.map(c => (
                      <label 
                        key={c.id} 
                        className={`flex cursor-pointer items-center gap-2 rounded-control border p-2 transition-colors ${
                          mainClassIds.includes(c.id) 
                            ? "border-primary bg-primary/5" 
                            : "border-rule bg-surface hover:bg-sunk"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={mainClassIds.includes(c.id)}
                          onChange={() => toggleMainClass(c.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-text truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-rule" />

          {/* Enseignements Spécifiques Section */}
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-text">Enseignements par matière</h3>
                <p className="text-sm text-text-soft">
                  Assignez les matières enseignées dans des classes spécifiques (généralement pour le Collège/Lycée).
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addAssignment} icon={<Plus className="h-4 w-4" />}>
                Ajouter
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rule p-6 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-text-faint mb-2" />
                <p className="text-sm text-text-soft">Aucun enseignement spécifique assigné.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={assignment.classId}
                      onChange={(e) => updateAssignment(index, "classId", e.target.value)}
                      className="flex-1 rounded-control border border-rule bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="" disabled>Sélectionner une classe...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    <select
                      value={assignment.subjectId}
                      onChange={(e) => updateAssignment(index, "subjectId", e.target.value)}
                      className="flex-1 rounded-control border border-rule bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="" disabled>Sélectionner une matière...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignment(index)}
                      className="text-text-faint hover:text-danger hover:bg-danger/10 p-2"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-3 border-t border-rule px-6 py-4 shrink-0 bg-sunk/50 rounded-b-2xl">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} loading={isPending} icon={<Save className="h-4 w-4" />}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
