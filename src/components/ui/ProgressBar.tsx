import * as React from "react";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pourcentage de complétion (0 à 100) */
  progress: number;
  /** Pourcentage cible optionnel (affiche un trait de démarcation) */
  target?: number;
  /** Couleur principale de la barre */
  color?: "primary" | "success" | "warning" | "danger" | "purple";
  /** Afficher le pourcentage au-dessus de la barre */
  showLabel?: boolean;
  label?: React.ReactNode;
}

export function ProgressBar({
  progress,
  target,
  color = "primary",
  showLabel = false,
  label,
  className,
  ...props
}: ProgressBarProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const safeTarget = target !== undefined ? Math.min(Math.max(target, 0), 100) : undefined;

  const bgColors = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    purple: "bg-purple-600",
  };

  const trackColors = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    danger: "bg-danger/10",
    purple: "bg-purple-600/10",
  };

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")} {...props}>
      {(showLabel || label) && (
        <div className="mb-2 flex items-center justify-between text-role-meta font-medium">
          {label && <span className="text-text-soft">{label}</span>}
          {showLabel && <span className="text-text">{Math.round(safeProgress)}%</span>}
        </div>
      )}
      <div className={["relative h-3 w-full overflow-hidden rounded-full", trackColors[color]].join(" ")}>
        {/* Progress fill */}
        <div
          className={["h-full transition-all duration-500 ease-in-out", bgColors[color]].join(" ")}
          style={{ width: `${safeProgress}%` }}
        />
        
        {/* Target indicator */}
        {safeTarget !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-text-soft/40 shadow-sm z-10"
            style={{ left: `${safeTarget}%` }}
            title={`Cible: ${safeTarget}%`}
          />
        )}
      </div>
      {safeTarget !== undefined && (
        <div className="relative mt-1 flex justify-between text-[11px] font-medium text-text-faint">
          <span>0%</span>
          <span style={{ position: 'absolute', left: `${safeTarget}%`, transform: 'translateX(-50%)' }}>
            Cible : {Math.round(safeTarget)}%
          </span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}
