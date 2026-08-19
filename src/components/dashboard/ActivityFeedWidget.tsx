"use client";

import { Activity, CreditCard, UserPlus, FileText, CheckCircle2 } from "lucide-react";

type ActivityItem = {
  id: string;
  type: "payment" | "enrollment" | "document" | "system";
  title: string;
  time: string;
};

const activities: ActivityItem[] = [
  { id: "1", type: "payment", title: "Paiement de 50,000 FCFA reçu pour Jean D.", time: "Il y a 10 min" },
  { id: "2", type: "enrollment", title: "Nouvelle inscription : Alice M. en 6ème", time: "Il y a 2 heures" },
  { id: "3", type: "document", title: "Bulletin généré pour la classe 3ème A", time: "Il y a 3 heures" },
  { id: "4", type: "system", title: "Mise à jour du système réussie", time: "Hier" },
];

const iconMap = {
  payment: <CreditCard className="h-4 w-4 text-emerald-500" />,
  enrollment: <UserPlus className="h-4 w-4 text-blue-500" />,
  document: <FileText className="h-4 w-4 text-purple-500" />,
  system: <CheckCircle2 className="h-4 w-4 text-gray-500" />,
};

const bgMap = {
  payment: "bg-emerald-500/10 border-emerald-500/20",
  enrollment: "bg-blue-500/10 border-blue-500/20",
  document: "bg-purple-500/10 border-purple-500/20",
  system: "bg-gray-500/10 border-gray-500/20",
};

export default function ActivityFeedWidget() {
  return (
    <div className="group relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/40 flex flex-col flex-1 h-full transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1">
      {/* Decorative corner */}
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-amber-50 opacity-70 pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
          <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">Flux d'activité</h2>
        </div>
  
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4 items-start group/item">
              {/* Vertical Line Connection */}
              {index !== activities.length - 1 && (
                <div className="absolute left-4 top-8 bottom-[-16px] w-px bg-border/50 transition-colors group-hover/item:bg-border"></div>
              )}
              
              <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${bgMap[activity.type]} transition-transform duration-300 group-hover/item:scale-110 shadow-sm`}>
                {iconMap[activity.type]}
              </div>
              
              <div className="flex flex-col pt-1.5 pb-2">
                <p className="text-sm font-medium text-text-primary leading-tight transition-colors group-hover/item:text-primary">
                  {activity.title}
                </p>
                <span className="text-xs font-medium text-text-muted mt-1">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
