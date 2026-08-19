"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertCircle, UserPlus, MessageSquare, BellRing } from "lucide-react";

type Alert = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: "error" | "warning" | "info" | "success";
  href: string;
};

export default function AlertsWidget({
  lateInvoicesCount,
  pendingStudentsCount
}: {
  lateInvoicesCount: number;
  pendingStudentsCount: number;
}) {
  // Construct alerts dynamically based on props, and add some dummy examples as requested
  const alerts: Alert[] = [];

  if (lateInvoicesCount > 0) {
    alerts.push({
      id: "late-invoices",
      title: "Paiements en retard",
      description: `${lateInvoicesCount} factures à relancer`,
      icon: <AlertCircle className="h-5 w-5" />,
      color: "error",
      href: "/payments"
    });
  }

  if (pendingStudentsCount > 0) {
    alerts.push({
      id: "pending-students",
      title: "Admissions",
      description: `${pendingStudentsCount} dossiers en attente`,
      icon: <UserPlus className="h-5 w-5" />,
      color: "warning",
      href: "/admissions"
    });
  }

  // Adding dummy examples requested by the user
  alerts.push({
    id: "unread-messages",
    title: "Nouveaux messages",
    description: "4 messages non lus",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "info",
    href: "/communications"
  });

  alerts.push({
    id: "absences",
    title: "Absences",
    description: "12 élèves absents aujourd'hui",
    icon: <BellRing className="h-5 w-5" />,
    color: "warning",
    href: "/students"
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextAlert = () => {
    setCurrentIndex((prev) => (prev + 1) % alerts.length);
  };

  const prevAlert = () => {
    setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length);
  };

  if (alerts.length === 0) {
    return (
      <div className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-sm border border-border">
        {/* Decorative corner */}
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-rose-50 opacity-70 pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
        
        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Alertes Urgentes</h3>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-success/10 border border-success/20">
            <div>
              <p className="text-sm font-medium text-success mb-1">Tout va bien</p>
              <p className="text-base font-semibold text-text-primary">Aucune alerte</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentAlert = alerts[currentIndex];

  const colorStyles = {
    error: "bg-error/10 border-error/20 text-error",
    warning: "bg-warning/10 border-warning/20 text-warning",
    info: "bg-info/10 border-info/20 text-info",
    success: "bg-success/10 border-success/20 text-success"
  };

  return (
    <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Decorative corner */}
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-rose-50 opacity-70 pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            Alertes Urgentes
            <span className="bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {alerts.length}
            </span>
          </h3>
          <div className="flex gap-2">
            <button onClick={prevAlert} className="p-1 rounded-full bg-secondary text-text-muted hover:text-text-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={nextAlert} className="p-1 rounded-full bg-secondary text-text-muted hover:text-text-primary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <Link 
          href={currentAlert.href}
          className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${colorStyles[currentAlert.color]}`}
        >
          <div>
            <p className="text-sm font-medium mb-1 opacity-90">{currentAlert.title}</p>
            <p className="text-base font-semibold text-text-primary">{currentAlert.description}</p>
          </div>
          <div className={`h-10 w-10 flex-shrink-0 rounded-2xl bg-white shadow-sm border border-white/50 flex items-center justify-center`}>
            {currentAlert.icon}
          </div>
        </Link>
        
        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-auto pt-4">
          {alerts.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? "w-4 bg-text-primary" : "w-1.5 bg-border hover:bg-text-muted"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
