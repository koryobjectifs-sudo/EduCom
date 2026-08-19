"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Folder, FolderPlus, FileText, Search, LayoutGrid, List, Upload, Download, Eye,
  Send, History, Trash2, Info, X, Clock, ShieldCheck, AlertTriangle, Filter,
  MessageCircle, Mail, UserX, Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { formatSize } from "@/lib/studentFileLabels";
import { checkFile } from "@/lib/studentFileLimits";
import {
  DOC_STATUS_LABELS, AUDIENCE_LABELS, SCOPE_LABELS, CYCLE_LABELS, previewKind,
} from "@/lib/schoolDocumentLabels";
import {
  uploadSchoolDocument, updateSchoolDocument, transitionSchoolDocument,
  getSchoolDocumentUrl, prepareDocumentDiffusion, confirmDocumentDiffusion,
  schoolDocumentDetail, createFolder, deleteFolder,
} from "./actions";

/**
 * Explorateur du centre documentaire. Lot 15.
 *
 * ⚠️ **Aucune action factice.** Un bouton n'apparaît que si l'action existe
 * réellement et que le rôle y a droit — `canManage` vient du serveur. « Préparer
 * pour WhatsApp » n'est jamais écrit « Envoyer » : rien n'est transmis, et
 * l'écran le dit en toutes lettres plutôt que de laisser croire le contraire.
 *
 * ⚠️ **Les filtres passent par l'URL**, donc par le serveur. Un filtre qui
 * masque des lignes déjà chargées ment sur les compteurs ; celui-ci change
 * réellement la requête.
 */

type Doc = {
  id: string; title: string; description: string | null; status: string; audience: string;
  scopeKind: string; cycle: string | null; className: string | null; classId: string | null;
  folderId: string | null; folderName: string | null; academicYear: string | null; subject: string | null;
  fileName: string; mimeType: string; sizeBytes: number; version: number;
  hasPreviousVersion: boolean; publishedAt: string | null; updatedAt: string;
};

type FolderRow = { id: string; name: string; icon: string | null; parentId: string | null; documentCount: number };

/**
 * Capacité réelle d'un canal, **résolue par le serveur** (`src/lib/channels.ts`).
 *
 * ⚠️ Le client ne la calcule jamais lui-même : il ne peut pas lire
 * l'environnement, et un écran qui devinerait ce qu'il est capable d'envoyer est
 * exactement ce que le lot 17 corrige.
 */
type ChannelInfo = {
  id: string; label: string; state: string;
  canSend: boolean; canPrepare: boolean; reason: string; missing: string[];
};

/** Paquet préparé, tel qu'il revient du serveur. */
type Prep = NonNullable<Awaited<ReturnType<typeof prepareDocumentDiffusion>>["data"]>;

const CHANNEL_ICON: Record<string, typeof Send> = { whatsapp: MessageCircle, email: Mail };

type Detail = Awaited<ReturnType<typeof schoolDocumentDetail>>["data"];

const TRANSITIONS: Record<string, { to: string; label: string; manage: boolean; comment?: boolean }[]> = {
  DRAFT:     [{ to: "REVIEW", label: "Soumettre à validation", manage: false }, { to: "PUBLISHED", label: "Publier", manage: true }],
  REVIEW:    [{ to: "PUBLISHED", label: "Valider et publier", manage: true }, { to: "DRAFT", label: "Renvoyer au brouillon", manage: false, comment: true }],
  PUBLISHED: [{ to: "DRAFT", label: "Dépublier", manage: true, comment: true }, { to: "ARCHIVED", label: "Archiver", manage: true }],
  ARCHIVED:  [{ to: "PUBLISHED", label: "Remettre en circulation", manage: true }],
};

export function CentreClient({
  folders, documents, facets, canManage, recentDays, channels, diffusedIds,
}: {
  folders: FolderRow[];
  documents: Doc[];
  facets: { years: string[]; classes: { id: string; name: string; cycle: string }[] };
  canManage: boolean;
  recentDays: number;
  channels: ChannelInfo[];
  diffusedIds: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [view, setView] = useState<"list" | "grid">("list");

  const [editing, setEditing] = useState<Doc | null>(null);
  const [creating, setCreating] = useState(false);
  const [replacing, setReplacing] = useState<Doc | null>(null);
  const [detailOf, setDetailOf] = useState<Doc | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  /**
   * ⚠️ Lot 16.1 — un indicateur de chargement PROPRE à la diffusion.
   * `Button` applique `disabled={disabled || loading}` : brancher la modale sur
   * le `useTransition` partagé figerait tous les boutons de l'écran pendant la
   * résolution des destinataires.
   */
  const [diffusion, setDiffusion] = useState<{ doc: Doc; prep: Prep } | null>(null);
  const [diffusionChannel, setDiffusionChannel] = useState<string>(channels[0]?.id ?? "whatsapp");
  const [diffusionBusy, setDiffusionBusy] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [confirmStep, setConfirmStep] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const diffused = useMemo(() => new Set(diffusedIds), [diffusedIds]);
  const [preview, setPreview] = useState<{ doc: Doc; url: string } | null>(null);
  const [newFolder, setNewFolder] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const q = params.get("q") ?? "";
  const current = (k: string) => params.get(k) ?? "";

  /** Toute navigation passe par l'URL : le serveur refiltre réellement. */
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`?${next.toString()}`);
  }

  const activeFilters = ["folder", "status", "audience", "year", "cycle", "class", "recent"]
    .filter((k) => params.get(k)).length;

  const folderName = useMemo(
    () => folders.find((f) => f.id === current("folder"))?.name ?? null,
    [folders, params],
  );

  const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  /**
   * §6 — « Diffuser » n'est écrit que si un canal envoie réellement. Aujourd'hui
   * aucun ne le fait, et le bouton dit donc « Préparer la diffusion ». Le libellé
   * suit la capacité ; il ne la décrit pas de mémoire.
   */
  const diffuseLabel = channels.some((c) => c.canSend) ? "Diffuser" : "Préparer la diffusion";

  /* ═════════ actions ═════════ */

  function openPreview(doc: Doc) {
    if (!previewKind(doc.mimeType)) {
      toast.info("Aperçu indisponible pour ce format — le document peut être téléchargé.");
      return;
    }
    start(async () => {
      const r = await getSchoolDocumentUrl(doc.id, "preview");
      if (r.error) { toast.error(r.error); return; }
      setPreview({ doc, url: r.data!.url });
    });
  }

  function download(doc: Doc) {
    start(async () => {
      const r = await getSchoolDocumentUrl(doc.id, "download");
      if (r.error) { toast.error(r.error); return; }
      window.open(r.data!.url, "_blank", "noopener,noreferrer");
    });
  }

  function openDetail(doc: Doc) {
    setDetailOf(doc); setDetail(null);
    start(async () => {
      const r = await schoolDocumentDetail(doc.id);
      if (r.error) { toast.error(r.error); return; }
      setDetail(r.data!);
    });
  }

  function move(doc: Doc, to: string, needsComment?: boolean) {
    const comment = needsComment ? (window.prompt("Motif (obligatoire) :") ?? "") : undefined;
    if (needsComment && !comment?.trim()) { toast.error("Un motif est obligatoire pour cette action."); return; }
    start(async () => {
      const r = await transitionSchoolDocument({ id: doc.id, to: to as never, comment });
      if (r.error) { toast.error(r.error); return; }
      toast.success(`Document ${DOC_STATUS_LABELS[to as keyof typeof DOC_STATUS_LABELS].toLowerCase()}.`);
      router.refresh();
    });
  }

  /**
   * Ouvre la diffusion, ou change de canal sans fermer la modale.
   *
   * ⚠️ Changer de canal **refait la préparation côté serveur** : la
   * disponibilité d'un destinataire dépend du canal (un parent sans numéro reste
   * joignable par courriel), et recalculer cela dans le navigateur produirait
   * une seconde vérité.
   */
  function openDiffusion(doc: Doc, channelId: string) {
    setDiffusionBusy(true);
    setDiffusionChannel(channelId);
    void (async () => {
      const r = await prepareDocumentDiffusion(doc.id, channelId as never);
      setDiffusionBusy(false);
      if (r.error) { toast.error(r.error); setDiffusion(null); return; }
      const prep = r.data!;
      setDiffusion({ doc, prep });
      // Présélection : tous ceux qui ont réellement une adresse sur ce canal.
      setChosen(new Set(prep.recipients.filter((x) => x.available).map((x) => x.parentId)));
      setConfirmStep(false);
    })();
  }

  function closeDiffusion() {
    setDiffusion(null); setConfirmStep(false); setDeliveryNote("");
  }

  /** §10 — enregistre la remise, après confirmation humaine explicite. */
  function saveDelivery() {
    if (!diffusion) return;
    setDiffusionBusy(true);
    void (async () => {
      const r = await confirmDocumentDiffusion({
        id: diffusion.doc.id,
        channel: diffusion.prep.channel,
        parentIds: [...chosen],
        note: deliveryNote.trim() || null,
      });
      setDiffusionBusy(false);
      if (r.error) { toast.error(r.error); return; }
      toast.success(`Remise enregistrée pour ${r.data!.recipients.length} famille(s).`);
      closeDiffusion();
      router.refresh();
    })();
  }

  function submitDoc(form: HTMLFormElement, mode: "create" | "update" | "replace") {
    const fd = new FormData(form);
    const file = fd.get("file");
    if (mode !== "update") {
      if (!(file instanceof File) || file.size === 0) { toast.error("Choisissez un fichier."); return; }
      const verdict = checkFile(file.type, file.name, file.size);
      if (!verdict.ok) { toast.error(verdict.error); return; }
    }
    start(async () => {
      const r = mode === "update" ? await updateSchoolDocument(fd) : await uploadSchoolDocument(fd);
      if (r.error) { toast.error(r.error); return; }
      toast.success(
        mode === "replace" ? "Nouvelle version déposée — l'ancienne est conservée."
        : mode === "update" ? "Document mis à jour."
        : "Document ajouté en brouillon.",
      );
      setCreating(false); setEditing(null); setReplacing(null);
      router.refresh();
    });
  }

  /* ═════════ formulaire partagé ═════════ */

  function DocForm({ doc, mode }: { doc: Doc | null; mode: "create" | "update" | "replace" }) {
    const [scopeKind, setScopeKind] = useState(doc?.scopeKind ?? "SCHOOL");
    return (
      <form
        id="doc-form"
        onSubmit={(e) => { e.preventDefault(); submitDoc(e.currentTarget, mode); }}
        className="space-y-4"
      >
        {mode === "update" && <input type="hidden" name="id" value={doc!.id} />}
        {mode === "replace" && <input type="hidden" name="replacesId" value={doc!.id} />}

        <Input label="Titre" name="title" required defaultValue={doc?.title ?? ""} placeholder="Liste de fournitures — CM2" />
        <Textarea label="Description" name="description" rows={2} defaultValue={doc?.description ?? ""} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Dossier" name="folderId" defaultValue={doc?.folderId ?? ""}>
            <option value="">Racine du centre</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>

          <Select label="Destinataires" name="audience" defaultValue={doc?.audience ?? "STAFF"}
            hint="Seuls les documents « Familles » publiés sont visibles par les parents.">
            {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>

          <Select label="Portée" name="scopeKind" value={scopeKind} onChange={(e) => setScopeKind(e.target.value)}>
            {Object.entries(SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>

          {scopeKind === "CYCLE" && (
            <Select label="Cycle" name="cycle" required defaultValue={doc?.cycle ?? ""}>
              <option value="">—</option>
              {Object.entries(CYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          )}
          {scopeKind === "CLASS" && (
            <Select label="Classe" name="classId" required defaultValue={doc?.classId ?? ""}>
              <option value="">—</option>
              {facets.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}

          <Select label="Année scolaire" name="academicYear" defaultValue={doc?.academicYear ?? ""}
            hint="Vide = document permanent (un règlement).">
            <option value="">Permanent</option>
            {facets.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>

          <Input label="Matière ou domaine" name="subject" defaultValue={doc?.subject ?? ""}
            placeholder="Mathématiques" hint="Facultatif — utile pour un manuel." />
        </div>

        {mode !== "update" && (
          <div>
            <label className="text-role-meta font-medium text-text-soft">Fichier</label>
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="mt-1 block w-full text-role-body text-text file:mr-3 file:rounded-control file:border file:border-rule file:bg-sunk file:px-3 file:py-1.5 file:text-role-body file:font-medium"
            />
            <p className="mt-1 text-role-meta text-text-soft">PDF, JPEG, PNG, WEBP, HEIC — 10 Mo maximum.</p>
          </div>
        )}
      </form>
    );
  }

  /* ═════════ rendu ═════════ */

  return (
    <div className="space-y-5">
      {/* ─── RECHERCHE ET VUES ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setParam("q", new FormData(e.currentTarget).get("q") as string); }}
        >
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher un titre, une description, une matière…"
              aria-label="Rechercher un document"
              className="h-10 w-full rounded-control border border-rule bg-surface pl-9 pr-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Rechercher</Button>
        </form>

        <div className="flex items-center gap-1 rounded-control border border-rule p-0.5">
          <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} aria-label="Vue liste" onClick={() => setView("list")}>
            <List aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={view === "grid" ? "secondary" : "ghost"} aria-label="Vue grille" onClick={() => setView("grid")}>
            <LayoutGrid aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Upload aria-hidden="true" className="h-4 w-4" /> Ajouter
          </Button>
        )}
      </div>

      {/* ─── FILTRES ─── */}
      <Card
        title="Filtres"
        description={activeFilters > 0 ? `${activeFilters} filtre(s) actif(s) — les résultats sont filtrés en base.` : "Tous les documents visibles."}
        actions={
          activeFilters > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => router.push("?")}>
              <X aria-hidden="true" className="h-4 w-4" /> Tout effacer
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Dossier" value={current("folder")} onChange={(e) => setParam("folder", e.target.value)}>
            <option value="">Tous les dossiers</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.documentCount})</option>)}
          </Select>
          {canManage && (
            <Select label="Statut" value={current("status")} onChange={(e) => setParam("status", e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(DOC_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          )}
          <Select label="Destinataires" value={current("audience")} onChange={(e) => setParam("audience", e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Année scolaire" value={current("year")} onChange={(e) => setParam("year", e.target.value)}>
            <option value="">Toutes</option>
            {facets.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select label="Cycle" value={current("cycle")} onChange={(e) => setParam("cycle", e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(CYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Classe" value={current("class")} onChange={(e) => setParam("class", e.target.value)}>
            <option value="">Toutes</option>
            {facets.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="mt-3">
          <Button
            size="sm"
            variant={current("recent") ? "secondary" : "ghost"}
            onClick={() => setParam("recent", current("recent") ? "" : "1")}
          >
            <Clock aria-hidden="true" className="h-4 w-4" />
            Récents ({recentDays} derniers jours)
          </Button>
        </div>
      </Card>

      {/* ─── DOSSIERS ─── */}
      <Card
        title="Dossiers"
        description="Les rayons du centre, créés par l'établissement."
        actions={
          canManage ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newFolder.trim();
                if (!name) return;
                start(async () => {
                  const r = await createFolder({ name });
                  if (r.error) { toast.error(r.error); return; }
                  setNewFolder(""); toast.success("Dossier créé."); router.refresh();
                });
              }}
            >
              <input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="Fournitures, Manuels…"
                aria-label="Nom du nouveau dossier"
                className="h-9 w-44 rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button size="sm" variant="secondary" type="submit" loading={pending}>
                <FolderPlus aria-hidden="true" className="h-4 w-4" /> Créer
              </Button>
            </form>
          ) : undefined
        }
      >
        {folders.length === 0 ? (
          <EmptyState
            size="sm"
            icon={Folder}
            title="Aucun dossier"
            description={canManage
              ? "Créez vos rayons : Fournitures, Manuels, Uniformes, Formulaires, Règlements — comme votre établissement les classe."
              : "L'établissement n'a pas encore organisé son centre documentaire."}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {folders.map((f) => (
              <div key={f.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setParam("folder", current("folder") === f.id ? "" : f.id)}
                  className={`inline-flex items-center gap-2 rounded-control border px-3 py-2 text-role-body transition-colors ${
                    current("folder") === f.id ? "border-primary bg-primary/5 font-semibold text-text" : "border-rule bg-surface text-text hover:bg-sunk"
                  }`}
                >
                  <Folder aria-hidden="true" className="h-4 w-4 text-text-faint" />
                  {f.name}
                  <span className="text-role-meta tabular-nums text-text-soft">{f.documentCount}</span>
                </button>
                {canManage && (
                  <Button
                    size="sm" variant="ghost" aria-label={`Supprimer le dossier ${f.name}`}
                    onClick={() => start(async () => {
                      const r = await deleteFolder(f.id);
                      if (r.error) { toast.error(r.error); return; }
                      toast.success(r.data!.releasedDocuments > 0
                        ? `Dossier supprimé — ${r.data!.releasedDocuments} document(s) remis à la racine.`
                        : "Dossier supprimé.");
                      router.refresh();
                    })}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ─── DOCUMENTS ─── */}
      <Card
        title={folderName ? `Documents — ${folderName}` : "Documents"}
        description={`${documents.length} document${documents.length > 1 ? "s" : ""} visible${documents.length > 1 ? "s" : ""}${q ? ` pour « ${q} »` : ""}.`}
      >
        {documents.length === 0 ? (
          <EmptyState
            size="sm"
            icon={FileText}
            title={q || activeFilters > 0 ? "Aucun résultat" : "Aucun document"}
            description={q || activeFilters > 0
              ? "Aucun document ne correspond. Élargissez la recherche ou effacez les filtres."
              : canManage
                ? "Déposez le premier document officiel de l'établissement."
                : "Aucun document publié ne vous concerne pour l'instant."}
          />
        ) : (
          <ul className={view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
            {documents.map((d) => (
              <li key={d.id} className="rounded-control border border-rule px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-text-faint" />
                  <span className="font-medium text-text">{d.title}</span>
                  <StatusBadge domain="schoolDocument" status={d.status} size="sm" />
                  {d.audience === "FAMILIES" && <Badge size="sm" variant="info">Familles</Badge>}
                  {d.version > 1 && <Badge size="sm" variant="neutral">v{d.version}</Badge>}
                  {/* Vient d'une ligne d'audit réelle, jamais d'une supposition. */}
                  {diffused.has(d.id) && <Badge size="sm" variant="neutral">Remis à la main</Badge>}
                </div>

                <p className="mt-1 text-role-meta text-text-soft">
                  {d.scopeKind === "CLASS" ? d.className ?? "classe supprimée"
                    : d.scopeKind === "CYCLE" ? CYCLE_LABELS[d.cycle as keyof typeof CYCLE_LABELS] ?? d.cycle
                    : "Tout l'établissement"}
                  {d.academicYear && ` · ${d.academicYear}`}
                  {d.subject && ` · ${d.subject}`}
                  {d.folderName && ` · ${d.folderName}`}
                  {` · ${d.fileName} (${formatSize(d.sizeBytes)})`}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="ghost" loading={pending} onClick={() => openPreview(d)}
                    title={previewKind(d.mimeType) ? "Aperçu" : "Aperçu indisponible pour ce format"}>
                    <Eye aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Aperçu</span>
                  </Button>
                  <Button size="sm" variant="ghost" loading={pending} onClick={() => download(d)}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Télécharger</span>
                  </Button>
                  <Button size="sm" variant="ghost" loading={pending} onClick={() => openDetail(d)}>
                    <History aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Historique</span>
                  </Button>

                  {/* §6 — l'action n'existe que pour un document PUBLIÉ destiné aux
                      familles. Son libellé suit la capacité réelle : « Diffuser »
                      seulement si un canal envoie vraiment, sinon « Préparer ». */}
                  {d.status === "PUBLISHED" && d.audience === "FAMILIES" && (
                    <Button
                      size="sm" variant="ghost"
                      loading={diffusionBusy && diffusion?.doc.id === d.id}
                      onClick={() => openDiffusion(d, diffusionChannel)}
                    >
                      <Send aria-hidden="true" className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">{diffuseLabel}</span>
                    </Button>
                  )}

                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(d)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplacing(d)}>Nouvelle version</Button>
                    </>
                  )}

                  {(TRANSITIONS[d.status] ?? [])
                    .filter((t) => !t.manage || canManage)
                    .map((t) => (
                      <Button key={t.to} size="sm" variant="secondary" loading={pending} onClick={() => move(d, t.to, t.comment)}>
                        {t.label}
                      </Button>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ─── MODALES ─── */}
      <Modal
        open={creating || editing !== null || replacing !== null}
        onClose={() => { setCreating(false); setEditing(null); setReplacing(null); }}
        size="lg"
        title={replacing ? "Nouvelle version" : editing ? "Modifier le document" : "Ajouter un document"}
        description={
          replacing
            ? "L'ancienne version est conservée et reste consultable dans l'historique. La nouvelle arrive en brouillon : publier reste un acte distinct."
            : editing
              ? "Les métadonnées seules. Pour changer le fichier, déposez une nouvelle version."
              : "Le document arrive en brouillon. Il ne sera visible hors de la direction qu'une fois publié."
        }
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => { setCreating(false); setEditing(null); setReplacing(null); }}>Annuler</Button>
            <Button type="submit" form="doc-form" loading={pending}>
              {replacing ? "Déposer la version" : editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        }
      >
        {(creating || editing || replacing) && (
          <DocForm doc={replacing ?? editing} mode={replacing ? "replace" : editing ? "update" : "create"} />
        )}
      </Modal>

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview?.doc.title ?? ""}
        description="Lien temporaire — il expire en deux minutes."
      >
        {preview && (previewKind(preview.doc.mimeType) === "pdf" ? (
          <iframe src={preview.url} title={preview.doc.title} className="h-[60vh] w-full rounded-control border border-rule" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt={preview.doc.title} className="max-h-[60vh] w-full rounded-control border border-rule object-contain" />
        ))}
      </Modal>

      <Modal
        open={detailOf !== null}
        onClose={() => { setDetailOf(null); setDetail(null); }}
        size="lg"
        title={detailOf ? `Historique — ${detailOf.title}` : ""}
        description="Versions et actes, depuis le journal existant."
      >
        {!detail ? (
          <p className="text-role-meta text-text-soft">Chargement…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-role-body font-semibold text-text">Versions</p>
              <ul className="mt-1 space-y-1">
                {detail.versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2 text-role-meta text-text-soft">
                    <Badge size="sm" variant={v.current ? "info" : "neutral"}>v{v.version}</Badge>
                    <span>{v.fileName}</span>
                    <StatusBadge domain="schoolDocument" status={String(v.status)} size="sm" />
                    <span className="ml-auto tabular-nums">{date(v.createdAt)}</span>
                    {v.current && <span className="font-medium text-text">courante</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-role-body font-semibold text-text">Actes</p>
              {detail.events.length === 0 ? (
                <p className="mt-1 text-role-meta text-text-soft">Aucun acte enregistré.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {detail.events.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-2 text-role-meta text-text-soft">
                      <span className="font-medium text-text">{e.action}</span>
                      {e.detail && <span>— {e.detail}</span>}
                      <span>par {e.who}</span>
                      <span className="ml-auto tabular-nums">{date(e.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── DIFFUSION (lot 17) ─── */}
      <Modal
        open={diffusion !== null}
        onClose={closeDiffusion}
        size="lg"
        title={diffusion ? `${diffuseLabel} — ${diffusion.doc.title}` : diffuseLabel}
        description="Les destinataires viennent des familles réellement inscrites dans la portée du document."
      >
        {diffusion && (
          <div className="space-y-4">
            {/* ⚠️ AVANT TOUT LE RESTE : ce qui n'a pas eu lieu. */}
            <div className="flex items-start gap-3 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-role-meta leading-relaxed text-text-soft">{diffusion.prep.notice}</p>
            </div>

            {/* Canal — change réellement la préparation, côté serveur. */}
            <div className="flex flex-wrap gap-2">
              {channels.map((c) => {
                const Icon = CHANNEL_ICON[c.id] ?? Send;
                const active = diffusion.prep.channel === c.id;
                return (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={active ? "secondary" : "ghost"}
                    loading={diffusionBusy && !active}
                    onClick={() => openDiffusion(diffusion.doc, c.id)}
                    title={c.reason}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {c.label}
                  </Button>
                );
              })}
            </div>

            {/* §8 — les chiffres sont comptés, jamais estimés. */}
            <div className="space-y-1 rounded-control border border-rule px-3 py-2.5">
              <p className="text-role-body text-text">
                <ShieldCheck aria-hidden="true" className="mr-1 inline h-4 w-4 text-text-faint" />
                {diffusion.prep.totalRecipients} famille{diffusion.prep.totalRecipients > 1 ? "s" : ""} concernée
                {diffusion.prep.totalRecipients > 1 ? "s" : ""} — {diffusion.prep.availableCount} avec une adresse{" "}
                {diffusion.prep.channelLabel}, {diffusion.prep.unavailableCount} sans.
              </p>
              {diffusion.prep.studentsWithoutParent > 0 && (
                <p className="text-role-meta text-text-soft">
                  <UserX aria-hidden="true" className="mr-1 inline h-4 w-4 text-text-faint" />
                  {diffusion.prep.studentsWithoutParent} élève(s) n&apos;ont aucun parent rattaché : personne ne les joindra.
                </p>
              )}
              {diffusion.prep.truncated && (
                <p className="text-role-meta text-text-soft">
                  Seules les {diffusion.prep.recipients.length} premières familles sont listées ci-dessous.
                </p>
              )}
            </div>

            {/* Destinataires réels. Toute la ligne est la cible tactile (leçon 16.1). */}
            {diffusion.prep.recipients.length === 0 ? (
              <p className="rounded-control border border-rule px-3 py-3 text-role-meta text-text-soft">
                Aucune famille rattachée à la portée de ce document : il n&apos;y a personne à qui le remettre.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {diffusion.prep.recipients.map((r) => (
                  <li key={r.parentId} className="rounded-control border border-rule">
                    <label className={`flex flex-wrap items-center gap-2 px-3 py-3 ${r.available ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}>
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0"
                        disabled={!r.available}
                        checked={chosen.has(r.parentId)}
                        onChange={(e) => {
                          const next = new Set(chosen);
                          if (e.target.checked) next.add(r.parentId); else next.delete(r.parentId);
                          setChosen(next);
                        }}
                      />
                      {/* ⚠️ `break-words` : « Fatoumata-Binetou Ndiaye-Diagne » à côté
                          d'une pastille « Destinataire indisponible » ne laisse plus
                          que ~150 px sur un écran de 390. Sans point de césure, le nom
                          était coupé — mesuré, pas supposé. */}
                      <span className="min-w-0 flex-1 basis-full break-words sm:basis-auto">
                        <span className="block text-role-body text-text">{r.name}</span>
                        <span className="block text-role-meta text-text-soft">
                          {r.children.join(", ") || "aucun enfant listé"}
                        </span>
                      </span>
                      {/* §8 — dit clairement quand personne ne peut être joint. */}
                      {r.available
                        ? <Badge size="sm" variant="neutral">{diffusion.prep.channel === "email" ? r.email : r.phone}</Badge>
                        : <Badge size="sm" variant="warning">Destinataire indisponible</Badge>}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {/* Le paquet à transmettre soi-même. */}
            {diffusion.prep.channel === "email" && (
              <Input label="Objet" readOnly value={diffusion.prep.subject} />
            )}
            <Textarea label="Message à copier" readOnly rows={5} value={diffusion.prep.text} />
            <Input
              label={`Lien temporaire vers le fichier (${Math.round(diffusion.prep.link.ttlSeconds / 60)} minutes)`}
              readOnly
              value={diffusion.prep.link.url}
            />
            <p className="text-role-meta text-text-soft">
              <Clock aria-hidden="true" className="mr-1 inline h-4 w-4 text-text-faint" />
              Ce lien expire — ce n&apos;est ni un lien permanent, ni une preuve de transmission.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(`${diffusion.prep.text}\n${diffusion.prep.link.url}`);
                  toast.success("Message et lien copiés.");
                }}
              >
                Copier le message
              </Button>
            </div>

            {/* §10 — confirmation humaine explicite avant d'écrire quoi que ce soit. */}
            {!confirmStep ? (
              <div className="border-t border-rule pt-3">
                <p className="mb-2 text-role-meta text-text-soft">
                  Une fois le message réellement envoyé depuis votre {diffusion.prep.channel === "email" ? "messagerie" : "téléphone"},
                  enregistrez-le ici pour en garder la trace.
                </p>
                <Button
                  variant="primary"
                  disabled={chosen.size === 0}
                  onClick={() => setConfirmStep(true)}
                >
                  <Check aria-hidden="true" className="h-4 w-4" />
                  J&apos;ai transmis ce document
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-control border border-rule bg-sunk px-3 py-3">
                <p className="text-role-body text-text">
                  Vous êtes sur le point d&apos;enregistrer que <strong>vous avez transmis</strong> «&nbsp;{diffusion.doc.title}&nbsp;»
                  à {chosen.size} famille{chosen.size > 1 ? "s" : ""} par {diffusion.prep.channelLabel}.
                </p>
                <p className="text-role-meta text-text-soft">
                  EduCom n&apos;a rien envoyé : cette trace dit qu&apos;un humain l&apos;a fait, avec son nom et la date.
                </p>
                <Textarea
                  label="Note (facultative)"
                  rows={2}
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Groupe WhatsApp des parents de CM2, 18 h"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => setConfirmStep(false)}>Annuler</Button>
                  <Button variant="primary" loading={diffusionBusy} onClick={saveDelivery}>
                    Confirmer la remise
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
