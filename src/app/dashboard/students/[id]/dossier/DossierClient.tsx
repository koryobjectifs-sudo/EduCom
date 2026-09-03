"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Upload, Download, Check, X, FileText, History, GraduationCap, AlertTriangle,
  Lock, ScanLine, Send, Clock, UserX,
  IdCard, ClipboardList, HeartPulse, Award, ArrowLeftRight, Folder, FolderOpen, Package,
  ArrowLeft, ChevronDown, Plus, FolderPlus,
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
  prepareStudentDocumentDiffusion, confirmStudentDocumentDiffusion, createStudentDocFolder,
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

/**
 * L'icône de chaque rayon.
 *
 * ⚠️ Les rayons EUX-MÊMES viennent du serveur (`categories`), déjà bornés par
 * `canSeeCategory()`. Ce sont les valeurs de `DocCategory` — pas une
 * nomenclature inventée pour l'écran : classer autrement ici produirait un
 * rangement que les exigences, la validation et l'export ne connaissent pas.
 * Ici, seule l'illustration se décide.
 */
/** Une carte du hub : catégorie officielle, ou classeur créé par l'école. */
type Rayon = {
  cle: string;
  kind: "categorie" | "perso";
  categorie: string;
  folderId: string | null;
  titre: string;
  Icone: typeof Folder;
  lignes: Line[];
  libres: { id: string; label: string; category: string; folderId: string | null; status: string; fileName: string; sizeBytes: number; uploadedAt: string }[];
  pieces: number;
  manquants: number;
  exige: boolean;
};

const ICONE_RAYON: Record<string, typeof Folder> = {
  IDENTITE: IdCard,
  INSCRIPTION: ClipboardList,
  SCOLARITE: GraduationCap,
  SANTE: HeartPulse,
  EXAMENS: Award,
  TRANSFERT: ArrowLeftRight,
  AUTRES: Folder,
};

/** `Button` n'accepte pas d'être rendu en `<a>` : un lien qui doit lui ressembler copie sa variante « secondary », taille `sm`. */
const LIEN_SECONDAIRE =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-rule bg-surface px-3 " +
  "text-role-label font-semibold text-text shadow-card transition-colors hover:bg-sunk " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 " +
  "pointer-coarse:min-h-11";

const ACTION_LABELS: Record<string, string> = {
  "studentDocument.upload": "Dépôt",
  "studentDocument.replace": "Remplacement",
  "studentDocument.validate": "Validation",
  "studentDocument.reject": "Rejet",
  "studentDocument.download": "Téléchargement",
};

export function DossierClient({
  studentId, student, kind, kindDeclared, year, enrollments, lines, loose, completeness, canReview,
  restricted, notice, events, channels, categories, folders,
}: {
  studentId: string;
  student: {
    firstName: string; lastName: string; status: string; dateOfBirth: string | null;
    address: string | null; bloodGroup: string | null; emergencyContact: string | null;
    emergencyPhone: string | null; createdAt: string;
    parent: { name: string; email: string; phone: string | null } | null;
  };
  kind: string; kindDeclared: boolean; year: string;
  /** Rayons visibles par l'acteur, résolus côté serveur. Le client n'en décide rien. */
  categories: readonly string[];
  /** Rayons personnalisés de l'école. Ils s'ajoutent aux catégories, ne les remplacent pas. */
  folders: { id: string; name: string }[];
  enrollments: { academicYear: string; className: string; cycle: string }[];
  lines: Line[];
  loose: { id: string; label: string; category: string; folderId: string | null; status: string; fileName: string; sizeBytes: number; uploadedAt: string }[];
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
  /** Chemin d'entrée de la fenêtre de dépôt. `null` = fermée. */
  const [scan, setScan] = useState<"scan" | "import" | null>(null);
  /** Rayon ouvert. `null` = le hub. */
  const [folder, setFolder] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [nomDossier, setNomDossier] = useState("");
  const [erreurDossier, setErreurDossier] = useState<string | null>(null);
  const [creationBusy, setCreationBusy] = useState(false);
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
  /**
   * ⚠️ Un seul jeu de champs de fichier, parce qu'une seule liste les rend
   * désormais. La version précédente en tenait deux — la checklist et le
   * récapitulatif affichaient la même ligne : écrites sous la même clé, la
   * seconde référence écrasait la première.
   */
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  function send(file: File, opts: { requirementId: string | null; label: string; category: string; folderId?: string | null; dossier?: string }) {
    const fd = new FormData();
    fd.set("studentId", studentId);
    if (opts.requirementId) fd.set("requirementId", opts.requirementId);
    fd.set("label", opts.label);
    fd.set("category", opts.category);
    if (opts.folderId) fd.set("folderId", opts.folderId);
    fd.set("file", file);
    // ⚠️ Le lot 14 exige une confirmation avant tout remplacement. Ici, le clic
    // s'est fait sur un bouton qui affiche « Remplacer » à côté du nom de la
    // pièce existante : la confirmation est l'acte lui-même, pas une case en
    // plus. La demander deux fois transformerait un geste clair en obstacle.
    fd.set("confirmReplace", "1");

    start(async () => {
      const r = await uploadStudentDocument(fd);
      if (r.error) { toast.error(r.error); return; }
      // ⚠️ Nommer le rayon : une pièce glissée dans la grille disparaît de
      // l'écran si le rayon visé n'est pas celui qui est ouvert.
      toast.success(
        r.data?.replaced
          ? "Pièce remplacée — l'ancienne version est conservée."
          : opts.dossier
            ? `Pièce ajoutée dans « ${opts.dossier} ».`
            : "Pièce déposée.",
      );
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


  /**
   * ═══ LES RAYONS ═══
   *
   * ⚠️ Dérivés à chaque rendu de `lines` et `loose`, jamais comptés à part : un
   * compteur tenu séparément finit toujours par contredire la liste qu'il
   * prétend résumer.
   */
  const dossiers: Rayon[] = useMemo(() => {
    /* ⚠️ Une pièce rangée dans un classeur personnalisé ne doit PAS reparaître
       dans le rayon de sa catégorie : elle serait comptée deux fois et le total
       du pied de page contredirait la somme des cartes. Le classeur gagne. */
    const officiels: Rayon[] = categories.map((cle) => {
      const lignes = lines.filter((l) => l.category === cle);
      const libres = loose.filter((d) => d.category === cle && !d.folderId);
      return {
        cle: `cat:${cle}`,
        kind: "categorie",
        categorie: cle,
        folderId: null,
        titre: categoryLabel(cle),
        Icone: ICONE_RAYON[cle] ?? Folder,
        lignes,
        libres,
        /** Ce qui est RÉELLEMENT rangé : une exigence sans pièce n'est pas une pièce. */
        pieces: lignes.filter((l) => l.document).length + libres.length,
        manquants: lignes.filter(
          (l) => l.status === "MISSING" || l.status === "REJECTED" || l.status === "EXPIRED",
        ).length,
        /** Vrai si une exigence porte sur ce rayon — sans quoi « Complet » ne veut rien dire. */
        exige: lignes.length > 0,
      };
    });

    /* Un classeur de l'école ne porte JAMAIS d'exigence : une exigence vise une
       catégorie, pas un classeur. Il n'est donc ni complet ni incomplet. */
    const perso: Rayon[] = folders.map((fo) => {
      const libres = loose.filter((d) => d.folderId === fo.id);
      return {
        cle: `folder:${fo.id}`,
        kind: "perso",
        categorie: "AUTRES",
        folderId: fo.id,
        titre: fo.name,
        Icone: FolderPlus,
        lignes: [],
        libres,
        pieces: libres.length,
        manquants: 0,
        exige: false,
      };
    });

    return [...officiels, ...perso];
  }, [categories, folders, lines, loose]);

  const totalPieces = dossiers.reduce((n, g) => n + g.pieces, 0);

  /**
   * ⚠️ `folder` est une PRÉFÉRENCE, pas la vérité : un rayon peut cesser d'être
   * visible entre deux rendus (droits recalculés, catégorie retirée) et laisser
   * la sélection pointer dans le vide. On ne lit donc jamais `folder`
   * directement — l'écran retombe sur le hub plutôt que d'afficher un dossier
   * qui n'existe pas, ce qu'aucune erreur n'aurait signalé.
   */
  const dossierOuvert = folder ? dossiers.find((g) => g.cle === folder) ?? null : null;

  /**
   * Dépôt d'une pièce hors checklist dans un rayon — officiel ou personnalisé.
   *
   * ⚠️ Le libellé est le nom du fichier : personne n'a saisi de titre, et en
   * inventer un fabriquerait une donnée que rien ne justifie. Pour rattacher
   * une pièce à une exigence précise, c'est le bouton « Déposer » de la ligne
   * concernée — là, le libellé existe déjà.
   */
  function deposerLibre(files: FileList | null, cible: Rayon) {
    const f = files?.[0];
    if (!f) return;
    send(f, {
      requirementId: null,
      label: f.name.replace(/\.[^.]+$/, "").slice(0, 120) || f.name,
      category: cible.categorie,
      folderId: cible.folderId,
      dossier: cible.titre,
    });
  }

  /** Création d'un classeur — « Bourse », « Cantine »… */
  function creerDossier() {
    const nom = nomDossier.trim();
    if (!nom) { setErreurDossier("Le nom du dossier est obligatoire."); return; }
    setCreationBusy(true);
    setErreurDossier(null);
    void (async () => {
      const r = await createStudentDocFolder(nom);
      setCreationBusy(false);
      if (r.error) { setErreurDossier(r.error); return; }
      toast.success(`Dossier « ${r.data!.name} » créé.`);
      setCreationOuverte(false);
      setFolder(`folder:${r.data!.id}`);
    })();
  }

  /**
   * ⚠️ Fonctions, pas composants. Écrites en `<Ligne … />`, React les prendrait
   * pour un type de composant recréé à chaque rendu : il démonterait puis
   * remonterait chaque ligne, et les `ref` des champs de fichier
   * (`inputs.current[…]`) seraient remises à `null` sous le clic.
   */
  const ligneExigee = (l: Line) => (
    <li key={l.requirementId} className="rounded-control border border-rule px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-text-faint" />
        <span className="font-medium text-text">{l.label}</span>
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
  );

  const ligneLibre = (d: (typeof loose)[number]) => (
    <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-control border border-rule px-3 py-2">
      <FileText aria-hidden="true" className="h-4 w-4 text-text-faint" />
      <span className="font-medium text-text">{d.label}</span>
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
  );
  /**
   * Les trois capacités du dossier — identiques au hub et dans un rayon.
   *
   * ⚠️ « Importer » passe par la MÊME fenêtre que « Scanner » : c'est elle qui
   * fait classer la pièce (exigence, catégorie, libellé) avant de l'enregistrer.
   * Un import direct depuis le hub aurait dû choisir une destination à la place
   * de l'utilisateur, et un extrait de naissance serait tombé dans « Autres ».
   */
  const actions = (
    <>
      <Button size="sm" onClick={() => setScan("scan")}>
        <ScanLine aria-hidden="true" className="h-4 w-4" />
        Scanner
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setScan("import")}>
        <Upload aria-hidden="true" className="h-4 w-4" />
        Importer
      </Button>
      <Link href={`/dashboard/students/export?students=${studentId}`} className={LIEN_SECONDAIRE}>
        <Package aria-hidden="true" className="h-4 w-4" />
        Exporter
      </Link>
    </>
  );

  return (
    <div className="space-y-6">
      {/* ───────────── PÉRIMÈTRE ───────────── */}
      {restricted && notice && (
        <div className="flex items-start gap-3 rounded-control border border-rule bg-sunk px-4 py-3">
          <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
          <p className="text-role-meta leading-relaxed text-text-soft">{notice}</p>
        </div>
      )}

      {dossierOuvert ? (
        /* ═══════════════ UN DOSSIER OUVERT ═══════════════
           Le hub disparaît : on est DANS un rayon, et deux niveaux affichés
           ensemble laisseraient l'utilisateur ignorer où il se trouve. */
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setFolder(null)} className="-ml-2 shrink-0">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Tous les dossiers
              </Button>
              <div className="min-w-0">
                <h2 className="truncate text-role-card font-semibold text-text">{dossierOuvert.titre}</h2>
                <p className="text-role-meta text-text-soft">
                  {dossierOuvert.pieces} document{dossierOuvert.pieces > 1 ? "s" : ""}
                  {dossierOuvert.manquants > 0 && ` · ${dossierOuvert.manquants} manquant${dossierOuvert.manquants > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>

          <Card>
            {dossierOuvert.lignes.length === 0 && dossierOuvert.libres.length === 0 ? (
              <EmptyState
                size="sm"
                icon={FolderOpen}
                title="Ce dossier est vide"
                description="Aucune pièce n'est exigée ici et rien n'y a encore été rangé. Scannez ou importez un document pour l'ouvrir."
              />
            ) : (
              <div className="space-y-5">
                {dossierOuvert.lignes.length > 0 && (
                  <ul className="space-y-2">{dossierOuvert.lignes.map(ligneExigee)}</ul>
                )}

                {dossierOuvert.libres.length > 0 && (
                  <div className="space-y-2">
                    {dossierOuvert.lignes.length > 0 && (
                      <p className="text-role-meta font-semibold text-text-soft">Pièces versées hors checklist</p>
                    )}
                    <ul className="space-y-2">{dossierOuvert.libres.map(ligneLibre)}</ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      ) : (
        /* ═══════════════ LE HUB ═══════════════ */
        <>
          {/* ───────────── RÉCAPITULATIF ─────────────
              Compact et chiffré. Le détail de ce qui manque n'est PAS ici : il
              est dans le rayon concerné, où se trouve aussi le bouton pour le
              déposer. Le répéter en tête de page rendait l'écran illisible et
              repoussait les dossiers — le sujet de la page — sous la ligne de
              flottaison. */}
          <Card>
            {!completeness.configured ? (
              // ⚠️ Jamais 0 % : c'est la règle qui manque, pas les pièces.
              <div className="flex items-start gap-3">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="text-role-body font-semibold text-text">Aucune pièce exigée pour cet élève</p>
                  <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">
                    Aucun pourcentage n&apos;est affiché : il serait calculé sur une liste vide. Définissez vos
                    exigences dans Réglages › Pièces du dossier.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-rule">
                  {([
                    ["Requis", completeness.required, "text-text"],
                    ["Reçus", completeness.received, "text-text"],
                    ["Manquants", outstanding, outstanding > 0 ? "text-warning" : "text-text"],
                    ["Complet", `${completeness.percent ?? 0} %`, "text-text"],
                  ] as const).map(([label, valeur, ton], i) => (
                    <div key={label} className={i === 0 ? "sm:pr-6" : "sm:px-6"}>
                      <p className={`text-role-page font-semibold tabular-nums ${ton}`}>{valeur}</p>
                      <p className="text-role-meta text-text-soft">{label}</p>
                    </div>
                  ))}
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={completeness.percent ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Complétude du dossier"
                  className="h-1.5 w-full overflow-hidden rounded-pill bg-sunk"
                >
                  <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${completeness.percent}%` }} />
                </div>
              </div>
            )}
          </Card>

          {/* ───────────── ACTIONS DU DOSSIER ───────────── */}
          <div className="flex flex-wrap items-center gap-2">{actions}</div>

          {/* ───────────── LES DOSSIERS ─────────────
              ⚠️ TOUS les rayons officiels sont affichés, y compris vides — un
              dossier qui n'apparaît qu'une fois rempli est un dossier qu'on ne
              peut pas remplir. La liste vient du SERVEUR, déjà bornée par
              `canSeeCategory()` ; les classeurs personnalisés de l'école
              s'ajoutent à la suite, jamais à la place des sept catégories. */}
          <Card
            title="Dossiers"
            description="Cliquez un dossier pour l'ouvrir, ou glissez un fichier directement dessus."
            actions={
              <span className="text-role-meta tabular-nums text-text-faint">
                {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""} · {totalPieces} document
                {totalPieces > 1 ? "s" : ""}
              </span>
            }
            flush
          >
            {/* ⚠️ `categories` peut être VIDE : un rôle dont le périmètre
                documentaire ne couvre rien reçoit une liste vide, et la grille
                rendrait une carte blanche sans un mot d'explication. */}
            {dossiers.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  size="sm"
                  icon={FolderOpen}
                  title="Aucun dossier accessible"
                  description="Votre rôle ne donne accès à aucune catégorie de pièces pour cet élève."
                />
              </div>
            ) : (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {dossiers.map((g) => {
                const cible = survol === g.cle;
                return (
                  <button
                    key={g.cle}
                    type="button"
                    onClick={() => setFolder(g.cle)}
                    onDragOver={(e) => { e.preventDefault(); setSurvol(g.cle); }}
                    onDragLeave={() => setSurvol((s) => (s === g.cle ? null : s))}
                    onDrop={(e) => { e.preventDefault(); setSurvol(null); deposerLibre(e.dataTransfer.files, g); }}
                    aria-label={`Ouvrir le dossier ${g.titre} — ${g.pieces} document${g.pieces > 1 ? "s" : ""}`}
                    className={[
                      /* Rangée sur téléphone, carte sur écran large : réduire la
                         carte de bureau donnerait dix blocs hauts à faire
                         défiler pour lire dix libellés. */
                      "flex items-center gap-4 rounded-surface border bg-surface p-5 text-left shadow-card transition-colors",
                      "sm:flex-col sm:items-start sm:gap-6 sm:p-6",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                      cible ? "border-primary bg-primary/5" : "border-rule hover:border-primary/40",
                    ].join(" ")}
                  >
                    <span
                      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-control ${
                        cible ? "bg-primary/10" : "bg-sunk"
                      }`}
                    >
                      <g.Icone aria-hidden="true" className="h-6 w-6 text-primary-ink" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-role-body font-semibold text-primary-ink">{g.titre}</span>
                      <span className="mt-1 block text-role-meta tabular-nums text-text-soft">
                        {g.pieces} document{g.pieces > 1 ? "s" : ""}
                      </span>
                      {/* ⚠️ « Complet » n'a de sens que là où une exigence
                          existe. Un rayon qui ne contient que des pièces versées
                          librement n'est ni complet ni incomplet : rien n'y est
                          attendu, et l'annoncer complet serait faux. */}
                      {g.manquants > 0 ? (
                        <span className="mt-3 inline-flex items-center gap-1 text-role-meta font-semibold text-warning">
                          <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          {g.manquants} manquant{g.manquants > 1 ? "s" : ""}
                        </span>
                      ) : g.exige ? (
                        <span className="mt-3 inline-flex items-center gap-1 text-role-meta font-semibold text-success">
                          <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          Complet
                        </span>
                      ) : (
                        <span className="mt-3 block text-role-meta text-text-faint">
                          {g.pieces === 0 ? "Vide" : g.kind === "perso" ? "Dossier de l'école" : "Aucune pièce exigée"}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

              {/* ───── + NOUVEAU DOSSIER ─────
                  En pointillé et sans ombre : c'est une commande, pas un
                  classeur. Rendue comme les autres cartes, elle se compterait
                  parmi les dossiers du regard avant d'être lue. */}
              <button
                type="button"
                onClick={() => { setNomDossier(""); setErreurDossier(null); setCreationOuverte(true); }}
                className={[
                  "flex items-center gap-4 rounded-surface border border-dashed border-rule p-5 text-left transition-colors",
                  "sm:flex-col sm:items-start sm:gap-6 sm:p-6",
                  "hover:border-primary/50 hover:bg-sunk/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                ].join(" ")}
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-dashed border-rule">
                  <Plus aria-hidden="true" className="h-6 w-6 text-text-faint" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-role-body font-semibold text-text">Nouveau dossier</span>
                  <span className="mt-1 block text-role-meta text-text-soft">Bourse, cantine, transport…</span>
                </span>
              </button>
            </div>
            )}
          </Card>

          {/* ───────────── APPUIS ─────────────
              Repliés par défaut. Rien n'est supprimé : la fiche élève porte
              désormais l'identité et la scolarité en entier, et l'historique
              n'est consulté qu'en cas de doute. Les déplier n'est qu'un clic ;
              les laisser ouverts repoussait les dossiers hors de l'écran. */}
          <div className="space-y-3">
            {([
              { cle: "identite", titre: "Informations de l'élève", Icone: IdCard },
              { cle: "scolarite", titre: "Scolarité", Icone: GraduationCap },
              { cle: "historique", titre: "Historique du dossier", Icone: History },
            ] as const).map(({ cle, titre, Icone }) => (
              <details key={cle} className="group rounded-surface border border-rule bg-surface shadow-card">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-role-body font-semibold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 pointer-coarse:min-h-11">
                  <Icone aria-hidden="true" className="h-4 w-4 shrink-0 text-text-faint" />
                  {titre}
                  <ChevronDown
                    aria-hidden="true"
                    className="ml-auto h-4 w-4 shrink-0 text-text-faint transition-transform group-open:rotate-180"
                  />
                </summary>

                <div className="border-t border-rule px-5 py-4">
                  {cle === "identite" && (
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
                  )}

                  {cle === "scolarite" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-role-meta text-text-soft">Année en cours : {year}.</span>
                        <Badge variant={kind === "NOUVEAU" ? "info" : "neutral"}>
                          {STUDENT_KIND_LABELS[kind as keyof typeof STUDENT_KIND_LABELS] ?? kind}
                          {!kindDeclared && " (déduit)"}
                        </Badge>
                      </div>
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
                    </div>
                  )}

                  {cle === "historique" && (
                    events.length === 0 ? (
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
                    )
                  )}
                </div>
              </details>
            ))}
          </div>
        </>
      )}

      {/* ───────────── NOUVEAU DOSSIER (rayon personnalisé) ───────────── */}
      <Modal
        open={creationOuverte}
        onClose={() => setCreationOuverte(false)}
        size="sm"
        title="Nouveau dossier"
        description="Un classeur propre à l'établissement — bourse, cantine, transport…"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreationOuverte(false)}>Annuler</Button>
            <Button loading={creationBusy} onClick={creerDossier}>
              <FolderPlus aria-hidden="true" className="h-4 w-4" />
              Créer le dossier
            </Button>
          </>
        }
      >
        <Input
          label="Nom du dossier"
          value={nomDossier}
          onChange={(e) => { setNomDossier(e.target.value); setErreurDossier(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") creerDossier(); }}
          placeholder="Ex. Bourse, Cantine, Transport…"
          error={erreurDossier}
          autoFocus
        />
        {/* ⚠️ Les sept catégories officielles restent la classification qui
            porte les exigences et les droits — un classeur ne peut recevoir
            que des pièces versées hors checklist. Le dire ici évite qu'on s'y
            reprenne pour comprendre pourquoi une pièce exigée n'y apparaît
            jamais. */}
        <p className="mt-3 text-role-meta leading-relaxed text-text-faint">
          Un dossier personnalisé ne remplace pas les catégories officielles (Identité, Scolarité…) : il s&apos;y
          ajoute, pour des pièces que la checklist ne prévoit pas.
        </p>
      </Modal>

      <ScanDialog
        open={scan !== null}
        intent={scan}
        defaultCategory={dossierOuvert?.cle ?? "AUTRES"}
        onClose={() => setScan(null)}
        studentId={studentId}
        studentName={`${student.firstName} ${student.lastName}`}
        lines={lines.map((l) => ({
          requirementId: l.requirementId,
          label: l.label,
          category: l.category,
          hasDocument: l.document !== null,
        }))}
      />
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
