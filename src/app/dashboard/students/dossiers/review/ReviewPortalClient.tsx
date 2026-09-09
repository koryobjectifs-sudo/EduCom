"use client";

import { useState, useMemo, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  UploadCloud,
  FileText,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  Phone,
  MessageCircle,
  Layers,
  Camera,
  FolderOpen,
  Hourglass,
  Check,
  X,
  Loader2,
  Eye,
  Edit3,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  FileCheck,
  XCircle,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  approveStudentAdmissionAction,
  bulkApproveStudentAdmissionsAction,
  rejectStudentAdmissionAction,
  validateStudentDocumentAction,
  rejectStudentDocumentAction,
  markDocumentRegularisationAction,
  bulkMarkRegularisationAction,
  updateStudentParentDirectAction,
  uploadStudentDocumentDirectAction,
  bulkUploadStudentDocumentAction,
  getSignedDocumentUrlAction,
} from "./actions";

export type StudentDocItem = {
  requirementId: string;
  label: string;
  shortLabel: string;
  category: string;
  cycle: string | null;
  source: "OFFICIEL" | "ETABLISSEMENT";
  required: boolean;
  pinned: boolean;
  order: number;
  applicable: boolean;
  nonApplicableReason: string | null;
  status: "NON_APPLICABLE" | "MANQUANT" | "EN_REGULARISATION" | "FOURNI" | "CONFORME" | "NON_CONFORME";
  documentId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  storagePath?: string | null;
  note?: string | null;
  updatedAt?: string | null;
};

export type ReviewStudentItem = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  age: number | null;
  formattedAge: string;
  gender: string | null;
  status: "PENDING" | "ENROLLED" | "INACTIVE" | "GRADUATED";
  createdAt: string;
  className: string | null;
  classId: string | null;
  cycle: string | null;
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  docs: StudentDocItem[];
  completeness: {
    totalRequired: number;
    providedRequired: number;
    compliantCount: number;
    missingCount: number;
    isCompliant: boolean;
  };
};

export type RequirementDefItem = {
  id: string;
  label: string;
  shortLabel: string;
  category: string;
  cycle: string | null;
  source: "OFFICIEL" | "ETABLISSEMENT";
  required: boolean;
  pinned: boolean;
  order: number;
  conditional: string | null;
};

interface ReviewPortalClientProps {
  students: ReviewStudentItem[];
  classes: { id: string; name: string; cycle: string }[];
  requirementDefs: RequirementDefItem[];
  initialFilter?: "todo" | "missing_docs" | "compliant" | "all";
}

/**
 * Compresse une image côté client avant envoi pour les connexions mobiles sénégalaises.
 */
async function compressImageClient(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("svg")) {
    return file; // Ne compresse pas les PDF ou SVG
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        elem.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export default function ReviewPortalClient({
  students,
  classes,
  requirementDefs,
  initialFilter = "todo",
}: ReviewPortalClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtres
  const [activeTab, setActiveTab] = useState<"todo" | "missing_docs" | "compliant" | "all">(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [missingPieceFilter, setMissingPieceFilter] = useState<string | null>(null);

  // Sélections multiples
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Tiroir latéral de révision (Poste de travail)
  const [drawerStudent, setDrawerStudent] = useState<ReviewStudentItem | null>(null);
  const [drawerDocReqId, setDrawerDocReqId] = useState<string | null>(null);
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null);
  const [signedDocLoading, setSignedDocLoading] = useState(false);

  // Modales d'actions
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Modale Dépôt cellule
  const [depositModal, setDepositModal] = useState<{
    student: ReviewStudentItem;
    req: RequirementDefItem;
  } | null>(null);
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Modale Mise en régularisation cellule
  const [regularisationModal, setRegularisationModal] = useState<{
    student: ReviewStudentItem;
    reqId: string;
    reqLabel: string;
  } | null>(null);
  const [regularisationNote, setRegularisationNote] = useState("");

  // Modale Actions Groupées
  const [bulkRegModal, setBulkRegModal] = useState(false);
  const [bulkRegReqId, setBulkRegReqId] = useState(requirementDefs[0]?.id || "");
  const [bulkRegNote, setBulkRegNote] = useState("");

  const [bulkUploadModal, setBulkUploadModal] = useState(false);
  const [bulkUploadReqId, setBulkUploadReqId] = useState(requirementDefs[0]?.id || "");
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);

  // Modale Confirmation Admission incomplète
  const [confirmAdmissionStudent, setConfirmAdmissionStudent] = useState<{
    student: ReviewStudentItem;
    missingCount: number;
  } | null>(null);

  const [confirmBulkAdmission, setConfirmBulkAdmission] = useState<{
    students: ReviewStudentItem[];
    incompleteCount: number;
  } | null>(null);

  // Modale Édition Tuteur Rapide
  const [editParentStudent, setEditParentStudent] = useState<ReviewStudentItem | null>(null);
  const [parentFormData, setParentFormData] = useState({ firstName: "", lastName: "", phone: "" });

  // Menu contextuel d'en-tête de colonne
  const [columnMenuReqId, setColumnMenuReqId] = useState<string | null>(null);

  // Input file refs
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const drawerFileInputRef = useRef<HTMLInputElement>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. Détermination des colonnes canoniques dédoublonnées de la matrice selon la vue
  const visibleColumns = useMemo(() => {
    // Filtrer les exigences brutes selon la classe / cycle sélectionné
    let pool = requirementDefs;
    if (classFilter !== "ALL") {
      const selectedCls = classes.find((c) => c.id === classFilter);
      if (selectedCls) {
        pool = requirementDefs.filter((req) => req.cycle === null || req.cycle === selectedCls.cycle);
      }
    } else {
      pool = requirementDefs.filter((req) => req.cycle === null || classes.some((c) => c.cycle === req.cycle));
    }

    // Dédoublonnage par clé canonique (label normalisé)
    const map = new Map<string, {
      key: string;
      label: string;
      shortLabel: string;
      category: string;
      source: "OFFICIEL" | "ETABLISSEMENT";
      reqIds: string[];
      sampleReq: RequirementDefItem;
    }>();

    const getOrderPriority = (label: string) => {
      const l = label.toLowerCase();
      if (l.includes("extrait") || l.includes("naissance") || l.includes("acte")) return 1;
      if (l.includes("préscolaire") || l.includes("prescolaire")) return 2;
      if (l.includes("fiche scolaire") || l.includes("scolarité") || l.includes("scolarite")) return 3;
      if (l.includes("demande d'inscription") || l.includes("demande")) return 4;
      if (l.includes("cfee")) return 5;
      if (l.includes("bfem")) return 6;
      if (l.includes("bulletin") || l.includes("n-1")) return 7;
      if (l.includes("règlement") || l.includes("reglement")) return 8;
      return 99;
    };

    for (const req of pool) {
      const normKey = (req.shortLabel || req.label)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      if (!map.has(normKey)) {
        map.set(normKey, {
          key: normKey,
          label: req.label,
          shortLabel: req.shortLabel || req.label,
          category: req.category,
          source: req.source,
          reqIds: [req.id],
          sampleReq: req,
        });
      } else {
        const existing = map.get(normKey)!;
        if (!existing.reqIds.includes(req.id)) {
          existing.reqIds.push(req.id);
        }
        if (req.source === "OFFICIEL") {
          existing.source = "OFFICIEL";
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const prioA = getOrderPriority(a.label);
      const prioB = getOrderPriority(b.label);
      if (prioA !== prioB) return prioA - prioB;
      return a.label.localeCompare(b.label);
    });
  }, [requirementDefs, classFilter, classes]);

  // 2. Calcul des KPI globaux
  const counts = useMemo(() => {
    let todo = 0;
    let missing = 0;
    let compliant = 0;

    for (const s of students) {
      if (s.status === "PENDING") {
        todo++;
      } else {
        if (s.completeness.isCompliant) {
          compliant++;
        } else {
          missing++;
        }
      }
    }

    return {
      todo,
      missing_docs: missing,
      compliant,
      all: students.length,
    };
  }, [students]);

  // 3. Filtrage de la liste
  const filteredList = useMemo(() => {
    return students.filter((s) => {
      // Onglet
      if (activeTab === "todo" && s.status !== "PENDING") return false;
      if (activeTab === "missing_docs" && (s.status === "PENDING" || s.completeness.isCompliant)) return false;
      if (activeTab === "compliant" && (s.status === "PENDING" || !s.completeness.isCompliant)) return false;

      // Classe
      if (classFilter !== "ALL" && s.classId !== classFilter) return false;

      // Filtre sur pièce manquante spécifique
      if (missingPieceFilter) {
        const doc = s.docs.find((d) => {
          const normKey = (d.shortLabel || d.label)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
          return normKey === missingPieceFilter || d.requirementId === missingPieceFilter;
        });
        if (!doc || !doc.applicable || doc.status === "CONFORME") return false;
      }

      // Recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const parentName = `${s.parent?.firstName || ""} ${s.parent?.lastName || ""}`.toLowerCase();
        const phone = (s.parent?.phone || "").replace(/[^0-9]/g, "");
        const cleanQ = q.replace(/[^0-9]/g, "");

        const matchName = fullName.includes(q);
        const matchParent = parentName.includes(q);
        const matchPhone = cleanQ && phone.includes(cleanQ);
        const matchClass = s.className?.toLowerCase().includes(q);

        if (!matchName && !matchParent && !matchPhone && !matchClass) return false;
      }

      return true;
    });
  }, [students, activeTab, classFilter, missingPieceFilter, searchQuery]);

  // 4. Chargement de l'URL signée lors de l'ouverture du tiroir
  const activeDrawerDoc = useMemo(() => {
    if (!drawerStudent) return null;
    const applicableDocs = drawerStudent.docs.filter((d) => d.applicable);
    if (!drawerDocReqId) return applicableDocs[0] || null;
    return applicableDocs.find((d) => d.requirementId === drawerDocReqId) || applicableDocs[0] || null;
  }, [drawerStudent, drawerDocReqId]);

  useEffect(() => {
    if (!activeDrawerDoc || !activeDrawerDoc.documentId) {
      setSignedDocUrl(null);
      setSignedDocLoading(false);
      return;
    }

    let isMounted = true;
    setSignedDocLoading(true);

    getSignedDocumentUrlAction(activeDrawerDoc.documentId).then((res) => {
      if (isMounted) {
        setSignedDocLoading(false);
        if ("url" in res) {
          setSignedDocUrl(res.url);
        } else {
          setSignedDocUrl(null);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeDrawerDoc]);

  // Gestion de la sélection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredList.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions d'admission
  const handleApproveClick = (student: ReviewStudentItem) => {
    if (!student.completeness.isCompliant) {
      setConfirmAdmissionStudent({
        student,
        missingCount: student.completeness.missingCount,
      });
    } else {
      executeApprove(student.id);
    }
  };

  const executeApprove = (studentId: string) => {
    setProcessingId(studentId);
    startTransition(async () => {
      const res = await approveStudentAdmissionAction(studentId);
      setProcessingId(null);
      setConfirmAdmissionStudent(null);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleBulkApprove = () => {
    const selectedStudents = students.filter((s) => selectedIds.has(s.id));
    const incomplete = selectedStudents.filter((s) => !s.completeness.isCompliant).length;

    if (incomplete > 0) {
      setConfirmBulkAdmission({
        students: selectedStudents,
        incompleteCount: incomplete,
      });
    } else {
      executeBulkApprove();
    }
  };

  const executeBulkApprove = () => {
    setProcessingId("BULK");
    startTransition(async () => {
      const res = await bulkApproveStudentAdmissionsAction(Array.from(selectedIds));
      setProcessingId(null);
      setConfirmBulkAdmission(null);
      setSelectedIds(new Set());
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  // Actions sur une pièce depuis le Tiroir
  const handleDrawerValidate = () => {
    if (!drawerStudent || !activeDrawerDoc) return;
    setProcessingId(activeDrawerDoc.requirementId);
    startTransition(async () => {
      const res = await validateStudentDocumentAction({
        documentId: activeDrawerDoc.documentId || undefined,
        studentId: drawerStudent.id,
        requirementId: activeDrawerDoc.requirementId,
      });
      setProcessingId(null);
      if (res.error) {
        alert(res.error);
      } else {
        // Avancer à la pièce suivante si disponible
        advanceDrawerDoc(1);
        router.refresh();
      }
    });
  };

  const handleDrawerReject = () => {
    if (!drawerStudent || !activeDrawerDoc) return;
    if (!rejectReason.trim()) {
      alert("Veuillez indiquer le motif du refus pour la famille.");
      return;
    }
    setProcessingId(activeDrawerDoc.requirementId);
    startTransition(async () => {
      const res = await rejectStudentDocumentAction({
        documentId: activeDrawerDoc.documentId || undefined,
        studentId: drawerStudent.id,
        requirementId: activeDrawerDoc.requirementId,
        reason: rejectReason.trim(),
      });
      setProcessingId(null);
      setShowRejectInput(false);
      setRejectReason("");
      if (res.error) {
        alert(res.error);
      } else {
        advanceDrawerDoc(1);
        router.refresh();
      }
    });
  };

  const advanceDrawerDoc = (direction: number) => {
    if (!drawerStudent) return;
    const applicableDocs = drawerStudent.docs.filter((d) => d.applicable);
    const currentIndex = applicableDocs.findIndex((d) => d.requirementId === activeDrawerDoc?.requirementId);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < applicableDocs.length) {
      setDrawerDocReqId(applicableDocs[nextIndex].requirementId);
      setShowRejectInput(false);
      setRejectReason("");
    }
  };

  // Dépôt de fichier cellule
  const handleDepositSubmit = async () => {
    if (!depositModal || !depositFile) return;
    setDepositSubmitting(true);

    try {
      const compressed = await compressImageClient(depositFile);
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("studentId", depositModal.student.id);
      fd.append("requirementId", depositModal.req.id);

      const res = await uploadStudentDocumentDirectAction(fd);
      setDepositSubmitting(false);
      setDepositModal(null);
      setDepositFile(null);

      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setDepositSubmitting(false);
      alert("Erreur lors de l'envoi du fichier.");
    }
  };

  // Dépôt depuis le tiroir
  const handleDrawerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !drawerStudent || !activeDrawerDoc) return;

    setSignedDocLoading(true);
    try {
      const compressed = await compressImageClient(file);
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("studentId", drawerStudent.id);
      fd.append("requirementId", activeDrawerDoc.requirementId);

      const res = await uploadStudentDocumentDirectAction(fd);
      setSignedDocLoading(false);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setSignedDocLoading(false);
      alert("Erreur lors de l'envoi.");
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ── CARTES DE COMPTEURS EN HAUT (Format compact & élégant) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("todo")}
          className={`rounded-xl p-3 border text-left transition-all relative overflow-hidden ${
            activeTab === "todo"
              ? "bg-amber-50/80 border-amber-300 ring-1.5 ring-amber-400 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl font-display font-bold text-slate-900 tracking-tight">{counts.todo}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/80 text-amber-700">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-800">À traiter</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">Admission non tranchée</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("missing_docs")}
          className={`rounded-xl p-3 border text-left transition-all relative overflow-hidden ${
            activeTab === "missing_docs"
              ? "bg-orange-50/80 border-orange-300 ring-1.5 ring-orange-400 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl font-display font-bold text-slate-900 tracking-tight">{counts.missing_docs}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100/80 text-orange-700">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-800">Pièces manquantes</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">Admis, dossier incomplet</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compliant")}
          className={`rounded-xl p-3 border text-left transition-all relative overflow-hidden ${
            activeTab === "compliant"
              ? "bg-emerald-50/80 border-emerald-300 ring-1.5 ring-emerald-400 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl font-display font-bold text-slate-900 tracking-tight">{counts.compliant}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/80 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-800">Complets</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">Admis et dossier conforme</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-xl p-3 border text-left transition-all relative overflow-hidden ${
            activeTab === "all"
              ? "bg-slate-100/90 border-slate-300 ring-1.5 ring-slate-400 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl font-display font-bold text-slate-900 tracking-tight">{counts.all}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-800">Tous</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">Vue globale école</p>
        </button>
      </div>

      {/* ── BARRE D'OUTILS ET FILTRES ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher élève, parent, téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="py-2 pl-3 pr-8 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="ALL">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cycle})
              </option>
            ))}
          </select>

          {missingPieceFilter && (
            <button
              type="button"
              onClick={() => setMissingPieceFilter(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              title="Réinitialiser le filtre de pièce"
            >
              <span>Filtre pièce actif</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <Link
            href="/dashboard/settings/documents"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
          >
            <span>Configurer les pièces</span>
          </Link>
        </div>
      </div>

      {/* ── BARRE D'ACTIONS GROUPÉES FLOTTANTE ── */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 text-white shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3 pl-2">
            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium">
              élève{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={processingId === "BULK"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {processingId === "BULK" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              <span>Valider l&apos;admission</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkRegModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-semibold transition-all"
            >
              <Hourglass className="h-3.5 w-3.5 text-amber-400" />
              <span>Mettre en régularisation</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-semibold transition-all"
            >
              <UploadCloud className="h-3.5 w-3.5 text-sky-400" />
              <span>Déposer la même pièce</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Désélectionner tout"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── TABLEAU MATRICE DESKTOP (>= 768px) ── */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Search}
              title="Aucun dossier trouvé"
              description="Aucun élève ne correspond aux critères de recherche actuels."
            />
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-semibold text-[10px] h-8">
                  {/* Pinned 1: Élève */}
                  <th className="sticky left-0 z-20 bg-slate-50 py-1 pl-3 pr-2 min-w-[150px] max-w-[170px] uppercase tracking-wider shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] border-r border-slate-200">
                    Élève
                  </th>

                  {/* Pinned 2: Classe */}
                  <th className="sticky left-[150px] z-20 bg-slate-50 py-1 px-2 min-w-[70px] max-w-[80px] uppercase tracking-wider shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-slate-200">
                    Classe
                  </th>

                  {/* Colonnes de pièces dédoublonnées (Matrice dynamique ajustée) */}
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className="py-1 px-1 text-center min-w-[85px] max-w-[110px] border-l border-slate-100 group/th relative align-middle select-none normal-case tracking-normal"
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center justify-center gap-1 w-full">
                          <span
                            className="font-semibold text-slate-800 text-[11px] leading-tight text-center break-words"
                            title={col.label}
                          >
                            {col.shortLabel || col.label}
                          </span>
                          {col.source === "OFFICIEL" ? (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"
                              title="Pièce réglementaire officielle"
                            />
                          ) : (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"
                              title="Pièce établissement"
                            />
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-normal leading-none">
                          {col.source === "OFFICIEL" ? "officiel" : "école"}
                        </span>
                      </div>

                      {/* Bouton de menu rapide sur l'en-tête */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setColumnMenuReqId(columnMenuReqId === col.key ? null : col.key);
                        }}
                        className="opacity-0 group-hover/th:opacity-100 absolute top-0.5 right-0.5 p-0.5 text-slate-400 hover:text-slate-700 transition-opacity rounded hover:bg-slate-100"
                        title="Options pour cette pièce"
                      >
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>

                      {/* Menu déroulant de colonne */}
                      {columnMenuReqId === col.key && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 w-52 rounded-xl bg-white border border-slate-200 p-1.5 shadow-xl text-left normal-case"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-2 py-1 text-[10px] font-semibold text-slate-800 border-b border-slate-100 mb-1">
                            {col.label}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMissingPieceFilter(col.key);
                              setColumnMenuReqId(null);
                            }}
                            className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
                          >
                            <Filter className="h-3 w-3 text-amber-600" />
                            <span>Filtrer les manquants</span>
                          </button>
                        </div>
                      )}
                    </th>
                  ))}

                  {/* Pinned Right: Progression & Statut Admission */}
                  <th className="sticky right-0 z-20 bg-slate-50 py-1 pl-1.5 pr-2.5 text-right min-w-[130px] max-w-[150px] uppercase tracking-wider shadow-[-6px_0_8px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                    Progression & Statut
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredList.map((student) => {
                  const isProcessing = processingId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="group transition-colors h-8 hover:bg-slate-50/70"
                    >
                      {/* Pinned 1: Élève (Nom + Âge compact, sans avatar) */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 py-0.5 pl-3 pr-2 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100">
                        <div className="min-w-0 flex items-center gap-1.5 truncate">
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="font-medium text-slate-900 hover:text-primary transition-colors text-xs truncate max-w-[115px]"
                            title={`${student.firstName} ${student.lastName}`}
                          >
                            {student.firstName} {student.lastName}
                          </Link>
                          <span className="text-[10px] text-slate-300 shrink-0">·</span>
                          <span
                            className={`text-[10px] shrink-0 ${
                              student.formattedAge === "Âge inconnu"
                                ? "text-amber-700 font-medium bg-amber-50 px-1 rounded"
                                : "text-slate-500"
                            }`}
                          >
                            {student.formattedAge}
                          </span>
                        </div>
                      </td>

                      {/* Pinned 2: Classe */}
                      <td className="sticky left-[150px] z-10 bg-white group-hover:bg-slate-50/70 py-0.5 px-2 align-middle shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-slate-100">
                        {student.className ? (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 text-[10px] whitespace-nowrap leading-none">
                            {student.className}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 text-[10px] border border-amber-200 whitespace-nowrap leading-none">
                            Non assignée
                          </span>
                        )}
                      </td>

                      {/* Cellules de la Matrice (Format ultra-compact Google Sheets) */}
                      {visibleColumns.map((col) => {
                        const doc = student.docs.find((d) => {
                          if (col.reqIds.includes(d.requirementId)) return true;
                          const dNorm = (d.shortLabel || d.label)
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .trim();
                          return dNorm === col.key;
                        });
                        const status = doc?.status || "MANQUANT";

                        // État 1 : NON_APPLICABLE
                        if (!doc?.applicable || status === "NON_APPLICABLE") {
                          return (
                            <td
                              key={col.key}
                              className="py-0.5 px-1 text-center align-middle border-l border-slate-100 bg-slate-50/20"
                            >
                              <span
                                className="inline-flex items-center text-[10px] text-slate-400 font-normal px-1 rounded select-none cursor-default"
                                title={doc?.nonApplicableReason || `Non exigé en cycle ${student.cycle || ""}`}
                              >
                                Non exigé
                              </span>
                            </td>
                          );
                        }

                        // État 2 : CONFORME (Validé)
                        if (status === "CONFORME") {
                          return (
                            <td
                              key={col.key}
                              className="py-0.5 px-1 text-center align-middle border-l border-slate-100"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerStudent(student);
                                  setDrawerDocReqId(doc.requirementId);
                                }}
                                className="inline-flex items-center justify-center h-5 w-5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer mx-auto"
                                title={doc?.fileName ? `Conforme (${doc.fileName})` : "Pièce validée"}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </button>
                            </td>
                          );
                        }

                        // État 3 : FOURNI (À vérifier)
                        if (status === "FOURNI") {
                          return (
                            <td
                              key={col.key}
                              className="py-0.5 px-1 text-center align-middle border-l border-slate-100"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerStudent(student);
                                  setDrawerDocReqId(doc.requirementId);
                                }}
                                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-medium transition-all cursor-pointer mx-auto"
                                title="Fichier reçu — Cliquer pour contrôler"
                              >
                                <FileText className="h-3 w-3 text-sky-600" />
                                <span>À vérifier</span>
                              </button>
                            </td>
                          );
                        }

                        // État 4 : EN_REGULARISATION
                        if (status === "EN_REGULARISATION") {
                          return (
                            <td
                              key={col.key}
                              className="py-0.5 px-1 text-center align-middle border-l border-slate-100"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setRegularisationModal({
                                    student,
                                    reqId: doc.requirementId,
                                    reqLabel: col.label,
                                  });
                                  setRegularisationNote(doc?.note || "");
                                }}
                                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-medium transition-all cursor-pointer mx-auto"
                                title={`Démarche en cours${doc?.note ? ` : ${doc.note}` : ""}`}
                              >
                                <Hourglass className="h-2.5 w-2.5 text-amber-600 animate-spin-slow" />
                                <span>En cours</span>
                              </button>
                            </td>
                          );
                        }

                        // État 5 : NON_CONFORME (Refusé)
                        if (status === "NON_CONFORME") {
                          return (
                            <td
                              key={col.key}
                              className="py-0.5 px-1 text-center align-middle border-l border-slate-100"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerStudent(student);
                                  setDrawerDocReqId(doc.requirementId);
                                }}
                                className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-medium transition-all cursor-pointer mx-auto"
                                title={`Refusé : ${doc?.note || "Document non conforme"}`}
                              >
                                <XCircle className="h-3 w-3 text-rose-600" />
                                <span>Refusé</span>
                              </button>
                            </td>
                          );
                        }

                        // État 6 : MANQUANT (Bouton + compact)
                        return (
                          <td
                            key={col.key}
                            className="py-0.5 px-1 text-center align-middle border-l border-slate-100"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setDepositModal({
                                  student,
                                  req: {
                                    id: doc?.requirementId || col.sampleReq.id,
                                    label: col.label,
                                    shortLabel: col.shortLabel,
                                    category: col.category,
                                    cycle: doc?.cycle || col.sampleReq.cycle,
                                    source: col.source,
                                    required: doc?.required ?? col.sampleReq.required,
                                    pinned: doc?.pinned ?? col.sampleReq.pinned,
                                    order: doc?.order ?? col.sampleReq.order,
                                    conditional: col.sampleReq.conditional,
                                  },
                                });
                              }}
                              className="inline-flex items-center justify-center h-5 w-5 rounded bg-slate-100 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all mx-auto"
                              title={`Déposer ${col.label}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </td>
                        );
                      })}

                      {/* Pinned Right: Progression & Statut Admission (Compact) */}
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50/70 py-0.5 pl-1.5 pr-2.5 align-middle text-right shadow-[-6px_0_8px_-2px_rgba(0,0,0,0.06)] border-l border-slate-100">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-600 tabular-nums">
                            {student.completeness.compliantCount}/{student.completeness.totalRequired}
                          </span>

                          {student.status === "PENDING" ? (
                            student.completeness.isCompliant ? (
                              <button
                                type="button"
                                onClick={() => handleApproveClick(student)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-2xs transition-all bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer whitespace-nowrap h-6"
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3 w-3" />
                                )}
                                <span>Admettre</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-2xs transition-all bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 whitespace-nowrap h-6"
                                title={`Dossier incomplet : ${student.completeness.missingCount} pièce(s) manquante(s)`}
                              >
                                <UserCheck className="h-3 w-3" />
                                <span>Admettre</span>
                              </button>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 h-5">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              <span>Inscrit</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── AFFICHAGE MOBILE & TABLETTE (< 768px) EN CARTES ── */}
      <div className="md:hidden space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200">
            <EmptyState
              icon={Search}
              title="Aucun dossier trouvé"
              description="Aucun dossier ne correspond à vos filtres."
            />
          </div>
        ) : (
          filteredList.map((student) => {
            const applicableDocs = student.docs.filter((d) => d.applicable);

            return (
              <div
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
              >
                {/* En-tête de carte */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 text-sm">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {student.firstName} {student.lastName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {student.className || "Sans classe"}
                        </span>
                        <span>·</span>
                        <span>{student.formattedAge}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      student.status === "PENDING"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {student.status === "PENDING" ? "À traiter" : "Inscrit"}
                  </span>
                </div>

                {/* Tuteur & Contact rapide */}
                {student.parent?.phone ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-700 truncate">
                      {student.parent.firstName} {student.parent.lastName}
                    </span>
                    <div className="flex items-center gap-3">
                      <a
                        href={`tel:${student.parent.phone}`}
                        className="inline-flex items-center gap-1 text-primary font-semibold min-h-[44px] min-w-[44px] justify-center"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`https://wa.me/${student.parent.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 font-semibold min-h-[44px] min-w-[44px] justify-center"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditParentStudent(student);
                      setParentFormData({ firstName: "", lastName: "", phone: "" });
                    }}
                    className="w-full text-left p-2 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-800 font-medium flex items-center justify-between"
                  >
                    <span>Tuteur non renseigné</span>
                    <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                  </button>
                )}

                {/* Ligne des pastilles de pièces applicables */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Pièces du dossier</span>
                    <span>
                      {student.completeness.compliantCount} / {student.completeness.totalRequired} conformes
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {applicableDocs.map((doc) => {
                      let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
                      let icon = <Plus className="h-3 w-3" />;

                      if (doc.status === "CONFORME") {
                        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        icon = <Check className="h-3 w-3 text-emerald-600" />;
                      } else if (doc.status === "FOURNI") {
                        badgeStyle = "bg-sky-50 text-sky-700 border-sky-200";
                        icon = <FileText className="h-3 w-3 text-sky-600" />;
                      } else if (doc.status === "EN_REGULARISATION") {
                        badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                        icon = <Hourglass className="h-3 w-3 text-amber-600" />;
                      } else if (doc.status === "NON_CONFORME") {
                        badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                        icon = <X className="h-3 w-3 text-rose-600" />;
                      }

                      return (
                        <button
                          key={doc.requirementId}
                          type="button"
                          onClick={() => {
                            setDrawerStudent(student);
                            setDrawerDocReqId(doc.requirementId);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${badgeStyle}`}
                        >
                          {icon}
                          <span>{doc.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Boutons d'action principaux (Zone du pouce, min-h 44px) */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerStudent(student);
                      setDrawerDocReqId(applicableDocs[0]?.requirementId || null);
                    }}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white font-semibold text-xs transition-colors hover:bg-slate-800"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Contrôler le dossier</span>
                  </button>

                  {student.status === "PENDING" && (
                    student.completeness.isCompliant ? (
                      <button
                        type="button"
                        onClick={() => handleApproveClick(student)}
                        disabled={processingId === student.id}
                        className="min-h-[44px] px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Admettre</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="min-h-[44px] px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-semibold text-xs cursor-not-allowed opacity-60"
                        title={`Dossier incomplet : ${student.completeness.missingCount} pièce(s) manquante(s)`}
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Incomplet</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── PANNEAU LATÉRAL (POSTE DE TRAVAIL DE REVUE) ── */}
      {drawerStudent && activeDrawerDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête du panneau */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary text-base">
                  {drawerStudent.firstName[0]}
                  {drawerStudent.lastName[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {drawerStudent.firstName} {drawerStudent.lastName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Classe : <span className="font-semibold text-slate-700">{drawerStudent.className || "Sans classe"}</span> · Âge : {drawerStudent.formattedAge}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Onglets des pièces applicables pour cet élève */}
            <div className="flex overflow-x-auto gap-1.5 p-3 border-b border-slate-100 bg-white">
              {drawerStudent.docs
                .filter((d) => d.applicable)
                .map((doc, idx) => {
                  const isActive = doc.requirementId === activeDrawerDoc.requirementId;
                  return (
                    <button
                      key={doc.requirementId}
                      type="button"
                      onClick={() => {
                        setDrawerDocReqId(doc.requirementId);
                        setShowRejectInput(false);
                        setRejectReason("");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{idx + 1}. {doc.shortLabel}</span>
                      {doc.status === "CONFORME" && <Check className="h-3 w-3 text-emerald-400" />}
                      {doc.status === "FOURNI" && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
                      {doc.status === "EN_REGULARISATION" && <Hourglass className="h-3 w-3 text-amber-400" />}
                      {doc.status === "NON_CONFORME" && <X className="h-3 w-3 text-rose-400" />}
                    </button>
                  );
                })}
            </div>

            {/* Corps du panneau (Aperçu & Détails) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Carte Info Pièce */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {activeDrawerDoc.category} · {activeDrawerDoc.source === "OFFICIEL" ? "Réglementaire" : "Établissement"}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      activeDrawerDoc.status === "CONFORME"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : activeDrawerDoc.status === "FOURNI"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : activeDrawerDoc.status === "EN_REGULARISATION"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : activeDrawerDoc.status === "NON_CONFORME"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {activeDrawerDoc.status === "CONFORME"
                      ? "Conforme"
                      : activeDrawerDoc.status === "FOURNI"
                      ? "À vérifier"
                      : activeDrawerDoc.status === "EN_REGULARISATION"
                      ? "En régularisation"
                      : activeDrawerDoc.status === "NON_CONFORME"
                      ? "Non conforme"
                      : "Manquant"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{activeDrawerDoc.label}</h3>

                {activeDrawerDoc.note && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mt-2">
                    <p className="font-semibold">Observation :</p>
                    <p className="mt-0.5">{activeDrawerDoc.note}</p>
                  </div>
                )}
              </div>

              {/* Zone d'aperçu du document */}
              <div className="rounded-2xl border border-slate-200 bg-slate-100 min-h-[260px] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {signedDocLoading ? (
                  <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Chargement du document...</span>
                  </div>
                ) : signedDocUrl ? (
                  signedDocUrl.toLowerCase().includes(".pdf") ? (
                    <iframe src={signedDocUrl} className="w-full h-80 rounded-xl border border-slate-200" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signedDocUrl}
                      alt={activeDrawerDoc.label}
                      className="max-h-80 max-w-full rounded-xl object-contain shadow-sm"
                    />
                  )
                ) : activeDrawerDoc.status === "EN_REGULARISATION" ? (
                  <div className="text-center p-6 space-y-2">
                    <Hourglass className="h-10 w-10 text-amber-600 mx-auto animate-spin-slow" />
                    <p className="text-xs font-semibold text-slate-800">Démarche en cours auprès de l&apos;état civil</p>
                    <p className="text-[11px] text-slate-500">Aucun fichier joint — justificatif en attente</p>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <FolderOpen className="h-10 w-10 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Aucun document déposé</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cette pièce est manquante au dossier de cet élève.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Saisie de motif de refus si activé */}
              {showRejectInput && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      <span>Motif du refus (obligatoire)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="text-xs text-rose-700 hover:underline"
                    >
                      Annuler
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Ex. : Document illisible, extrait non certifié, date coupée..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-rose-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                  />
                  <button
                    type="button"
                    onClick={handleDrawerReject}
                    disabled={!rejectReason.trim() || processingId === activeDrawerDoc.requirementId}
                    className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Confirmer le refus & notifier
                  </button>
                </div>
              )}
            </div>

            {/* Pied du panneau : Contrôles de validation & Navigation */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Boutons d'action principaux */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDrawerValidate}
                  disabled={processingId === activeDrawerDoc.requirementId}
                  className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Conforme</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  className="min-h-[44px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  <span>Non conforme</span>
                </button>
              </div>

              {/* Remplacer le document & Navigation pièce précédente / suivante */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => drawerFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-primary transition-colors py-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Remplacer le document</span>
                </button>
                <input
                  ref={drawerFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,application/pdf"
                  onChange={handleDrawerFileUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => advanceDrawerDoc(-1)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Pièce précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceDrawerDoc(1)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Pièce suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE DÉPÔT CELLULE MANQUANT ── */}
      {depositModal && (
        <Modal
          open={true}
          onClose={() => {
            setDepositModal(null);
            setDepositFile(null);
          }}
          title={`Déposer ${depositModal.req.label}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Élève : <span className="font-semibold text-slate-800">{depositModal.student.firstName} {depositModal.student.lastName}</span>
            </p>

            {/* Menu 3 entrées */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => directFileInputRef.current?.click()}
                className="w-full min-h-[44px] p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 text-left transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Choisir un fichier</p>
                  <p className="text-[11px] text-slate-500">PDF, JPG, PNG (max. 10 Mo)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full min-h-[44px] p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 text-left transition-colors sm:hidden"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Prendre une photo</p>
                  <p className="text-[11px] text-slate-500">Recadrage et compression automatiques</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const s = depositModal.student;
                  const req = depositModal.req;
                  setDepositModal(null);
                  setRegularisationModal({
                    student: s,
                    reqId: req.id,
                    reqLabel: req.label,
                  });
                }}
                className="w-full min-h-[44px] p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 flex items-center gap-3 text-left transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <Hourglass className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-900">Marquer en régularisation</p>
                  <p className="text-[11px] text-amber-700">Démarche en cours (état civil, jugement supplétif)</p>
                </div>
              </button>
            </div>

            {/* Inputs cachés */}
            <input
              ref={directFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setDepositFile(f);
              }}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setDepositFile(f);
              }}
              className="hidden"
            />

            {depositFile && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 truncate">{depositFile.name}</span>
                <button
                  type="button"
                  onClick={handleDepositSubmit}
                  disabled={depositSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {depositSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Envoyer"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── MODALE RÉGULARISATION CELLULE ── */}
      {regularisationModal && (
        <Modal
          open={true}
          onClose={() => setRegularisationModal(null)}
          title="Mise en régularisation"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Pièce : <span className="font-semibold text-slate-800">{regularisationModal.reqLabel}</span> pour{" "}
              <span className="font-semibold text-slate-800">
                {regularisationModal.student.firstName} {regularisationModal.student.lastName}
              </span>
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Note d&apos;observation (optionnelle)
              </label>
              <textarea
                rows={3}
                placeholder="Ex. : Jugement supplétif en cours au tribunal d'instance..."
                value={regularisationNote}
                onChange={(e) => setRegularisationNote(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegularisationModal(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    const res = await markDocumentRegularisationAction({
                      studentId: regularisationModal.student.id,
                      requirementId: regularisationModal.reqId,
                      note: regularisationNote,
                    });
                    setRegularisationModal(null);
                    if (res.error) alert(res.error);
                    else router.refresh();
                  });
                }}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODALE MISE EN RÉGULARISATION GROUPÉE ── */}
      {bulkRegModal && (
        <Modal
          open={true}
          onClose={() => setBulkRegModal(false)}
          title="Mise en régularisation groupée"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Appliquer à <span className="font-bold text-slate-900">{selectedIds.size}</span> élève{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pièce concernée</label>
              <select
                value={bulkRegReqId}
                onChange={(e) => setBulkRegReqId(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                {requirementDefs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Observation commune</label>
              <input
                type="text"
                placeholder="Ex. : Démarche collective en cours"
                value={bulkRegNote}
                onChange={(e) => setBulkRegNote(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkRegModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    const res = await bulkMarkRegularisationAction(
                      Array.from(selectedIds),
                      bulkRegReqId,
                      bulkRegNote
                    );
                    setBulkRegModal(false);
                    if (res.error) alert(res.error);
                    else router.refresh();
                  });
                }}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                Appliquer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODALE DÉPÔT GROUPÉ ── */}
      {bulkUploadModal && (
        <Modal
          open={true}
          onClose={() => {
            setBulkUploadModal(false);
            setBulkUploadFile(null);
          }}
          title="Déposer la même pièce pour la sélection"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Associer ce document aux <span className="font-bold text-slate-900">{selectedIds.size}</span> élèves sélectionnés.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pièce exigée</label>
              <select
                value={bulkUploadReqId}
                onChange={(e) => setBulkUploadReqId(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                {requirementDefs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Fichier (PDF, JPG, PNG)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,application/pdf"
                onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBulkUploadModal(false);
                  setBulkUploadFile(null);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!bulkUploadFile}
                onClick={async () => {
                  if (!bulkUploadFile) return;
                  const compressed = await compressImageClient(bulkUploadFile);
                  const fd = new FormData();
                  fd.append("file", compressed);
                  fd.append("requirementId", bulkUploadReqId);
                  fd.append("studentIds", JSON.stringify(Array.from(selectedIds)));

                  startTransition(async () => {
                    const res = await bulkUploadStudentDocumentAction(fd);
                    setBulkUploadModal(false);
                    setBulkUploadFile(null);
                    if (res.error) alert(res.error);
                    else router.refresh();
                  });
                }}
                className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50"
              >
                Téléverser pour la sélection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODALE CONFIRMATION ADMISSION INCOMPLÈTE ── */}
      {confirmAdmissionStudent && (
        <Modal
          open={true}
          onClose={() => setConfirmAdmissionStudent(null)}
          title="Confirmer la validation de l'admission"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                <span>Dossier administratif incomplet</span>
              </p>
              <p>
                Ce dossier comporte <strong>{confirmAdmissionStudent.missingCount} pièce(s) manquante(s)</strong> ou non conformes. L&apos;admission de{" "}
                <strong>
                  {confirmAdmissionStudent.student.firstName} {confirmAdmissionStudent.student.lastName}
                </strong>{" "}
                sera validée, mais les pièces resteront à régulariser auprès de la famille.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAdmissionStudent(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => executeApprove(confirmAdmissionStudent.student.id)}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
              >
                Confirmer l&apos;admission
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODALE CONFIRMATION ADMISSION GROUPÉE INCOMPLÈTE ── */}
      {confirmBulkAdmission && (
        <Modal
          open={true}
          onClose={() => setConfirmBulkAdmission(null)}
          title="Validation des admissions groupées"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                <span>Dossiers incomplets détectés</span>
              </p>
              <p>
                Parmi les <strong>{confirmBulkAdmission.students.length}</strong> dossiers sélectionnés,{" "}
                <strong>{confirmBulkAdmission.incompleteCount}</strong> ont des pièces manquantes.
                Les admissions seront validées, et les pièces resteront ouvertes à régularisation.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBulkAdmission(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeBulkApprove}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                Valider les {confirmBulkAdmission.students.length} admissions
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODALE ÉDITION TUTEUR RAPIDE ── */}
      {editParentStudent && (
        <Modal
          open={true}
          onClose={() => setEditParentStudent(null)}
          title="Coordonnées du Parent / Tuteur"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Élève : <span className="font-bold text-slate-900">{editParentStudent.firstName} {editParentStudent.lastName}</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prénom</label>
                <input
                  type="text"
                  placeholder="Ex. : Ousmane"
                  value={parentFormData.firstName}
                  onChange={(e) => setParentFormData({ ...parentFormData, firstName: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom</label>
                <input
                  type="text"
                  placeholder="Ex. : Diop"
                  value={parentFormData.lastName}
                  onChange={(e) => setParentFormData({ ...parentFormData, lastName: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone (avec WhatsApp)</label>
              <input
                type="tel"
                placeholder="Ex. : +221 77 123 45 67"
                value={parentFormData.phone}
                onChange={(e) => setParentFormData({ ...parentFormData, phone: e.target.value })}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditParentStudent(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    const res = await updateStudentParentDirectAction({
                      studentId: editParentStudent.id,
                      firstName: parentFormData.firstName,
                      lastName: parentFormData.lastName,
                      phone: parentFormData.phone,
                    });
                    setEditParentStudent(null);
                    if (res.error) alert(res.error);
                    else router.refresh();
                  });
                }}
                className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
