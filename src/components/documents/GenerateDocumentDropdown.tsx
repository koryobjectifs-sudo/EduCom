"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  FileBadge,
  Contact2,
  CalendarDays,
  Receipt,
  BellRing,
  Printer,
  ChevronDown,
  CheckCircle2,
  Users,
} from "lucide-react";

export type GenerateDocContext = "student" | "class" | "invoice" | "payment";

export interface GenerateDocumentDropdownProps {
  context: GenerateDocContext;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  invoiceId?: string;
  paymentId?: string;
  variant?: "banner" | "default" | "subtle";
  align?: "left" | "right";
  classNameButton?: string;
}

export default function GenerateDocumentDropdown({
  context,
  studentId,
  studentName,
  classId,
  className,
  invoiceId,
  paymentId,
  variant = "default",
  align = "right",
  classNameButton,
}: GenerateDocumentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on escape key and outside click
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Options configuration per context
  const getOptions = () => {
    switch (context) {
      case "student":
        return [
          {
            title: "Certificat de scolarité",
            description: "Attestation officielle signée avec cachet",
            href: `/dashboard/documents/certificate?studentId=${studentId}`,
            icon: FileBadge,
            badge: "Officiel",
          },
          {
            title: "Bulletin trimestriel",
            description: "Relevé des notes et appréciations",
            href: `/dashboard/grades/report-card?studentId=${studentId}`,
            icon: FileText,
            badge: "Pédagogie",
          },
          {
            title: "Fiche de renseignements",
            description: "Dossier d'urgence, état civil et tuteurs",
            href: `/dashboard/documents/info-sheet?studentId=${studentId}`,
            icon: Contact2,
            badge: "Administratif",
          },
          {
            title: "Attestation de scolarité",
            description: "Certificat allégé pour démarches courantes",
            href: `/dashboard/documents/certificate?studentId=${studentId}&type=attestation`,
            icon: CheckCircle2,
            badge: "Attestation",
          },
        ];

      case "class":
        return [
          {
            title: "Liste de la classe",
            description: "Registre d'émargement et effectif officiel",
            href: "#print-class-list",
            icon: Users,
            badge: "Effectif",
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              setIsOpen(false);
              window.print();
            },
          },
          {
            title: "Emploi du temps",
            description: "Grille horaire hebdomadaire de la classe",
            href: `/dashboard/documents/timetable?classId=${classId}`,
            icon: CalendarDays,
            badge: "Planning",
          },
          {
            title: "Bulletins de la classe",
            description: "Tous les bulletins du trimestre en lot",
            href: `/dashboard/grades/report-card?classId=${classId}`,
            icon: FileText,
            badge: "Pédagogie",
          },
        ];

      case "invoice":
        return [
          {
            title: "Facture officielle",
            description: "Facture scolaire avec ventilation des frais",
            href: `/dashboard/payments/invoice?invoiceId=${invoiceId}`,
            icon: FileText,
            badge: "Finance",
          },
          {
            title: "Reçu de versement",
            description: "Preuve d'encaissement et décharge",
            href: `/dashboard/payments/receipt?invoiceId=${invoiceId}`,
            icon: Receipt,
            badge: "Paiement",
          },
          {
            title: "Lettre de relance",
            description: "Mise en demeure pour solde impayé",
            href: `/dashboard/documents/reminder?invoiceId=${invoiceId}`,
            icon: BellRing,
            badge: "Recouvrement",
          },
        ];

      case "payment":
        return [
          {
            title: "Reçu de versement",
            description: "Preuve certifiée de paiement",
            href: `/dashboard/payments/receipt?paymentId=${paymentId}`,
            icon: Receipt,
            badge: "Officiel",
          },
        ];

      default:
        return [];
    }
  };

  const options = getOptions();

  // Button styles based on variant
  const getButtonStyles = () => {
    if (classNameButton) return classNameButton;

    if (variant === "banner") {
      return (
        "inline-flex items-center justify-center gap-2 rounded-control px-3.5 h-10 text-role-label font-medium shadow-card transition-all " +
        "bg-white text-slate-900 border border-transparent hover:bg-white/95 active:scale-[0.98] " +
        "pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      );
    }

    if (variant === "subtle") {
      return (
        "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all " +
        "bg-white/10 text-white border border-white/20 hover:bg-white/20 active:scale-[0.98] " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      );
    }

    return (
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all " +
      "bg-primary text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    );
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={getButtonStyles()}
      >
        <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Générer un document</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 divide-y divide-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden`}
        >
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Documents contextuels
            </p>
            <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
              {studentName || className || (invoiceId ? `Facture #${invoiceId.slice(0, 8)}` : "Document courant")}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pré-rempli automatiquement sans sélection d&apos;élève.
            </p>
          </div>

          <div className="py-1 max-h-[360px] overflow-y-auto">
            {options.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <Link
                  key={idx}
                  href={opt.href}
                  role="menuitem"
                  onClick={(e) => {
                    if (opt.onClick) {
                      opt.onClick(e);
                    } else {
                      setIsOpen(false);
                    }
                  }}
                  className="group flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {opt.title}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-slate-100 group-hover:bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-slate-600 group-hover:text-primary transition-colors shrink-0">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
