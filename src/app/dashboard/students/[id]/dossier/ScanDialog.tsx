"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Camera, Upload, FileText, Trash2, ArrowUp, ArrowDown, Wand2, Check,
  AlertTriangle, Info, Eye, Plus,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { DOC_CATEGORY_LABELS, categoryLabel, formatSize } from "@/lib/studentFileLabels";
import { checkFile, MAX_BYTES } from "@/lib/studentFileLimits";
import { pdfFromJpegs, jpegSize, MAX_EDGE, MAX_PAGES } from "@/lib/scan";
import { analyzeStudentDocument, uploadStudentDocument } from "./actions";

/**
 * Ajout d'une pièce au dossier — import ou scan. Lot 14.
 *
 * ═══ LE PARCOURS, ET POURQUOI IL EST DANS CET ORDRE ═══
 *
 *   choisir → pages → analyser → vérifier → confirmer → classé
 *
 * L'étape courante est **écrite en toutes lettres** en haut de la boîte. Une
 * secrétaire qui numérise trente dossiers doit savoir où elle en est sans le
 * déduire de la disposition des boutons.
 *
 * ═══ CE QUI EST DÉTECTÉ, ET CE QUI EST SUPPOSÉ ═══
 *
 * ⚠️ **Aucune API n'est supposée présente.** Sont détectées, à l'exécution :
 * l'attribut `capture` (appareil photo direct), `canvas.toBlob` (réduction et
 * assemblage PDF), `createImageBitmap` (décodage). Chaque absence a une issue :
 * le bouton « Scanner » retombe sur le sélecteur de fichiers, et une pièce non
 * décodable part **telle quelle** au lieu d'être perdue. Rien ne bloque le
 * parcours entier.
 *
 * ⚠️ **Aucune décision automatique.** L'analyse propose ; l'humain tranche. Le
 * dossier de départ n'est jamais changé par une proposition : si l'analyse
 * reconnaît un autre élève, elle le dit, et il faut fermer et rouvrir depuis le
 * bon dossier. Détourner la cible en silence serait le pire défaut possible ici.
 */

type Line = { requirementId: string; label: string; category: string; hasDocument: boolean };

type Page = {
  id: string;
  /** JPEG réduit, prêt pour l'assemblage. */
  bytes: Uint8Array;
  width: number;
  height: number;
  url: string;
};

type Analysis = Awaited<ReturnType<typeof analyzeStudentDocument>>["data"];

const STEPS = ["Choisir", "Pages", "Vérifier", "Confirmer"] as const;

const ACCEPT_IMPORT =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

/** Capacités réellement offertes par CE navigateur, mesurées une fois. */
function useCapabilities() {
  const [caps, setCaps] = useState({ capture: false, canvas: false, bitmap: false, checked: false });
  useEffect(() => {
    const input = document.createElement("input");
    setCaps({
      capture: "capture" in input,
      canvas: typeof HTMLCanvasElement !== "undefined" && typeof HTMLCanvasElement.prototype.toBlob === "function",
      bitmap: typeof createImageBitmap === "function",
      checked: true,
    });
  }, []);
  return caps;
}

export function ScanDialog({
  open, onClose, studentId, studentName, lines, intent = null, defaultCategory = "AUTRES",
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  lines: Line[];
  /**
   * Chemin choisi AVANT l'ouverture — le hub du dossier propose « Scanner » et
   * « Importer » séparément, et refaire ce choix dans la fenêtre serait un clic
   * pour rien. `null` laisse l'étape 0 poser la question.
   */
  intent?: "scan" | "import" | null;
  /** Rayon d'où la fenêtre a été ouverte : pré-sélectionne la catégorie. */
  defaultCategory?: string;
}) {
  const caps = useCapabilities();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);

  const [pages, setPages] = useState<Page[]>([]);
  /** Fichier importé tel quel (PDF, ou image non décodable) — jamais converti. */
  const [asIs, setAsIs] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [requirementId, setRequirementId] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [label, setLabel] = useState("");
  const [accepted, setAccepted] = useState<Record<string, unknown> | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [saved, setSaved] = useState<{ replaced: boolean } | null>(null);

  const importRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Les URL d'objet sont révoquées : chacune retient son image en mémoire, et
  // trente pages oubliées sur un téléphone finissent par le faire ramer.
  useEffect(() => () => { pages.forEach((p) => URL.revokeObjectURL(p.url)); }, [pages]);

  function reset() {
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]); setAsIs(null); setAnalysis(null); setAccepted(null);
    setRequirementId(""); setCategory(defaultCategory); setLabel("");
    setConfirmReplace(false); setSaved(null); setStep(0); setZoom(null);
  }

  function close() { reset(); onClose(); }

  /**
   * Ouverture directe sur le chemin demandé.
   *
   * ⚠️ Le clic programmatique sur un `<input type="file">` n'est accepté que
   * pendant l'activation transitoire déclenchée par le geste de l'utilisateur.
   * Le report d'un tour de boucle laisse la modale se monter (sans quoi la
   * référence est encore nulle) et reste dans cette fenêtre. Si un navigateur
   * refuse quand même, **rien n'est cassé** : l'étape 0 est là, avec ses deux
   * boutons.
   */
  useEffect(() => {
    if (!open || !intent) return;
    const t = setTimeout(() => {
      // ⚠️ Dans la temporisation, pas dans le corps de l'effet : un `setState`
      // synchrone y déclenche un rendu en cascade, que le lint refuse.
      setCategory(defaultCategory);
      (intent === "scan" ? cameraRef : importRef).current?.click();
    }, 0);
    return () => clearTimeout(t);
  }, [open, intent, defaultCategory]);

  const chosenLine = lines.find((l) => l.requirementId === requirementId) ?? null;
  const needsReplace = Boolean(chosenLine?.hasDocument);

  /* ═════════ réduction d'une image capturée ═════════ */

  /**
   * Réduit une image et la réencode en JPEG.
   *
   * ⚠️ Une photo d'appareil moderne fait 4000 px et 5 Mo ; trois pages
   * dépasseraient la limite de 10 Mo à elles seules. On ramène le côté long à
   * 1600 px — largement lisible pour un extrait de naissance — avant tout envoi.
   */
  async function toJpegPage(file: File): Promise<Page | null> {
    if (!caps.canvas || !caps.bitmap) return null;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
      if (!blob) return null;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const measured = jpegSize(bytes) ?? { width: w, height: h };
      return { id: crypto.randomUUID(), bytes, ...measured, url: URL.createObjectURL(blob) };
    } catch {
      return null; // décodage impossible (HEIC sur un navigateur qui l'ignore)
    }
  }

  async function addFiles(files: FileList | null, source: "scan" | "import") {
    if (!files?.length) return;
    setBusy("Préparation des pages…");
    try {
      for (const file of Array.from(files)) {
        const verdict = checkFile(file.type, file.name, file.size);
        if (!verdict.ok) { toast.error(verdict.error); continue; }

        // Un PDF n'est pas converti : le rouvrir page par page en images le
        // dégraderait et coûterait cher sur un téléphone, pour rien.
        if (file.type === "application/pdf") {
          if (pages.length > 0) {
            toast.error("Un PDF ne se combine pas avec des pages photographiées. Terminez ou videz les pages en cours.");
            continue;
          }
          setAsIs(file);
          if (!label) setLabel(file.name.replace(/\.[^.]+$/, ""));
          setStep(1);
          continue;
        }

        if (asIs) { toast.error("Un document est déjà en cours. Terminez-le d'abord."); continue; }
        if (pages.length >= MAX_PAGES) { toast.error(`Maximum ${MAX_PAGES} pages par document.`); break; }

        const page = await toJpegPage(file);
        if (page) {
          setPages((p) => [...p, page]);
          if (!label) setLabel(file.name.replace(/\.[^.]+$/, ""));
        } else {
          // Repli honnête : on ne perd pas la pièce, on l'envoie telle quelle.
          setAsIs(file);
          if (!label) setLabel(file.name.replace(/\.[^.]+$/, ""));
          toast.info("Cette image n'a pas pu être préparée par le navigateur : elle sera envoyée telle quelle.");
        }
        setStep(1);
      }
    } finally { setBusy(null); }
  }

  /* ═════════ analyse ═════════ */

  function analyze() {
    const fileName = asIs?.name ?? (label ? `${label}.pdf` : "document.pdf");
    start(async () => {
      const r = await analyzeStudentDocument({ studentId, fileName });
      if (r.error) { toast.error(r.error); return; }
      const a = r.data!;
      setAnalysis(a);
      // ⚠️ Rien n'est préselectionné à la place de l'humain : la meilleure
      // proposition est mise en avant, mais le champ reste vide tant qu'il ne
      // l'a pas acceptée. Un formulaire prérempli se valide sans être lu.
      setStep(2);
    });
  }

  function acceptRequirement(p: NonNullable<Analysis>["requirements"][number]) {
    setRequirementId(p.requirementId);
    setCategory(String(p.category));
    setLabel(p.label);
    setConfirmReplace(false);
    setAccepted({ ...(accepted ?? {}), requirement: { id: p.requirementId, label: p.label, score: p.score } });
    toast.success("Proposition retenue — vérifiez avant de confirmer.");
  }

  /* ═════════ enregistrement ═════════ */

  async function buildFile(): Promise<File | null> {
    if (asIs) return asIs;
    if (pages.length === 0) return null;
    if (pages.length === 1) {
      // Une seule page : le JPEG suffit. Emballer une image unique dans un PDF
      // ne rend service à personne et alourdit le fichier.
      return new File([pages[0].bytes as BlobPart], `${label || "document"}.jpg`, { type: "image/jpeg" });
    }
    const pdf = pdfFromJpegs(pages.map((p) => ({ bytes: p.bytes, width: p.width, height: p.height })));
    return new File([pdf as BlobPart], `${label || "document"}.pdf`, { type: "application/pdf" });
  }

  function save() {
    start(async () => {
      const file = await buildFile();
      if (!file) { toast.error("Aucune page à enregistrer."); return; }
      if (!label.trim()) { toast.error("Le libellé de la pièce est obligatoire."); return; }

      const verdict = checkFile(file.type, file.name, file.size);
      if (!verdict.ok) {
        toast.error(`${verdict.error} Retirez une page ou reprenez la photo de plus loin.`);
        return;
      }

      const fd = new FormData();
      fd.set("studentId", studentId);
      if (requirementId) fd.set("requirementId", requirementId);
      fd.set("label", label.trim());
      fd.set("category", category);
      fd.set("file", file);
      fd.set("source", asIs ? "import" : "scan");
      fd.set("pages", String(asIs ? 1 : pages.length));
      if (analysis) {
        fd.set("proposal", JSON.stringify({
          ocrAvailable: analysis.ocr.available,
          textSource: analysis.textSource,
          proposedRequirements: analysis.requirements.map((r) => ({ label: r.label, score: r.score })),
          proposedStudents: analysis.students.map((s) => ({ name: s.name, score: s.score })),
          accepted,
        }));
      }
      if (confirmReplace) fd.set("confirmReplace", "1");

      const r = await uploadStudentDocument(fd);
      if (r.error) { toast.error(r.error); return; }
      if (r.needsConfirmation) {
        toast.error(`Une pièce existe déjà pour cette exigence (${r.needsConfirmation.fileName}). Cochez « Remplacer » pour continuer.`);
        setConfirmReplace(false);
        return;
      }
      setSaved({ replaced: Boolean(r.data?.replaced) });
      setStep(3);
    });
  }

  /* ═════════ rendu ═════════ */

  const totalBytes = useMemo(
    () => (asIs ? asIs.size : pages.reduce((n, p) => n + p.bytes.length, 0)),
    [asIs, pages],
  );
  const tooBig = totalBytes > MAX_BYTES;

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Ajouter une pièce au dossier"
      description={`Dossier de ${studentName}. Les pièces restent privées et ne quittent jamais l'établissement.`}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          <span className="text-role-meta text-text-soft">
            {STEPS.map((s, i) => (
              <span key={s} className={i === step ? "font-semibold text-text" : ""}>
                {i > 0 && " › "}{s}
              </span>
            ))}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {step === 3 ? (
              <Button onClick={close}>Terminer</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={close}>Annuler</Button>
                {step === 1 && (
                  <Button loading={pending} disabled={tooBig || (pages.length === 0 && !asIs)} onClick={analyze}>
                    <Wand2 aria-hidden="true" className="h-4 w-4" /> Analyser le document
                  </Button>
                )}
                {step === 2 && (
                  <Button loading={pending} disabled={!label.trim() || (needsReplace && !confirmReplace)} onClick={save}>
                    <Check aria-hidden="true" className="h-4 w-4" /> Confirmer et classer
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      }
    >
      {/* ─────────── ÉTAPE 0 — CHOISIR ─────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-surface border border-rule bg-surface px-4 py-8 text-center shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Camera aria-hidden="true" className="h-7 w-7 text-primary" />
              <span className="text-role-body font-semibold text-text">Scanner</span>
              <span className="text-role-meta text-text-soft">
                {caps.checked && !caps.capture
                  ? "Votre navigateur n'ouvre pas l'appareil photo : le sélecteur de fichiers s'ouvrira à la place."
                  : "Photographiez la pièce, page après page."}
              </span>
            </button>

            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-surface border border-rule bg-surface px-4 py-8 text-center shadow-card transition-colors hover:bg-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Upload aria-hidden="true" className="h-7 w-7 text-primary" />
              <span className="text-role-body font-semibold text-text">Importer un fichier</span>
              <span className="text-role-meta text-text-soft">PDF, JPEG, PNG, WEBP, HEIC — 10 Mo maximum.</span>
            </button>
          </div>

          {caps.checked && !caps.canvas && (
            <p className="flex items-start gap-2 rounded-control border border-warning/30 bg-warning/5 px-3 py-2 text-role-meta text-text-soft">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              Ce navigateur ne sait pas assembler plusieurs pages en un PDF. Les pièces peuvent être importées une par une.
            </p>
          )}
        </div>
      )}

      {/* ─────────── ÉTAPE 1 — PAGES ─────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {busy && <p className="text-role-meta text-text-soft">{busy}</p>}

          {asIs ? (
            <div className="flex flex-wrap items-center gap-3 rounded-control border border-rule px-3 py-3">
              <FileText aria-hidden="true" className="h-5 w-5 text-text-faint" />
              <span className="font-medium text-text">{asIs.name}</span>
              <Badge size="sm">{asIs.type === "application/pdf" ? "PDF" : "Image"}</Badge>
              <span className="text-role-meta text-text-soft">{formatSize(asIs.size)}</span>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAsIs(null)}>
                <Trash2 aria-hidden="true" className="h-4 w-4" /> Retirer
              </Button>
              <p className="w-full text-role-meta text-text-soft">
                Ce fichier est envoyé tel quel, sans conversion ni recompression.
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {pages.map((p, i) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-control border border-rule px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Page ${i + 1}`} className="h-16 w-12 rounded border border-rule object-cover" />
                    <span className="font-medium text-text">Page {i + 1}</span>
                    <span className="text-role-meta text-text-soft">
                      {p.width}×{p.height} · {formatSize(p.bytes.length)}
                    </span>
                    <div className="ml-auto flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Aperçu de la page ${i + 1}`} onClick={() => setZoom(p.url)}>
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Monter la page ${i + 1}`} disabled={i === 0}
                        onClick={() => setPages((ps) => { const n = [...ps]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>
                        <ArrowUp aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Descendre la page ${i + 1}`} disabled={i === pages.length - 1}
                        onClick={() => setPages((ps) => { const n = [...ps]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}>
                        <ArrowDown aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Supprimer la page ${i + 1}`}
                        onClick={() => setPages((ps) => { URL.revokeObjectURL(ps[i].url); return ps.filter((_, k) => k !== i); })}>
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => cameraRef.current?.click()}>
                  <Plus aria-hidden="true" className="h-4 w-4" /> Ajouter une page
                </Button>
                <span className="text-role-meta text-text-soft">
                  {pages.length} page{pages.length > 1 ? "s" : ""} · {formatSize(totalBytes)}
                  {pages.length > 1 && " · seront assemblées en un seul PDF"}
                </span>
              </div>
            </>
          )}

          {tooBig && (
            <p className="flex items-start gap-2 rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-role-meta text-danger">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              L&apos;ensemble dépasse 10 Mo. Retirez une page avant de continuer.
            </p>
          )}

          {zoom && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={zoom} alt="Aperçu de la page" className="max-h-[50vh] w-full rounded-control border border-rule object-contain" onClick={() => setZoom(null)} />
          )}
        </div>
      )}

      {/* ─────────── ÉTAPE 2 — VÉRIFIER ─────────── */}
      {step === 2 && analysis && (
        <div className="space-y-5">
          {/* État réel de la reconnaissance de texte — jamais une promesse. */}
          <div className="flex items-start gap-3 rounded-control border border-rule bg-sunk px-3 py-2.5">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
            <div>
              <p className="text-role-body font-semibold text-text">
                {analysis.ocr.available ? "Lecture automatique disponible" : "Lecture automatique indisponible"}
              </p>
              <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">{analysis.ocr.reason}</p>
              <p className="mt-1 text-role-meta leading-relaxed text-text-faint">
                Les propositions ci-dessous sont déduites du <strong>nom du fichier</strong>
                {analysis.analyzedText ? ` (« ${analysis.analyzedText} »)` : ""} — pas du contenu de la pièce.
              </p>
            </div>
          </div>

          {/* Dossier cible : rappelé, et jamais modifié par une proposition. */}
          <div className="rounded-control border border-rule px-3 py-2.5">
            <p className="text-role-meta text-text-faint">Dossier de destination</p>
            <p className="text-role-body font-semibold text-text">{analysis.context.name}</p>
            {analysis.students.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-role-meta text-text-soft">Élèves dont le nom ressemble au fichier :</p>
                {analysis.students.map((s) => (
                  <p key={s.studentId} className="text-role-meta text-text-soft">
                    {s.name} — {Math.round(s.score * 100)} %
                    {s.studentId === analysis.context.studentId
                      ? " · c'est bien ce dossier"
                      : " · autre dossier : fermez et rouvrez depuis celui-là si c'est le bon"}
                  </p>
                ))}
              </div>
            )}
            {analysis.students.length === 0 && (
              <p className="mt-1 text-role-meta text-text-soft">
                Correspondance incertaine — le nom du fichier ne permet pas de reconnaître un élève.
                Le dossier de destination reste celui d&apos;où vous êtes parti.
              </p>
            )}
          </div>

          {/* Propositions d'exigence, avec leur score réel. */}
          <div className="space-y-2">
            <p className="text-role-body font-semibold text-text">Propositions détectées</p>
            {analysis.requirements.length === 0 ? (
              <p className="text-role-meta text-text-soft">
                Correspondance incertaine — aucune pièce de la checklist ne ressemble à ce nom de fichier.
                Choisissez vous-même ci-dessous.
              </p>
            ) : (
              <ul className="space-y-2">
                {analysis.requirements.map((r) => (
                  <li key={r.requirementId} className="flex flex-wrap items-center gap-2 rounded-control border border-rule px-3 py-2">
                    <span className="font-medium text-text">{r.label}</span>
                    <Badge size="sm">{categoryLabel(r.category)}</Badge>
                    <span className="text-role-meta tabular-nums text-text-soft">{Math.round(r.score * 100)} %</span>
                    {r.hasDocument && <Badge size="sm" variant="warning">Pièce déjà présente</Badge>}
                    <Button size="sm" variant="secondary" className="ml-auto" onClick={() => acceptRequirement(r)}>
                      Retenir
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Décision humaine — toujours modifiable, jamais préremplie en secret. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Pièce de la checklist"
              hint="« Hors checklist » verse la pièce au dossier sans la rattacher à une exigence."
              value={requirementId}
              onChange={(e) => { setRequirementId(e.target.value); setConfirmReplace(false); }}
            >
              <option value="">Hors checklist</option>
              {lines.map((l) => (
                <option key={l.requirementId} value={l.requirementId}>
                  {l.label}{l.hasDocument ? " — pièce déjà présente" : ""}
                </option>
              ))}
            </Select>

            <Select label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>

            <Input
              label="Libellé de la pièce"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="sm:col-span-2"
            />
          </div>

          {needsReplace && (
            <label className="flex items-start gap-3 rounded-control border border-warning/30 bg-warning/5 px-3 py-3">
              <input
                type="checkbox"
                checked={confirmReplace}
                onChange={(e) => setConfirmReplace(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span className="text-role-meta leading-relaxed text-text-soft">
                <strong className="text-warning">Document existant.</strong> Une pièce est déjà enregistrée pour
                « {chosenLine?.label} ». En confirmant, elle devient une version antérieure : elle est
                <strong> conservée</strong>, horodatée, et reste consultable dans l&apos;historique. Rien n&apos;est effacé.
              </span>
            </label>
          )}
        </div>
      )}

      {/* ─────────── ÉTAPE 3 — CLASSÉ ─────────── */}
      {step === 3 && saved && (
        <div className="flex items-start gap-3 rounded-control border border-success/30 bg-success/5 px-4 py-3">
          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div>
            <p className="text-role-body font-semibold text-success">
              {saved.replaced ? "Pièce remplacée" : "Document ajouté"}
            </p>
            <p className="mt-0.5 text-role-meta leading-relaxed text-text-soft">
              « {label} » est classée dans le dossier de {studentName}, en attente de vérification par le secrétariat.
              {saved.replaced && " L'ancienne version est conservée dans l'historique."}
            </p>
          </div>
        </div>
      )}

      {/* Entrées de fichier — hors flux, pilotées par les boutons ci-dessus. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => { void addFiles(e.target.files, "scan"); e.target.value = ""; }}
      />
      <input
        ref={importRef}
        type="file"
        accept={ACCEPT_IMPORT}
        multiple
        className="sr-only"
        onChange={(e) => { void addFiles(e.target.files, "import"); e.target.value = ""; }}
      />
    </Modal>
  );
}
