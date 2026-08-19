"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Upload, Download, Check, X, FileText, History, GraduationCap, AlertTriangle,
  FileWarning, Lock, RotateCcw, CalendarClock, ScanLine, Send, Clock, UserX,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Field";
import { categoryLabel, formatSize, STUDENT_KIND_LABELS } from "@/lib/studentFileLabels";
import {
  uploadStudentDocument, reviewStudentDocument, downloadStudentDocument,
  prepareStudentDocumentDiffusion, confirmStudentDocumentDiffusion,
} from "./actions";
import { ScanDialog } from "./ScanDialog";

/**
 * Dossier élève — interface. Lot 13.
 *
 * ⚠️ **Aucune décision de droit ici.** `canReview` est calculé côté serveur
 * depuis `hasAccess()` et ne fait que masquer des boutons ; les actions
 * revérifient systématiquement. Un composant client ne protège rien.
 *
 * ⚠️ **Mobile** : le champ de fichier porte `accept` (types autorisés) et
 * `capture` n'est PAS forcé — laisser le navigateur proposer « appareil photo »
 * ou « fichiers » est ce qui rend l'écran utilisable sur téléphone. La
 * reconnaissance automatique (OCR, classement) relève du lot 14 et n'est pas ici.
 */

type Line = {
  requirementId: string; label: string; category: string; status: string; needsUpdate: boolean;
  validityMonths: number | null;
  document: {
    id: string; fileName: string; mimeType: string; sizeBytes: number; uploadedAt: string;
    expiresAt: string | null; reviewNote: string | null; academicYear: string | null; previousVersions: number;
  } | null;
};

/** Capacité réelle d'un canal, résolue par le serveur (`src/lib/channels.ts`). */
type ChannelInfo = { id: string; label: string; canSend: boolean; reason: string };

/** Paquet préparé, tel qu'il revient du serveur. */
type Prep = NonNullable<Awaited<ReturnType<typeof prepareStudentDocumentDiffusion>>["data"]>;

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

const ACTION_LABELS: Record<string, string> = {
  "studentDocument.upload": "Dépôt",
  "studentDocument.replace": "Remplacement",
  "studentDocument.validate": "Validation",
  "studentDocument.reject": "Rejet",
  "studentDocument.download": "Téléchargement",
};

export function DossierClient({
  studentId, student, kind, kindDeclared, year, enrollments, lines, loose, completeness, canReview,
  restricted, notice, events, channels,
}: {
  studentId: string;
  student: {
    firstName: string; lastName: string; status: string; dateOfBirth: string | null;
    address: string | null; bloodGroup: string | null; emergencyContact: string | null;
    emergencyPhone: string | null; createdAt: string;
    parent: { name: string; email: string; phone: string | null } | null;
  };
  kind: string; kindDeclared: boolean; year: string;
  enrollments: { academicYear: string; className: string; cycle: string }[];
  lines: Line[];
  loose: { id: string; label: string; category: string; status: string; fileName: string; sizeBytes: number; uploadedAt: string }[];
  completeness: {
    configured: boolean; required: number; received: number; toVerify: number;
    validated: number; rejected: number; expired: number; missing: number; percent: number | null;
  };
  canReview: boolean;
  channels: ChannelInfo[];
  /** Vrai si le dossier affiché est filtré par le périmètre du rôle. */
  restricted: boolean;
  notice: string | null;
  events: { id: string; action: string; at: string; who: string; label: string | null }[];
}) {
  const [pending, start] = useTransition();
  const [scanOpen, setScanOpen] = useState(false);
  const [note, setNote] = useState<Record<string, string>>({});

  /**
   * ⚠️ Lot 16.1 — un indicateur de chargement propre à la diffusion : `Button`
   * applique `disabled={disabled || loading}`, et brancher la modale sur le
   * `useTransition` partagé figerait tous les boutons du dossier.
   */
  const [diff, setDiff] = useState<{ prep: Prep } | null>(null);
  const [diffBusy, setDiffBusy] = useState(false);
  const [diffConfirm, setDiffConfirm] = useState(false);
  const [diffNote, setDiffNote] = useState("");
  const diffuseLabel = channels.some((c) => c.canSend) ? "Diffuser" : "Préparer la remise";
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  // Champs de la section « Documents manquants ». Une seconde carte d'entrée est
  // nécessaire : réutiliser `inputs` ferait écrire deux nœuds sous la même clé,
  // et le dernier rendu écraserait la référence du premier.
  const quick = useRef<Record<string, HTMLInputElement | null>>({});

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  function send(file: File, opts: { requirementId: string | null; label: string; category: string }) {
    const fd = new FormData();
    fd.set("studentId", studentId);
    if (opts.requirementId) fd.set("requirementId", opts.requirementId);
    fd.set("label", opts.label);
    fd.set("category", opts.category);
    fd.set("file", file);
    // ⚠️ Le lot 14 exige une confirmation avant tout remplacement. Ici, le clic
    // s'est fait sur un bouton qui affiche « Remplacer » à côté du nom de la
    // pièce existante : la confirmation est l'acte lui-même, pas une case en
    // plus. La demander deux fois transformerait un geste clair en obstacle.
    fd.set("confirmReplace", "1");

    start(async () => {
      const r = await uploadStudentDocument(fd);
      if (r.error) { toast.error(r.error); return; }
      toast.success(r.data?.replaced ? "Pièce remplacée — l'ancienne version est conservée." : "Pièce déposée.");
    });
  }

  function review(id: string, accept: boolean) {
    start(async () => {
      const r = await reviewStudentDocument({ id, accept, note: note[id] });
      if (r.error) { toast.error(r.error); return; }
      toast.success(accept ? "Pièce validée." : "Pièce rejetée.");
    });
  }

  /**
   * §7 — la diffusion d'une pièce d'élève. Le destinataire n'est PAS choisi :
   * c'est le parent de cet enfant, ou personne.
   */
  function openDiffusion(documentId: string, channelId: string) {
    setDiffBusy(true);
    void (async () => {
      const r = await prepareStudentDocumentDiffusion(documentId, channelId as never);
      setDiffBusy(false);
      if (r.error) { toast.error(r.error); setDiff(null); return; }
      setDiff({ prep: r.data! });
      setDiffConfirm(false);
    })();
  }

  function saveDelivery() {
    if (!diff) return;
    const ids = diff.prep.recipients.filter((r) => r.available).map((r) => r.parentId);
    setDiffBusy(true);
    void (async () => {
      const r = await confirmStudentDocumentDiffusion({
        id: diff.prep.documentId,
        channel: diff.prep.channel,
        parentIds: ids,
        note: diffNote.trim() || null,
      });
      setDiffBusy(false);
      if (r.error) { toast.error(r.error); return; }
      toast.success("Remise enregistrée.");
      setDiff(null); setDiffConfirm(false); setDiffNote("");
    })();
  }

  function download(id: string) {
    start(async () => {
      const r = await downloadStudentDocument(id);
      if (r.error) { toast.error(r.error); return; }
      // Le lien est signé et temporaire : il est ouvert immédiatement, jamais stocké.
      if (r.data?.url) window.open(r.data.url, "_blank", "noopener,noreferrer");
    });
  }

  // ⚠️ Les trois listes sont dérivées de `lines`, jamais recomptées à part : le
  // nombre affiché ne peut donc pas diverger de la checklist réellement
  // applicable. Les pièces hors checklist et les pièces validées en sont
  // exclues par construction, puisqu'elles n'ont pas ces statuts.
  const missing = lines.filter((l) => l.status === "MISSING");
  const rejected = lines.filter((l) => l.status === "REJECTED");
  const expired = lines.filter((l) => l.status === "EXPIRED");
  const outstanding = missing.length + rejected.length + expired.length;

  return (
    <div className="space-y-6">
      {/* ───────────── PÉRIMÈTRE ───────────── */}
      {restricted && notice && (
        <div className="flex items-start gap-3 rounded-control border border-rule bg-sunk px-4 py-3">
          <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
          <p className="text-role-meta leading-relaxed text-text-soft">{notice}</p>
        </div>
      )}

      {/* ───────────── IDENTITÉ ───────────── */}
      <Card title="Identité" description="Informations portées par la fiche élève.">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Nom complet", `${student.firstName} ${student.lastName}`],
            ["Statut", student.status],
            ["Date de naissance", student.dateOfBirth ? date(student.dateOfBirth) : "—"],
            ["Adresse", student.address ?? "—"],
            ["Groupe sanguin", student.bloodGroup ?? (restricted ? "Non communiqué" : "—")],
            ["Contact d'urgence", student.emergencyContact ? `${student.emergencyContact} ${student.emergencyPhone ?? ""}` : "—"],
            ["Parent rattaché", student.parent ? `${student.parent.name} · ${student.parent.email}` : "Aucun"],
            ["Dossier ouvert le", date(student.createdAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-role-meta text-text-faint">{k}</dt>
              <dd className="text-role-body text-text">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* ───────────── SCOLARITÉ ───────────── */}
      <Card
        title="Scolarité"
        description={`Année en cours : ${year}.`}
        actions={
          <Badge variant={kind === "NOUVEAU" ? "info" : "neutral"}>
            {STUDENT_KIND_LABELS[kind as keyof typeof STUDENT_KIND_LABELS] ?? kind}
            {!kindDeclared && " (déduit)"}
          </Badge>
        }
      >
        {enrollments.length === 0 ? (
          <EmptyState size="sm" title="Aucune inscription" description="Cet élève n'est inscrit dans aucune classe." />
        ) : (
          <ul className="space-y-2">
            {enrollments.map((e, i) => (
              <li key={`${e.academicYear}-${i}`} className="flex flex-wrap items-center gap-3 rounded-control border border-rule px-3 py-2">
                <GraduationCap aria-hidden="true" className="h-4 w-4 text-text-faint" />
                <span className="font-medium text-text">{e.className}</span>
                <span className="text-role-meta text-text-soft">{e.cycle}</span>
                <span className="ml-auto text-role-meta tabular-nums text-text-soft">{e.academicYear}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ───────────── AJOUTER UNE PIÈCE ───────────── */}
      <Card
        title="Ajouter un document"
        description="Photographiez une pièce papier ou importez un fichier. Rien n'est classé sans votre confirmation."
      >
        <Button onClick={() => setScanOpen(true)}>
          <ScanLine aria-hidden="true" className="h-4 w-4" />
          Scanner ou importer
        </Button>
      </Card>

      <ScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        studentId={studentId}
        studentName={`${student.firstName} ${student.lastName}`}
        lines={lines.map((l) => ({
          requirementId: l.requirementId,
          label: l.label,
          category: l.category,
          hasDocument: l.document !== null,
        }))}
      />

      {/* ───────────── COMPLÉTUDE ───────────── */}
      <Card title="Complétude du dossier">
        {!completeness.configured ? (
          // ⚠️ Jamais 0 % : c'est la règle qui manque, pas les pièces.
          <div className="flex items-start gap-3 rounded-control border border-warning/30 bg-warning/5 px-4 py-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-role-body font-semibold text-warning">Checklist non configurée</p>
              <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">
                Aucune pièce n&apos;est exigée pour cet élève. Aucun pourcentage n&apos;est affiché : il serait
                calculé sur une liste vide. Définissez vos exigences dans Réglages › Pièces du dossier.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-role-page font-semibold tabular-nums text-text">
              {completeness.received} / {completeness.required}{" "}
              <span className="text-role-body font-medium text-text-soft">pièces reçues — {completeness.percent} %</span>
            </p>
            <div
              role="progressbar"
              aria-valuenow={completeness.percent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Complétude du dossier"
              className="h-2 w-full overflow-hidden rounded-pill bg-sunk"
            >
              <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${completeness.percent}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["Manquants", completeness.missing, "MISSING"],
                ["À vérifier", completeness.toVerify, "TO_VERIFY"],
                ["Validés", completeness.validated, "VALIDATED"],
                ["Rejetés", completeness.rejected, "REJECTED"],
                ["Expirés", completeness.expired, "EXPIRED"],
              ] as const).filter(([, n]) => n > 0).map(([label, n, st]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <StatusBadge domain="studentDocument" status={st} size="sm" />
                  <span className="text-role-meta tabular-nums text-text-soft">{n}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ───────────── DOCUMENTS MANQUANTS ───────────── */}
      {completeness.configured && (
        <Card
          title="Documents manquants"
          description="Ce qu'il reste à obtenir pour que le dossier soit complet."
        >
          {outstanding === 0 ? (
            // ⚠️ Un dossier complet mérite de le dire. Une section vide sans
            // message laisse croire à un écran cassé plutôt qu'à un travail fini.
            <div className="flex items-start gap-3 rounded-control border border-success/30 bg-success/5 px-4 py-3">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="text-role-body font-semibold text-success">Dossier complet</p>
                <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">
                  Les {completeness.required} pièce{completeness.required > 1 ? "s" : ""} exigée
                  {completeness.required > 1 ? "s" : ""} pour cet élève ont été reçues. Rien n&apos;est en attente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {([
                {
                  key: "missing",
                  rows: missing,
                  icon: FileWarning,
                  title: "Jamais reçues",
                  hint: "Aucune pièce n'a été déposée pour ces exigences.",
                  cta: "Déposer",
                },
                {
                  key: "rejected",
                  rows: rejected,
                  icon: RotateCcw,
                  title: "Rejetées — une nouvelle pièce est attendue",
                  hint: "La pièce reçue a été refusée : le motif est indiqué sous chaque ligne.",
                  cta: "Remplacer",
                },
                {
                  key: "expired",
                  rows: expired,
                  icon: CalendarClock,
                  title: "Expirées — à mettre à jour",
                  hint: "La durée de validité fixée par l'établissement est dépassée.",
                  cta: "Mettre à jour",
                },
              ] as const)
                .filter((g) => g.rows.length > 0)
                .map((g) => (
                  <div key={g.key} className="space-y-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <g.icon aria-hidden="true" className="h-4 w-4 shrink-0 self-center text-text-faint" />
                      <span className="text-role-body font-semibold text-text">{g.title}</span>
                      <span className="text-role-meta tabular-nums text-text-soft">
                        {g.rows.length} sur {completeness.required}
                      </span>
                    </div>
                    <p className="text-role-meta text-text-soft">{g.hint}</p>
                    <ul className="space-y-2">
                      {g.rows.map((l) => (
                        <li
                          key={l.requirementId}
                          className="flex flex-wrap items-center gap-2 rounded-control border border-rule px-3 py-2"
                        >
                          <span className="font-medium text-text">{l.label}</span>
                          <Badge size="sm">{categoryLabel(l.category)}</Badge>
                          {l.validityMonths != null && (
                            <span className="text-role-meta text-text-soft">valide {l.validityMonths} mois</span>
                          )}
                          {l.document?.reviewNote && (
                            <span className="text-role-meta text-text-soft">— {l.document.reviewNote}</span>
                          )}
                          {l.document?.expiresAt && (
                            <span className="text-role-meta text-text-soft">
                              expirée le {date(l.document.expiresAt)}
                            </span>
                          )}
                          <input
                            ref={(el) => { quick.current[l.requirementId] = el; }}
                            type="file"
                            accept={ACCEPT}
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) send(f, { requirementId: l.requirementId, label: l.label, category: l.category });
                              e.target.value = "";
                            }}
                          />
                          <Button
                            size="sm"
                            variant="primary"
                            className="ml-auto"
                            loading={pending}
                            onClick={() => quick.current[l.requirementId]?.click()}
                          >
                            <Upload aria-hidden="true" className="h-4 w-4" />
                            {g.cta}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      {/* ───────────── DOCUMENTS ───────────── */}
      <Card title="Documents exigés" description="Déposez une pièce, ou remplacez-la — l'ancienne version est conservée.">
        {lines.length === 0 ? (
          <EmptyState
            size="sm"
            title="Aucune exigence applicable"
            description="La checklist ne prévoit rien pour cet élève (cycle, classe, année ou type)."
          />
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.requirementId} className="rounded-control border border-rule px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-text-faint" />
                  <span className="font-medium text-text">{l.label}</span>
                  <Badge size="sm">{categoryLabel(l.category)}</Badge>
                  <StatusBadge domain="studentDocument" status={l.status} size="sm" />
                  {l.needsUpdate && (
                    <Badge size="sm" variant="warning" title="Pièce d'une année scolaire antérieure">
                      À mettre à jour
                    </Badge>
                  )}

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {l.document && (
                      <Button size="sm" variant="ghost" loading={pending} onClick={() => download(l.document!.id)}>
                        <Download aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">Télécharger</span>
                      </Button>
                    )}
                    {l.document && channels.length > 0 && (
                      <Button size="sm" variant="ghost" loading={diffBusy} onClick={() => openDiffusion(l.document!.id, channels[0].id)}>
                        <Send aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">{diffuseLabel}</span>
                      </Button>
                    )}
                    <input
                      ref={(el) => { inputs.current[l.requirementId] = el; }}
                      type="file"
                      accept={ACCEPT}
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) send(f, { requirementId: l.requirementId, label: l.label, category: l.category });
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant={l.document ? "secondary" : "primary"}
                      loading={pending}
                      onClick={() => inputs.current[l.requirementId]?.click()}
                    >
                      <Upload aria-hidden="true" className="h-4 w-4" />
                      {l.document ? "Remplacer" : "Déposer"}
                    </Button>
                  </div>
                </div>

                {l.document && (
                  <p className="mt-1.5 text-role-meta text-text-soft">
                    {l.document.fileName} · {formatSize(l.document.sizeBytes)} · déposé le {date(l.document.uploadedAt)}
                    {l.document.academicYear && ` · ${l.document.academicYear}`}
                    {l.document.expiresAt && ` · ${l.status === "EXPIRED" ? "expirée" : "valable"} jusqu'au ${date(l.document.expiresAt)}`}
                    {l.document.previousVersions > 0 && ` · ${l.document.previousVersions} version(s) antérieure(s) conservée(s)`}
                    {l.document.reviewNote && ` · ${l.document.reviewNote}`}
                  </p>
                )}

                {canReview && l.document && l.status !== "VALIDATED" && (
                  <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-rule pt-2">
                    <Button size="sm" loading={pending} onClick={() => review(l.document!.id, true)}>
                      <Check aria-hidden="true" className="h-4 w-4" /> Valider
                    </Button>
                    <label className="flex flex-col gap-1">
                      <span className="text-role-meta text-text-soft">Motif du rejet (obligatoire)</span>
                      <input
                        value={note[l.document.id] ?? ""}
                        onChange={(e) => setNote({ ...note, [l.document!.id]: e.target.value })}
                        className="h-9 w-56 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <Button size="sm" variant="secondary" loading={pending} onClick={() => review(l.document!.id, false)}>
                      <X aria-hidden="true" className="h-4 w-4" /> Rejeter
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ───────────── PIÈCES HORS CHECKLIST ───────────── */}
      {loose.length > 0 && (
        <Card title="Autres pièces au dossier" description="Versées hors checklist.">
          <ul className="space-y-2">
            {loose.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-control border border-rule px-3 py-2">
                <FileText aria-hidden="true" className="h-4 w-4 text-text-faint" />
                <span className="font-medium text-text">{d.label}</span>
                <Badge size="sm">{categoryLabel(d.category)}</Badge>
                <StatusBadge domain="studentDocument" status={d.status} size="sm" />
                <span className="text-role-meta text-text-soft">{d.fileName} · {formatSize(d.sizeBytes)}</span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="ghost" loading={pending} onClick={() => download(d.id)}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">Télécharger</span>
                  </Button>
                  {channels.length > 0 && (
                    <Button size="sm" variant="ghost" loading={diffBusy} onClick={() => openDiffusion(d.id, channels[0].id)}>
                      <Send aria-hidden="true" className="h-4 w-4" />
                      <span className="sr-only">{diffuseLabel}</span>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ───────────── HISTORIQUE ───────────── */}
      <Card title="Historique" description="Qui a fait quoi, et quand. Rien n'est effacé par un remplacement.">
        {events.length === 0 ? (
          <EmptyState size="sm" icon={History} title="Aucun événement" description="Aucune pièce n'a encore été déposée." />
        ) : (
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-2 text-role-body">
                <span className="font-medium text-text">{ACTION_LABELS[e.action] ?? e.action}</span>
                {e.label && <span className="text-text-soft">— {e.label}</span>}
                <span className="text-text-soft">par {e.who}</span>
                <span className="ml-auto text-role-meta tabular-nums text-text-faint">{date(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ───────────── DIFFUSION D'UNE PIÈCE (lot 17) ───────────── */}
      <Modal
        open={diff !== null}
        onClose={() => { setDiff(null); setDiffConfirm(false); }}
        size="md"
        title={diff ? `${diffuseLabel} — ${diff.prep.title}` : diffuseLabel}
        description="Une pièce du dossier ne part que vers le parent de cet enfant."
      >
        {diff && (
          <div className="space-y-4">
            {/* ⚠️ Avant tout le reste : ce qui n'a pas eu lieu. */}
            <div className="flex items-start gap-3 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-role-meta leading-relaxed text-text-soft">{diff.prep.notice}</p>
            </div>

            {diff.prep.recipients.length === 0 ? (
              <p className="flex items-start gap-2 rounded-control border border-rule px-3 py-3 text-role-body text-text-soft">
                <UserX aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
                Aucun parent n&apos;est rattaché à cet élève : il n&apos;y a personne à qui remettre cette pièce.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {diff.prep.recipients.map((r) => (
                  <li key={r.parentId} className="flex flex-wrap items-center gap-2 rounded-control border border-rule px-3 py-3">
                    <span className="min-w-0 flex-1 basis-full break-words sm:basis-auto">
                      <span className="block text-role-body text-text">{r.name}</span>
                      <span className="block text-role-meta text-text-soft">{r.children.join(", ")}</span>
                    </span>
                    {r.available
                      ? <Badge size="sm">{diff.prep.channel === "email" ? r.email : r.phone}</Badge>
                      : <Badge size="sm" variant="warning">Destinataire indisponible</Badge>}
                  </li>
                ))}
              </ul>
            )}

            <Textarea label="Message à copier" readOnly rows={4} value={diff.prep.text} />
            <Input
              label={`Lien temporaire vers le fichier (${Math.round(diff.prep.link.ttlSeconds / 60)} minutes)`}
              readOnly
              value={diff.prep.link.url}
            />
            <p className="text-role-meta text-text-soft">
              <Clock aria-hidden="true" className="mr-1 inline h-4 w-4 text-text-faint" />
              Ce lien expire — ce n&apos;est ni un lien permanent, ni une preuve de remise.
            </p>

            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(`${diff.prep.text}\n${diff.prep.link.url}`);
                toast.success("Message et lien copiés.");
              }}
            >
              Copier le message
            </Button>

            {/* §10 — confirmation humaine avant d'écrire la moindre trace. */}
            {diff.prep.availableCount > 0 && (
              !diffConfirm ? (
                <div className="border-t border-rule pt-3">
                  <Button variant="primary" onClick={() => setDiffConfirm(true)}>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    J&apos;ai remis cette pièce
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-control border border-rule bg-sunk px-3 py-3">
                  <p className="text-role-body text-text">
                    Vous êtes sur le point d&apos;enregistrer que <strong>vous avez remis</strong> «&nbsp;{diff.prep.title}&nbsp;»
                    à {diff.prep.availableCount} destinataire{diff.prep.availableCount > 1 ? "s" : ""} par {diff.prep.channelLabel}.
                  </p>
                  <p className="text-role-meta text-text-soft">
                    EduCom n&apos;a rien envoyé : cette trace dit qu&apos;un humain l&apos;a fait.
                  </p>
                  <Textarea label="Note (facultative)" rows={2} value={diffNote} onChange={(e) => setDiffNote(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setDiffConfirm(false)}>Annuler</Button>
                    <Button variant="primary" loading={diffBusy} onClick={saveDelivery}>Confirmer la remise</Button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
