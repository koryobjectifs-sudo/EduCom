"use client";

import { useState, useMemo } from "react";
import { Folder, ArrowLeft, Users, School } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import StudentListClient from "../StudentListClient";

interface DossiersClientProps {
  studentsData: any[];
  classesData: any[];
}

export default function DossiersClient({ studentsData, classesData }: DossiersClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const statsByClass = useMemo(() => {
    const stats: Record<string, number> = {};
    let unassigned = 0;
    
    classesData.forEach((c) => {
      stats[c.id] = 0;
    });

    studentsData.forEach((student) => {
      const activeEnrollment = student.enrollments?.[0];
      if (activeEnrollment?.classId) {
        stats[activeEnrollment.classId] = (stats[activeEnrollment.classId] || 0) + 1;
      } else {
        unassigned++;
      }
    });

    return { stats, unassigned };
  }, [studentsData, classesData]);

  // Group classes by cycle
  const elementaire = classesData.filter((c) => c.cycle === "ELEMENTARY");
  const secondaire = classesData.filter((c) => c.cycle === "MIDDLE" || c.cycle === "HIGH");
  const maternelle = classesData.filter((c) => c.cycle === "PRE_K");

  if (selectedClassId !== null) {
    const filteredStudents = selectedClassId === "UNASSIGNED" 
      ? studentsData.filter(s => !s.enrollments?.[0]?.classId)
      : studentsData.filter(s => s.enrollments?.[0]?.classId === selectedClassId);

    const className = selectedClassId === "UNASSIGNED" 
      ? "Élèves sans classe"
      : classesData.find((c) => c.id === selectedClassId)?.name ?? "";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedClassId(null)} className="-ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h2 className="text-lg font-semibold flex items-center gap-2 text-text">
              <Folder className="h-5 w-5 text-primary" />
              {className}
            </h2>
          </div>
          <div className="text-sm text-text-soft font-medium">
            {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""}
          </div>
        </div>

        <StudentListClient 
          students={filteredStudents} 
          classesData={selectedClassId === "UNASSIGNED" ? [] : classesData.filter(c => c.id === selectedClassId)} 
        />
      </div>
    );
  }

  const renderClassFolder = (cls: any) => (
    <Card 
      key={cls.id} 
      className="p-6 cursor-pointer group hover:border-primary transition-all flex flex-col gap-4 items-center text-center"
      onClick={() => setSelectedClassId(cls.id)}
    >
      <div className="h-16 w-16 bg-sunk rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-transform duration-300">
        <Folder className="h-8 w-8 text-primary/80 group-hover:text-primary transition-colors" />
      </div>
      <div>
        <h3 className="font-bold text-text group-hover:text-primary transition-colors">{cls.name}</h3>
        <p className="text-sm font-medium text-text-soft mt-1 flex items-center justify-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {statsByClass.stats[cls.id] ?? 0} élève{(statsByClass.stats[cls.id] ?? 0) > 1 ? "s" : ""}
        </p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-10">
      {maternelle.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-widest text-text-soft uppercase flex items-center gap-2">
            <School className="h-4 w-4" /> Cycle Maternel
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {maternelle.map(renderClassFolder)}
          </div>
        </section>
      )}

      {elementaire.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-widest text-text-soft uppercase flex items-center gap-2">
            <School className="h-4 w-4" /> Cycle Élémentaire
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {elementaire.map(renderClassFolder)}
          </div>
        </section>
      )}

      {secondaire.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-widest text-text-soft uppercase flex items-center gap-2">
            <School className="h-4 w-4" /> Cycle Secondaire
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {secondaire.map(renderClassFolder)}
          </div>
        </section>
      )}

      {/* Classes sans cycle explicite (au cas où) */}
      {classesData.filter(c => !["PRE_K", "ELEMENTARY", "MIDDLE", "HIGH"].includes(c.cycle)).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold tracking-widest text-text-soft uppercase flex items-center gap-2">
            <School className="h-4 w-4" /> Autres Classes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {classesData.filter(c => !["PRE_K", "ELEMENTARY", "MIDDLE", "HIGH"].includes(c.cycle)).map(renderClassFolder)}
          </div>
        </section>
      )}

      {statsByClass.unassigned > 0 && (
        <section className="space-y-4 pt-4 border-t border-rule">
          <h2 className="text-sm font-bold tracking-widest text-text-soft uppercase flex items-center gap-2">
            <Users className="h-4 w-4" /> Hors classe
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <Card 
              className="p-6 cursor-pointer group hover:border-danger/50 transition-all flex flex-col gap-4 items-center text-center bg-danger/5"
              onClick={() => setSelectedClassId("UNASSIGNED")}
            >
              <div className="h-16 w-16 bg-white/50 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-danger/10 transition-transform duration-300">
                <Folder className="h-8 w-8 text-danger/80 group-hover:text-danger transition-colors" />
              </div>
              <div>
                <h3 className="font-bold text-danger group-hover:text-danger transition-colors">Non assignés</h3>
                <p className="text-sm font-medium text-danger/70 mt-1 flex items-center justify-center gap-1">
                  {statsByClass.unassigned} élève{statsByClass.unassigned > 1 ? "s" : ""}
                </p>
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
