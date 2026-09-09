"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface SidebarResizeHandleProps {
  initialWidth: number;
  onWidthChange: (width: number) => void;
}

const MIN_EXPANDED_WIDTH = 180;
const MAX_WIDTH = 320;
const COLLAPSED_WIDTH = 52;
const DEFAULT_EXPANDED_WIDTH = 220;

export default function SidebarResizeHandle({
  initialWidth,
  onWidthChange,
}: SidebarResizeHandleProps) {
  const [width, setWidth] = useState(initialWidth);
  const lastExpandedWidthRef = useRef(initialWidth > COLLAPSED_WIDTH ? initialWidth : DEFAULT_EXPANDED_WIDTH);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  const saveWidthCookie = useCallback((w: number) => {
    document.cookie = `educom_sidebar_width=${w}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `educom_sidebar_collapsed=${w === COLLAPSED_WIDTH}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const updateWidth = useCallback((newWidth: number, save = true) => {
    let finalWidth = newWidth;
    if (newWidth < MIN_EXPANDED_WIDTH) {
      finalWidth = COLLAPSED_WIDTH;
    } else if (newWidth > MAX_WIDTH) {
      finalWidth = MAX_WIDTH;
    } else {
      lastExpandedWidthRef.current = newWidth;
    }

    setWidth(finalWidth);
    onWidthChange(finalWidth);
    if (save) {
      saveWidthCookie(finalWidth);
    }
  }, [onWidthChange, saveWidthCookie]);

  const toggleCollapse = useCallback(() => {
    if (width === COLLAPSED_WIDTH) {
      const target = lastExpandedWidthRef.current >= MIN_EXPANDED_WIDTH ? lastExpandedWidthRef.current : DEFAULT_EXPANDED_WIDTH;
      updateWidth(target);
    } else {
      lastExpandedWidthRef.current = width;
      updateWidth(COLLAPSED_WIDTH);
    }
  }, [width, updateWidth]);

  // Mouse Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - startXRef.current;
      const proposed = startWidthRef.current + deltaX;
      updateWidth(proposed, false);
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      // Save current final state to cookie
      setWidth((curr) => {
        saveWidthCookie(curr);
        return curr;
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Keyboard accessibility
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCollapse();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (width === COLLAPSED_WIDTH) return;
      const next = width - 16;
      updateWidth(next);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (width === COLLAPSED_WIDTH) {
        updateWidth(MIN_EXPANDED_WIDTH);
      } else {
        updateWidth(width + 16);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      updateWidth(COLLAPSED_WIDTH);
    } else if (e.key === "End") {
      e.preventDefault();
      updateWidth(MAX_WIDTH);
    }
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={COLLAPSED_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-label="Redimensionner la barre latérale"
      title="Glisser pour redimensionner · Double-clic pour replier/déplier"
      onMouseDown={onMouseDown}
      onDoubleClick={toggleCollapse}
      onKeyDown={onKeyDown}
      className="group absolute -right-1 top-0 bottom-0 z-30 w-3 cursor-col-resize select-none outline-none hidden md:block"
    >
      {/* Ligne visuelle de séparation avec retour au survol / focus */}
      <div className="absolute inset-y-0 left-1 w-[2px] bg-transparent transition-colors group-hover:bg-primary/50 group-focus-visible:bg-primary" />
    </div>
  );
}
