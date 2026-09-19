"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, FolderOpen, ClipboardCheck } from "lucide-react";

export function DocumentsTabs() {
  const pathname = usePathname() || "";

  const tabs = [
    {
      name: "Documents produits",
      href: "/dashboard/documents",
      icon: FileStack,
      isActive: pathname === "/dashboard/documents" || (pathname.startsWith("/dashboard/documents") && !pathname.startsWith("/dashboard/documents/templates") && !pathname.startsWith("/dashboard/documents/drafts")),
    },
    {
      name: "Modèles",
      href: "/dashboard/documents/templates",
      icon: FolderOpen,
      isActive: pathname.startsWith("/dashboard/documents/templates"),
    },
    {
      name: "Actions & Contrôle",
      href: "/dashboard/students/dossiers/review",
      icon: ClipboardCheck,
      isActive: pathname.startsWith("/dashboard/students/dossiers/review"),
    },
  ];


  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`
                group inline-flex items-center gap-2 border-b-2 py-4 px-1 text-[14px] font-medium transition-colors
                ${tab.isActive
                  ? "border-[#539BEB] text-[#539BEB]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }
              `}
            >
              <Icon
                className={`h-4 w-4 ${tab.isActive ? "text-[#539BEB]" : "text-gray-400 group-hover:text-gray-500"}`}
                aria-hidden="true"
              />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
