"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PenTool,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  X,
  FileText,
  RotateCcw,
  Camera,
  Check,
  Sparkles,
  Info,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { submitParentSignatureAction, submitParentUploadAction } from "./actions";
import { formatDate } from "@/lib/dateUtils";

export type ActionStatus = "ACTION_REQUIRED" | "NEEDS_CORRECTION" | "IN_REVIEW" | "APPROVED";

export interface FamilyActionItem {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  requirementId: string;
  requirementLabel: string;
  nature: "SIGNATURE" | "UPLOAD";
  status: ActionStatus;
  reviewNote?: string | null;
  message?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  fileName?: string | null;
}

interface Props {
  actions: FamilyActionItem[];
  activeStudentId?: string;
  activeReqId?: string;
  schoolName: string;
  parentName: string;
}

export default function FamilyActionCenterClient({
  actions,
  activeStudentId,
  activeReqId,
  schoolName,
  parentName,
}: Props) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<FamilyActionItem | null>(null);
  const [activeTab, setActiveTab] = useState<"todo" | "in_review" | "completed">("todo");

  // Si des paramètres d'action directe sont passés (deep-link WhatsApp/SMS), ouvrir immédiatement le runner
  useEffect(() => {
    if (activeStudentId && activeReqId) {
      const target = actions.find(
        (a) => a.studentId === activeStudentId && a.requirementId === activeReqId
      );
      if (target && (target.status === "ACTION_REQUIRED" || target.status === "NEEDS_CORRECTION")) {
        setSelectedAction(target);
      }
    }
  }, [activeStudentId, activeReqId, actions]);

  const todoActions = actions.filter(
    (a) => a.status === "ACTION_REQUIRED" || a.status === "NEEDS_CORRECTION"
  );
  const inReviewActions = actions.filter((a) => a.status === "IN_REVIEW");
  const completedActions = actions.filter((a) => a.status === "APPROVED");

  return (
    <div className="space-y-6">
      {/* En-tête principal */}
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Centre d&apos;Actions Documentaires
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-text-soft">
          Complétez directement les démarches administratives exigées par{" "}
          <strong className="text-text font-semibold">{schoolName}</strong> pour vos enfants.
        </p>
      </div>

      {/* Onglets de suivi orientés utilisateur */}
      <div className="flex border-b border-rule gap-6 text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("todo")}
          className={`pb-3 relative transition-colors ${
            activeTab === "todo" ? "text-primary border-b-2 border-primary" : "text-text-soft hover:text-text"
          }`}
        >
          <span>À traiter</span>
          {todoActions.length > 0 && (
            <span className="ml-2 rounded-full bg-danger text-white px-2 py-0.5 text-[10px] font-bold">
              {todoActions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("in_review")}
          className={`pb-3 relative transition-colors ${
            activeTab === "in_review" ? "text-primary border-b-2 border-primary" : "text-text-soft hover:text-text"
          }`}
        >
          <span>En cours de vérification</span>
          {inReviewActions.length > 0 && (
            <span className="ml-2 rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[10px] font-bold">
              {inReviewActions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`pb-3 relative transition-colors ${
            activeTab === "completed" ? "text-primary border-b-2 border-primary" : "text-text-soft hover:text-text"
          }`}
        >
          <span>Conformes & Validées</span>
          {completedActions.length > 0 && (
            <span className="ml-2 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
              {completedActions.length}
            </span>
          )}
        </button>
      </div>

      {/* CONTENU ONGLET 1 : À TRAITER */}
      {activeTab === "todo" && (
        <div className="space-y-4">
          {todoActions.length === 0 ? (
            <div className="rounded-surface border border-emerald-500/20 bg-surface p-8 text-center shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-3">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-text">Toutes vos démarches sont à jour !</h2>
              <p className="text-xs text-text-soft mt-1.5 max-w-md mx-auto">
                Aucune action en attente pour vos enfants actuellement. L&apos;établissement vous avertira directement en cas de nouveau document à signer ou déposer.
              </p>
              <div className="mt-5">
                <Link
                  href="/famille"
                  className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-sunk transition-colors"
                >
                  <span>Retour à l&apos;accueil</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todoActions.map((item) => {
                const isCorrection = item.status === "NEEDS_CORRECTION";
                const isSignature = item.nature === "SIGNATURE";

                return (
                  <div
                    key={`${item.studentId}-${item.requirementId}`}
                    className={`rounded-surface border p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isCorrection
                        ? "border-danger/40 bg-danger/5 hover:border-danger/70"
                        : "border-rule bg-surface hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                          isCorrection
                            ? "bg-danger/10 text-danger"
                            : isSignature
                            ? "bg-amber-100 text-amber-700"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {isSignature ? <PenTool className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-text text-sm sm:text-base">
                            {item.requirementLabel}
                          </h3>
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                              isCorrection
                                ? "bg-danger/10 text-danger"
                                : isSignature
                                ? "bg-amber-100 text-amber-800"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isCorrection
                              ? "À corriger"
                              : isSignature
                              ? "Signature requise"
                              : "Document à déposer"}
                          </span>
                        </div>

                        <p className="text-xs text-text-soft">
                          Concerne : <strong className="text-text font-semibold">{item.studentName}</strong>
                          <span className="text-text-muted mx-1.5">•</span>
                          <span className="text-text-soft font-medium">{item.className}</span>
                        </p>

                        {/* Motif explicite si correction */}
                        {isCorrection && item.reviewNote && (
                          <div className="rounded-control bg-danger/10 p-2.5 mt-2 border border-danger/20 text-xs text-danger flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold">Motif de non-conformité : </strong>
                              <span>{item.reviewNote}</span>
                            </div>
                          </div>
                        )}

                        {/* Message d'accompagnement de la relance si présent */}
                        {!isCorrection && item.message && (
                          <p className="text-xs text-text-soft bg-sunk/60 rounded p-2 mt-2 border border-rule/60 italic">
                            « {item.message} »
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-rule/50">
                      <button
                        type="button"
                        onClick={() => setSelectedAction(item)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-control px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all w-full sm:w-auto text-center ${
                          isCorrection
                            ? "bg-danger hover:bg-danger/90"
                            : "bg-primary hover:bg-primary-hover"
                        }`}
                      >
                        <span>
                          {isCorrection
                            ? isSignature
                              ? "Re-signer le document"
                              : "Remplacer la pièce"
                            : isSignature
                            ? "Signer maintenant"
                            : "Déposer la pièce"}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENU ONGLET 2 : EN COURS DE VÉRIFICATION */}
      {activeTab === "in_review" && (
        <div className="space-y-3">
          {inReviewActions.length === 0 ? (
            <div className="rounded-surface border border-dashed border-rule bg-surface p-8 text-center text-xs text-text-soft">
              Aucun document en attente de vérification par l&apos;établissement.
            </div>
          ) : (
            inReviewActions.map((item) => (
              <div
                key={`${item.studentId}-${item.requirementId}`}
                className="rounded-surface border border-sky-200 bg-sky-50/40 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 mt-0.5">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text">{item.requirementLabel}</h3>
                    <p className="text-xs text-text-soft">
                      Élève : <strong className="text-text font-medium">{item.studentName}</strong>
                      <span className="text-text-muted mx-1.5">•</span>
                      <span>Déposé, en cours d&apos;examen par le secrétariat</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-100/80 px-2.5 py-1 rounded">
                    <Clock className="h-3 w-3" /> Transmis
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTENU ONGLET 3 : VALIDÉES */}
      {activeTab === "completed" && (
        <div className="space-y-3">
          {completedActions.length === 0 ? (
            <div className="rounded-surface border border-dashed border-rule bg-surface p-8 text-center text-xs text-text-soft">
              Aucun document validé pour le moment.
            </div>
          ) : (
            completedActions.map((item) => (
              <div
                key={`${item.studentId}-${item.requirementId}`}
                className="rounded-surface border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text">{item.requirementLabel}</h3>
                    <p className="text-xs text-text-soft">
                      Élève : <strong className="text-text font-medium">{item.studentName}</strong>
                      <span className="text-text-muted mx-1.5">•</span>
                      <span>Vérifié et déclaré conforme par {schoolName}</span>
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                  <Check className="h-3 w-3" /> Validé
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODALE D'EXÉCUTION DIRECTE DE L'ACTION (ACTION RUNNER MOBILE-FIRST 390px) */}
      {selectedAction && (
        <ActionRunnerModal
          action={selectedAction}
          schoolName={schoolName}
          parentName={parentName}
          onClose={() => setSelectedAction(null)}
          onSuccess={() => {
            setSelectedAction(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Composant Modal Action Runner Mobile-First
 */
function ActionRunnerModal({
  action,
  schoolName,
  parentName,
  onClose,
  onSuccess,
}: {
  action: FamilyActionItem;
  schoolName: string;
  parentName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);
  const [notes, setNotes] = useState("");

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const isSignature = action.nature === "SIGNATURE";

  // Initialisation du canvas de signature
  useEffect(() => {
    if (!isSignature || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustement de la résolution pour écrans Retina
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#0B1F3A";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [isSignature]);

  // Gestion du tracé tactile & souris
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if ("touches" in e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    setHasSignature(false);
  };

  // Soumission de la signature
  const handleSignatureSubmit = () => {
    if (!hasSignature || !canvasRef.current) {
      toast.error("Veuillez apposer votre signature dans le cadre ci-dessous.");
      return;
    }
    if (!attestationConfirmed) {
      toast.error("Veuillez cocher l'attestation sur l'honneur.");
      return;
    }

    const signatureImageBase64 = canvasRef.current.toDataURL("image/png");

    startTransition(async () => {
      try {
        const res = await submitParentSignatureAction({
          studentId: action.studentId,
          requirementId: action.requirementId,
          signatureImageBase64,
          signatureType: "DRAWN",
          attestationConfirmed: true,
          notes: notes.trim() || undefined,
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Document signé et transmis avec succès !");
          onSuccess();
        }
      } catch (err: any) {
        toast.error("Une erreur inattendue est survenue lors de l'enregistrement.");
      }
    });
  };

  // Soumission du dépôt de fichier
  const handleUploadSubmit = () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier ou prendre une photo.");
      return;
    }

    const formData = new FormData();
    formData.append("studentId", action.studentId);
    formData.append("requirementId", action.requirementId);
    formData.append("file", selectedFile);

    startTransition(async () => {
      try {
        const res = await submitParentUploadAction(formData);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Document déposé et transmis à l'établissement avec succès !");
          onSuccess();
        }
      } catch (err: any) {
        toast.error("Une erreur inattendue est survenue lors de l'envoi.");
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-surface border border-rule bg-surface p-5 sm:p-6 shadow-xl max-h-[92vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
        {/* En-tête modal */}
        <div className="flex items-start justify-between border-b border-rule pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {schoolName}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-text mt-0.5">
              {action.requirementLabel}
            </h2>
            <p className="text-xs text-text-soft">
              Élève concerné(e) : <strong className="text-text font-semibold">{action.studentName}</strong> ({action.className})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-sunk transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Motif de rejet en rappel si correction */}
        {action.status === "NEEDS_CORRECTION" && action.reviewNote && (
          <div className="rounded-control bg-danger/10 p-3 border border-danger/20 text-xs text-danger space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Précisions du secrétariat :</span>
            </div>
            <p className="pl-5">{action.reviewNote}</p>
          </div>
        )}

        {/* CONTENU RUNNER : SIGNATURE */}
        {isSignature ? (
          <div className="space-y-4">
            <div className="rounded-control bg-sunk/60 p-3 text-xs text-text-soft border border-rule space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <Info className="h-4 w-4 text-primary" />
                <span>Engagement légal</span>
              </div>
              <p>
                Cette signature électronique vaut acceptation pleine et entière du document conformément à la réglementation sénégalaise en vigueur.
              </p>
            </div>

            {/* Zone de signature tactile */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-text">Tracez votre signature :</label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  disabled={!hasSignature || isPending}
                  className="inline-flex items-center gap-1 text-[11px] text-text-soft hover:text-danger disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Effacer</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-rule rounded-surface bg-white relative overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair block"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-text-muted">
                    Signez avec le doigt ou la souris ici
                  </div>
                )}
              </div>
            </div>

            {/* Attestation sur l'honneur */}
            <label className="flex items-start gap-2.5 text-xs text-text cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={attestationConfirmed}
                onChange={(e) => setAttestationConfirmed(e.target.checked)}
                disabled={isPending}
                className="mt-0.5 h-4 w-4 rounded border-rule text-primary focus:ring-primary"
              />
              <span>
                J&apos;atteste sur l&apos;honneur être le représentant légal de l&apos;élève et certifie l&apos;authenticité de ma signature.
              </span>
            </label>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-control border border-rule px-4 py-2 text-xs font-semibold text-text hover:bg-sunk transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSignatureSubmit}
                disabled={!hasSignature || !attestationConfirmed || isPending}
                className="inline-flex items-center gap-1.5 rounded-control bg-primary px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <span>Signature en cours...</span>
                ) : (
                  <>
                    <PenTool className="h-3.5 w-3.5" />
                    <span>Signer et transmettre</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* CONTENU RUNNER : DÉPÔT / UPLOAD */
          <div className="space-y-4">
            <div className="rounded-control bg-sunk/60 p-3 text-xs text-text-soft border border-rule space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <Camera className="h-4 w-4 text-primary" />
                <span>Conseil pour la photo</span>
              </div>
              <p>
                Prenez une photo bien éclairée, nette et sans reflets de votre pièce originale (ou choisissez un fichier PDF).
              </p>
            </div>

            {/* Sélecteur de fichier */}
            <div className="border-2 border-dashed border-rule rounded-surface p-6 text-center hover:border-primary/50 transition-colors bg-sunk/20">
              <input
                type="file"
                id="parent-file-input"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={handleFileChange}
                disabled={isPending}
                className="hidden"
              />

              {filePreview ? (
                <div className="space-y-2">
                  <img
                    src={filePreview}
                    alt="Aperçu du document"
                    className="max-h-48 mx-auto rounded border border-rule object-contain shadow-xs"
                  />
                  <p className="text-xs font-semibold text-text">{selectedFile?.name}</p>
                  <label
                    htmlFor="parent-file-input"
                    className="inline-block text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Changer de photo ou fichier
                  </label>
                </div>
              ) : selectedFile ? (
                <div className="space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-text">{selectedFile.name}</p>
                  <label
                    htmlFor="parent-file-input"
                    className="inline-block text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Changer de fichier
                  </label>
                </div>
              ) : (
                <label htmlFor="parent-file-input" className="cursor-pointer block space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-primary block">
                      Prendre une photo ou choisir un fichier
                    </span>
                    <span className="text-[11px] text-text-muted block">
                      Formats autorisés : PDF, JPEG, PNG (max 15 Mo)
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-control border border-rule px-4 py-2 text-xs font-semibold text-text hover:bg-sunk transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!selectedFile || isPending}
                className="inline-flex items-center gap-1.5 rounded-control bg-primary px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <span>Envoi en cours...</span>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Transmettre la pièce</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
