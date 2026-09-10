"use client";

import { useState, useEffect, useRef } from "react";
import { Search, GraduationCap, Users, FileText, CreditCard, School, X, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { globalSearchAction, type SearchResultItem } from "@/app/dashboard/search-actions";

export default function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearchAction(query);
        setResults(res.items || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    router.push(item.href);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "student":
        return <GraduationCap className="h-4 w-4 text-emerald-600" />;
      case "class":
        return <School className="h-4 w-4 text-blue-600" />;
      case "staff":
        return <Users className="h-4 w-4 text-amber-600" />;
      case "document":
        return <FileText className="h-4 w-4 text-indigo-600" />;
      case "finance":
        return <CreditCard className="h-4 w-4 text-rose-600" />;
      default:
        return <Search className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <>
      {/* Barre de recherche dans la TopBar (Centrée Slack-style) */}
      <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-auto px-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group w-full flex items-center justify-between h-7 px-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-white/15 text-xs text-white/80 hover:text-white transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Rechercher dans tout l'établissement"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
            <span className="truncate text-white/70 text-[11.5px]">Rechercher un élève, une classe...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-white/10 border border-white/20 px-1.5 py-0.5 text-[10px] font-mono text-white/80 shrink-0 shadow-2xs">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Modale / Palette de Commande */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div
            className="w-full max-w-xl bg-surface rounded-surface border border-rule shadow-overlay overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-100"
            onKeyDown={handleModalKeyDown}
          >
            {/* Input Header */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-rule bg-surface">
              <Search className="h-4 w-4 text-text-soft shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par nom d'élève, matricule, classe, document..."
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-0"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-control hover:bg-sunk text-text-faint hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-medium text-text-faint hover:text-text px-1.5 py-0.5 rounded border border-rule bg-sunk"
              >
                Échap
              </button>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto p-1.5 flex-1 divide-y divide-rule/50">
              {results.length > 0 ? (
                <div className="space-y-0.5">
                  {results.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-control text-left transition-colors ${
                          isSelected ? "bg-primary/10 text-primary" : "hover:bg-sunk text-text"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-surface border border-rule shadow-2xs">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-[11px] text-text-soft truncate leading-tight mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-surface border border-rule text-text-faint">
                            {item.categoryLabel}
                          </span>
                          <ArrowRight className={`h-3 w-3 ${isSelected ? "text-primary opacity-100" : "opacity-0"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : query.trim().length >= 2 && !loading ? (
                <div className="py-8 text-center text-xs text-text-soft">
                  <p className="font-semibold text-text">Aucun résultat trouvé pour « {query} »</p>
                  <p className="text-[11px] text-text-faint mt-1">Vérifiez l&apos;orthographe ou essayez un autre mot-clé.</p>
                </div>
              ) : (
                <div className="py-6 px-4 text-center text-xs text-text-soft space-y-2">
                  <p className="text-[11px] text-text-faint font-medium uppercase tracking-wider">
                    Raccourcis de recherche rapide
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {["Bulletins", "Classes", "Élèves", "Factures", "Certificats"].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setQuery(k)}
                        className="px-2 py-1 rounded-control bg-sunk hover:bg-rule text-[11px] text-text font-medium transition-colors"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="px-3 py-1.5 border-t border-rule bg-sunk/50 flex items-center justify-between text-[10.5px] text-text-faint">
              <div className="flex items-center gap-3">
                <span><kbd className="font-mono">↑↓</kbd> Naviguer</span>
                <span><kbd className="font-mono">↵</kbd> Ouvrir</span>
                <span><kbd className="font-mono">esc</kbd> Fermer</span>
              </div>
              <span>EduCom Command Palette</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
