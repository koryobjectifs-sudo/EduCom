"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Upload, Image as ImageIcon } from "lucide-react";

export function SignaturePad({
  onSignatureChange,
}: {
  onSignatureChange: (signature: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [stampImage, setStampImage] = useState<HTMLImageElement | null>(null);

  // Set up canvas context
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1e3a8a"; // blue-900
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, []);

  const exportComposite = useCallback((stamp: HTMLImageElement | null, canvas: HTMLCanvasElement | null) => {
    if (!canvas && !stamp) {
      onSignatureChange(null);
      return;
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 400;
    tempCanvas.height = 150;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    if (stamp) {
      // Draw centered, contain
      const hRatio = tempCanvas.width / stamp.width;
      const vRatio = tempCanvas.height / stamp.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (tempCanvas.width - stamp.width * ratio) / 2;
      const centerShift_y = (tempCanvas.height - stamp.height * ratio) / 2;
      
      // We make the stamp slightly transparent so the signature is readable on top
      ctx.globalAlpha = 0.5;
      ctx.drawImage(stamp, 0, 0, stamp.width, stamp.height,
                        centerShift_x, centerShift_y, stamp.width * ratio, stamp.height * ratio);
      ctx.globalAlpha = 1.0;
    }

    if (canvas) {
      ctx.drawImage(canvas, 0, 0);
    }
    
    // Si ni signature ni cachet (canvas vierge et pas de cachet), on n'envoie rien (ou on envoie quand même)
    onSignatureChange(tempCanvas.toDataURL("image/png"));
  }, [onSignatureChange]);

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
    
    // Save signature composite
    exportComposite(stampImage, canvasRef.current);
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    exportComposite(stampImage, canvasRef.current);
  };

  const clearStamp = () => {
    setStampImage(null);
    exportComposite(null, canvasRef.current);
  };

  const clearAll = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setStampImage(null);
    onSignatureChange(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setStampImage(img);
        exportComposite(img, canvasRef.current);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex justify-between items-center bg-gray-100/50 p-2 rounded-lg">
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-gray-700 hover:text-blue-600 rounded-md shadow-sm border border-gray-200 cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <span>Importer Cachet</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
        
        <div className="flex items-center gap-2">
          {stampImage && (
            <button
              type="button"
              onClick={clearStamp}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
              title="Retirer le cachet"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Retirer cachet
            </button>
          )}
          <button
            type="button"
            onClick={clearSignature}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Effacer la signature tracée"
          >
            <Eraser className="w-3.5 h-3.5" /> Effacer signature
          </button>
        </div>
      </div>

      <div className="relative border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm group" style={{ height: "150px" }}>
        
        {/* Background Stamp */}
        {stampImage && (
          <div 
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              backgroundImage: `url(${stampImage.src})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}
        
        {/* Drawing Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="relative z-10 w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {!stampImage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 group-hover:opacity-20 transition-opacity">
            <span className="text-gray-400 italic text-sm">Signez ici...</span>
          </div>
        )}
      </div>
    </div>
  );
}
