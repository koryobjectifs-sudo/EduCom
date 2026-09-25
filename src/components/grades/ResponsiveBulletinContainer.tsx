"use client";

import { useState, useEffect, useRef, ReactNode, useCallback } from "react";

const A4_WIDTH_PX = 794; // 210mm à 96dpi standard

interface ResponsiveBulletinContainerProps {
  children: ReactNode;
  studentName?: string;
  isFirst?: boolean;
}

export function ResponsiveBulletinContainer({
  children,
}: ResponsiveBulletinContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialisation immédiate avec la largeur réelle de l'écran pour éviter tout saut
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      // Largeur disponible sur mobile (déduction du padding de 24px du layout)
      return Math.min(window.innerWidth - 24, A4_WIDTH_PX);
    }
    return A4_WIDTH_PX;
  });

  const [contentHeight, setContentHeight] = useState<number>(1123); // Hauteur A4 standard

  // Mesure exacte de la largeur du conteneur et de la hauteur du bulletin
  const measure = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      if (w > 0) {
        setContainerWidth(w);
      }
    }
    if (contentRef.current) {
      const h = contentRef.current.offsetHeight || contentRef.current.scrollHeight;
      if (h > 100) {
        setContentHeight(h);
      }
    }
  }, []);

  useEffect(() => {
    measure();

    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);

    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [measure]);

  // Détection mobile : l'écran est plus étroit que la feuille A4 (794px)
  const isMobile = containerWidth > 0 && containerWidth < A4_WIDTH_PX;

  // Calcul du ratio d'échelle pour remplir exactement 100% de la largeur mobile
  const scale = isMobile ? containerWidth / A4_WIDTH_PX : 1;

  // Hauteur proportionnelle exacte (évite tout espace blanc résiduel en bas)
  const scaledHeight = Math.ceil(contentHeight * scale);

  return (
    <div
      ref={containerRef}
      className="w-full print:w-full print:block print:overflow-visible"
    >
      {/* Conteneur cadré à la hauteur proportionnelle sur mobile */}
      <div
        className="w-full overflow-hidden print:w-full print:overflow-visible print:h-auto"
        style={{
          height: isMobile ? `${scaledHeight}px` : "auto",
        }}
      >
        {/* Conteneur A4 mis à l'échelle depuis l'origine (0, 0) */}
        <div
          ref={contentRef}
          className="print:transform-none print:w-full print:h-auto"
          style={{
            width: `${A4_WIDTH_PX}px`,
            transform: isMobile ? `scale(${scale})` : "none",
            transformOrigin: "0 0",
            margin: isMobile ? "0" : "0 auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
