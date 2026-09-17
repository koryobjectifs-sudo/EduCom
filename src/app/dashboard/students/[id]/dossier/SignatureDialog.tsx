"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PenTool, Upload, Trash2, Plus, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { signStudentDocument, type AuthorizedPersonInput } from "./actions";

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  studentClass?: string | null;
  requirement: {
    id: string;
    label: string;
    category: string;
  } | null;
  onSigned: () => void;
}

export function SignatureDialog({
  open,
  onClose,
  studentId,
  studentName,
  studentClass,
  requirement,
  onSigned,
}: SignatureDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"DRAW" | "SCAN">("DRAW");
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);

  // Formulaire spécifique "Personnes autorisées"
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPersonInput[]>([
    { lastName: "", firstName: "", relationship: "Parent", phone: "", idCardNumber: "" },
  ]);

  // État de la signature dessinée
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const isDrawing = useRef(false);

  // État du scan téléversé
  const [scannedImageBase64, setScannedImageBase64] = useState<string | null>(null);

  const isAuthorizedPersons = Boolean(
    requirement?.label.toLowerCase().includes("personne") ||
    requirement?.label.toLowerCase().includes("récupérer") ||
    requirement?.label.toLowerCase().includes("recuperer")
  );

  const isRules = Boolean(
    requirement?.label.toLowerCase().includes("règlement") ||
    requirement?.label.toLowerCase().includes("reglement")
  );

  // Initialisation du canvas pour écran tactile et souris
  useEffect(() => {
    if (!open || mode !== "DRAW") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustement haute densité (Retina/Mobile)
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a";
  }, [open, mode]);

  function getCoordinates(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function stopDrawing() {
    isDrawing.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleScanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image (PNG, JPEG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScannedImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function addPerson() {
    setAuthorizedPersons([
      ...authorizedPersons,
      { lastName: "", firstName: "", relationship: "", phone: "", idCardNumber: "" },
    ]);
  }

  function updatePerson(index: number, field: keyof AuthorizedPersonInput, value: string) {
    const updated = [...authorizedPersons];
    updated[index] = { ...updated[index], [field]: value };
    setAuthorizedPersons(updated);
  }

  function removePerson(index: number) {
    if (authorizedPersons.length <= 1) {
      toast.error("Au moins une personne autorisée doit être mentionnée.");
      return;
    }
    setAuthorizedPersons(authorizedPersons.filter((_, i) => i !== index));
  }

  async function handleConfirmSign() {
    if (!requirement) return;

    let signatureImageBase64 = "";
    if (mode === "DRAW") {
      if (!hasDrawn || !canvasRef.current) {
        toast.error("Veuillez apposer votre signature à l'écran.");
        return;
      }
      signatureImageBase64 = canvasRef.current.toDataURL("image/png");
    } else {
      if (!scannedImageBase64) {
        toast.error("Veuillez téléverser un fichier de signature scannée.");
        return;
      }
      signatureImageBase64 = scannedImageBase64;
    }

    if (!attestationConfirmed) {
      toast.error("Veuillez cocher l'attestation sur l'honneur.");
      return;
    }

    if (isAuthorizedPersons) {
      for (let i = 0; i < authorizedPersons.length; i++) {
        const p = authorizedPersons[i];
        if (!p.lastName.trim() || !p.firstName.trim() || !p.phone.trim()) {
          toast.error(`Veuillez renseigner le nom, prénom et téléphone pour la personne ${i + 1}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await signStudentDocument({
        studentId,
        requirementId: requirement.id,
        signatureImageBase64,
        signatureType: mode === "DRAW" ? "DRAWN" : "SCANNED",
        formData: {
          authorizedPersons: isAuthorizedPersons ? authorizedPersons : undefined,
          attestationConfirmed,
        },
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Le document « ${requirement.label} » a été signé avec succès.`);
      onSigned();
      onClose();
    } catch {
      toast.error("Une erreur imprévue est survenue lors de la signature.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!requirement) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={requirement.label}
      size="lg"
    >
      <div className="space-y-6">
        {/* En-tête de contexte */}
        <div className="rounded-control bg-sunk/60 border border-rule p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-role-meta font-semibold text-text-soft uppercase tracking-wider">Élève concerné(e)</p>
            <p className="text-role-body font-bold text-text">{studentName}</p>
          </div>
          {studentClass && (
            <div className="text-right">
              <p className="text-role-meta font-semibold text-text-soft uppercase tracking-wider">Classe</p>
              <p className="text-role-body font-bold text-text">{studentClass}</p>
            </div>
          )}
        </div>

        {/* Formulaire structuré si "Personnes autorisées" */}
        {isAuthorizedPersons && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-role-card font-semibold text-text">Personnes autorisées</h4>
                <p className="text-role-meta text-text-soft">
                  Indiquez les personnes autorisées à récupérer l&apos;enfant à la sortie de l&apos;école.
                </p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={addPerson}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {authorizedPersons.map((p, idx) => (
                <div key={idx} className="rounded-control border border-rule bg-surface p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-role-meta font-bold text-primary">Personne {idx + 1}</span>
                    {authorizedPersons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePerson(idx)}
                        className="text-text-faint hover:text-danger p-1 rounded-sm transition-colors"
                        title="Supprimer cette personne"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-soft mb-1">Nom *</label>
                      <input
                        type="text"
                        value={p.lastName}
                        onChange={(e) => updatePerson(idx, "lastName", e.target.value)}
                        placeholder="Ex: DIOP"
                        className="h-9 w-full rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-soft mb-1">Prénom *</label>
                      <input
                        type="text"
                        value={p.firstName}
                        onChange={(e) => updatePerson(idx, "firstName", e.target.value)}
                        placeholder="Ex: Mariama"
                        className="h-9 w-full rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-soft mb-1">Lien de parenté / Qualité</label>
                      <input
                        type="text"
                        value={p.relationship}
                        onChange={(e) => updatePerson(idx, "relationship", e.target.value)}
                        placeholder="Ex: Mère, Oncle, Chauffeur..."
                        className="h-9 w-full rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-soft mb-1">Téléphone *</label>
                      <input
                        type="tel"
                        value={p.phone}
                        onChange={(e) => updatePerson(idx, "phone", e.target.value)}
                        placeholder="Ex: 77 000 00 00"
                        className="h-9 w-full rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-text-soft mb-1">N° CNI ou Passeport (optionnel)</label>
                      <input
                        type="text"
                        value={p.idCardNumber}
                        onChange={(e) => updatePerson(idx, "idCardNumber", e.target.value)}
                        placeholder="Ex: 1 234 1990 00123"
                        className="h-9 w-full rounded-control border border-rule bg-surface px-3 text-role-body text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Règlement intérieur */}
        {isRules && (
          <div className="space-y-2">
            <h4 className="text-role-card font-semibold text-text">Lecture du règlement intérieur</h4>
            <div className="rounded-control border border-rule bg-surface p-4 text-role-body text-text-soft text-xs max-h-48 overflow-y-auto space-y-2">
              <p>1. Assiduité et ponctualité aux cours et activités pédagogiques obligatoires.</p>
              <p>2. Port de la tenue scolaire réglementaire et respect des consignes de discipline.</p>
              <p>3. Respect scrupuleux des enseignants, du personnel d&apos;encadrement et des autres élèves.</p>
              <p>4. Préservation du matériel et des locaux scolaires.</p>
            </div>
          </div>
        )}

        {/* Choix du mode de signature */}
        <div className="space-y-3 pt-2 border-t border-rule">
          <div className="flex items-center justify-between">
            <label className="text-role-body font-semibold text-text">Apposition de votre signature</label>
            <div className="inline-flex rounded-control border border-rule bg-sunk p-0.5">
              <button
                type="button"
                onClick={() => setMode("DRAW")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold transition-colors ${
                  mode === "DRAW" ? "bg-surface text-text shadow-2xs" : "text-text-soft hover:text-text"
                }`}
              >
                <PenTool className="h-3.5 w-3.5" />
                Au doigt / souris
              </button>
              <button
                type="button"
                onClick={() => setMode("SCAN")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold transition-colors ${
                  mode === "SCAN" ? "bg-surface text-text shadow-2xs" : "text-text-soft hover:text-text"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                Scan ou image
              </button>
            </div>
          </div>

          {mode === "DRAW" ? (
            <div className="space-y-2">
              <div className="relative rounded-control border-2 border-dashed border-rule bg-surface overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 cursor-crosshair bg-white"
                  style={{ touchAction: "none" }}
                />
                {!hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-role-meta text-text-faint">
                    Tracez votre signature ici avec votre doigt ou la souris
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-text-soft hover:text-danger font-medium transition-colors"
                >
                  Effacer et recommencer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-rule bg-surface hover:bg-sunk rounded-control p-6 cursor-pointer transition-colors">
                <Upload className="h-6 w-6 text-text-soft mb-2" />
                <span className="text-role-body font-semibold text-text">Choisir un fichier de signature</span>
                <span className="text-role-meta text-text-soft mt-1">PNG, JPEG ou WebP</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleScanUpload}
                  className="sr-only"
                />
              </label>
              {scannedImageBase64 && (
                <div className="p-3 border border-rule rounded-control bg-surface flex items-center gap-3">
                  <img src={scannedImageBase64} alt="Aperçu signature" className="h-12 max-w-[140px] object-contain border border-rule rounded-sm bg-white p-1" />
                  <span className="text-role-meta text-text font-medium">Signature chargée avec succès</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attestation légale obligatoire */}
        <label className="flex items-start gap-3 rounded-control bg-sunk/60 border border-rule p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={attestationConfirmed}
            onChange={(e) => setAttestationConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-rule text-primary focus:ring-primary"
          />
          <div className="text-role-meta text-text leading-snug">
            <span className="font-semibold text-text">Engagement sur l&apos;honneur : </span>
            Je certifie l&apos;exactitude des données transmises et appose ma signature en toute connaissance de cause.
            Ce document fera foi devant l&apos;administration de l&apos;établissement.
          </div>
        </label>

        {/* Traçabilité juridique */}
        <div className="flex items-center gap-2 text-[11px] text-text-soft bg-surface border border-rule px-3 py-2 rounded-control">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            Traçabilité probatoire certifiée : Horodatage universel UTC, adresse IP de connexion et empreinte SHA-256 scellée.
          </span>
        </div>

        {/* Boutons d'actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="button" onClick={handleConfirmSign} loading={submitting}>
            <Check aria-hidden="true" className="h-4 w-4" />
            Confirmer et signer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
