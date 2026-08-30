import Link from "next/link";
import { ArrowRight, Lightbulb, Users, FileWarning, ClipboardCheck, Banknote, PenTool, School, UserPlus } from "lucide-react";
import type { NextBestAction as NextBestActionType } from "@/lib/contextEngine";

type NextBestActionProps = {
  action: NextBestActionType | null;
  period: string;
};

const iconMap = {
  userPlus: UserPlus,
  fileWarning: FileWarning,
  users: Users,
  penTool: PenTool,
  clipboardCheck: ClipboardCheck,
  banknote: Banknote,
  school: School,
};

const severityStyles = {
  urgent: "bg-danger/10 text-danger border-danger/20",
  watch: "bg-warning/10 text-warning-dark border-warning/20",
  info: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
};

const buttonStyles = {
  urgent: "bg-danger hover:bg-danger/90 text-white",
  watch: "bg-warning hover:bg-warning-hover text-white",
  info: "bg-primary hover:bg-primary-hover text-white",
  success: "bg-success hover:bg-success-hover text-white",
};

export default function NextBestAction({ action, period }: NextBestActionProps) {
  if (!action) {
    // Empty state: "Tout est sous contrôle"
    return (
      <div className="rounded-[20px] border border-rule/40 bg-surface p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-success/10 text-success p-2.5 rounded-xl border border-success/20 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-text mb-0.5">
              Tout est sous contrôle
            </div>
            <p className="text-[13px] text-text-soft">
              Aucune action urgente n'est requise pour la période actuelle ({period}).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const IconComponent = iconMap[action.icon as keyof typeof iconMap] || Lightbulb;
  const style = severityStyles[action.severity] || severityStyles.info;
  const btnStyle = buttonStyles[action.severity] || buttonStyles.info;

  return (
    <div className="rounded-[20px] border border-rule/40 bg-surface p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
      {/* Decorative background element for the card */}
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full opacity-10 blur-2xl ${style.split(" ")[0]}`} />
      
      <div className="flex items-start gap-4 relative z-10">
        <div className={`${style} p-3 rounded-xl border shrink-0`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-soft">
              Priorité — {period}
            </span>
          </div>
          <div className="text-[16px] font-bold text-text mb-1.5">
            {action.title}
          </div>
          <p className="text-[13px] text-text-soft max-w-xl">
            {action.reason}
          </p>
        </div>
      </div>
      
      <Link 
        href={action.href}
        className={`shrink-0 ${btnStyle} px-6 py-2.5 rounded-control text-[13px] font-semibold transition-colors flex items-center gap-2 justify-center relative z-10 shadow-sm`}
      >
        {action.ctaLabel}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
