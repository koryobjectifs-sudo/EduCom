"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
// @ts-ignore
import readXlsxFile from "read-excel-file/browser";
import {
  School,
  Users,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  initSchoolPedagogyAction,
  importStudentsWizardAction,
  inviteTeachersWizardAction,
  type WizardStudentRow,
  type WizardImportResult,
} from "./actions";
import { SCHOOL_TYPE_CLASSES, type SchoolTypeOption } from "@/lib/pedagogy-types";

interface WizardClientProps {
  schoolName: string;
  currentYear: string;
  initialStep?: number;
}

type ClassDraft = {
  name: string;
  cycle: "MATERNELLE" | "ELEMENTAIRE" | "COLLEGE" | "LYCEE";
  checked: boolean;
};

export default function WizardClient({ schoolName, currentYear, initialStep = 1 }: WizardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<number>(initialStep);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── ÉCRAN 1 : ÉCOLE & CLASSES ──
  const [selectedType, setSelectedType] = useState<SchoolTypeOption>("PRIMAIRE");
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [classesList, setClassesList] = useState<ClassDraft[]>(
    SCHOOL_TYPE_CLASSES.PRIMAIRE.map((c) => ({ ...c, checked: true }))
  );
  const [newClassName, setNewClassName] = useState("");
  const [setupResult, setSetupResult] = useState<any>(null);

  const handleTypeSelect = (type: SchoolTypeOption) => {
    setSelectedType(type);
    setClassesList(SCHOOL_TYPE_CLASSES[type].map((c) => ({ ...c, checked: true })));
  };

  const toggleClass = (index: number) => {
    setClassesList((prev) =>
      prev.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c))
    );
  };

  const addCustomClass = () => {
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    const defaultCycle =
      selectedType === "MATERNELLE"
        ? "MATERNELLE"
        : selectedType === "COLLEGE"
        ? "COLLEGE"
        : selectedType === "LYCEE"
        ? "LYCEE"
        : "ELEMENTAIRE";

    setClassesList((prev) => [...prev, { name: trimmed, cycle: defaultCycle, checked: true }]);
    setNewClassName("");
  };

  const removeClass = (index: number) => {
    setClassesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStep1Submit = async () => {
    const activeClasses = classesList.filter((c) => c.checked);
    if (activeClasses.length === 0) {
      setErrorMessage("Veuillez sélectionner au moins une classe pour votre établissement.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const res = await initSchoolPedagogyAction({
      classes: activeClasses.map((c) => ({ name: c.name, cycle: c.cycle })),
      academicYear,
    });

    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setSetupResult(res.data);
      setStep(2);
    }
  };

  // ── ÉCRAN 2 : IMPORT ÉLÈVES ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rawRows, setRawRows] = useState<WizardStudentRow[]>([]);
  const [importPreview, setImportPreview] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [importResult, setImportResult] = useState<WizardImportResult | null>(null);
  const [importedTotal, setImportedTotal] = useState(0);

  const normalizeHeader = (h: string): string => {
    const s = h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (s.includes("tel") || s.includes("phone") || s.includes("mobile") || s.includes("cel") || s.includes("portable") || s.includes("contact")) {
      return "guardianPhone";
    }
    if (s.includes("lien") || s.includes("relation") || s.includes("parente")) {
      return "guardianRelation";
    }
    if (s.includes("tuteur") || s.includes("parent") || s.includes("pere") || s.includes("mere") || s.includes("responsable") || s.includes("representant")) {
      return "guardianName";
    }
    if (s.includes("date") || s.includes("naissance") || s.includes("dob") || s.includes("ne(e)") || s.includes("anniversaire")) {
      return "dateOfBirth";
    }
    if (s.includes("sexe") || s.includes("genre")) {
      return "gender";
    }
    if (s.includes("classe") || s.includes("niveau") || s.includes("division")) {
      return "className";
    }
    if (s.includes("prenom")) return "firstName";
    if (s.includes("nom")) return "lastName";
    if (s.includes("matricule") || s.includes("identifiant")) return "matricule";
    return s;
  };

  const parseFile = async (file: File) => {
    setErrorMessage(null);
    setRawRows([]);
    setImportPreview(null);

    const isCsv = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      setErrorMessage("Format non supporté. Veuillez utiliser un fichier .xlsx, .xls ou .csv");
      return;
    }

    try {
      if (isCsv) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: normalizeHeader,
          complete: (results) => {
            const rows = results.data as WizardStudentRow[];
            processParsedRows(rows);
          },
        });
      } else {
        const rows: any = await readXlsxFile(file);
        if (!rows || rows.length < 2) {
          setErrorMessage("Le fichier Excel ne contient pas de données.");
          return;
        }
        const headers = rows[0].map((h: any) => normalizeHeader(String(h || "")));
        const dataRows: WizardStudentRow[] = [];

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const obj: any = {};
          headers.forEach((hdr: string, idx: number) => {
            if (hdr) obj[hdr] = r[idx] ? String(r[idx]) : undefined;
          });
          if (obj.firstName || obj.lastName) {
            dataRows.push(obj as WizardStudentRow);
          }
        }
        processParsedRows(dataRows);
      }
    } catch (err) {
      setErrorMessage("Impossible de lire ce fichier.");
    }
  };

  const processParsedRows = (rows: WizardStudentRow[]) => {
    const valid = rows.filter((r) => r.firstName?.trim() && r.lastName?.trim());
    setRawRows(rows);
    setImportPreview({
      total: rows.length,
      valid: valid.length,
      invalid: rows.length - valid.length,
    });
  };

  const handleImportSubmit = async () => {
    if (!rawRows || rawRows.length === 0) return;
    setLoading(true);
    setErrorMessage(null);

    const res = await importStudentsWizardAction(rawRows);
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setImportResult(res.data);
      setImportedTotal(res.data.importedCount);
      setStep(3);
    }
  };

  const downloadErrorFile = () => {
    if (!importResult || importResult.errors.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Ligne,Nom,Erreur", ...importResult.errors.map((e) => `"${e.row}","${e.name}","${e.reason}"`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "erreurs_import_eleves.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcelTemplate = () => {
    const activeClassNames = classesList.filter((c) => c.checked).map((c) => c.name);
    const sampleClasses = activeClassNames.length > 0 ? activeClassNames.join(" / ") : "CI / CP / CE1";
    const headers = [
      "Prenom",
      "Nom",
      "Date de naissance (JJ/MM/AAAA)",
      "Sexe (M/F)",
      "Classe (" + sampleClasses + ")",
      "Nom du tuteur",
      "Telephone tuteur (Ex: 771234567)",
      "Lien (Pere/Mere/Tuteur)",
    ];
    const sampleRow = ["Moussa", "Diallo", "12/04/2014", "M", activeClassNames[0] || "CI", "Amadou Diallo", "771234567", "Pere"];

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(";"), sampleRow.join(";")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modele_import_eleves_educom.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── ÉCRAN 3 : INVITATION ENSEIGNANTS ──
  const [teacherRawInput, setTeacherRawInput] = useState("");
  const [selectedClassForTeachers, setSelectedClassForTeachers] = useState<string>("ALL");
  const [invitedTeachersCount, setInvitedTeachersCount] = useState(0);

  const handleTeachersSubmit = async () => {
    const lines = teacherRawInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setStep(4);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const activeClasses = classesList.filter((c) => c.checked);
    const classIdsToAssign =
      selectedClassForTeachers === "ALL"
        ? [] // All or unassigned
        : [selectedClassForTeachers];

    const invites = lines.map((identifier) => ({
      identifier,
      classIds: classIdsToAssign,
    }));

    const res = await inviteTeachersWizardAction(invites);
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setInvitedTeachersCount(res.count || lines.length);
      setStep(4);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 mt-4">
      {/* ── BARRE DE PROGRESSION DU PARCOURS ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span className={step >= 1 ? "text-primary font-bold" : ""}>1. Votre école</span>
          <span className={step >= 2 ? "text-primary font-bold" : ""}>2. Vos élèves</span>
          <span className={step >= 3 ? "text-primary font-bold" : ""}>3. Vos enseignants</span>
          <span className={step >= 4 ? "text-emerald-600 font-bold" : ""}>Terminé</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Attention</p>
            <p className="mt-0.5 text-xs text-red-600">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ÉCRAN 1 : VOTRE ÉCOLE (~30 secondes)
      ══════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <School className="h-3.5 w-3.5" />
              <span>Étape 1 sur 3 · Rapide</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Configurez votre établissement
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Sélectionnez votre type d&apos;école. EduCom prépare automatiquement les classes, les matières et le calendrier officiel sénégalais.
            </p>
          </div>

          {/* Type d'établissement */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Type d&apos;établissement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: "PRIMAIRE", label: "Primaire", desc: "CI à CM2" },
                { id: "MATERNELLE_PRIMAIRE", label: "Maternelle + Primaire", desc: "PS à CM2" },
                { id: "MATERNELLE", label: "Maternelle seule", desc: "PS, MS, GS" },
                { id: "COLLEGE", label: "Collège", desc: "6ème à 3ème" },
                { id: "LYCEE", label: "Lycée", desc: "2nde à Tle" },
              ].map((t) => {
                const isSel = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeSelect(t.id as SchoolTypeOption)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      isSel
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <p className={`text-xs sm:text-sm font-semibold ${isSel ? "text-primary font-bold" : "text-slate-900"}`}>
                      {t.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classes pré-cochées */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Classes de votre école ({classesList.filter((c) => c.checked).length} sélectionnée(s))
              </label>
              <span className="text-xs text-slate-400">Décochez ou ajoutez une division</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {classesList.map((cls, idx) => (
                <div
                  key={cls.name + idx}
                  onClick={() => toggleClass(idx)}
                  className={`flex items-center justify-between rounded-lg border p-2.5 px-3 text-xs font-medium cursor-pointer transition-colors ${
                    cls.checked
                      ? "border-emerald-300 bg-emerald-50/40 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-400 line-through"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cls.checked}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold">{cls.name}</span>
                  </div>
                  {classesList.length > 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClass(idx);
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Ajouter une division */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Ex: CM2 B, CP 2, 6ème B..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomClass();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <button
                type="button"
                onClick={addCustomClass}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>

          {/* Année scolaire */}
          <div className="pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Année scolaire
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="mt-1.5 w-full sm:w-48 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Les matières et les trimestres seront générés automatiquement.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleStep1Submit}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <span>Continuer</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ÉCRAN 2 : VOS ÉLÈVES (~2 minutes, sautable)
      ══════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 mb-3 border border-emerald-200">
                <Users className="h-3.5 w-3.5" />
                <span>Étape 2 sur 3 · Sautable</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Importez la liste de vos élèves
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500">
                Importez votre fichier Excel ou CSV. Les parents seront automatiquement rattachés à leurs enfants par numéro de téléphone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-4"
            >
              Passer cette étape &rarr;
            </button>
          </div>

          {/* Zone de Dépôt / Téléchargement Modèle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Fichier d&apos;élèves
              </span>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Télécharger le modèle avec vos classes</span>
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) parseFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-slate-300 hover:border-primary/60 hover:bg-slate-50/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) parseFile(e.target.files[0]);
                }}
              />
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                Glissez votre fichier ici, ou cliquez pour parcourir
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Formats acceptés : .xlsx, .xls, .csv · Détection automatique des colonnes
              </p>
            </div>
          </div>

          {/* Prévisualisation */}
          {importPreview && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">Résultat de la détection :</span>
                <span className="text-primary font-bold">{importPreview.total} lignes trouvées</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <p className="text-base font-bold text-emerald-600">{importPreview.valid}</p>
                  <p className="text-[10px] text-slate-500">Valides</p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <p className="text-base font-bold text-red-600">{importPreview.invalid}</p>
                  <p className="text-[10px] text-slate-500">Incomplètes</p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <p className="text-base font-bold text-blue-600">Partiel</p>
                  <p className="text-[10px] text-slate-500">Import sécurisé</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retour</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2"
              >
                Ajouter manuellement plus tard
              </button>
              {importPreview && importPreview.valid > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleImportSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Importation en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Importer {importPreview.valid} élèves</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ÉCRAN 3 : VOS ENSEIGNANTS (~1 minute, sautable)
      ══════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-3 border border-blue-200">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Étape 3 sur 3 · Sautable</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Invitez vos enseignants
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500">
                Collez les numéros de téléphone ou adresses email de vos enseignants pour leur donner accès à la saisie de leurs notes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-4"
            >
              Passer cette étape &rarr;
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Numéros de téléphone ou emails des enseignants
              </label>
              <textarea
                rows={4}
                placeholder="Exemple :&#10;77 123 45 67&#10;78 234 56 78&#10;prof.diop@gmail.com"
                value={teacherRawInput}
                onChange={(e) => setTeacherRawInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3.5 text-xs sm:text-sm font-mono text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Séparez les entrées par des retours à la ligne ou des virgules.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retour</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2"
              >
                Je saisirai les notes moi-même pour l&apos;instant
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleTeachersSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <span>Inviter les enseignants</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ÉCRAN FINAL : RÉCAPITULATIF & ACTIVATION
      ══════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-7">
          <div className="text-center space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Votre établissement est prêt !
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              La configuration initiale est en place. Vous pouvez commencer la saisie des notes et le suivi des élèves immédiatement.
            </p>
          </div>

          {/* Liste récapitulative */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 divide-y divide-slate-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {classesList.filter((c) => c.checked).length} classes configurées
                </span>
              </div>
              <Link href="/dashboard/students" className="text-primary hover:underline font-medium">
                Ajuster
              </Link>
            </div>

            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  Programme officiel sénégalais appliqué & coefficients posés
                </span>
              </div>
              <Link href="/dashboard/settings/pedagogie#programme" className="text-primary hover:underline font-medium">
                Voir
              </Link>
            </div>

            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  3 trimestres datés · Contrôles & Compositions planifiés
                </span>
              </div>
              <Link href="/dashboard/settings/pedagogie#calendrier" className="text-primary hover:underline font-medium">
                Calendrier
              </Link>
            </div>

            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                {importedTotal > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-slate-300 inline-block shrink-0" />
                )}
                <span className="font-semibold text-slate-800">
                  {importedTotal > 0 ? `${importedTotal} élèves importés` : "Élèves : à ajouter au fil de l'eau"}
                </span>
              </div>
              <Link href="/dashboard/students" className="text-primary hover:underline font-medium">
                Dossiers
              </Link>
            </div>

            <div className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                {invitedTeachersCount > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-slate-300 inline-block shrink-0" />
                )}
                <span className="font-semibold text-slate-800">
                  {invitedTeachersCount > 0
                    ? `${invitedTeachersCount} enseignants invités`
                    : "Enseignants : mode saisie autonome par la direction"}
                </span>
              </div>
              <Link href="/dashboard/team" className="text-primary hover:underline font-medium">
                Équipe
              </Link>
            </div>
          </div>

          {importResult && importResult.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  {importResult.errors.length} ligne(s) nécessitent une correction mineure.
                </span>
              </div>
              <button
                type="button"
                onClick={downloadErrorFile}
                className="font-semibold text-amber-900 underline hover:text-amber-950"
              >
                Télécharger le fichier des erreurs
              </button>
            </div>
          )}

          {/* Bouton vers Dashboard */}
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0E2541] px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-[#123055] active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span>Accéder au tableau de bord</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
