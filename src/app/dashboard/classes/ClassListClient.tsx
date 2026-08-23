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
    await deleteClass(classToDelete);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CYCLES.map((cycle) => {
            const cycleClasses = classes.filter((c) => c.cycle === cycle.id);
            const totalStudents = cycleClasses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0);
            const Icon = cycle.icon;
            const empty = cycleClasses.length === 0;

            return (
              <button
                key={cycle.id}
                type="button"
                onClick={() => setSelectedCycle(cycle.id)}
                aria-label={`Ouvrir le cycle ${cycle.label} — ${cycleClasses.length} classe(s), ${totalStudents} élève(s)`}
                className="group flex h-full flex-col rounded-surface border border-rule bg-surface p-5 text-left shadow-card transition-colors hover:border-primary/40 hover:bg-sunk/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft group-hover:text-primary">
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="text-role-meta font-semibold tabular-nums text-text-faint">
                    {cycleClasses.length} classe{cycleClasses.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <h3 className="mt-3 text-role-card font-semibold text-text group-hover:text-primary">
                  {cycle.label}
                </h3>
                <p className="mt-1 flex-1 text-role-meta text-text-faint">{cycle.desc}</p>

                <p className="mt-4 flex items-center gap-1.5 border-t border-rule pt-3 text-role-body text-text-soft">
                  <Users aria-hidden="true" className="h-4 w-4 text-text-faint" />
                  <span className="tabular-nums font-medium text-text">{totalStudents}</span>
                  élève{totalStudents !== 1 ? "s" : ""}
                  {empty && <span className="ml-auto text-role-meta text-text-faint">à créer</span>}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Classes Grid */}
      {(selectedCycle || searchTerm) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                /* La carte n'est plus un <Link> englobant : le bouton de
                   suppression s'y trouvait imbriqué, ce qui est invalide en HTML
                   et rendait le clavier imprévisible. Le nom porte le lien, la
                   carte garde son survol. */
                <div
                  key={c.id}
                  className="group flex flex-col rounded-surface border border-rule bg-surface p-5 shadow-card transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sunk text-text-soft">
                        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/classes/${c.id}`}
                          className="block truncate rounded-control text-role-card font-semibold text-text hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {c.name}
                        </Link>
                        <p className="text-role-meta text-text-faint">{cycleInfo.label}</p>
                      </div>
                    </div>

                    {/* Toujours visible : l'ancienne version l'affichait au
                        survol seulement, donc inatteignable au clavier et au
                        tactile. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Supprimer la classe ${c.name}`}
                      onClick={(e) => handleDeleteClick(e, c.id)}
                      loading={isDeleting === c.id}
                      icon={<Trash2 aria-hidden="true" className="h-4 w-4" />}
                      className="shrink-0 hover:text-danger"
                    />
                  </div>

                  {/* L'effectif est l'information la plus consultée : il passe en
                      chiffre de premier plan plutôt qu'en légende sous le nom. */}
                  <p className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-role-section font-semibold tabular-nums text-text">{count}</span>
                    <span className="text-role-body text-text-soft">
                      élève{count !== 1 ? "s" : ""} inscrit{count !== 1 ? "s" : ""}
                    </span>
                  </p>

                  <div className="mt-4 flex items-center gap-2.5 border-t border-rule pt-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-sunk">
                      <User aria-hidden="true" className="h-3.5 w-3.5 text-text-faint" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-role-meta uppercase tracking-wide text-text-faint">
                        Professeur principal
                      </p>
                      <p className="truncate text-role-body font-medium text-text">
                        {c.teacher
                          ? `${c.teacher.firstName} ${c.teacher.lastName}`
                          : <span className="font-normal text-text-faint">Non assigné</span>}
                      </p>
                    </div>
                  </div>
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
        Êtes-vous sûr de vouloir supprimer cette classe ? Cette action est irréversible et supprimera les inscriptions associées.
      </Modal>
    </div>
  );
}
