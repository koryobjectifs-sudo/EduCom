"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, GraduationCap, FileText, FileBadge, X, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { deleteStudent, deleteStudents, assignStudentToClass } from "./actions";

/**
 * Annuaire des élèves — écran quotidien du secrétariat.
 *
 * ═══ CE QUI CHANGE DANS LA HIÉRARCHIE ═══
 *
 * 1. **Le bouton « Filtres » a disparu.** Il n'avait aucun handler : un contrôle
 *    décoratif à côté d'un filtre qui, lui, fonctionne. Le sélecteur de statut
 *    est désormais étiqueté et accompagné d'un filtre de classe **réellement
 *    branché**, construit depuis les inscriptions déjà chargées.
 *
 * 2. **Les avatars ne sont plus arc-en-ciel.** Cinq teintes tirées d'un modulo
 *    de l'index ne codaient rien — deux élèves voisins n'ont aucun rapport parce
 *    qu'ils ont la même couleur. Traitement neutre unique, conforme au socle.
 *
 * 3. **Le nom est un vrai lien.** La ligne entière restait cliquable via un
 *    `onClick` sur `<tr>` — inaccessible au clavier. Le clic de ligne est
 *    conservé pour le confort à la souris, et le nom devient un `<a>` : la
 *    tabulation atteint enfin chaque élève.
 *
 * 4. **Colonnes hiérarchisées par densité d'écran.** Sous `md`, la colonne
 *    Parent/Tuteur se replie sous le nom de l'élève au lieu d'être poussée hors
 *    du cadre : l'information reste lisible sans défilement horizontal.
 */

interface StudentListClientProps {
  students: any[];
  classesData?: any[];
  /**
   * Classes proposées par la fenêtre « Assigner à une classe ».
   *
   * ⚠️ Distincte de `classesData`, qui alimente le FILTRE de la vue. Les deux
   * étaient confondues : un écran qui borne son filtre au dossier ouvert
   * (« Non assignés » → aucune classe) privait du même geste l'assignation de
   * toute option, rendant l'action impossible là où elle est le plus utile.
   * Par défaut, l'assignation reprend `classesData`.
   */
  classesAssignables?: { id: string; name: string }[];
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  hideSearchBar?: boolean;
}

export default function StudentListClient({ 
  students, 
  classesData = [], 
  classesAssignables,
  searchTerm: externalSearchTerm,
  onSearchChange,
  hideSearchBar 
}: StudentListClientProps) {
  const router = useRouter();
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setInternalSearchTerm(val);
  };
  
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [studentToAssign, setStudentToAssign] = useState<string | null>(null);
  const [assignClassId, setAssignClassId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  /** Classes provenant directement de classesData, sans dépendre des inscriptions */
  const classes = useMemo(() => {
    return classesData.map(c => [c.id, c.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [classesData]);

  /** Classes offertes à l'assignation — toute l'école, pas seulement la vue. */
  const classesPourAssigner = useMemo(() => {
    const source = classesAssignables ?? classesData;
    return source.map(c => [c.id, c.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [classesAssignables, classesData]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !q ||
        student.firstName.toLowerCase().includes(q) ||
        student.lastName.toLowerCase().includes(q) ||
        (student.parent?.firstName || "").toLowerCase().includes(q) ||
        (student.parent?.lastName || "").toLowerCase().includes(q) ||
        (student.parent?.phone || "").includes(searchTerm.trim());

      const matchesStatus = statusFilter === "ALL" || student.status === statusFilter;
      const matchesClass =
        classFilter === "ALL" || student.enrollments?.[0]?.class?.id === classFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [students, searchTerm, statusFilter, classFilter]);

  const hasActiveFilter = statusFilter !== "ALL" || classFilter !== "ALL";

  const resetFilters = () => {
    setStatusFilter("ALL");
    setClassFilter("ALL");
  };

  // Fermeture du menu contextuel au clic extérieur et à Escape.
  useEffect(() => {
    if (!openDropdownId) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenDropdownId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdownId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDropdownId]);

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    await deleteStudents(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowBulkDeleteModal(false);
    setIsDeleting(false);
    router.refresh();
  };

  const handleSingleDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    await deleteStudent(studentToDelete);
    setStudentToDelete(null);
    setIsDeleting(false);
    router.refresh();
  };

  const handleAssignClass = async () => {
    if (!studentToAssign || !assignClassId) return;
    setIsAssigning(true);
    await assignStudentToClass(studentToAssign, assignClassId);
    setIsAssigning(false);
    setStudentToAssign(null);
    setAssignClassId("");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Barre de filtres */}
      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        {!hideSearchBar ? (
          <div className="w-full sm:max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher un dossier élève (nom, prénom)..."
              inputClassName="pl-9"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex w-full sm:w-auto items-center gap-3">
          <Select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            disabled={classes.length === 0}
            className="w-full sm:w-48"
          >
            <option value="ALL">Toutes les classes</option>
            {classes.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ENROLLED">Inscrits</option>
            <option value="PENDING">En attente</option>
            <option value="GRADUATED">Diplômés</option>
            <option value="INACTIVE">Inactifs</option>
          </Select>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="shrink-0 text-text-soft"
              title="Réinitialiser"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* Tableau */}
      <Card flush>
        <DataTable caption="Liste des élèves de l'établissement">
          <DataTable.Head>
            <tr>
              <DataTable.HeadCell className="w-12">
                <input
                  type="checkbox"
                  className="rounded border-rule text-primary focus:ring-primary/40 h-4 w-4"
                  checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(filteredStudents.map(s => s.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </DataTable.HeadCell>
              <DataTable.HeadCell>Élève</DataTable.HeadCell>
              <DataTable.HeadCell>Classe</DataTable.HeadCell>
              <DataTable.HeadCell className="hidden md:table-cell">Parent / Tuteur</DataTable.HeadCell>
              <DataTable.HeadCell>Statut</DataTable.HeadCell>
              <DataTable.HeadCell className="text-right"><span className="sr-only">Actions</span></DataTable.HeadCell>
            </tr>
          </DataTable.Head>
          <DataTable.Body>
            {filteredStudents.length === 0 ? (
              <DataTable.EmptyRow colSpan={6}>
                {hasActiveFilter || searchTerm ? (
                  <EmptyState
                    icon={Search}
                    title="Aucun élève ne correspond"
                    description="Essayez d'autres termes de recherche, ou réinitialisez les filtres."
                    action={hasActiveFilter ? { label: "Réinitialiser les filtres", onClick: resetFilters } : undefined}
                    size="sm"
                  />
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    title="Aucun élève inscrit"
                    description="Commencez par une première admission pour constituer votre annuaire."
                    action={{ label: "Nouvelle admission", href: "/dashboard/students/new" }}
                    size="sm"
                  />
                )}
              </DataTable.EmptyRow>
            ) : (
              filteredStudents.map((student) => {
                const currentEnrollment = student.enrollments[0];
                const isDropdownOpen = openDropdownId === student.id;
                const fullName = `${student.firstName} ${student.lastName}`;
                const parentName = student.parent
                  ? `${student.parent.firstName} ${student.parent.lastName}`
                  : null;

                return (
                  <DataTable.Row
                    key={student.id}
                    onClick={() => router.push(`/dashboard/students/${student.id}`)}
                    className="group cursor-pointer"
                  >
                    <DataTable.Cell>
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-rule text-primary focus:ring-primary/40 h-4 w-4"
                          checked={selectedIds.has(student.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(student.id);
                            else next.delete(student.id);
                            setSelectedIds(next);
                          }}
                        />
                      </div>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-sunk text-role-meta font-semibold text-text-soft"
                        >
                          {student.firstName[0]}{student.lastName[0]}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate font-semibold text-text hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-control"
                          >
                            {fullName}
                          </Link>
                          <span className="block text-role-meta text-text-faint">
                            {student.dateOfBirth
                              ? `Né(e) le ${new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}`
                              : "Date de naissance non renseignée"}
                          </span>
                          {/* Sous md, le tuteur se replie ici au lieu de sortir du cadre. */}
                          {parentName && (
                            <span className="mt-0.5 block text-role-meta text-text-soft md:hidden">
                              {parentName}
                              {student.parent?.phone ? ` · ${student.parent.phone}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </DataTable.Cell>

                    <DataTable.Cell>
                      {currentEnrollment?.class?.name ? (
                        <>
                          <span className="font-medium text-text">{currentEnrollment.class.name}</span>
                          {currentEnrollment.academicYear && (
                            <span className="block text-role-meta text-text-faint">
                              {currentEnrollment.academicYear}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-text-faint">Non assigné</span>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-primary/10 text-primary border-transparent hover:bg-primary/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentToAssign(student.id);
                            }}
                          >
                            Assigner
                          </Button>
                        </div>
                      )}
                    </DataTable.Cell>

                    <DataTable.Cell className="hidden md:table-cell">
                      {parentName ? (
                        <>
                          <span className="text-text">{parentName}</span>
                          <span className="block text-role-meta text-text-faint">
                            {student.parent?.phone || "Téléphone non renseigné"}
                          </span>
                        </>
                      ) : (
                        <span className="text-text-faint">Aucun tuteur</span>
                      )}
                    </DataTable.Cell>

                    <DataTable.Cell>
                      <StatusBadge domain="student" status={student.status} />
                    </DataTable.Cell>

                    <DataTable.Cell className="relative text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Actions pour ${fullName}`}
                        aria-expanded={isDropdownOpen}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(isDropdownOpen ? null : student.id);
                        }}
                        icon={<MoreVertical aria-hidden="true" className="h-4 w-4" />}
                      />

                      {isDropdownOpen && (
                        <div
                          ref={menuRef}
                          role="menu"
                          className="absolute right-4 top-12 z-50 w-56 overflow-hidden rounded-surface border border-rule bg-surface p-1 text-left shadow-overlay"
                        >
                          {[
                            { label: "Voir le profil", icon: GraduationCap, href: `/dashboard/students/${student.id}` },
                            { label: "Générer un certificat", icon: FileBadge, href: `/dashboard/documents/certificate?studentId=${student.id}` },
                            { label: "Générer un bulletin", icon: FileText, href: `/dashboard/grades/report-card?studentId=${student.id}` },
                          ].map(({ label, icon: Icon, href }) => (
                            <button
                              key={label}
                              type="button"
                              role="menuitem"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                                router.push(href);
                              }}
                              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-role-body font-medium text-text-soft transition-colors hover:bg-sunk hover:text-text"
                            >
                              <Icon aria-hidden="true" className="h-4 w-4 text-text-faint" />
                              {label}
                            </button>
                          ))}
                          <div className="h-px w-full bg-rule my-1" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(null);
                              setStudentToDelete(student.id);
                            }}
                            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-role-body font-medium text-danger transition-colors hover:bg-danger/10"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })
            )}
          </DataTable.Body>
        </DataTable>

        {filteredStudents.length > 0 && (
          <DataTable.Footer>
            <div className="flex items-center justify-between w-full">
              <span>
                {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""} affiché
                {filteredStudents.length > 1 ? "s" : ""}
                {hasActiveFilter ? ` sur ${students.length}` : ""}
              </span>
              {selectedIds.size > 0 && (
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => setShowBulkDeleteModal(true)}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Supprimer ({selectedIds.size})
                </Button>
              )}
            </div>
          </DataTable.Footer>
        )}
      </Card>

      <Modal
        open={studentToDelete !== null}
        onClose={() => setStudentToDelete(null)}
        title="Supprimer l'élève ?"
        size="sm"
        dismissible={!isDeleting}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStudentToDelete(null)} disabled={isDeleting}>Annuler</Button>
            <Button variant="danger" onClick={handleSingleDelete} loading={isDeleting}>Supprimer</Button>
          </>
        }
      >
        Êtes-vous sûr de vouloir supprimer cet élève ? Cette action est irréversible.
      </Modal>

      <Modal
        open={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Supprimer la sélection ?"
        size="sm"
        dismissible={!isDeleting}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)} disabled={isDeleting}>Annuler</Button>
            <Button variant="danger" onClick={handleBulkDelete} loading={isDeleting}>Confirmer la suppression</Button>
          </>
        }
      >
        Vous êtes sur le point de supprimer {selectedIds.size} élève(s). Cette action est irréversible.
      </Modal>
      {/* Assign Class Modal */}
      <Modal
        open={studentToAssign !== null}
        onClose={() => {
          setStudentToAssign(null);
          setAssignClassId("");
        }}
        title="Assigner à une classe"
        size="sm"
        dismissible={!isAssigning}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setStudentToAssign(null);
                setAssignClassId("");
              }}
              disabled={isAssigning}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignClass}
              loading={isAssigning}
              disabled={!assignClassId}
            >
              Assigner
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-soft">
            Sélectionnez la classe dans laquelle vous souhaitez inscrire cet élève pour l'année en cours.
          </p>
          {/* Un menu vide ne dit pas POURQUOI il est vide. Sans classe créée,
              l'écran renvoie vers l'endroit où en créer une plutôt que de
              laisser l'utilisateur devant une liste muette. */}
          {classesPourAssigner.length === 0 ? (
            <div className="rounded-control border border-rule bg-sunk p-4 text-sm text-text-soft">
              Aucune classe n&apos;est encore créée dans cet établissement.{" "}
              <Link href="/dashboard/classes/new" className="font-medium text-primary hover:underline">
                Créer une classe
              </Link>
            </div>
          ) : (
            <Select
              label="Classe"
              value={assignClassId}
              onChange={(e) => setAssignClassId(e.target.value)}
            >
              <option value="" disabled>Choisir une classe...</option>
              {classesPourAssigner.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </Select>
          )}
        </div>
      </Modal>
    </div>
  );
}
