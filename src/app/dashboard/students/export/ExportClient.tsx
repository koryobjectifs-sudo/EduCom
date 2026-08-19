"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Package, CheckCircle2, AlertTriangle, Clock, Send, History, Download,
  Users, FileWarning, Lock, Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { formatSize } from "@/lib/studentFileLabels";
import { prepareExport, preparationTable, markTransmitted, listTransmissions } from "./actions";

/**
 * Préparation, export et transmission des dossiers. Lot 16.
 *
 * ═══ TROIS ACTES DISTINCTS, JAMAIS CONFONDUS ═══
 *
 *   Préparer     regarder ce qui partirait, et ce qui manque
 *   Exporter     télécharger une archive
 *   Transmettre  DÉCLARER qu'on l'a remise — un acte humain, séparé
 *
 * ⚠️ Télécharger ne marque rien comme transmis. Un secrétaire qui vérifie un
 * dossier le déclarerait sinon transmis sans le savoir, et le tableau de suivi
 * deviendrait faux le jour où on en a le plus besoin.
 *
 * ⚠️ **EduCom n'envoie rien à personne.** Aucune administration n'est connectée.
 * L'écran n'écrit jamais « transmis à l'Inspection » — seulement « transmission
 * manuelle enregistrée », ce qui est exactement ce qui s'est produit.
 */

type PrepRow = {
  studentId: string; name: string; className: string | null; state: string;
  required: number; received: number; missing: number; toVerify: number;
  transmitted: boolean; documents: number; excludedCategories: string[];
};

type Prep = NonNullable<Awaited<ReturnType<typeof preparationTable>>["data"]>;
type Summary = NonNullable<Awaited<ReturnType<typeof prepareExport>>["data"]>;
type Transmissions = NonNullable<Awaited<ReturnType<typeof listTransmissions>>["data"]>;

const STATE_STYLE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  PRET: { label: "Prêt", variant: "success" },
  A_VERIFIER: { label: "À vérifier", variant: "warning" },
  INCOMPLET: { label: "Incomplet", variant: "danger" },
  NON_CONFIGURE: { label: "Checklist non configurée", variant: "neutral" },
};

const REASON_LABEL: Record<string, string> = {
  MISSING: "jamais reçue",
  REJECTED: "rejetée, à refournir",
  EXPIRED: "expirée, à renouveler",
};

export function ExportClient({
  classes, selectedClassId, students, academicYear,
}: {
  classes: { id: string; name: string; cycle: string; students: number }[];
  selectedClassId: string | null;
  students: { id: string; name: string }[];
  academicYear: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // ⚠️ Lot 16.1 — chargement du tableau SÉPARÉ des actions de l'utilisateur.
  // Auparavant tout partageait un seul `useTransition` : or `Button` applique
  // `disabled={disabled || loading}`, donc pendant les 2 à 5 secondes de lecture
  // des dossiers, **tous** les boutons de l'écran étaient inertes. Mesuré au
  // pilote Chrome : le clic sur « Préparer l'export » ne faisait rien. Sur une
  // connexion faible, c'est un écran figé sans explication.
  const [loadingTable, setLoadingTable] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prep, setPrep] = useState<Prep | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [includeVersions, setIncludeVersions] = useState(false);
  const [transmitOpen, setTransmitOpen] = useState(false);
  const [history, setHistory] = useState<Transmissions | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

  // L'état de préparation est chargé pour la classe affichée, pas pour l'école.
  useEffect(() => {
    setSelected(new Set()); setPrep(null); setSummary(null); setDownloaded(false);
    if (students.length === 0) return;
    let cancelled = false;
    setLoadingTable(true);
    void (async () => {
      const r = await preparationTable(students.map((s) => s.id));
      if (cancelled) return;
      setLoadingTable(false);
      if (r.error) { toast.error(r.error); return; }
      setPrep(r.data!);
    })();
    // Changer de classe pendant un chargement ne doit pas écraser le résultat
    // de la nouvelle par celui de l'ancienne.
    return () => { cancelled = true; };
  }, [selectedClassId, students.length]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
    setSummary(null); setDownloaded(false);
  }

  function preparer() {
    if (selected.size === 0) { toast.error("Sélectionnez au moins un dossier."); return; }
    start(async () => {
      const r = await prepareExport([...selected]);
      if (r.error) { toast.error(r.error); return; }
      setSummary(r.data!);
    });
  }

  function telecharger() {
    if (!summary) return;
    const url = new URL("/dashboard/students/export/download", window.location.origin);
    url.searchParams.set("students", [...selected].join(","));
    if (includeVersions) url.searchParams.set("versions", "1");
    if (selectedClass) url.searchParams.set("label", selectedClass.name);
    // Le téléchargement passe par la route en flux : rien ne transite par la
    // mémoire de cette page.
    window.location.href = url.toString();
    setDownloaded(true);
  }

  function enregistrerTransmission(form: HTMLFormElement) {
    const fd = new FormData(form);
    start(async () => {
      const r = await markTransmitted({
        studentIds: [...selected],
        destination: String(fd.get("destination") ?? ""),
        note: String(fd.get("note") ?? ""),
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success(`Transmission manuelle enregistrée pour ${r.data!.count} dossier(s).`);
      setTransmitOpen(false);
      const h = await listTransmissions();
      if (!h.error) setHistory(h.data!);
      router.refresh();
      setLoadingTable(true);
      const t = await preparationTable(students.map((s) => s.id));
      setLoadingTable(false);
      if (!t.error) setPrep(t.data!);
    });
  }

  function chargerHistorique() {
    start(async () => {
      const r = await listTransmissions();
      if (r.error) { toast.error(r.error); return; }
      setHistory(r.data!);
    });
  }

  const rows: PrepRow[] = prep?.rows ?? [];
  const counts = prep?.counts;

  return (
    <div className="space-y-5">
      {/* ─── CHOIX DE LA CLASSE ─── */}
      <Card title="Classe" description="Les dossiers se préparent classe par classe.">
        {classes.length === 0 ? (
          <EmptyState size="sm" icon={Users} title="Aucune classe accessible"
            description="Aucun élève de votre périmètre n'est inscrit dans une classe." />
        ) : (
          <Select
            label="Classe à préparer"
            value={selectedClassId ?? ""}
            onChange={(e) => router.push(e.target.value ? `?class=${e.target.value}` : "?")}
          >
            <option value="">Choisir une classe…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.students} inscription(s)</option>
            ))}
          </Select>
        )}
      </Card>

      {/* ─── TABLEAU DE PRÉPARATION ─── */}
      {selectedClassId && (
        <Card
          title="État des dossiers"
          description={
            counts
              ? `Chiffres calculés sur les ${rows.length} élève(s) de ${selectedClass?.name ?? "cette classe"} — pas sur l'établissement entier.`
              : "Calcul en cours…"
          }
          actions={
            rows.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(rows.map((r) => r.studentId)))}>
                  Tout sélectionner
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Aucun</Button>
              </div>
            ) : undefined
          }
        >
          {loadingTable || !prep ? (
            <p className="text-role-meta text-text-soft">Lecture des dossiers…</p>
          ) : rows.length === 0 ? (
            <EmptyState size="sm" icon={Users} title="Aucun élève" description="Cette classe ne contient aucun élève de votre périmètre." />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {([
                  ["Prêts", counts!.ready, CheckCircle2, "text-success"],
                  ["Incomplets", counts!.incomplete, AlertTriangle, "text-danger"],
                  ["À vérifier", counts!.toVerify, Clock, "text-warning"],
                  ["Transmis", counts!.transmitted, Send, "text-text-soft"],
                ] as const).map(([label, n, Icon, tone]) => (
                  <div key={label} className="flex items-center gap-2 rounded-control border border-rule px-3 py-2">
                    <Icon aria-hidden="true" className={`h-4 w-4 ${tone}`} />
                    <span className="text-role-body font-semibold tabular-nums text-text">{n}</span>
                    <span className="text-role-meta text-text-soft">{label}</span>
                  </div>
                ))}
                {counts!.unconfigured > 0 && (
                  <div className="flex items-center gap-2 rounded-control border border-rule px-3 py-2">
                    <Info aria-hidden="true" className="h-4 w-4 text-text-faint" />
                    <span className="text-role-meta text-text-soft">
                      {counts!.unconfigured} sans checklist — complétude non calculable
                    </span>
                  </div>
                )}
              </div>

              {prep.truncated && (
                <p className="text-role-meta text-warning">
                  Seuls les {prep.limit} premiers élèves sont analysés : au-delà, le calcul deviendrait trop lourd.
                </p>
              )}

              {/*
                ⚠️ Lot 16.1 — la LIGNE ENTIÈRE est la cible tactile. Une case de
                16 px, mesurée au pilote Chrome, se rate une fois sur trois au
                doigt ; le `<label>` enveloppant offre toute la hauteur de la
                ligne, et la case passe à 20 px.
              */}
              <ul className="space-y-1.5">
                {rows.map((r) => (
                  <li key={r.studentId} className="rounded-control border border-rule">
                    <label className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.studentId)}
                      onChange={() => toggle(r.studentId)}
                      aria-label={`Sélectionner le dossier de ${r.name}`}
                      className="h-5 w-5 shrink-0"
                    />
                    <span className="font-medium text-text">{r.name}</span>
                    <Badge size="sm" variant={STATE_STYLE[r.state]?.variant ?? "neutral"}>
                      {STATE_STYLE[r.state]?.label ?? r.state}
                    </Badge>
                    {r.transmitted && <Badge size="sm" variant="info">Transmis</Badge>}
                    <span className="text-role-meta text-text-soft">
                      {r.documents} pièce(s)
                      {r.required > 0 && ` · ${r.received}/${r.required} exigées`}
                      {r.missing > 0 && ` · ${r.missing} manquante(s)`}
                    </span>
                    {r.excludedCategories.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-role-meta text-text-faint">
                        <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                        {r.excludedCategories.length} catégorie(s) hors de votre périmètre
                      </span>
                    )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* ─── PRÉPARATION ─── */}
      {selected.size > 0 && (
        <Card
          title="Export"
          description={`${selected.size} dossier(s) sélectionné(s) · année ${academicYear}`}
        >
          <div className="space-y-3">
            <label className="flex items-start gap-3 text-role-meta text-text-soft">
              <input type="checkbox" checked={includeVersions} onChange={(e) => setIncludeVersions(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                Inclure les <strong>versions antérieures</strong> des pièces remplacées.
                Elles sont rangées à part, jamais mêlées aux pièces courantes.
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button loading={pending} onClick={preparer}>
                <Package aria-hidden="true" className="h-4 w-4" /> Préparer l&apos;export
              </Button>
              {summary && (
                <Button variant="secondary" onClick={telecharger}>
                  <Download aria-hidden="true" className="h-4 w-4" /> Télécharger le ZIP
                </Button>
              )}
              {summary && (
                <Button variant="ghost" onClick={() => setTransmitOpen(true)}>
                  <Send aria-hidden="true" className="h-4 w-4" /> Enregistrer une transmission
                </Button>
              )}
            </div>

            {summary && (
              <div className="space-y-2 rounded-control border border-rule px-3 py-3">
                <p className="text-role-body font-semibold text-text">
                  {summary.students.length} dossier(s) · {summary.documentCount} pièce(s) · {formatSize(summary.totalBytes)}
                </p>
                {summary.accessible < summary.requested && (
                  <p className="text-role-meta text-warning">
                    {summary.requested - summary.accessible} dossier(s) écarté(s) : hors de votre périmètre.
                  </p>
                )}
                {summary.missingTotal > 0 ? (
                  <>
                    <p className="flex items-center gap-2 text-role-meta text-text-soft">
                      <FileWarning aria-hidden="true" className="h-4 w-4 text-warning" />
                      {summary.missingTotal} pièce(s) manquante(s) — l&apos;export reste possible, et l&apos;archive
                      le dira dans son résumé. Un ZIP produit ne rend pas un dossier complet.
                    </p>
                    <ul className="space-y-1">
                      {summary.students.filter((s) => s.missing.length > 0).map((s) => (
                        <li key={s.studentId} className="text-role-meta text-text-soft">
                          <span className="font-medium text-text">{s.name}</span> —{" "}
                          {s.missing.map((m) => `${m.label} (${REASON_LABEL[m.reason] ?? m.reason})`).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-role-meta text-success">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Aucune pièce ne manque dans la sélection.
                  </p>
                )}
                {summary.students.some((s) => s.excludedCategories.length > 0) && (
                  <p className="flex items-start gap-2 text-role-meta text-text-soft">
                    <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
                    Catégories exclues par vos droits :{" "}
                    {[...new Set(summary.students.flatMap((s) => s.excludedCategories))].join(", ")}.
                    Elles n&apos;entreront pas dans l&apos;archive.
                  </p>
                )}
                {downloaded && (
                  <p className="text-role-meta text-text-soft">
                    Archive téléchargée. <strong>Cela ne vaut pas transmission</strong> — enregistrez-la
                    séparément une fois qu&apos;elle a réellement été remise.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── HISTORIQUE ─── */}
      <Card
        title="Transmissions enregistrées"
        description="Ce qu'une personne a déclaré avoir remis, et quand."
        actions={<Button size="sm" variant="ghost" loading={pending} onClick={chargerHistorique}>
          <History aria-hidden="true" className="h-4 w-4" /> Afficher
        </Button>}
      >
        {history === null ? (
          <p className="text-role-meta text-text-soft">Cliquez sur « Afficher » pour lire l&apos;historique.</p>
        ) : history.length === 0 ? (
          <EmptyState size="sm" icon={Send} title="Aucune transmission enregistrée"
            description="Aucun dossier n'a encore été déclaré transmis." />
        ) : (
          <ul className="space-y-2">
            {history.map((t) => (
              <li key={t.id} className="rounded-control border border-rule px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-text">{t.count} dossier(s)</span>
                  <Badge size="sm" variant="neutral">Transmission manuelle</Badge>
                  {t.destination && <span className="text-role-meta text-text-soft">→ {t.destination}</span>}
                  <span className="ml-auto text-role-meta tabular-nums text-text-faint">
                    {new Date(t.at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <p className="mt-0.5 text-role-meta text-text-soft">
                  par {t.who}
                  {t.note && ` · ${t.note}`}
                  {t.students.length > 0 && ` · ${t.students.map((s) => s.name).join(", ")}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ─── MODALE DE TRANSMISSION ─── */}
      <Modal
        open={transmitOpen}
        onClose={() => setTransmitOpen(false)}
        title="Enregistrer une transmission manuelle"
        description="EduCom n'envoie rien : vous déclarez ici une remise que vous avez faite vous-même."
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setTransmitOpen(false)}>Annuler</Button>
            <Button type="submit" form="transmit-form" loading={pending}>Enregistrer</Button>
          </div>
        }
      >
        <form id="transmit-form" className="space-y-3" onSubmit={(e) => { e.preventDefault(); enregistrerTransmission(e.currentTarget); }}>
          <div className="flex items-start gap-3 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-role-meta leading-relaxed text-text-soft">
              Aucune administration n&apos;est connectée à EduCom. Cet enregistrement dit
              <strong> qui a remis quoi, et quand</strong> — il ne prouve pas une réception.
            </p>
          </div>
          <p className="text-role-body text-text">{selected.size} dossier(s) concerné(s).</p>
          <Input label="Destinataire" name="destination" placeholder="Inspection de l'éducation, académie…"
            hint="Facultatif — écrivez ce à quoi vous avez réellement remis les dossiers." />
          <Textarea label="Note" name="note" rows={2} placeholder="Remis en main propre, clé USB, courriel du 18/08…" />
        </form>
      </Modal>
    </div>
  );
}
