"use client";

import { useState, useTransition } from "react";
import { Users, School, Plus, Search, Layers, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudentListClient from "../students/StudentListClient";
import ClassListClient from "../classes/ClassListClient";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClassInline } from "../classes/actions";

// Les cycles existants dans l'application
const CYCLES = [
  { id: "MATERNELLE", label: "Maternelle" },
  { id: "ELEMENTAIRE", label: "Élémentaire" },
  { id: "COLLEGE", label: "Collège" },
  { id: "LYCEE", label: "Lycée" },
  { id: "AUTRE", label: "Autres" },
];

type DirectoryClientProps = {
  studentsData: any[];
  classesData: any[];
  teachersData: any[];
};

export default function DirectoryClient({ studentsData, classesData, teachersData }: DirectoryClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"students" | "classes">("students");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isAddingCycle, setIsAddingCycle] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Compute the cycles that don't have any classes yet
  const existingCycleIds = new Set(classesData.map(c => c.cycle));
  const missingCycles = CYCLES.filter(c => !existingCycleIds.has(c.id));

  // Handle New Class Creation
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await createClassInline(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setIsCreatingClass(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Search and Actions */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 w-full md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un élève, une classe..."
              inputClassName="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsAddingCycle(true)}
              icon={<Layers aria-hidden="true" className="h-4 w-4" />}
            >
              Ajouter cycle
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => setIsCreatingClass(true)}
              icon={<Plus aria-hidden="true" className="h-4 w-4" />}
            >
              Nouvelle classe
            </Button>

            <Link
              href="/dashboard/students/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-4 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nouvelle admission
            </Link>
          </div>
        </div>
      </Card>

      {/* Tabs navigation */}
      <div className="border-b border-rule">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("students")}
            className={`
              whitespace-nowrap flex py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === "students"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-soft hover:text-text hover:border-rule"
              }
            `}
          >
            <Users className="mr-2 h-5 w-5" />
            Élèves
            <span
              className={`ml-2 rounded-full py-0.5 px-2.5 text-xs font-medium ${
                activeTab === "students" ? "bg-primary/10 text-primary" : "bg-sunk text-text-soft"
              }`}
            >
              {studentsData.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("classes")}
            className={`
              whitespace-nowrap flex py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === "classes"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-soft hover:text-text hover:border-rule"
              }
            `}
          >
            <School className="mr-2 h-5 w-5" />
            Classes
            <span
              className={`ml-2 rounded-full py-0.5 px-2.5 text-xs font-medium ${
                activeTab === "classes" ? "bg-primary/10 text-primary" : "bg-sunk text-text-soft"
              }`}
            >
              {classesData.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-2">
        {activeTab === "students" ? (
          <StudentListClient students={studentsData} searchTerm={searchTerm} classesData={classesData} />
        ) : (
          <ClassListClient classes={classesData} teachers={teachersData} searchTerm={searchTerm} />
        )}
      </div>

      {/* Modal: Nouvelle classe */}
      <Modal
        open={isCreatingClass}
        onClose={() => setIsCreatingClass(false)}
        title="Nouvelle Classe"
        dismissible={!isPending}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <Input
            label="Nom de la classe"
            required
            type="text"
            name="name"
            id="name"
            placeholder="Ex: CP, CE1, 6ème A..."
          />

          <Select label="Cycle" name="cycle" id="cycle" required>
            {CYCLES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>

          <Select label="Professeur Principal" name="teacherId" id="teacherId">
            <option value="">Aucun professeur assigné</option>
            {teachersData.map(t => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </Select>

          {error && (
            <p className="text-role-body text-danger font-medium bg-danger/10 p-4 rounded-control">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsCreatingClass(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" loading={isPending} icon={<Save aria-hidden="true" className="w-4 h-4" />}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Ajouter Cycle */}
      <Modal
        open={isAddingCycle}
        onClose={() => setIsAddingCycle(false)}
        title="Ajouter un cycle"
      >
        {missingCycles.length === 0 ? (
          <div className="space-y-4">
            <p className="text-role-body text-text">Votre établissement a déjà ouvert des classes dans tous les cycles disponibles.</p>
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsAddingCycle(false)}>Fermer</Button>
            </div>
          </div>
        ) : (
          <form action={async (formData) => {
            setError(null);
            const cycleId = formData.get("cycleId") as string;
            if (!cycleId) return;
            startTransition(async () => {
              // We will call generateCycleClasses here
              const { generateCycleClasses } = await import("../classes/actions");
              const res = await generateCycleClasses(cycleId);
              if (res.error) {
                setError(res.error);
              } else {
                setIsAddingCycle(false);
                router.refresh();
              }
            });
          }} className="space-y-6">
            <p className="text-role-body text-text-soft">
              Ouvrez un nouveau cycle dans votre établissement. Les classes standards de ce cycle seront générées automatiquement.
            </p>
            <Select label="Sélectionnez le cycle" name="cycleId" required>
              {missingCycles.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>

            {error && (
              <p className="text-role-body text-danger font-medium bg-danger/10 p-4 rounded-control">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setIsAddingCycle(false)} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" loading={isPending} icon={<Plus aria-hidden="true" className="w-4 h-4" />}>
                Générer les classes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
