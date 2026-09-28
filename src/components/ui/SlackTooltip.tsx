"use client";

import React, { useState, useRef, useEffect } from "react";

export interface SlackTooltipProps {
  title: React.ReactNode;
  tip?: React.ReactNode;
  shortcut?: string;
  placement?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delay?: number;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function SlackTooltip({
  title,
  tip,
  shortcut,
  placement = "bottom",
  align = "center",
  delay = 180,
  className = "",
  children,
  disabled = false,
}: SlackTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Calcul des classes de positionnement
  let positionClasses = "";
  let arrowClasses = "";

  if (placement === "bottom") {
    positionClasses = "top-full mt-2";
    if (align === "start") {
      positionClasses += " left-0";
      arrowClasses = "top-[-5px] left-3 border-x-[5px] border-x-transparent border-b-[5px] border-b-[#1A1D21]";
    } else if (align === "end") {
      positionClasses += " right-0";
      arrowClasses = "top-[-5px] right-3 border-x-[5px] border-x-transparent border-b-[5px] border-b-[#1A1D21]";
    } else {
      positionClasses += " left-1/2 -translate-x-1/2";
      arrowClasses = "top-[-5px] left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-b-[5px] border-b-[#1A1D21]";
    }
  } else if (placement === "top") {
    positionClasses = "bottom-full mb-2";
    if (align === "start") {
      positionClasses += " left-0";
      arrowClasses = "bottom-[-5px] left-3 border-x-[5px] border-x-transparent border-t-[5px] border-t-[#1A1D21]";
    } else if (align === "end") {
      positionClasses += " right-0";
      arrowClasses = "bottom-[-5px] right-3 border-x-[5px] border-x-transparent border-t-[5px] border-t-[#1A1D21]";
    } else {
      positionClasses += " left-1/2 -translate-x-1/2";
      arrowClasses = "bottom-[-5px] left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-[#1A1D21]";
    }
  } else if (placement === "right") {
    positionClasses = "left-full ml-2 top-1/2 -translate-y-1/2";
    arrowClasses = "left-[-5px] top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-[#1A1D21]";
  } else if (placement === "left") {
    positionClasses = "right-full mr-2 top-1/2 -translate-y-1/2";
    arrowClasses = "right-[-5px] top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-l-[5px] border-l-[#1A1D21]";
  }

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {visible && !disabled && (
        <div
          role="tooltip"
          className={`absolute z-[100] pointer-events-none whitespace-normal text-left ${positionClasses} animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Bulle style Slack dark */}
          <div className="relative rounded-lg bg-[#1A1D21] border border-white/10 px-2.5 py-1.5 shadow-2xl max-w-[280px]">
            {/* Flèche */}
            <div className={`absolute w-0 h-0 ${arrowClasses}`} aria-hidden="true" />

            {/* Titre & Raccourci */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-white leading-tight">
                {title}
              </span>
              {shortcut && (
                <kbd className="inline-flex items-center px-1.5 py-0.2 rounded bg-white/15 text-[10px] font-mono text-white/90">
                  {shortcut}
                </kbd>
              )}
            </div>

            {/* Sous-titre / Tip optionnel style Slack (Capture 2 & 4) */}
            {tip && (
              <p className="text-[11px] text-slate-300 font-normal leading-snug mt-0.5">
                {tip}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
