"use client";

import { useMemo, useState } from "react";
import { roleLabel, ROLE_LABELS, type RoleType } from "@/lib/permissions";
import { Edit2, BookOpen, Plus } from "lucide-react";
import type { DonneesEquipe } from "@/lib/equipe";
import FicheMembre from "./FicheMembre";
import type { Autres } from "./BlocsMembre";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  managerId: string | null;
  email?: string;
  avatar?: string | null;
}

export default function OrgChartClient({
  members,
  donnees,
  autres,
  acces,
  peutGerer,
}: {
  members: User[];
  donnees: DonneesEquipe;
  autres: Autres;
  /** Accès en plus par membre. */
  acces: Record<string, string[]>;
  /** Direction seulement : ouvrir la fiche. */
  peutGerer: boolean;
}) {
  const [editingNode, setEditingNode] = useState<User | null>(null);

  // Build the tree
  const tree = useMemo(() => {
    const rootNodes: any[] = [];
    const map = new Map<string, any>();

    members.forEach((m) => {
      map.set(m.id, { ...m, children: [] });
    });

    members.forEach((m) => {
      if (m.managerId && map.has(m.managerId)) {
        map.get(m.managerId).children.push(map.get(m.id));
      } else {
        rootNodes.push(map.get(m.id));
      }
    });

    return rootNodes;
  }, [members]);

  const nbClasses = (id: string) =>
    new Set([...donnees.classes.filter((c) => c.titulaireId === id).map((c) => c.id), ...autres.affectations.filter((a) => a.teacherId === id).map((a) => a.classId)]).size;

  const renderNode = (node: any) => {
    const info = ROLE_LABELS[node.role as RoleType];
    const initials = `${node.firstName?.charAt(0) ?? ""}${node.lastName?.charAt(0) ?? ""}`.toUpperCase();
    
    // Logic for role badge colors based on general departments
    let badgeClass = "bg-primary/10 text-primary";
    if (node.role === "TEACHER") badgeClass = "bg-green-100 text-green-700";
    if (node.role === "ACCOUNTANT") badgeClass = "bg-amber-100 text-amber-700";
    if (node.role === "SECRETARY" || node.role === "ASSISTANT") badgeClass = "bg-purple-100 text-purple-700";
    if (node.role === "ADMIN" || node.role === "OWNER") badgeClass = "bg-blue-100 text-blue-700";

    const reportCount = node.children.length;

    return (
      <li key={node.id}>
        <div className="relative z-10 flex flex-col items-center group">
          <div className="relative flex flex-col gap-2 rounded-xl border border-rule bg-surface p-3 shadow-sm transition-all hover:shadow-md w-[200px] text-left">
            
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {node.avatar ? (
                  <img
                    src={node.avatar}
                    alt={`${node.firstName} ${node.lastName}`}
                    className="h-9 w-9 shrink-0 rounded-full object-cover border border-rule shadow-sm"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ground border border-rule text-xs font-semibold text-text shadow-sm">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-text text-xs truncate leading-tight">{node.firstName} {node.lastName}</p>
                  <p className="text-[10px] text-text-soft truncate mt-0.5">{info?.description || roleLabel(node.role)}</p>
                </div>
              </div>
              
              {peutGerer && <button 
                onClick={() => setEditingNode(node)}
                className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity p-1.5 text-text-faint hover:text-primary rounded-full hover:bg-primary/5 -mt-1 -mr-1"
                title="Modifier les rôles et accès"
              >
                <Edit2 className="h-3 w-3" />
              </button>}
            </div>

            <div className="flex w-full items-center justify-between mt-1 pt-2 border-t border-rule/50">
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-none ${badgeClass}`}>
                {roleLabel(node.role).substring(0, 15)}{roleLabel(node.role).length > 15 ? '.' : ''}
              </span>
              
              <div className="flex items-center gap-1">
                {node.role === "TEACHER" && (() => {
                  const n = nbClasses(node.id);
                  return (
                    <button
                      type="button"
                      disabled={!peutGerer}
                      onClick={() => setEditingNode(node)}
                      className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium ${n ? "border-rule text-text-soft" : "border-warning/50 bg-warning/5 text-text"} ${peutGerer ? "hover:bg-sunk" : ""}`}
                      title={n ? "Classes & matières" : "Aucune classe : cliquez pour lui en confier"}
                    >
                      {n ? <BookOpen aria-hidden="true" className="h-3 w-3" /> : <Plus aria-hidden="true" className="h-3 w-3" />}
                      {n ? `${n} classe${n > 1 ? "s" : ""}` : "Classes"}
                    </button>
                  );
                })()}
                {(acces[node.id]?.length ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold leading-none" title="Accès en plus">
                    +{acces[node.id].length} accès
                  </span>
                )}
                {reportCount > 0 && (
                  <span className="px-1 py-0.5 rounded-full bg-sunk text-text-soft text-[9px] font-medium border border-rule leading-none">
                    +{reportCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {node.children.length > 0 && (
          <ul>
            {node.children.map((child: any) => renderNode(child))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="relative">
      {/* Styles inline pour le rendu parfait de l'arbre CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .org-tree ul {
          display: flex;
          justify-content: center;
          position: relative;
          padding-top: 24px;
        }
        .org-tree li {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 24px 12px 0 12px;
        }
        /* Ligne verticale au dessus de chaque nœud */
        .org-tree li::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #e2e8f0; /* var(--border-rule) */
          transform: translateX(-50%);
        }
        /* Ligne verticale en dessous des parents (qui descend vers les enfants) */
        .org-tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #e2e8f0;
          transform: translateX(-50%);
        }
        /* Cacher la ligne au dessus de la racine */
        .org-tree > ul { padding-top: 0; }
        .org-tree > ul::before { display: none; }
        .org-tree > ul > li::before { display: none; }
        .org-tree > ul > li { padding-top: 0; }

        /* Ligne horizontale connectant les enfants */
        .org-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          width: 100%;
          border-top: 2px solid #e2e8f0;
        }
        .org-tree li:first-child::after {
          left: 50%;
          width: 50%;
        }
        .org-tree li:last-child::after {
          right: 50%;
          width: 50%;
          left: auto;
        }
        .org-tree li:only-child::after {
          display: none;
        }
      `}} />

      <div className="overflow-x-auto pb-10 pt-4">
        <div className="min-w-max flex justify-center org-tree">
          {tree.length === 0 ? (
            <p className="text-text-soft">Aucun collaborateur trouvé.</p>
          ) : (
            <ul>
              {tree.map(renderNode)}
            </ul>
          )}
        </div>
      </div>

      {editingNode && (
        <FicheMembre
          membre={editingNode}
          membres={members}
          donnees={donnees}
          autres={autres}
          accesInitiaux={acces[editingNode.id] ?? []}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  );
}
