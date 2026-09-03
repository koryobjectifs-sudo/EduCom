"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, ArrowLeft, Trash2, CalendarDays, Contact2, FileBadge, ReceiptText, Banknote } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DraftsList({ students, classes }: { students: any[], classes?: any[] }) {
  const router = useRouter();
  
  // States for different draft categories
  const [reportCardDrafts, setReportCardDrafts] = useState<any[]>([]);
  const [certificateDrafts, setCertificateDrafts] = useState<any[]>([]);
  const [infoSheetDrafts, setInfoSheetDrafts] = useState<any[]>([]);
  const [timetableDrafts, setTimetableDrafts] = useState<any[]>([]);
  const [invoiceDrafts, setInvoiceDrafts] = useState<any[]>([]);
  const [receiptDrafts, setReceiptDrafts] = useState<any[]>([]);
  const [otherDrafts, setOtherDrafts] = useState<any[]>([]);
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadDrafts();
  }, [students, classes]);

  const loadDrafts = () => {
    const reports = [];
    const certs = [];
    const infosheets = [];
    const timetables = [];
    const invoices = [];
    const receipts = [];
    const others = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith("draft_certificate_")) {
          const studentId = key.replace("draft_certificate_", "");
          const s = students.find((st) => st.id === studentId);
          if (s) certs.push({ ...s, key });
        } else if (key.startsWith("draft_infosheet_")) {
          const studentId = key.replace("draft_infosheet_", "");
          const s = students.find((st) => st.id === studentId);
          if (s) infosheets.push({ ...s, key });
        } else if (key.startsWith("draft_timetable_")) {
          const classId = key.replace("draft_timetable_", "");
          const c = classes?.find((cl) => cl.id === classId);
          if (c) timetables.push({ ...c, key });
        } else if (key.startsWith("draft_invoice_")) {
          const studentId = key.replace("draft_invoice_", "");
          const s = students.find((st) => st.id === studentId);
          if (s) invoices.push({ ...s, key });
        } else if (key.startsWith("draft_receipt_")) {
          const studentId = key.replace("draft_receipt_", "");
          const s = students.find((st) => st.id === studentId);
          if (s) receipts.push({ ...s, key });
        } else if (key.startsWith("draft_other_")) {
          const studentId = key.replace("draft_other_", "");
          const s = students.find((st) => st.id === studentId);
          if (s) others.push({ ...s, key });
        } else if (key.startsWith("draft_")) {
          // Fallback to report card for legacy "draft_xyz"
          const studentId = key.replace("draft_", "");
          const s = students.find((st) => st.id === studentId);
          if (s) reports.push({ ...s, key });
        }
      }
    }
    
    setReportCardDrafts(reports);
    setCertificateDrafts(certs);
    setInfoSheetDrafts(infosheets);
    setTimetableDrafts(timetables);
    setInvoiceDrafts(invoices);
    setReceiptDrafts(receipts);
    setOtherDrafts(others);
  };

  const deleteDraft = (key: string) => {
    localStorage.removeItem(key);
    loadDrafts();
  };

  const resumeDraft = (type: string, id: string) => {
    if (type === "report-card") {
      router.push(`/dashboard/grades/report-card?studentId=${id}`);
    } else if (type === "certificate") {
      router.push(`/dashboard/documents/certificate?studentId=${id}`);
    } else if (type === "info-sheet") {
      router.push(`/dashboard/documents/info-sheet?studentId=${id}`);
    } else if (type === "timetable") {
      router.push(`/dashboard/documents/timetable?classId=${id}`);
    } else if (type === "invoice") {
      router.push(`/dashboard/payments/invoice?studentId=${id}`);
    } else if (type === "receipt") {
      router.push(`/dashboard/payments/receipt?studentId=${id}`);
    }
  };

  if (!isClient) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 border-b border-rule pb-4">
        <Link
          href="/dashboard/documents"
          className="rounded-full p-2 text-text-faint hover:bg-sunk hover:text-text-soft transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-role-page font-semibold tracking-tight text-text">Mes Brouillons</h1>
          <p className="text-sm text-text-soft">Reprenez l'édition de vos documents non terminés.</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Bulletins de notes */}
        {reportCardDrafts.length > 0 && (
          <div className="bg-white border border-rule rounded-control overflow-hidden shadow-sm">
            <div className="bg-ground px-5 py-3 border-b border-rule flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              <h2 className="font-semibold text-text">Bulletins de notes</h2>
              <span className="bg-sunk text-accent text-xs font-bold px-2 py-0.5 rounded-full ml-2">{reportCardDrafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {reportCardDrafts.map(draft => (
                <div key={draft.key} className="flex items-center justify-between p-4 hover:bg-ground transition-colors">
                  <div>
                    <p className="font-semibold text-text">{draft.firstName} {draft.lastName}</p>
                    <p className="text-sm text-text-soft">{draft.enrollments?.[0]?.class?.name || "Classe non spécifiée"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => resumeDraft("report-card", draft.id)}
                      className="px-3 py-1.5 text-sm font-semibold bg-white border border-rule text-text-soft rounded-lg hover:bg-ground shadow-sm transition-colors"
                    >
                      Reprendre
                    </button>
                    <button 
                      onClick={() => deleteDraft(draft.key)}
                      className="p-1.5 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Factures */}
        {invoiceDrafts.length > 0 && (
          <div className="bg-white border border-rule rounded-control overflow-hidden shadow-sm">
            <div className="bg-ground px-5 py-3 border-b border-rule flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-success" />
              <h2 className="font-semibold text-text">Factures</h2>
              <span className="bg-sunk text-text-soft text-xs font-bold px-2 py-0.5 rounded-full ml-2">{invoiceDrafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {invoiceDrafts.map(draft => (
                <div key={draft.key} className="flex items-center justify-between p-4 hover:bg-ground transition-colors">
                  <div>
                    <p className="font-semibold text-text">{draft.firstName} {draft.lastName}</p>
                    <p className="text-sm text-text-soft">{draft.enrollments?.[0]?.class?.name || "Classe non spécifiée"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => resumeDraft("invoice", draft.id)}
                      className="px-3 py-1.5 text-sm font-semibold bg-white border border-rule text-text-soft rounded-lg hover:bg-ground shadow-sm transition-colors"
                    >
                      Reprendre
                    </button>
                    <button 
                      onClick={() => deleteDraft(draft.key)}
                      className="p-1.5 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reçus */}
        {receiptDrafts.length > 0 && (
          <div className="bg-white border border-rule rounded-control overflow-hidden shadow-sm">
            <div className="bg-ground px-5 py-3 border-b border-rule flex items-center gap-2">
              <Banknote className="w-5 h-5 text-warning" />
              <h2 className="font-semibold text-text">Reçus de paiement</h2>
              <span className="bg-sunk text-text-soft text-xs font-bold px-2 py-0.5 rounded-full ml-2">{receiptDrafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {receiptDrafts.map(draft => (
                <div key={draft.key} className="flex items-center justify-between p-4 hover:bg-ground transition-colors">
                  <div>
                    <p className="font-semibold text-text">{draft.firstName} {draft.lastName}</p>
                    <p className="text-sm text-text-soft">{draft.enrollments?.[0]?.class?.name || "Classe non spécifiée"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => resumeDraft("receipt", draft.id)}
                      className="px-3 py-1.5 text-sm font-semibold bg-white border border-rule text-text-soft rounded-lg hover:bg-ground shadow-sm transition-colors"
                    >
                      Reprendre
                    </button>
                    <button 
                      onClick={() => deleteDraft(draft.key)}
                      className="p-1.5 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificats de scolarité */}
        {certificateDrafts.length > 0 && (
          <div className="bg-white border border-rule rounded-control overflow-hidden shadow-sm">
            <div className="bg-ground px-5 py-3 border-b border-rule flex items-center gap-2">
              <FileBadge className="w-5 h-5 text-accent" />
              <h2 className="font-semibold text-text">Certificats de scolarité</h2>
              <span className="bg-sunk text-text-soft text-xs font-bold px-2 py-0.5 rounded-full ml-2">{certificateDrafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {certificateDrafts.map(draft => (
                <div key={draft.key} className="flex items-center justify-between p-4 hover:bg-ground transition-colors">
                  <div>
                    <p className="font-semibold text-text">{draft.firstName} {draft.lastName}</p>
                    <p className="text-sm text-text-soft">{draft.enrollments?.[0]?.class?.name || "Classe non spécifiée"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => resumeDraft("certificate", draft.id)}
                      className="px-3 py-1.5 text-sm font-semibold bg-white border border-rule text-text-soft rounded-lg hover:bg-ground shadow-sm transition-colors"
                    >
                      Reprendre
                    </button>
                    <button 
                      onClick={() => deleteDraft(draft.key)}
                      className="p-1.5 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fiches d'inscription */}
        {infoSheetDrafts.length > 0 && (
          <div className="bg-white border border-rule rounded-control overflow-hidden shadow-sm">
            <div className="bg-ground px-5 py-3 border-b border-rule flex items-center gap-2">
              <Contact2 className="w-5 h-5 text-text-soft" />
              <h2 className="font-semibold text-text">Fiches d'inscription</h2>
              <span className="bg-sunk text-text-soft text-xs font-bold px-2 py-0.5 rounded-full ml-2">{infoSheetDrafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {infoSheetDrafts.map(draft => (
                <div key={draft.key} className="flex items-center justify-between p-4 hover:bg-ground transition-colors">
                  <div>
                    <p className="font-semibold text-text">{draft.firstName} {draft.lastName}</p>
                    <p className="text-sm text-text-soft">{draft.enrollments?.[0]?.class?.name || "Classe non spécifiée"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => resumeDraft("info-sheet", draft.id)}
                      className="px-3 py-1.5 text-sm font-semibold bg-white border border-rule text-text-soft rounded-lg hover:bg-ground shadow-sm transition-colors"
                    >
                      Reprendre
                    </button>
                    <button 
                      onClick={() => deleteDraft(draft.key)}
                      className="p-1.5 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emplois du temps */}
        {timetableDrafts.length > 0 && (
          <div className="bg-white border border-rule rounded-control overflow-hidden shadow-sm">
            <div className="bg-ground px-5 py-3 border-b border-rule flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-text-soft" />
              <h2 className="font-semibold text-text">Emplois du temps</h2>
              <span className="bg-sunk text-text-soft text-xs font-bold px-2 py-0.5 rounded-full ml-2">{timetableDrafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {timetableDrafts.map(draft => (
                <div key={draft.key} className="flex items-center justify-between p-4 hover:bg-ground transition-colors">
                  <div>
                    <p className="font-semibold text-text">Classe de {draft.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => resumeDraft("timetable", draft.id)}
                      className="px-3 py-1.5 text-sm font-semibold bg-white border border-rule text-text-soft rounded-lg hover:bg-ground shadow-sm transition-colors"
                    >
                      Reprendre
                    </button>
                    <button 
                      onClick={() => deleteDraft(draft.key)}
                      className="p-1.5 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Autres documents (Fallback) */}
        {otherDrafts.length > 0 && (
          <div className="bg-white border border-rule rounded-control overflow-hidden shadow-sm">
            <div className="bg-ground px-5 py-3 border-b border-rule flex items-center gap-2">
              <FileText className="w-5 h-5 text-text-soft" />
              <h2 className="font-semibold text-text">Autres brouillons</h2>
              <span className="bg-sunk text-text-soft text-xs font-bold px-2 py-0.5 rounded-full ml-2">{otherDrafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {otherDrafts.map(draft => (
                <div key={draft.key} className="flex items-center justify-between p-4 hover:bg-ground transition-colors">
                  <div>
                    <p className="font-semibold text-text">{draft.firstName} {draft.lastName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => deleteDraft(draft.key)}
                      className="p-1.5 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {reportCardDrafts.length === 0 && certificateDrafts.length === 0 && infoSheetDrafts.length === 0 && timetableDrafts.length === 0 && invoiceDrafts.length === 0 && receiptDrafts.length === 0 && otherDrafts.length === 0 && (
          <div className="text-center py-20 bg-white border border-dashed border-rule rounded-control">
            <FileText className="w-12 h-12 text-text-faint mx-auto mb-3" />
            <h3 className="text-lg font-medium text-text mb-1">Aucun brouillon</h3>
            <p className="text-text-soft text-sm max-w-sm mx-auto">
              Vous n'avez pas de document en cours d'édition. Les modifications non sauvegardées apparaîtront ici.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
