"use client";

import { useRef, useState, useEffect } from "react";
import { Eraser, Upload } from "lucide-react";

export function SignaturePad({
  onSignatureChange,
}: {
  onSignatureChange: (signature: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Set up canvas context
  useEffect(() => {
    if (mode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1e3a8a"; // blue-900
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [mode]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factor in case CSS size differs from internal canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    if (!coords || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const coords = getCoordinates(e);
    if (!coords || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save signature
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      
      // Check if canvas is essentially empty (simplified check)
      // If the user barely touches it, it might just be a dot, but we'll accept it
      onSignatureChange(dataUrl);
    }
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setUploadedImage(null);
    onSignatureChange(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
      onSignatureChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 w-full">
      {/* ⚠️ Chantier PLG — ces deux onglets faisaient 24 px de haut. Ils
          apparaissent dans l'éditeur du générateur de documents, c'est-à-dire
          sur l'écran de PREMIÈRE VALEUR : le premier geste tactile d'une
          directrice ne doit pas être un geste raté. */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-md w-fit">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`px-3 py-2 text-xs font-medium rounded ${mode === "draw" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Dessiner
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-3 py-2 text-xs font-medium rounded ${mode === "upload" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Importer Cachet
        </button>
      </div>

      <div className="relative border border-gray-300 rounded-md bg-gray-50 overflow-hidden" style={{ height: "150px" }}>
        {mode === "draw" ? (
          <>
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {/* ⚠️ 28 px de haut et AUCUN nom accessible : la sonde ne pouvait le
                désigner que par « BUTTON ». C'est le bouton qui efface une
                signature — un geste irréversible qu'on ne doit ni rater du
                doigt, ni déclencher sans savoir ce qu'il est. `title` seul ne
                suffit pas : il ne s'ouvre pas au toucher. */}
            <button
              type="button"
              onClick={clearSignature}
              aria-label="Effacer la signature"
              className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center bg-white text-gray-400 hover:text-red-500 rounded shadow-sm"
              title="Effacer la signature"
            >
              <Eraser aria-hidden="true" className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {uploadedImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img src={uploadedImage} alt="Cachet" className="max-h-full max-w-full object-contain" />
                {/* Même défaut que le bouton d'effacement du dessin : 28 px,
                    et sans nom accessible. */}
                <button
                  type="button"
                  onClick={clearSignature}
                  aria-label="Retirer le cachet importé"
                  title="Retirer le cachet importé"
                  className="absolute top-0 right-0 flex h-9 w-9 items-center justify-center bg-white text-gray-400 hover:text-red-500 rounded shadow-sm"
                >
                  <Eraser aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-blue-600 transition-colors">
                <Upload className="w-6 h-6 mb-2" />
                <span className="text-xs font-medium">Cliquez pour importer (PNG/JPG)</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
