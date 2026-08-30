"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus, Users, Trash2, Search, BookOpen, User, ArrowLeft, Save, Sparkles,
  Baby, Backpack, School, GraduationCap, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { deleteClass, createClassInline, generateDefaultClasses } from "./actions";

export default function ClassListClient({ classes, teachers, searchTerm }: { classes: any[], teachers: any[], searchTerm: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /**
   * Cycles éducatifs.
   *
   * ⚠️ Les emoji (🧸 🎒 🏫 🎓 📁) et les cinq familles de couleur
   * (pink/orange/blue/indigo/gray) ont été retirés : le socle interdit l'emoji
   * comme marqueur, et cinq teintes n'encodaient rien qu'un libellé ne dise
   * déjà. Icônes lucide cohérentes avec le reste de la navigation, couleur
   * réservée à l'accent de l'établissement.
   */
  const CYCLES = [
    { id: "MATERNELLE", label: "Maternelle", icon: Baby, desc: "Jardin, Petite, Moyenne, Grande Section" },
    { id: "ELEMENTAIRE", label: "Élémentaire", icon: Backpack, desc: "CI, CP, CE1, CE2, CM1, CM2" },
    { id: "COLLEGE", label: "Collège", icon: School, desc: "6ème, 5ème, 4ème, 3ème" },
    { id: "LYCEE", label: "Lycée", icon: GraduationCap, desc: "Seconde, Première, Terminale" },
    { id: "AUTRE", label: "Autres", icon: FolderOpen, desc: "Classes non catégorisées" },
  ];

  const existingCycleIds = new Set(classes.map(c => c.cycle));
  const activeCycles = CYCLES.filter(c => existingCycleIds.has(c.id));

  const visibleClasses = selectedCycle 
    ? classes.filter(c => c.cycle === selectedCycle)
    : classes;

  const filteredClasses = visibleClasses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.teacher && `${c.teacher.firstName} ${c.teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setClassToDelete(id);
  };

  const confirmDelete = async () => {
    if (!classToDelete) return;
    setIsDeleting(classToDelete);
    const res = await deleteClass(classToDelete);
    if (res.error) {
      setError(res.error);
    }
    setIsDeleting(null);
    setClassToDelete(null);
    router.refresh();
  };

  const handleGenerateDefaults = async () => {
    startTransition(async () => {
      const res = await generateDefaultClasses();
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Cycle Selection Grid */}
      {!selectedCycle && !searchTerm && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {activeCycles.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={School}
                title="Aucune classe configurée"
                description="Votre établissement n'a pas encore de classes. Utilisez le bouton 'Ajouter cycle' en haut pour générer les classes de votre choix."
              />
            </div>
          ) : (
            activeCycles.map((cycle) => {
              const cycleClasses = classes.filter((c) => c.cycle === cycle.id);
              const totalStudents = cycleClasses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0);
              const Icon = cycle.icon;

              return (
                <button
                  key={cycle.id}
                  type="button"
                  onClick={() => setSelectedCycle(cycle.id)}
                  aria-label={`Ouvrir le cycle ${cycle.label} — ${cycleClasses.length} classe(s), ${totalStudents} élève(s)`}
                  className="group flex items-center justify-between rounded-surface border border-rule bg-surface p-2.5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft group-hover:text-primary group-hover:bg-white transition-colors">
                      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 pr-2">
                      <h3 className="text-[13px] font-semibold text-text group-hover:text-primary transition-colors truncate">
                        {cycle.label}
                      </h3>
                      <p className="text-[11px] text-text-faint truncate">
                        {cycleClasses.length} classe{cycleClasses.length !== 1 ? "s" : ""} · {totalStudents} élève{totalStudents !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Classes Grid */}
      {(selectedCycle || searchTerm) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClasses.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={BookOpen}
                title={searchTerm ? "Aucune classe ne correspond" : "Aucune classe dans ce cycle"}
                description={
                  searchTerm
                    ? "Essayez un autre nom de classe ou de professeur."
                    : "Créez la première classe, ou générez le jeu standard du cycle."
                }
                action={
                  searchTerm
                    ? undefined
                    : undefined
                }
              />
              {!searchTerm && (
                <div className="mt-3 flex flex-col items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleGenerateDefaults}
                    loading={isPending}
                    icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}
                  >
                    Générer les classes standards
                  </Button>
                  {error && (
                     <p className="max-w-sm rounded-control bg-danger/10 px-3 py-2 text-role-meta font-medium text-danger">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredClasses.map((c) => {
              const cycleInfo = CYCLES.find((cy) => cy.id === c.cycle) ?? CYCLES[4];
              const Icon = cycleInfo.icon;
              const count = c._count?.enrollments || 0;

              return (
                <div
                  key={c.id}
                  className="group flex items-center justify-between rounded-surface border border-rule bg-surface p-2.5 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft group-hover:text-primary transition-colors">
                      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/classes/${c.id}`}
                          className="truncate rounded-control text-[13px] font-semibold text-text hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {c.name}
                        </Link>
                        <span className="text-[11px] font-medium text-text-soft bg-sunk px-1.5 py-0.5 rounded">
                          {count} élève{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-text-faint mt-0.5">
                        {c.teacher ? (
                          <span>{c.teacher.firstName} {c.teacher.lastName}</span>
                        ) : (
                          <Link href="/dashboard/team" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            Assigner un enseignant
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Supprimer la classe ${c.name}`}
                    onClick={(e) => handleDeleteClick(e, c.id)}
                    loading={isDeleting === c.id}
                    icon={<Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
                    className="shrink-0 hover:text-danger h-7 w-7 p-0 ml-2"
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={classToDelete !== null}
        onClose={() => setClassToDelete(null)}
        title="Supprimer la classe ?"
        size="sm"
        dismissible={isDeleting === null}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClassToDelete(null)} disabled={isDeleting !== null}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={isDeleting === classToDelete} disabled={isDeleting !== null}>
              Supprimer
            </Button>
          </>
        }
      >
        Êtes-vous sûr de vouloir supprimer cette classe ? Cette action est irréversible.
      </Modal>
    </div>
  );
}
