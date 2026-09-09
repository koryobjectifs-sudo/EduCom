"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  Power,
  Sparkles,
  Pin,
  PinOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { categoryLabel, STUDENT_KIND_LABELS, DOC_CATEGORY_LABELS } from "@/lib/studentFileLabels";
import {
  upsertRequirement,
  setRequirementActive,
  toggleRequirementPinned,
  toggleRequirementRequired,
  deleteRequirement,
  reorderRequirements,
  applyOfficialRequirements,
} from "./actions";

const CYCLES_ORDER = ["MATERNELLE", "ELEMENTAIRE", "COLLEGE", "LYCEE", "AUTRE"] as const;

const CYCLES_LABELS: Record<string, string> = {
  MATERNELLE: "Préscolaire (Maternelle)",
  ELEMENTAIRE: "Élémentaire (CI au CM2)",
  COLLEGE: "Moyen (6ème à 3ème)",
  LYCEE: "Secondaire (2nde à Terminale)",
  AUTRE: "Général / Sans cycle",
};

const CYCLES_REFERENTIEL: { cle: string; titre: string }[] = [
  { cle: "MATERNELLE", titre: "Préscolaire (Maternelle)" },
  { cle: "ELEMENTAIRE", titre: "Élémentaire (CI au CM2)" },
  { cle: "COLLEGE", titre: "Moyen (6ème à 3ème)" },
  { cle: "LYCEE", titre: "Secondaire (2nde à Terminale)" },
];

export type ReqItem = {
  id: string;
  label: string;
  category: string;
  cycle: string | null;
  classId: string | null;
  className: string | null;
  academicYear: string | null;
  studentKind: string | null;
  source: "OFFICIEL" | "ETABLISSEMENT";
  required: boolean;
  pinned: boolean;
  conditional: string | null;
  order: number;
  validityMonths: number | null;
  active: boolean;
  documentCount: number;
};

export function RequirementsClient({
  requirements,
  classes,
}: {
  requirements: ReqItem[];
  classes: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedCycleTab, setSelectedCycleTab] = useState<string>("ALL");
  const [refCycles, setRefCycles] = useState<Set<string>>(new Set(["ELEMENTAIRE"]));
  const [refBusy, setRefBusy] = useState(false);

  // Modal d'avertissement pour suppression de pièce officielle
  const [officialWarningItem, setOfficialWarningItem] = useState<ReqItem | null>(null);

  // Formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    category: "IDENTITE",
    scope: "cycle" as "school" | "cycle" | "class",
    cycle: "ELEMENTAIRE",
    classId: "",
    academicYear: "",
    studentKind: "",
    required: true,
    pinned: true,
    conditional: "",
    validity: "",
  });

  // Filtrage par cycle
  const filteredReqs = requirements.filter((r) => {
    if (selectedCycleTab === "ALL") return true;
    return r.cycle === selectedCycleTab || (!r.cycle && selectedCycleTab === "AUTRE");
  });

  // Appliquer le référentiel officiel
  function handleAppliquerReferentiel() {
    if (refCycles.size === 0) {
      toast.error("Choisissez au moins un cycle.");
      return;
    }
    setRefBusy(true);
    startTransition(async () => {
      const res = await applyOfficialRequirements([...refCycles] as never);
      setRefBusy(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const { created, skipped } = res.data!;
      toast.success(
        created === 0
          ? "Rien à ajouter : toutes les pièces figurent déjà dans votre référentiel."
          : `${created} pièce${created > 1 ? "s" : ""} officielle${created > 1 ? "s" : ""} ajoutée${created > 1 ? "s" : ""}` +
            (skipped > 0 ? ` · ${skipped} existante${skipped > 1 ? "s" : ""} conservée${skipped > 1 ? "s" : ""}.` : ".")
      );
    });
  }

  // Ajouter une exigence
  function handleAddRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.label.trim()) {
      toast.error("Le libellé de la pièce est obligatoire.");
      return;
    }
    startTransition(async () => {
      const res = await upsertRequirement({
        label: formData.label,
        category: formData.category as never,
        cycle: formData.scope === "cycle" ? (formData.cycle as never) : null,
        classId: formData.scope === "class" ? formData.classId || null : null,
        academicYear: formData.academicYear || null,
        studentKind: (formData.studentKind || null) as never,
        source: "ETABLISSEMENT",
        required: formData.required,
        pinned: formData.pinned,
        conditional: formData.conditional.trim() || null,
        validityMonths: formData.validity ? Number(formData.validity) : null,
        position: requirements.length + 1,
        order: requirements.length + 1,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Nouvelle pièce ajoutée à la checklist.");
      setFormData({
        label: "",
        category: "IDENTITE",
        scope: "cycle",
        cycle: selectedCycleTab !== "ALL" ? selectedCycleTab : "ELEMENTAIRE",
        classId: "",
        academicYear: "",
        studentKind: "",
        required: true,
        pinned: true,
        conditional: "",
        validity: "",
      });
      setShowAddForm(false);
    });
  }

  // Toggles rapides
  function handleToggleActive(r: ReqItem) {
    startTransition(async () => {
      const res = await setRequirementActive(r.id, !r.active);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(r.active ? "Exigence désactivée." : "Exigence réactivée.");
    });
  }

  function handleTogglePinned(r: ReqItem) {
    startTransition(async () => {
      const res = await toggleRequirementPinned(r.id, !r.pinned);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(r.pinned ? "Pièce retirée des colonnes épinglées." : "Pièce épinglée en colonne visible.");
    });
  }

  function handleToggleRequired(r: ReqItem) {
    startTransition(async () => {
      const res = await toggleRequirementRequired(r.id, !r.required);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(r.required ? "Pièce rendue optionnelle." : "Pièce rendue obligatoire.");
    });
  }

  function handleDeleteClick(r: ReqItem) {
    if (r.source === "OFFICIEL") {
      setOfficialWarningItem(r);
      return;
    }
    if (confirm(`Voulez-vous vraiment supprimer définitivement « ${r.label} » ?`)) {
      startTransition(async () => {
        const res = await deleteRequirement(r.id);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Pièce supprimée.");
      });
    }
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredReqs.length) return;

    const list = [...filteredReqs];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((item, idx) => ({ id: item.id, position: idx + 1 }));

    startTransition(async () => {
      const res = await reorderRequirements(reordered);
      if (res.error) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── BANDEAU RÉFÉRENTIEL OFFICIEL SÉNÉGALAIS ── */}
      <Card
        title="Référentiel réglementaire officiel"
        description="Générez ou restaurez les pièces d'inscription officielles sénégalaises par cycle (extrait de naissance, certificat de scolarité, quitus, etc.)."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {CYCLES_REFERENTIEL.map(({ cle, titre }) => {
              const checked = refCycles.has(cle);
              return (
                <label
                  key={cle}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                    checked
                      ? "border-primary bg-primary/5 text-primary shadow-2xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(refCycles);
                      if (e.target.checked) next.add(cle);
                      else next.delete(cle);
                      setRefCycles(next);
                    }}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>{titre}</span>
                </label>
              );
            })}
          </div>
          <Button
            size="sm"
            loading={refBusy || pending}
            disabled={refCycles.size === 0}
            onClick={handleAppliquerReferentiel}
            className="rounded-xl shadow-2xs"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4 mr-1.5" />
            <span>Appliquer / Mettre à jour le référentiel</span>
          </Button>
        </div>
      </Card>

      {/* ── ONGLETS PAR CYCLE & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedCycleTab("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCycleTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tous les cycles ({requirements.length})
          </button>
          {CYCLES_ORDER.map((c) => {
            const count = requirements.filter((r) => r.cycle === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCycleTab(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCycleTab === c
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {c === "MATERNELLE"
                  ? "Préscolaire"
                  : c === "ELEMENTAIRE"
                  ? "Élémentaire"
                  : c === "COLLEGE"
                  ? "Moyen"
                  : c === "LYCEE"
                  ? "Secondaire"
                  : "Autre"}{" "}
                ({count})
              </button>
            );
          })}
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-xl self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>{showAddForm ? "Fermer le formulaire" : "Ajouter une pièce"}</span>
        </Button>
      </div>

      {/* ── FORMULAIRE D'AJOUT ── */}
      {showAddForm && (
        <Card title="Ajouter une pièce personnalisée" description="Définissez une exigence propre à votre établissement.">
          <form onSubmit={handleAddRequirement} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Libellé de la pièce *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fiche d'engagement financier"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Catégorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(DOC_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Cycle concerné</label>
                <select
                  value={formData.cycle}
                  onChange={(e) => setFormData({ ...formData, cycle: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="MATERNELLE">Préscolaire (Maternelle)</option>
                  <option value="ELEMENTAIRE">Élémentaire (CI au CM2)</option>
                  <option value="COLLEGE">Moyen (6ème à 3ème)</option>
                  <option value="LYCEE">Secondaire (2nde à Terminale)</option>
                  <option value="AUTRE">Tout l'établissement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Condition particulière (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: exeat si transfert, age < 6"
                  value={formData.conditional}
                  onChange={(e) => setFormData({ ...formData, conditional: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Pièce obligatoire (bloquante pour la complétude)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Épingler en colonne visible dans le tableau</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
              <Button size="sm" type="submit" loading={pending}>
                Enregistrer la pièce
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── LISTE DES PIÈCES EXIGÉES ── */}
      <Card
        title="Checklist et colonnes du tableau"
        description="Activez, épinglez ou réordonnez les pièces pour configurer les colonnes du tableau d'examen des admissions."
      >
        {filteredReqs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Aucune pièce configurée pour ce filtre.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReqs.map((r, idx) => (
              <div
                key={r.id}
                className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  !r.active ? "opacity-60 bg-slate-50/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Flèches de réordonnancement */}
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button
                      type="button"
                      disabled={idx === 0 || pending}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100"
                      title="Monter"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === filteredReqs.length - 1 || pending}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100"
                      title="Descendre"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Libellé et badges */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold ${r.active ? "text-slate-900" : "text-slate-400 line-through"}`}>
                        {r.label}
                      </span>

                      {/* Source */}
                      {r.source === "OFFICIEL" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                          Officiel
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Établissement
                        </span>
                      )}

                      {/* Obligatoire / Optionnel */}
                      {r.required ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Obligatoire
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-medium">
                          Optionnel
                        </span>
                      )}

                      {/* Épinglé */}
                      {r.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                          <Pin className="h-2.5 w-2.5" />
                          <span>Colonne épinglée</span>
                        </span>
                      )}

                      {/* Catégorie */}
                      <span className="text-[10px] text-slate-400">
                        {categoryLabel(r.category)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>{r.cycle ? CYCLES_LABELS[r.cycle] || r.cycle : "Tout l'établissement"}</span>
                      {r.conditional && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                            Condition : {r.conditional}
                          </span>
                        </>
                      )}
                      {r.documentCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{r.documentCount} document{r.documentCount > 1 ? "s" : ""} déposé{r.documentCount > 1 ? "s" : ""}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions sur la ligne */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  {/* Bouton Épingler / Désépingler */}
                  <button
                    type="button"
                    onClick={() => handleTogglePinned(r)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      r.pinned
                        ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                    title={r.pinned ? "Retirer de la vue en colonnes épinglées" : "Épingler en colonne directe dans le tableau"}
                  >
                    {r.pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                  </button>

                  {/* Bouton Requis / Optionnel */}
                  <button
                    type="button"
                    onClick={() => handleToggleRequired(r)}
                    className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors"
                  >
                    {r.required ? "Rendre optionnel" : "Rendre obligatoire"}
                  </button>

                  {/* Bouton Activer / Désactiver */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(r)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      r.active
                        ? "border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                    title={r.active ? "Désactiver temporairement" : "Réactiver"}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>

                  {/* Bouton Supprimer */}
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(r)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                    title={r.source === "OFFICIEL" ? "Information sur la suppression" : "Supprimer définitivement"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── MODAL AVERTISSEMENT SUPPRESSION PIÈCE OFFICIELLE ── */}
      {officialWarningItem && (
        <Modal
          open={true}
          onClose={() => setOfficialWarningItem(null)}
          title="Pièce réglementaire officielle"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-amber-900">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">
                  « {officialWarningItem.label} » est une exigence réglementaire sénégalaise.
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Cette pièce fait partie des documents officiels requis par le Ministère de l'Éducation nationale pour l'inscription et la présentation aux examens. Elle ne peut pas être supprimée du référentiel.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Conséquence :</strong> Si votre établissement ne souhaite pas exiger cette pièce à l'inscription, vous pouvez :
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>La <strong>rendre optionnelle</strong> : elle n'impactera plus la complétude des dossiers.</li>
              <li>La <strong>désactiver</strong> : elle disparaîtra de la checklist active sans effacer les documents déjà reçus.</li>
            </ul>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="ghost" onClick={() => setOfficialWarningItem(null)}>
                Compris
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  handleToggleRequired(officialWarningItem);
                  setOfficialWarningItem(null);
                }}
              >
                Rendre optionnelle
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  handleToggleActive(officialWarningItem);
                  setOfficialWarningItem(null);
                }}
              >
                Désactiver la pièce
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
