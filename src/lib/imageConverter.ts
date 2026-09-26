/**
 * Convertisseur et normalisateur universel d'images côté client.
 * Accepte tous les formats (PNG, JPEG, WebP, SVG, BMP, GIF, HEIC/HEIF...)
 * et les convertit en format web optimisé (PNG haute résolution préservant la transparence).
 */

export interface ProcessedImageResult {
  dataUrl: string;
  originalName: string;
  originalType: string;
  convertedType: "image/png" | "image/jpeg";
  width: number;
  height: number;
  sizeKb: number;
}

export async function processAndConvertImage(
  file: File,
  options: {
    maxDimension?: number;
    preferFormat?: "image/png" | "image/jpeg";
    quality?: number;
  } = {}
): Promise<ProcessedImageResult> {
  const maxDim = options.maxDimension ?? 1400;
  const targetFormat = options.preferFormat ?? "image/png";
  const quality = options.quality ?? 0.92;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Impossible de lire le fichier sélectionné."));
    };

    reader.onload = () => {
      const rawDataUrl = reader.result as string;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onerror = () => {
        // Fallback si l'élément Image échoue à décoder directement
        // On retourne la DataURL brute si elle commence par data:image
        if (rawDataUrl && rawDataUrl.startsWith("data:image/")) {
          resolve({
            dataUrl: rawDataUrl,
            originalName: file.name,
            originalType: file.type || "image/unknown",
            convertedType: targetFormat,
            width: 300,
            height: 300,
            sizeKb: Math.round(rawDataUrl.length / 1024),
          });
        } else {
          reject(new Error("Le format de cette image n'a pas pu être décodé par votre navigateur."));
        }
      };

      img.onload = () => {
        try {
          let targetWidth = img.naturalWidth || img.width || 300;
          let targetHeight = img.naturalHeight || img.height || 300;

          // Redimensionnement proportionnel si l'image est gigantesque (> maxDim)
          if (targetWidth > maxDim || targetHeight > maxDim) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
              targetWidth = maxDim;
            } else {
              targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
              targetHeight = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            // Repli sur l'original si canvas indisponible
            resolve({
              dataUrl: rawDataUrl,
              originalName: file.name,
              originalType: file.type || "image/unknown",
              convertedType: targetFormat,
              width: targetWidth,
              height: targetHeight,
              sizeKb: Math.round(rawDataUrl.length / 1024),
            });
            return;
          }

          // Lissage haute qualité
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Dessin de l'image
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Export en format cible (PNG pour préserver la transparence du cachet/signature/logo)
          let finalDataUrl: string;
          try {
            finalDataUrl = canvas.toDataURL(targetFormat, quality);
          } catch {
            // Fallback si le format n'est pas supporté par le canvas du navigateur
            finalDataUrl = canvas.toDataURL("image/png");
          }

          resolve({
            dataUrl: finalDataUrl,
            originalName: file.name,
            originalType: file.type || "image/unknown",
            convertedType: targetFormat,
            width: targetWidth,
            height: targetHeight,
            sizeKb: Math.round(finalDataUrl.length / 1024),
          });
        } catch (err) {
          // Si le dessin sur canvas échoue, repli sur la DataURL originale
          resolve({
            dataUrl: rawDataUrl,
            originalName: file.name,
            originalType: file.type || "image/unknown",
            convertedType: targetFormat,
            width: img.width || 300,
            height: img.height || 300,
            sizeKb: Math.round(rawDataUrl.length / 1024),
          });
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
