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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Veuillez réessayer avec un autre fichier.";
      toast.error("Erreur lors du traitement de l'image", {
        description: msg,
      });
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  return (
    <div
      data-tour={dataTour}
      className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 transition-colors flex items-center justify-between gap-2.5"
    >
      {/* Miniature compacte (44px × 44px) */}
      <div className="relative shrink-0 flex items-center justify-center h-11 w-11 bg-white rounded-lg border border-slate-200 p-0.5 select-none overflow-hidden group/box">
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className="max-h-full max-w-full object-contain rounded"
              draggable={false}
            />
            {/* Bouton de suppression rapide */}
            <button
              type="button"
              onClick={() => onChangeValue("")}
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] shadow-xs opacity-0 group-hover/box:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer"
              title={`Retirer ${label.toLowerCase()}`}
              aria-label={`Retirer ${label.toLowerCase()}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </>
        ) : (
          <ImageIcon className="h-4 w-4 text-slate-300" />
        )}
      </div>

      {/* Titre & Description compacts */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-bold text-slate-900 tracking-tight truncate">
            {label}
          </h4>
          {value ? (
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
              Prêt
            </span>
          ) : (
            <span className="text-[9px] font-medium text-slate-400 shrink-0">
              Vide
            </span>
          )}
        </div>
        {description && (
          <p className="text-[10px] text-slate-500 truncate mt-0.2">
            {description}
          </p>
        )}
      </div>

      {/* Bouton d'action compact */}
      <label
        className={`cursor-pointer shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-2xs ${
          isProcessing ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <UploadCloud className="w-3 h-3 text-purple-600 shrink-0" />
        <span>{isProcessing ? "..." : value ? "Modifier" : "Ajouter"}</span>
        <input
          type="file"
          className="sr-only"
          accept="image/*,.png,.jpg,.jpeg,.webp,.svg,.bmp,.gif,.heic,.heif,.tiff"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      </label>
    </div>
  );
}
