"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, GraduationCap, FileText, FileBadge, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

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
}

export default function StudentListClient({ students }: StudentListClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Classes réellement présentes dans les inscriptions — aucune liste en dur. */
  const classes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of students) {
      const c = s.enrollments?.[0]?.class;
      if (c?.id && !seen.has(c.id)) seen.set(c.id, c.name);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [students]);

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

  const hasActiveFilter = searchTerm.trim() !== "" || statusFilter !== "ALL" || classFilter !== "ALL";

  const resetFilters = () => {
    setSearchTerm("");
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

  return (
    <div className="space-y-4">
      {/* Barre de filtres */}
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Input
            label="Rechercher"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nom de l'élève, du parent, ou téléphone…"
            className="flex-1"
          />

          <Select
            label="Statut"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="lg:w-48"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ENROLLED">Inscrits</option>
            <option value="PENDING">En attente</option>
            <option value="GRADUATED">Diplômés</option>
            <option value="INACTIVE">Inactifs</option>
          </Select>

          {classes.length > 0 && (
            <Select
              label="Classe"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="lg:w-48"
            >
              <option value="ALL">Toutes les classes</option>
              {classes.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </Select>
          )}

          {hasActiveFilter && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              icon={<X aria-hidden="true" className="h-4 w-4" />}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        {hasActiveFilter && (
          <p aria-live="polite" className="mt-3 text-role-meta text-text-soft">
            {filteredStudents.length} résultat{filteredStudents.length > 1 ? "s" : ""} sur {students.length}
          </p>
        )}
      </Card>

      {/* Tableau */}
      <Card flush>
        <DataTable caption="Liste des élèves de l'établissement">
          <DataTable.Head>
            <tr>
              <DataTable.HeadCell>Élève</DataTable.HeadCell>
              <DataTable.HeadCell>Classe</DataTable.HeadCell>
              <DataTable.HeadCell className="hidden md:table-cell">Parent / Tuteur</DataTable.HeadCell>
              <DataTable.HeadCell>Statut</DataTable.HeadCell>
              <DataTable.HeadCell className="text-right">
                <span className="sr-only">Actions</span>
              </DataTable.HeadCell>
            </tr>
          </DataTable.Head>
          <DataTable.Body>
            {filteredStudents.length === 0 ? (
              <DataTable.EmptyRow colSpan={5}>
                {hasActiveFilter ? (
                  <EmptyState
                    icon={Search}
                    title="Aucun élève ne correspond"
                    description="Essayez d'autres termes, ou réinitialisez les filtres."
                    action={{ label: "Réinitialiser les filtres", onClick: resetFilters }}
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
                        <span className="text-text-faint">Non assigné</span>
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
                            { label: "Générer un bulletin", icon: FileText, href: `/dashboard/documents/report-card?studentId=${student.id}` },
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
            <span>
              {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""} affiché
              {filteredStudents.length > 1 ? "s" : ""}
              {hasActiveFilter ? ` sur ${students.length}` : ""}
            </span>
          </DataTable.Footer>
        )}
      </Card>
    </div>
  );
}
