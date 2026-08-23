import * as React from "react";
import { Check, type LucideIcon } from "lucide-react";

export type FlowStep = {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming" | "failed";
  icon?: LucideIcon;
};

interface FlowStepsProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: FlowStep[];
}

export function FlowSteps({ steps, className, ...props }: FlowStepsProps) {
  return (
    <div className={["w-full py-4", className].filter(Boolean).join(" ")} {...props}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";
          const isFailed = step.status === "failed";
          
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              {/* Step indicator */}
              <div className="relative flex flex-col items-center group">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted
                      ? "border-primary bg-primary text-white"
                      : isFailed
                      ? "border-danger bg-danger text-white"
                      : isCurrent
                      ? "border-primary bg-surface text-primary shadow-sm"
                      : "border-rule bg-surface text-text-faint"
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : Icon ? (
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {/* Step label */}
                <div className="absolute top-10 mt-1 w-24 text-center">
                  <span
                    className={[
                      "text-[11px] font-semibold tracking-wide uppercase",
                      isCompleted || isCurrent ? "text-text" : "text-text-faint"
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </div>
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="flex-1 px-2">
                  <div
                    className={[
                      "h-0.5 w-full rounded-full transition-colors",
                      isCompleted ? "bg-primary" : "bg-rule"
                    ].join(" ")}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="h-8" /* Spacer for absolute labels */ />
    </div>
  );
}
