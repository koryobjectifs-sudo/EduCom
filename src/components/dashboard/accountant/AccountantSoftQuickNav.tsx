"use client";

import Link from "next/link";
import { Receipt, CreditCard, Building, FileSpreadsheet, ArrowUpRight } from "lucide-react";

interface AccountantSoftQuickNavProps {
  className?: string;
}

export default function AccountantSoftQuickNav({ className = "" }: AccountantSoftQuickNavProps) {
  const links = [
    {
      label: "Journal de Caisse",
      detail: "Écritures et versements",
      href: "/dashboard/payments",
      icon: Receipt,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Familles & Écolages",
      detail: "Dossiers de scolarité",
      href: "/dashboard/payments",
      icon: CreditCard,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Grille Tarifaire",
      detail: "Frais & échéanciers",
      href: "/dashboard/settings/fees",
      icon: Building,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Rapports & Exports",
      detail: "Grand livre et états",
      href: "/dashboard/payments",
      icon: FileSpreadsheet,
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
            Outils quotidiens de comptabilité
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
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
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
