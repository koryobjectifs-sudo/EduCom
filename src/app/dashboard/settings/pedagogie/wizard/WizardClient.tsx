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
  Check,
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
import { splitFullName } from "@/lib/nameUtils";
import {
  normalizeRawRow,
  suggestFieldForHeader,
  FIELD_DEFINITIONS,
  levenshteinDistance,
} from "@/app/dashboard/students/import/utils";
import { SCHOOL_TYPE_CLASSES, type SchoolTypeOption } from "@/lib/pedagogy-types";

interface WizardClientProps {
  schoolName: string;
  currentYear: string;
  initialStep?: number;
}

type ClassDraft = {
  name: string;
  cycle: "PRESCOLAIRE" | "ELEMENTAIRE" | "MOYEN" | "SECONDAIRE";
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
        ? "PRESCOLAIRE"
        : selectedType === "COLLEGE"
        ? "MOYEN"
        : selectedType === "LYCEE"
        ? "SECONDAIRE"
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
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [rawRows, setRawRows] = useState<WizardStudentRow[]>([]);
  const [importPreview, setImportPreview] = useState<{
    total: number;
    valid: number;
    invalid: number;
    classesDetected: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<WizardImportResult | null>(null);
  const [importedTotal, setImportedTotal] = useState(0);
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    header: string;
    field: string;
    fieldLabel: string;
    distance: number;
    rawRows: any[];
    file: File;
  } | null>(null);

  const parseFile = async (file: File) => {
    setErrorMessage(null);
    setRawRows([]);
    setImportPreview(null);
    setUploadedFile(null);
    setPendingSuggestion(null);

    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    if (!isCsv && !isExcel) {
      setErrorMessage("Format non supporté. Veuillez utiliser un fichier .xlsx, .xls ou .csv");
      return;
    }

    try {
      if (isCsv) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: "greedy",
          complete: (results) => {
            const rows = (results.data as any[]) || [];
            if (rows.length === 0) {
              setErrorMessage("Le fichier CSV ne contient aucune ligne de données.");
              return;
            }
            processParsedRows(rows, file);
          },
        });
      } else {
        const parsed: any = await (readXlsxFile as any)(file);
        let rows: any[] = [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0] && Array.isArray(parsed[0].data)) {
            // Plusieurs feuilles : retenir la feuille la plus remplie
            let maxLen = 0;
            for (const s of parsed) {
              if (Array.isArray(s.data) && s.data.length > maxLen) {
                maxLen = s.data.length;
                rows = s.data;
              }
            }
          } else if (Array.isArray(parsed[0])) {
            rows = parsed;
          }
        }

        if (!rows || rows.length === 0) {
          setErrorMessage("Le fichier Excel ne contient aucune ligne ou la feuille sélectionnée est vide.");
          return;
        }

        const nonEmptyRows = rows.filter(
          (r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== "")
        );

        if (nonEmptyRows.length < 2) {
          setErrorMessage(
            `Le fichier Excel contient ${rows.length} ligne(s), mais pas assez de données pour constituer des en-têtes et des élèves.`
          );
          return;
        }

        // Trouver dynamiquement la ligne d'en-tête (au cas où les premières lignes sont des titres)
        let headerRowIndex = 0;
        for (let rIdx = 0; rIdx < Math.min(nonEmptyRows.length, 6); rIdx++) {
          const r = nonEmptyRows[rIdx];
          const matchCount = r.filter((cell: any) => {
            const s = String(cell || "").toLowerCase().trim();
            return (
              s.includes("nom") ||
              s.includes("prenom") ||
              s.includes("eleve") ||
              s.includes("classe") ||
              s === "om" ||
              levenshteinDistance(s, "nom") <= 1 ||
              levenshteinDistance(s, "prenom") <= 1
            );
          }).length;
          if (matchCount >= 1) {
            headerRowIndex = rIdx;
            break;
          }
        }

        const headers = nonEmptyRows[headerRowIndex].map((h: any) => String(h || "").trim().replace(/^\uFEFF/, ""));
        const dataRows: any[] = [];

        for (let i = headerRowIndex + 1; i < nonEmptyRows.length; i++) {
          const r = nonEmptyRows[i];
          if (!Array.isArray(r)) continue;
          const obj: any = {};
          headers.forEach((hdr: string, idx: number) => {
            if (hdr) obj[hdr] = r[idx] !== null && r[idx] !== undefined ? String(r[idx]).trim() : "";
          });
          const hasAnyValue = Object.values(obj).some((v) => v && String(v).trim().length > 0);
          if (hasAnyValue) {
            dataRows.push(obj);
          }
        }

        if (dataRows.length === 0) {
          setErrorMessage(
            `Le fichier Excel contient ${nonEmptyRows.length} lignes, mais aucune donnée élève n'a pu être extraite sous les en-têtes.`
          );
          return;
        }

        processParsedRows(dataRows, file);
      }
    } catch (err) {
      console.error("Erreur lecture fichier:", err);
      setErrorMessage("Impossible de lire ce fichier Excel.");
    }
  };

  const processParsedRows = (rows: any[], file: File) => {
    const sample = rows[0] || {};
    const rawKeys = Object.keys(sample);

    const formattedRows: WizardStudentRow[] = rows.map((raw) => {
      const norm = normalizeRawRow(raw);
      let fName = norm.firstName?.trim() || "";
      let lName = norm.lastName?.trim() || "";

      if (fName && !lName) {
        const s = splitFullName(fName);
        fName = s.firstName;
        lName = s.lastName;
      } else if (!fName && lName) {
        const s = splitFullName(lName);
        fName = s.firstName;
        lName = s.lastName;
      }

      return {
        firstName: fName,
        lastName: lName,
        className: norm.className?.trim() || undefined,
        dateOfBirth: norm.dateOfBirth?.trim() || undefined,
        gender: norm.gender?.trim() || undefined,
        guardianName: norm.emergencyContact?.trim() || undefined,
        guardianPhone: norm.emergencyPhone?.trim() || undefined,
        guardianRelation: norm.guardianRelation?.trim() || undefined,
      };
    }).filter((r) => r.firstName || r.lastName);

    if (formattedRows.length === 0) {
      setUploadedFile(null);
      setRawRows([]);
      setImportPreview(null);

      // Chercher si une colonne non appariée a une suggestion approchante (ex: "om" -> "lastName")
      let foundSuggestion: any = null;
      for (const k of rawKeys) {
        const sugg = suggestFieldForHeader(k, 2);
        if (sugg && (sugg.field === "lastName" || sugg.field === "firstName")) {
          const fieldDef = FIELD_DEFINITIONS.find((f) => f.key === sugg.field);
          foundSuggestion = {
            header: k,
            field: sugg.field,
            fieldLabel: fieldDef?.label || sugg.field,
            distance: sugg.distance,
            rawRows: rows,
            file,
          };
          break;
        }
      }

      if (foundSuggestion) {
        setPendingSuggestion(foundSuggestion);
        setErrorMessage(
          `Le fichier contient ${rows.length} lignes, mais la colonne « ${foundSuggestion.fieldLabel} » n'a pas été reconnue directement. La colonne « ${foundSuggestion.header} » semble y correspondre.`
        );
      } else {
        setErrorMessage(
          `Le fichier contient ${rows.length} lignes, mais aucun élève n'a été reconnu car les colonnes obligatoires (Nom, Prénom) sont introuvables. Colonnes présentes : ${rawKeys.filter(Boolean).join(", ")}.`
        );
      }
      return;
    }

    const valid = formattedRows.filter((r) => r.firstName?.trim() && r.lastName?.trim());
    const uniqueClasses = new Set(formattedRows.map((r) => r.className?.trim()).filter(Boolean));

    setPendingSuggestion(null);
    setUploadedFile({ name: file.name, size: file.size });
    setRawRows(formattedRows);
    setImportPreview({
      total: formattedRows.length,
      valid: valid.length,
      invalid: formattedRows.length - valid.length,
      classesDetected: uniqueClasses.size,
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

            {/* Zone de Dépôt / Carte Fichier Analysé */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) parseFile(e.target.files[0]);
              }}
            />

            {/* Alerte de suggestion approchante (ex: "om" -> "nom") */}
            {pendingSuggestion && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Correspondance approchante proposée (distance d&apos;édition {pendingSuggestion.distance})</span>
                </div>
                <p className="text-xs text-amber-800">
                  Le fichier contient <strong>{pendingSuggestion.rawRows.length} lignes</strong>. La colonne « <span className="font-mono font-bold text-slate-900">{pendingSuggestion.header}</span> » ressemble à <strong>{pendingSuggestion.fieldLabel}</strong>. Souhaitez-vous l&apos;utiliser ?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const remapped = pendingSuggestion.rawRows.map((r) => ({
                        ...r,
                        [pendingSuggestion.field]: r[pendingSuggestion.header],
                      }));
                      processParsedRows(remapped, pendingSuggestion.file);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Oui, utiliser « {pendingSuggestion.header} » comme {pendingSuggestion.fieldLabel}
                  </button>
                </div>
              </div>
            )}

            {uploadedFile ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[220px] sm:max-w-xs">
                          {uploadedFile.name}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Fichier analysé avec succès
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(uploadedFile.size / 1024).toFixed(1)} Ko · {rawRows.length} lignes extraites
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors self-end sm:self-center"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                    <span>Changer de fichier</span>
                  </button>
                </div>
              </div>
            ) : (
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
                <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-800">
                  Glissez votre fichier ici, ou cliquez pour parcourir
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Formats acceptés : .xlsx, .xls, .csv · Détection automatique des colonnes
                </p>
              </div>
            )}
          </div>

          {/* Prévisualisation & Résumé */}
          {importPreview && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">
                    Résultat de l&apos;analyse :
                  </span>
                </div>
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {importPreview.total} élève{importPreview.total > 1 ? "s" : ""} trouvé{importPreview.total > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white p-3.5 border border-emerald-200 shadow-xs">
                  <p className="text-2xl font-black text-emerald-600">{importPreview.valid}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Prêts à être importés</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-xs">
                  <p className="text-2xl font-black text-slate-800">{importPreview.classesDetected}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Classes identifiées</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-xs">
                  <p className={`text-2xl font-black ${importPreview.invalid > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {importPreview.invalid}
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    {importPreview.invalid > 0 ? "Lignes incomplètes" : "Aucune erreur"}
                  </p>
                </div>
              </div>

              {/* Aperçu concret des premiers élèves pour rassurer l'utilisateur */}
              {rawRows.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/60">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    Aperçu des premiers élèves détectés :
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Prénom</th>
                          <th className="px-3 py-2">Nom</th>
                          <th className="px-3 py-2">Classe</th>
                          <th className="px-3 py-2">Contact Tuteur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rawRows.slice(0, 4).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium text-slate-900">{r.firstName || "—"}</td>
                            <td className="px-3 py-2 font-medium text-slate-900">{r.lastName || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{r.className || "À affecter"}</td>
                            <td className="px-3 py-2 text-slate-600">
                              {r.guardianPhone || r.guardianName || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rawRows.length > 4 && (
                      <div className="bg-slate-50/60 px-3 py-1.5 text-center text-[11px] text-slate-500 border-t border-slate-100">
                        + {rawRows.length - 4} autre{rawRows.length - 4 > 1 ? "s" : ""} élève{rawRows.length - 4 > 1 ? "s" : ""} prêt{rawRows.length - 4 > 1 ? "s" : ""} dans ce fichier
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions & Bouton de Validation CTA */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retour</span>
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2 order-2 sm:order-1"
              >
                Ajouter manuellement plus tard
              </button>

              {importPreview && importPreview.valid > 0 ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleImportSubmit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 order-1 sm:order-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Importation en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Valider et importer {importPreview.valid} élèves</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : importPreview && importPreview.valid === 0 ? (
                <div className="flex flex-col items-center sm:items-end gap-1 order-1 sm:order-2">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                  >
                    <span>Vérification requise</span>
                  </button>
                  <span className="text-[11px] text-red-500">
                    Aucun nom d&apos;élève détecté. Vérifiez vos colonnes.
                  </span>
                </div>
              ) : null}
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
