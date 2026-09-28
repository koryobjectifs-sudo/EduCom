"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { roleLabel } from "@/lib/permissions";
import type { ConfigEnseignant, DonneesEquipe } from "@/lib/equipe";
import { modifierMembre } from "./equipe-actions";
import { BlocAcces, BlocClasses, BlocMetier, type Autres } from "./BlocsMembre";

/**
 * Fiche membre — mêmes blocs que le parcours d'ajout (Métier · Classes &
 * matières · Accès en plus), modifiables à tout moment. Un seul « Enregistrer ».
 */
export type Membre = { id: string; firstName: string; lastName: string; role: string; managerId: string | null; email?: string };

export default function FicheMembre({
  membre,
  membres,
  donnees,
  autres,
  accesInitiaux,
  onClose,
}: {
  membre: Membre;
  membres: Membre[];
  donnees: DonneesEquipe;
  autres: Autres;
  accesInitiaux: string[];
  onClose: () => void;
}) {
  const proprietaire = membre.role === "OWNER";
  const [role, setRole] = useState(membre.role);
  const [managerId, setManagerId] = useState(membre.managerId ?? "");
  const [config, setConfig] = useState<ConfigEnseignant>(() => ({
    titulaire: donnees.classes.filter((c) => c.titulaireId === membre.id).map((c) => c.id),
    matieres: autres.affectations.filter((a) => a.teacherId === membre.id && a.subjectId).map((a) => ({ classId: a.classId, subjectId: a.subjectId! })),
  }));
  const [acces, setAcces] = useState<string[]>(accesInitiaux);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const [onglet, setOnglet] = useState<"metier" | "classes" | "acces">(membre.role === "TEACHER" ? "classes" : "metier");

  const enseignant = role === "TEACHER";
  const quitteEnseignement = membre.role === "TEACHER" && !enseignant;

  const enregistrer = () =>
    demarrer(async () => {
      setErreur("");
      const r = await modifierMembre({ userId: membre.id, role, managerId: managerId || null, config, acces });
      if (!r.ok) return setErreur(r.error);
      onClose();
    });

  const onglets = [
    { id: "metier" as const, nom: "Métier" },
    ...(enseignant ? [{ id: "classes" as const, nom: "Classes & matières" }] : []),
    { id: "acces" as const, nom: "Accès en plus" },
  ];
  const actif = onglets.some((o) => o.id === onglet) ? onglet : "metier";

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!enCours}
      size="lg"
      title={`${membre.firstName} ${membre.lastName}`}
      description={`${roleLabel(membre.role)}${membre.email ? ` · ${membre.email}` : ""}`}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={enCours}>
            Annuler
          </Button>
          <Button onClick={enregistrer} loading={enCours}>
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div role="tablist" className="flex gap-1 border-b border-rule">
          {onglets.map((o) => (
            <button
              key={o.id}
              role="tab"
              type="button"
              aria-selected={actif === o.id}
              onClick={() => setOnglet(o.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-role-label font-medium ${actif === o.id ? "border-primary text-text" : "border-transparent text-text-soft hover:text-text"}`}
            >
              {o.nom}
            </button>
          ))}
        </div>

        {actif === "metier" && (
          <div className="space-y-4">
            {proprietaire ? (
              <p className="rounded-xl bg-sunk p-3 text-role-body text-text-soft">Propriétaire de l&apos;établissement : son métier ne change pas.</p>
            ) : (
              <BlocMetier role={role} onChange={setRole} />
            )}
            {quitteEnseignement && (
              <p className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-role-meta text-text">
                En quittant le métier d&apos;enseignant, ses classes et matières lui seront retirées.
              </p>
            )}
            <label className="block text-role-label text-text">
              <span className="mb-1 block font-semibold">Responsable hiérarchique</span>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="h-9 w-full rounded-control border border-rule bg-surface px-2 text-role-label">
                <option value="">Au sommet de l&apos;organigramme</option>
                {membres
                  .filter((m) => m.id !== membre.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({roleLabel(m.role)})
                    </option>
                  ))}
              </select>
            </label>
          </div>
        )}

        {actif === "classes" && <BlocClasses donnees={donnees} config={config} onChange={setConfig} moi={membre.id} autres={autres} />}

        {actif === "acces" && <BlocAcces role={role} acces={acces} onChange={setAcces} />}

        {erreur && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-role-label text-danger">{erreur}</p>}
      </div>
    </Modal>
  );
}
