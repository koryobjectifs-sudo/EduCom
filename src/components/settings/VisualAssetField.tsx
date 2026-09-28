"use client";

import { useState } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import { processAndConvertImage } from "@/lib/imageConverter";
import { toast } from "sonner";

interface VisualAssetFieldProps {
  label: string;
  field: "logo" | "stamp" | "signature";
  value: string;
  size?: number;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  description?: string;
  dataTour?: string;
  onChangeValue: (value: string) => void;
  onChangeSize?: (size: number) => void;
}

export function VisualAssetField({
  label,
  value,
  description,
  dataTour,
  onChangeValue,
}: VisualAssetFieldProps) {
  const [isProcessing, setIsProcessing] = useState(false);

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
    <div data-tour={dataTour} className="p-4.5 rounded-2xl bg-secondary/30 border border-transparent hover:border-border transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            {label}
          </h3>
        </div>

        {/* Zone de prévisualisation standard */}
        <div className="relative mb-4 flex items-center justify-center min-h-[140px] bg-slate-50/80 rounded-2xl border border-dashed border-border/80 p-3 select-none">
          {value ? (
            <div className="relative group/box inline-flex items-center justify-center h-28 w-28">
              <img
                src={value}
                alt={label}
                className="max-h-full max-w-full object-contain rounded-xl bg-white shadow-xs border border-border/60 p-2"
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
            </div>
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-white shadow-xs border border-border flex flex-col items-center justify-center text-center p-2">
              <ImageIcon className="h-7 w-7 text-text-muted/40 mb-1" />
              <span className="text-[10px] text-text-muted">Aucun fichier</span>
            </div>
          )}
        </div>
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
