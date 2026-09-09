"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getVisibleSpaces, isActive } from "@/lib/navigation";
import { getNavIcon } from "./nav-icons";

export interface MobileNavProps {
  schoolName?: string;
  schoolLogo?: string | null;
  userRole?: string;
}

export default function MobileNav({
  schoolName = "EduCom",
  schoolLogo,
  userRole = "PARENT",
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const spaces = getVisibleSpaces(userRole);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    };
  }, [open]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la navigation"
        aria-expanded={open}
        icon={<Menu aria-hidden="true" className="h-5 w-5 text-text" />}
        className="md:hidden h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center p-0"
      />

      {open && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden">
          {/* Fond sombre */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Tiroir */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            tabIndex={-1}
            className="relative flex h-full w-80 max-w-[85vw] flex-col border-inline-end border-rule bg-surface shadow-overlay focus:outline-none"
          >
            {/* Entête Établissement */}
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-rule px-4 bg-ground">
              <div className="flex items-center gap-2.5 min-w-0">
                {schoolLogo ? (
                  <img
                    src={schoolLogo}
                    alt=""
                    aria-hidden="true"
                    className="h-7 w-auto max-w-[60px] shrink-0 rounded-sm object-contain"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-control bg-primary text-xs font-bold text-white"
                  >
                    {schoolName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-bold text-text leading-tight" title={schoolName}>
                    {schoolName}
                  </p>
                  <p className="text-[10px] text-text-faint">EduCom Workspace</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Fermer la navigation"
                icon={<X aria-hidden="true" className="h-4 w-4" />}
                className="shrink-0 min-h-[44px] min-w-[44px]"
              />
            </div>

            {/* Corps du menu mobile : Espaces & Sous-destinations */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {spaces.map((space) => {
                const SpaceIcon = getNavIcon(space.icon);
                return (
                  <div key={space.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-text-soft">
                      <SpaceIcon aria-hidden="true" className="h-4 w-4 text-primary" />
                      <span>{space.label}</span>
                    </div>

                    <div className="space-y-0.5 border-inline-start-2 border-rule/60 ms-2 ps-2">
                      {space.sections.map((section) =>
                        section.items.map((item) => {
                          const ItemIcon = getNavIcon(item.icon);
                          const active = isActive(item.href, pathname);
                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => setOpen(false)}
                              aria-current={active ? "page" : undefined}
                              className={[
                                "flex items-center gap-3 rounded-control px-3 py-2.5 text-xs font-medium min-h-[44px] transition-colors",
                                active
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-text-soft hover:bg-sunk hover:text-text",
                              ].join(" ")}
                            >
                              <ItemIcon
                                aria-hidden="true"
                                className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-text-faint"}`}
                              />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
