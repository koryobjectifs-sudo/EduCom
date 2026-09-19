"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  FileBadge,
  Filter,
  Download,
  Printer,
  ExternalLink,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

export interface LibraryDocumentItem {
  id: string;
  title: string;
  category: "scolaire" | "administratif";
  categoryLabel: string;
  docKind?: string;
  targetName?: string;
  targetClassName?: string;
  date: string;
  fileUrl?: string | null;
  viewUrl: string;
  statusLabel?: string;
  statusVariant?: "success" | "warning" | "neutral";
}

export interface DocumentsLibraryClientProps {
  initialDocuments: LibraryDocumentItem[];
  initialFilter?: string | null;
  canManage?: boolean;
}

export default function DocumentsLibraryClient({
  initialDocuments,
  initialFilter,
  canManage = false,
}: DocumentsLibraryClientProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "scolaire" | "administratif">(
    initialFilter === "administratifs" || initialFilter === "admin"
      ? "administratif"
      : initialFilter === "scolaires"
      ? "scolaire"
      : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(() => {
    return {
      all: initialDocuments.length,
      scolaire: initialDocuments.filter((d) => d.category === "scolaire").length,
      administratif: initialDocuments.filter((d) => d.category === "administratif").length,
    };
  }, [initialDocuments]);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialDocuments.filter((doc) => {
      // Category filter
      if (activeCategory !== "all" && doc.category !== activeCategory) {
        return false;
      }
      // Text search
      if (q) {
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesTarget = (doc.targetName || "").toLowerCase().includes(q);
        const matchesClass = (doc.targetClassName || "").toLowerCase().includes(q);
        const matchesKind = (doc.docKind || "").toLowerCase().includes(q);
        return matchesTitle || matchesTarget || matchesClass || matchesKind;
      }
      return true;
    });
  }, [initialDocuments, activeCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── Barre de Contrôle : Recherche et Filtres intégrés ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Onglets Filtres (Tous / Scolaires / Administratifs) */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tous
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeCategory === "all" ? "bg-slate-100 text-slate-700" : "bg-white/60 text-slate-500"
              }`}>
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("scolaire")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "scolaire"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileBadge className="h-3.5 w-3.5 text-indigo-600" />
              Documents scolaires
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeCategory === "scolaire" ? "bg-indigo-50 text-indigo-700" : "bg-white/60 text-slate-500"
              }`}>
                {counts.scolaire}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("administratif")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "administratif"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              Documents administratifs
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeCategory === "administratif" ? "bg-emerald-50 text-emerald-700" : "bg-white/60 text-slate-500"
              }`}>
                {counts.administratif}
              </span>
            </button>
          </div>

          {/* Champ de recherche */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, élève, classe..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* ── Liste des Documents Produits ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Aucun document trouvé
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "Aucun document ne correspond à votre recherche. Essayez un autre terme ou réinitialisez les filtres."
                : "Les documents générés et publiés apparaîtront ici automatiquement au fil des usages."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-slate-100">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Document</th>
                  <th scope="col" className="px-4 py-3.5">Catégorie</th>
                  <th scope="col" className="px-4 py-3.5">Bénéficiaire / Cible</th>
                  <th scope="col" className="px-4 py-3.5">Date</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          doc.category === "scolaire"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {doc.category === "scolaire" ? (
                            <FileBadge className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {doc.title}
                          </p>
                          {doc.docKind && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {doc.docKind}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        doc.category === "scolaire"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {doc.categoryLabel}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {doc.targetName || "Établissement"}
                        </p>
                        {doc.targetClassName && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Classe : {doc.targetClassName}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {doc.date}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={doc.viewUrl}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors shadow-2xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Consulter
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
