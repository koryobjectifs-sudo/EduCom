"use client";

import { useState } from "react";
import TeacherAssignmentModal from "./TeacherAssignmentModal";
import { BookOpen } from "lucide-react";

export default function TeacherActionsWrapper({
  teacher,
  classes,
  subjects,
  allAssignments,
  compact = false
}: any) {
  const [isOpen, setIsOpen] = useState(false);

  if (teacher.role !== "TEACHER") return null;

  const mainClassIds = classes.filter((c: any) => c.teacherId === teacher.id).map((c: any) => c.id);
  const teacherAssignments = allAssignments.filter((a: any) => a.teacherId === teacher.id);

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-rule bg-surface text-[13px] font-medium text-text shadow-sm transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${compact ? 'px-2' : 'px-3'}`}
        title="Gérer les classes de cet enseignant"
      >
        <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-text-soft" />
        {!compact && <span>Classes</span>}
      </button>
      
      {isOpen && (
        <TeacherAssignmentModal
          teacher={teacher}
          classes={classes}
          subjects={subjects}
          initialMainClassIds={mainClassIds}
          initialAssignments={teacherAssignments}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
