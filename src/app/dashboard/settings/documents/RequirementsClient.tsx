"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Power, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { categoryLabel, STUDENT_KIND_LABELS, DOC_CATEGORY_LABELS } from "@/lib/studentFileLabels";
import { upsertRequirement, setRequirementActive, applyOfficialRequirements } from "./actions";

const CYCLES = ["MATERNELLE", "ELEMENTAIRE", "COLLEGE", "LYCEE", "AUTRE"];

/** Cycles couverts par `src/lib/officialRequirements.ts`. `AUTRE` n'en a pas. */
const CYCLES_REFERENTIEL: { cle: string; titre: string }[] = [
  { cle: "MATERNELLE", titre: "Préscolaire (Maternelle)" },
  { cle: "ELEMENTAIRE", titre: "Élémentaire (CI au CM2)" },
  { cle: "COLLEGE", titre: "Moyen (6ème à 3ème)" },
  { cle: "LYCEE", titre: "Secondaire (2nde à Terminale)" },
];
const KINDS = ["NOUVEAU", "ANCIEN", "TRANSFERT"];

type Req = {
  id: string; label: string; category: string; cycle: string | null; classId: string | null;
  className: string | null; academicYear: string | null; studentKind: string | null;
  validityMonths: number | null; active: boolean; documentCount: number;
};

export function RequirementsClient({
  requirements, classes,
}: { requirements: Req[]; classes: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const [refCycles, setRefCycles] = useState<Set<string>>(new Set());
  const [refBusy, setRefBusy] = useState(false);
  const [d, setD] = useState({
    label: "", category: "IDENTITE", scope: "school" as "school" | "cycle" | "class",
    cycle: "ELEMENTAIRE", classId: "", academicYear: "", studentKind: "", validity: "",
  });

  function appliquerReferentiel() {
    if (refCycles.size === 0) { toast.error("Choisissez au moins un cycle."); return; }
    setRefBusy(true);
    void (async () => {
      const r = await applyOfficialRequirements([...refCycles] as never);
      setRefBusy(false);
      if (r.error) { toast.error(r.error); return; }
      const { created, skipped } = r.data!;
      toast.success(
        created === 0
          ? "Rien à ajouter : ces pièces figurent déjà dans votre checklist."
          : `${created} pièce${created > 1 ? "s" : ""} ajoutée${created > 1 ? "s" : ""}` +
            (skipped > 0 ? ` · ${skipped} déjà présente${skipped > 1 ? "s" : ""}, conservée${skipped > 1 ? "s" : ""} telle${skipped > 1 ? "s" : ""} quelle${skipped > 1 ? "s" : ""}.` : "."),
      );
      setRefCycles(new Set());
    })();
  }

  function add() {
    if (!d.label.trim()) { toast.error("Le libellé est obligatoire."); return; }
    start(async () => {
      const r = await upsertRequirement({
        label: d.label,
        category: d.category as never,
        cycle: d.scope === "cycle" ? (d.cycle as never) : null,
        classId: d.scope === "class" ? d.classId || null : null,
        academicYear: d.academicYear || null,
        studentKind: (d.studentKind || null) as never,
        validityMonths: d.validity ? Number(d.validity) : null,
        position: requirements.length,
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success("Exigence ajoutée.");
      setD({ ...d, label: "", validity: "" });
    });
  }

  function toggle(r: Req) {
    start(async () => {
      const res = await setRequirementActive(r.id, !r.active);
      if (res.error) { toast.error(res.error); return; }
      toast.success(r.active ? "Exigence désactivée." : "Exigence réactivée.");
    });
  }

  const field = "h-9 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-6">
      {/* ───────────── RÉFÉRENTIEL OFFICIEL ─────────────
          ⚠️ Une PROPOSITION, jamais une règle : rien n'est écrit tant que la
          direction ne coche pas un cycle et ne clique pas « Appliquer ». Une
          fois créées, ces exigences sont des lignes ordinaires — modifiables,
          désactivables — comme celles saisies à la main juste en dessous. */}
      <Card
        title="Référentiel officiel sénégalais"
        description="Pièces habituellement demandées à l'inscription, par cycle. Cochez ce qui s'applique chez vous — rien n'est ajouté sans votre confirmation, et les exigences déjà présentes ne sont jamais dupliquées."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {CYCLES_REFERENTIEL.map(({ cle, titre }) => {
              const coche = refCycles.has(cle);
              return (
                <label
                  key={cle}
                  className={`flex cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-role-body transition-colors ${
                    coche ? "border-primary bg-primary/5 text-text" : "border-rule text-text-soft hover:bg-sunk"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={coche}
                    onChange={(e) => {
                      const next = new Set(refCycles);
                      if (e.target.checked) next.add(cle); else next.delete(cle);
                      setRefCycles(next);
                    }}
                    className="rounded border-rule text-primary focus:ring-primary/40"
                  />
                  <span className="font-medium">{titre}</span>
                </label>
              );
            })}
          </div>
          <Button size="sm" loading={refBusy} disabled={refCycles.size === 0} onClick={appliquerReferentiel}>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Appliquer aux cycles cochés
          </Button>
        </div>
      </Card>

      {requirements.length > 0 && (
        <Card title="Pièces exigées" description="Désactiver conserve les pièces déjà reçues à ce titre.">
          <ul className="space-y-2">
            {requirements.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-control border border-rule px-3 py-2">
                <span className={`font-medium ${r.active ? "text-text" : "text-text-faint line-through"}`}>{r.label}</span>
                <Badge size="sm">{categoryLabel(r.category)}</Badge>
                <span className="text-role-meta text-text-soft">
                  {r.className ? `classe ${r.className}` : r.cycle ? `cycle ${r.cycle}` : "tout l'établissement"}
                  {r.academicYear && ` · ${r.academicYear}`}
                  {r.studentKind && ` · ${STUDENT_KIND_LABELS[r.studentKind as keyof typeof STUDENT_KIND_LABELS]}`}
                  {r.validityMonths && ` · valide ${r.validityMonths} mois`}
                  {r.documentCount > 0 && ` · ${r.documentCount} pièce(s) reçue(s)`}
                </span>
                {!r.active && <Badge size="sm" variant="neutral">Désactivée</Badge>}
                <Button size="sm" variant="ghost" className="ml-auto" loading={pending} onClick={() => toggle(r)}>
                  <Power aria-hidden="true" className="h-4 w-4" />
                  {r.active ? "Désactiver" : "Réactiver"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Ajouter une pièce exigée">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-role-meta text-text-soft">Libellé</span>
            <input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })}
              placeholder="ex. Extrait de naissance" className={`${field} w-56`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-role-meta text-text-soft">Catégorie</span>
            <select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} className={field}>
              {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-role-meta text-text-soft">Portée</span>
            <select value={d.scope} onChange={(e) => setD({ ...d, scope: e.target.value as typeof d.scope })} className={field}>
              <option value="school">Tout l&apos;établissement</option>
              <option value="cycle">Un cycle</option>
              <option value="class">Une classe</option>
            </select>
          </label>
          {d.scope === "cycle" && (
            <select value={d.cycle} onChange={(e) => setD({ ...d, cycle: e.target.value })} className={field}>
              {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {d.scope === "class" && (
            <select value={d.classId} onChange={(e) => setD({ ...d, classId: e.target.value })} className={field}>
              <option value="">— choisir —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-role-meta text-text-soft">Type d&apos;élève</span>
            <select value={d.studentKind} onChange={(e) => setD({ ...d, studentKind: e.target.value })} className={field}>
              <option value="">Tous</option>
              {KINDS.map((k) => <option key={k} value={k}>{STUDENT_KIND_LABELS[k as keyof typeof STUDENT_KIND_LABELS]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-role-meta text-text-soft">Année (option.)</span>
            <input value={d.academicYear} onChange={(e) => setD({ ...d, academicYear: e.target.value })}
              placeholder="2025-2026" className={`${field} w-32`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-role-meta text-text-soft">Validité (mois)</span>
            <input type="number" min="1" value={d.validity} onChange={(e) => setD({ ...d, validity: e.target.value })}
              className={`${field} w-28 tabular-nums`} />
          </label>
          <Button size="md" loading={pending} onClick={add}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </Card>
    </div>
  );
}
