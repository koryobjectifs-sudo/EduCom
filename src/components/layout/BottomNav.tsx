"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, UserPlus, CreditCard, BarChart2 } from "lucide-react";

const navigation = [
  { name: "Accueil", href: "/", icon: Home },
  { name: "Admissions", href: "/admissions", icon: UserPlus },
  { name: "Élèves", href: "/students", icon: Users },
  { name: "Paiements", href: "/payments", icon: CreditCard },
  { name: "Rapports", href: "/reports", icon: BarChart2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] px-4 py-2 flex items-center justify-between">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 ${isActive ? "text-primary" : "text-text-muted hover:text-text-secondary"
                }`}
            >
              <item.icon
                className={`h-6 w-6 mb-1 transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"
                  }`}
              />
              <span className={`text-[10px] font-medium transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 h-0 w-0 overflow-hidden"
                }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
