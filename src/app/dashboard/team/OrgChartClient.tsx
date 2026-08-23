"use client";

import { useMemo, useState, useActionState } from "react";
import { roleLabel, ROLE_LABELS, type RoleType } from "@/lib/permissions";
import { updateStaffMember } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { X, Save, Edit2 } from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  managerId: string | null;
  email?: string;
}

const ASSIGNABLE: RoleType[] = ["TEACHER", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "ADMIN"];

export default function OrgChartClient({ members }: { members: User[] }) {
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

  const [state, formAction, isPending] = useActionState<any, any>(
    async (prevState: any, formData: FormData) => {
      const res = await updateStaffMember(formData);
      if (res?.success) {
        setEditingNode(null);
      }
      return res;
    },
    { error: "", success: false }
  );

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
          <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-rule bg-surface p-4 shadow-sm transition-all hover:shadow-md w-[260px] text-center">
            
            <div className="flex w-full items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ground border border-rule font-semibold text-text shadow-sm">
                {initials}
              </span>
              
              <button 
                onClick={() => setEditingNode(node)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-text-faint hover:text-primary rounded-full hover:bg-primary/5"
                title="Modifier les rôles et accès"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            <div className="text-left w-full mt-1">
              <p className="font-semibold text-text text-base truncate">{node.firstName} {node.lastName}</p>
              <p className="text-sm text-text-soft truncate">{info?.description || roleLabel(node.role)}</p>
            </div>

            <div className="flex w-full items-center justify-between mt-2 pt-3 border-t border-rule/50">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                {roleLabel(node.role)}
              </span>
              
              {reportCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-sunk text-text-soft text-xs font-medium border border-rule">
                  +{reportCount}
                </span>
              )}
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

      {/* MODAL POUR EDITER */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-text">Modifier l'accès</h2>
                <p className="text-sm text-text-soft">{editingNode.firstName} {editingNode.lastName}</p>
              </div>
              <button 
                onClick={() => setEditingNode(null)}
                className="rounded-full p-2 text-text-faint hover:bg-sunk hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form action={formAction} className="p-6 space-y-5">
              <input type="hidden" name="userId" value={editingNode.id} />
              
              {editingNode.role === "OWNER" ? (
                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                  Le rôle et la hiérarchie du propriétaire principal ne peuvent pas être modifiés.
                </div>
              ) : (
                <>
                  <Select label="Rôle (Définit les accès)" required id="role" name="role" defaultValue={editingNode.role}>
                    <option value="ADMIN">Direction (ADMIN)</option>
                    {ASSIGNABLE.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r].label} — {ROLE_LABELS[r].description}
                      </option>
                    ))}
                  </Select>

                  <Select label="Responsable hiérarchique" id="managerId" name="managerId" defaultValue={editingNode.managerId || ""}>
                    <option value="">Au sommet de la hiérarchie</option>
                    {members
                      .filter(m => m.id !== editingNode.id) // Cannot be own manager
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({roleLabel(m.role)})
                        </option>
                      ))}
                  </Select>

                  {state?.error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                      {state.error}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 gap-3">
                    <Button type="button" variant="ghost" onClick={() => setEditingNode(null)}>
                      Annuler
                    </Button>
                    <Button type="submit" loading={isPending} icon={<Save className="h-4 w-4" />}>
                      Enregistrer
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
