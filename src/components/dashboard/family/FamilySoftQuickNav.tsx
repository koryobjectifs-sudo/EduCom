"use client";

import Link from "next/link";
import { Users, GraduationCap, CreditCard, MessagesSquare, ArrowUpRight } from "lucide-react";

interface FamilySoftQuickNavProps {
  className?: string;
}

export default function FamilySoftQuickNav({ className = "" }: FamilySoftQuickNavProps) {
  const links = [
    {
      label: "Mes Enfants",
      detail: "Fiches et scolarité",
      href: "/famille/enfants",
      icon: Users,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Notes & Bulletins",
      detail: "Relevés officiels",
      href: "/famille/notes",
      icon: GraduationCap,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Paiements & Scolarité",
      detail: "Factures et reçus",
      href: "/famille/paiements",
      icon: CreditCard,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Communauté & Fil",
      detail: "Informations d'école",
      href: "/famille/communaute",
      icon: MessagesSquare,
      color: "text-sky-600 bg-sky-50",
    },
  ];

  return (
    <div
      className={`rounded-[28px] bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Accès Rapides
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Portail quotidien des parents d&apos;élèves
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col justify-between p-3.5 rounded-2xl bg-slate-50/60 hover:bg-white border border-slate-100 hover:border-slate-200/80 hover:shadow-xs transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold text-slate-900 group-hover:text-violet-600 transition-colors truncate">
                  {item.label}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {item.detail}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
