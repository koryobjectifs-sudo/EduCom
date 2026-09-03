"use client";

import { useState, useMemo } from "react";
import { Folder, ArrowLeft, Users, School } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import StudentListClient from "../StudentListClient";
import { CYCLE_LABELS } from "@/lib/schoolDocumentLabels";

interface DossiersClientProps {
  studentsData: any[];
  classesData: any[];
}

export default function DossiersClient({ studentsData, classesData }: DossiersClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  /**
   * Classe courante d'un élève, quelle que soit la FORME des données reçues.
   *
   * ⚠️ Les deux écrans qui rendent ce composant ne chargent pas la même chose :
   * `students/dossiers` fait un `include: { class: true }` (donc `classId` est
   * là), l'annuaire fait un `select` qui ne retient que `class { id, name }`
   * (donc `classId` est ABSENT). Lire `classId` seul comptait alors les 243
   * élèves comme non assignés, sans erreur ni indice.
   */
  const classeDe = (student: { enrollments?: { classId?: string | null; class?: { id?: string } | null }[] }): string | undefined => {
    const e = student.enrollments?.[0];
    return e?.classId ?? e?.class?.id ?? undefined;
  };

  const statsByClass = useMemo(() => {
    const stats: Record<string, number> = {};
    let unassigned = 0;
    
    classesData.forEach((c) => {
      stats[c.id] = 0;
    });

    studentsData.forEach((student) => {
      const classId = classeDe(student);
      if (classId) {
        stats[classId] = (stats[classId] || 0) + 1;
      } else {
        unassigned++;
      }
    });

    return { stats, unassigned };
  }, [studentsData, classesData]);

  /* ⚠️ Regroupement piloté par l'ÉNUMÉRATION, plus par des chaînes écrites à la
     main. Les filtres précédents comparaient à "ELEMENTARY", "MIDDLE", "HIGH" et
     "PRE_K" — **aucune de ces valeurs n'existe** dans `EducationalCycle`
     (MATERNELLE, ELEMENTAIRE, COLLEGE, LYCEE, AUTRE). Les trois sections étaient
     donc toujours vides et TOUTES les classes tombaient dans le repli « Autres
     classes ». Le défaut était invisible : rien ne plantait, les dossiers
     s'affichaient, seulement tous sous la mauvaise étiquette.

     Les libellés viennent de `CYCLE_LABELS`, déjà source unique du produit. */
  const groupes = useMemo(() => {
    const ordre = ["MATERNELLE", "ELEMENTAIRE", "COLLEGE", "LYCEE", "AUTRE"] as const;
    const connus = new Set<string>(ordre);
    const listes = ordre
      .map((cycle) => ({ cle: cycle as string, titre: CYCLE_LABELS[cycle], classes: classesData.filter((c) => c.cycle === cycle) }))
      .filter((g) => g.classes.length > 0);
    // Filet : un cycle ajouté au schéma demain ne disparaît pas de l'écran.
    const orphelines = classesData.filter((c) => !connus.has(c.cycle));
    if (orphelines.length > 0) listes.push({ cle: "INCONNU", titre: "Autres classes", classes: orphelines });
    return listes;
  }, [classesData]);

  if (selectedClassId !== null) {
    const filteredStudents = selectedClassId === "UNASSIGNED" 
      ? studentsData.filter(s => !classeDe(s))
      : studentsData.filter(s => classeDe(s) === selectedClassId);

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
          /* ⚠️ Le filtre de la vue est borné au dossier ouvert, mais l'assignation
             a besoin de TOUTES les classes de l'école. Les deux listes étaient
             confondues : dans « Non assignés » la première vaut `[]`, et la
             fenêtre « Assigner à une classe » n'offrait donc AUCUN choix —
             les élèves sans classe étaient impossibles à assigner depuis cet
             écran, qui est pourtant celui prévu pour ça. */
          classesAssignables={classesData} 
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
      {groupes.map((g) => (
        <section key={g.cle} className="space-y-4">
          <h2 className="text-sm font-bold tracking-widest text-text-soft uppercase flex items-center gap-2">
            <School className="h-4 w-4" /> {g.titre}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {g.classes.map(renderClassFolder)}
          </div>
        </section>
      ))}

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
