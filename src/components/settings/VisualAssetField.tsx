"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, RotateCcw, X, ZoomIn } from "lucide-react";
import { processAndConvertImage } from "@/lib/imageConverter";
import { toast } from "sonner";

interface VisualAssetFieldProps {
  label: string;
  field: "logo" | "stamp" | "signature";
  value: string;
  size: number;
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
  description?: string;
  onChangeValue: (value: string) => void;
  onChangeSize: (size: number) => void;
}

export function VisualAssetField({
  label,
  field,
  value,
  size,
  defaultSize,
  minSize = 40,
  maxSize = 220,
  description,
  onChangeValue,
  onChangeSize,
}: VisualAssetFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; startSize: number }>({
    startX: 0,
    startY: 0,
    startSize: size,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startSize: size,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      // Déplacement diagonal proportionnel : tirer vers le coin bas-droite agrandit
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      // On combine X et Y pour un redimensionnement uniforme préservant les proportions
      const delta = Math.round((deltaX + deltaY) / 2);
      const newSize = Math.max(minSize, Math.min(maxSize, dragStartRef.current.startSize + delta));
      onChangeSize(newSize);
    },
    [isDragging, minSize, maxSize, onChangeSize]
  );

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignorer si déjà libéré
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await processAndConvertImage(file, {
        maxDimension: 1200,
        preferFormat: "image/png",
      });
      onChangeValue(result.dataUrl);
      toast.success("Image importée et optimisée", {
        description: `Format converti en PNG haute résolution (${result.width}×${result.height}px).`,
      });
    } catch (err: any) {
      toast.error("Erreur lors du traitement de l'image", {
        description: err?.message || "Veuillez réessayer avec un autre fichier.",
      });
    } finally {
      setIsProcessing(false);
      e.target.value = ""; // Réinitialiser l'input file
    }
  };

  return (
    <div className="p-4.5 rounded-2xl bg-secondary/30 border border-transparent hover:border-border transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            {label}
          </h3>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-pill bg-white border border-border text-text-secondary shadow-2xs">
            {size} px
          </span>
        </div>

        {/* Zone de prévisualisation avec poignée de redimensionnement de coin */}
        <div className="relative mb-4 flex items-center justify-center min-h-[140px] bg-slate-50/80 rounded-2xl border border-dashed border-border/80 p-3 overflow-hidden select-none">
          {value ? (
            <div
              className="relative group/box inline-flex items-center justify-center transition-all duration-75"
              style={{
                width: `${size}px`,
                height: `${size}px`,
              }}
            >
              <img
                src={value}
                alt={label}
                className="w-full h-full object-contain rounded-xl bg-white shadow-xs border border-border/60 p-1.5"
                draggable={false}
              />

              {/* Bouton de suppression */}
              <button
                type="button"
                onClick={() => onChangeValue("")}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-md opacity-0 group-hover/box:opacity-100 transition-opacity hover:bg-red-700 active:scale-90"
                title={`Retirer ${label.toLowerCase()}`}
                aria-label={`Retirer ${label.toLowerCase()}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Poignée de coin bas-droite ("Tirer vers les bouts pour ajuster") */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md cursor-nwse-resize touch-none transition-transform hover:scale-110 active:scale-125 z-10 ${
                  isDragging ? "ring-4 ring-primary/30 scale-125" : ""
                }`}
                title="Tirez sur ce coin pour agrandir ou réduire la taille"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 fill-current rotate-90"
                  aria-hidden="true"
                >
                  <path d="M19 19H17V17H19V19ZM19 15H17V13H19V15ZM15 19H13V17H15V19ZM19 11H17V9H19V11ZM11 19H9V17H11V19ZM15 15H13V13H15V15Z" />
                </svg>
              </div>

              {/* Infobulle visuelle pendant le glisser */}
              {isDragging && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-gray-900 text-white text-[10px] font-mono shadow-md pointer-events-none whitespace-nowrap z-20">
                  {size} × {size} px
                </div>
              )}
            </div>
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-white shadow-xs border border-border flex flex-col items-center justify-center text-center p-2">
              <ImageIcon className="h-7 w-7 text-text-muted/40 mb-1" />
              <span className="text-[10px] text-text-muted">Aucun fichier</span>
            </div>
          )}
        </div>

        {/* Curseur de réglage précis en pixels */}
        {value && (
          <div className="space-y-1.5 mb-3 bg-white/70 rounded-xl p-2.5 border border-border/50">
            <div className="flex items-center justify-between text-[11px] text-text-secondary">
              <span className="flex items-center gap-1">
                <ZoomIn className="w-3 h-3 text-primary" />
                Taille documents :
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-text-primary">{size} px</span>
                {size !== defaultSize && (
                  <button
                    type="button"
                    onClick={() => onChangeSize(defaultSize)}
                    className="p-0.5 rounded text-text-muted hover:text-primary transition-colors"
                    title={`Rétablir la taille par défaut (${defaultSize} px)`}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted font-mono">{minSize}px</span>
              <input
                type="range"
                min={minSize}
                max={maxSize}
                step={2}
                value={size}
                onChange={(e) => onChangeSize(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                title={`Ajuster la taille (${minSize} à ${maxSize} px)`}
              />
              <span className="text-[10px] text-text-muted font-mono">{maxSize}px</span>
            </div>
          </div>
        )}
      </div>

      <div>
        {description && (
          <p className="text-[11px] text-text-muted mb-3 leading-snug">
            {description}
          </p>
        )}

        <label
          className={`cursor-pointer w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors shadow-2xs ${
            isProcessing ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-primary" />
          <span>{isProcessing ? "Conversion..." : value ? "Remplacer l'image" : "Importer un fichier"}</span>
          <input
            type="file"
            className="sr-only"
            accept="image/*,.png,.jpg,.jpeg,.webp,.svg,.bmp,.gif,.heic,.heif,.tiff"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      </div>
    </div>
  );
}
