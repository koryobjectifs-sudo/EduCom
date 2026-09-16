"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file/browser";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Users,
  School,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  ClipboardPaste,
  Edit3,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  importStudents,
  previewImport,
  getDpaStatusAction,
  acceptDpaAction,
  getImportConfigAction,
  saveImportMappingAction,
} from "./actions";
import {
  type ImportRow,
  type ImportPreviewResult,
  type MissingClassDef,
  type ImportStudentResult,
  levenshteinDistance,
} from "./utils";
import Link from "next/link";
import { MappingWizard } from "./MappingWizard";
import type { EducationalCycle } from "@/generated/prisma/client";

type ImportState = "UPLOAD" | "MAPPING" | "PREVIEW" | "IMPORTING" | "SUCCESS";
type InputMode = "FILE" | "PASTE" | "MANUAL";

export default function ImportStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstClass = searchParams.get("first") === "true";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // État DPA (Loi 2008-12 CDP)
  const [dpaAccepted, setDpaAccepted] = useState<boolean | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [acceptingDpa, setAcceptingDpa] = useState(false);

  // Configuration et mémorisation mapping
  const [savedMapping, setSavedMapping] = useState<Record<string, string>>({});

  const [inputMode, setInputMode] = useState<InputMode>("FILE");
  const [currentState, setCurrentState] = useState<ImportState>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);

  // Classes manquantes à créer et séries
  const [confirmedClasses, setConfirmedClasses] = useState<MissingClassDef[]>([]);

  // Conflits de tuteurs (décisions de l'utilisateur: MERGE ou SEPARATE)
  const [guardianDecisions, setGuardianDecisions] = useState<Record<string, "MERGE" | "SEPARATE">>({});

  // Résultat d'importation
  const [importResult, setImportResult] = useState<ImportStudentResult | null>(null);

  // Copier-coller & Saisie manuelle
  const [pastedText, setPastedText] = useState("");
  const [manualRows, setManualRows] = useState<ImportRow[]>([
    { firstName: "", lastName: "", className: "", emergencyContact: "", emergencyPhone: "" },
    { firstName: "", lastName: "", className: "", emergencyContact: "", emergencyPhone: "" },
    { firstName: "", lastName: "", className: "", emergencyContact: "", emergencyPhone: "" },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  useEffect(() => {
    getImportConfigAction().then((res) => {
      if (res && "accepted" in res) {
        setDpaAccepted(Boolean(res.accepted));
        setSchoolName(res.schoolName || "votre établissement");
        if (res.savedMapping) {
          setSavedMapping(res.savedMapping);
        }
      }
    });
  }, []);

  const handleAcceptDpa = async () => {
    setAcceptingDpa(true);
    setError(null);
    const res = await acceptDpaAction();
    setAcceptingDpa(false);
    if (res.success) {
      setDpaAccepted(true);
    } else {
      setError("Impossible d'enregistrer l'acceptation de la convention.");
    }
  };

  // Téléchargement du modèle officiel CSV EduCom (UTF-8 avec BOM)
  const downloadCsvTemplate = () => {
    const headers = [
      "Prénom",
      "Nom",
      "Classe",
      "Date de naissance (JJ/MM/AAAA)",
      "Sexe (M/F)",
      "Nom du tuteur",
      "Téléphone tuteur (Ex: +221 77 123 45 67)",
      "Matricule",
    ];

    const sampleRows = [
      ["Moussa", "Diallo", "Terminale S2", "12/04/2007", "M", "Amadou Diallo", "+221 77 123 45 67", "MAT-2026-001"],
      ["Fatou", "Ndiaye", "Terminale S2", "05/11/2007", "F", "Awa Ndiaye", "+221 77 987 65 43", "MAT-2026-002"],
      ["Oumar", "Sow", "6ème A", "18/02/2014", "M", "Ibrahima Sow", "+221 70 555 44 33", "MAT-2026-003"],
      ["Aïda", "Fall", "CI", "22/09/2019", "F", "Mariama Fall", "+221 78 222 11 00", "MAT-2026-004"],
    ];

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...sampleRows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modele_import_eleves_educom.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Téléchargement des lignes rejetées pour correction
  const downloadRejectedRows = (rejected: { rowNumber: number; data: ImportRow; reason: string }[]) => {
    if (!rejected || rejected.length === 0) return;
    const headers = [
      "Ligne",
      "Prénom",
      "Nom",
      "Classe",
      "Date de naissance",
      "Sexe",
      "Nom tuteur",
      "Téléphone tuteur",
      "Matricule",
      "Motif du rejet",
    ];
    const rows = rejected.map((r) => [
      String(r.rowNumber),
      r.data.firstName || "",
      r.data.lastName || "",
      r.data.className || "",
      r.data.dateOfBirth || "",
      r.data.gender || "",
      r.data.emergencyContact || "",
      r.data.emergencyPhone || "",
      r.data.matricule || "",
      r.reason,
    ]);
    const csvContent =
      "\uFEFF" +
      [
        headers.join(";"),
        ...rows.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")),
      ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "lignes_rejetees_a_corriger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileParse = async (selectedFile: File) => {
    setError(null);
    setRawHeaders([]);
    setRawRows([]);
    setFile(selectedFile);

    const isCsv = selectedFile.name.toLowerCase().endsWith(".csv");
    const isExcel =
      selectedFile.name.toLowerCase().endsWith(".xlsx") ||
      selectedFile.name.toLowerCase().endsWith(".xls");

    if (!isCsv && !isExcel) {
      setError("Format non supporté. Veuillez utiliser un fichier .csv ou .xlsx");
      return;
    }

    try {
      if (isCsv) {
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: "greedy",
          complete: async (results) => {
            if (results.errors.length > 0 && results.data.length === 0) {
              setError("Erreur lors de la lecture du fichier CSV.");
              return;
            }
            const cleanFields = (results.meta.fields || []).map((f) => f.trim().replace(/^\uFEFF/, "")).filter(Boolean);
            setRawHeaders(cleanFields);
            setRawRows(results.data);
            setCurrentState("MAPPING");
          },
        });
      } else if (isExcel) {
        const parsed: any = await (readXlsxFile as any)(selectedFile);
        let rows: any[] = [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0] && Array.isArray(parsed[0].data)) {
            // Plusieurs feuilles : retenir la feuille avec le plus de lignes
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
          setError("Le fichier Excel ne contient aucune ligne ou la feuille sélectionnée est vide.");
          return;
        }

        // Nettoyer les lignes complètement vides
        const nonEmptyRows = rows.filter(
          (r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== "")
        );

        if (nonEmptyRows.length < 2) {
          setError(
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
          const rowData = nonEmptyRows[i];
          const obj: any = {};
          headers.forEach((header: string, index: number) => {
            if (header) {
              obj[header] = rowData[index] !== null && rowData[index] !== undefined ? String(rowData[index]).trim() : "";
            }
          });
          const hasAny = Object.values(obj).some((v) => v && String(v).trim().length > 0);
          if (hasAny) dataRows.push(obj);
        }

        if (dataRows.length === 0) {
          setError(
            `Le fichier Excel contient ${rows.length} lignes, mais aucune donnée élève exploitable n'a été extraite sous la ligne d'en-tête.`
          );
          return;
        }

        setRawHeaders(headers.filter(Boolean));
        setRawRows(dataRows);
        setCurrentState("MAPPING");
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur s'est produite lors de la lecture du fichier Excel.");
    }
  };

  const handlePastedData = async () => {
    setError(null);
    if (!pastedText.trim()) {
      setError("Veuillez coller les lignes d'élèves à importer.");
      return;
    }

    const lines = pastedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows: ImportRow[] = [];

    for (const line of lines) {
      const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts.length >= 2) {
        rows.push({
          firstName: parts[0] || "",
          lastName: parts[1] || "",
          className: parts[2] || "",
          emergencyContact: parts[3] || "",
          emergencyPhone: parts[4] || "",
        });
      }
    }

    if (rows.length === 0) {
      setError("Format attendu : Prénom [Tab/Virgule] Nom [Tab/Virgule] Classe");
      return;
    }

    setFile(new File(["pasted"], "Texte_colle.csv"));
    setParsedData(rows);
    await fetchPreview(rows);
  };

  const handleManualData = async () => {
    setError(null);
    const valid = manualRows.filter((r) => r.firstName.trim() && r.lastName.trim());
    if (valid.length === 0) {
      setError("Veuillez renseigner au moins un élève avec son prénom et son nom.");
      return;
    }

    setFile(new File(["manual"], "Saisie_manuelle.csv"));
    setParsedData(valid);
    await fetchPreview(valid);
  };

  const fetchPreview = async (rows: ImportRow[]) => {
    const res = await previewImport(rows);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setPreviewResult(res.data);
      setConfirmedClasses(res.data.missingClasses || []);
      setCurrentState("PREVIEW");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileParse(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setCurrentState("IMPORTING");
    setError(null);

    try {
      const result = await importStudents(parsedData, {
        skipDuplicates,
        confirmedClasses,
        guardianDecisions,
      });

      if (!result.success && result.error) {
        setError(result.error);
        setCurrentState("PREVIEW");
      } else {
        setImportResult(result);
        setCurrentState("SUCCESS");
      }
    } catch {
      setError("L'importation a rencontré un problème technique.");
      setCurrentState("PREVIEW");
    }
  };

  const reset = () => {
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setParsedData([]);
    setPreviewResult(null);
    setConfirmedClasses([]);
    setGuardianDecisions({});
    setImportResult(null);
    setError(null);
    setCurrentState("UPLOAD");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- RENDER DPA BLOCKER ---
  if (dpaAccepted === false) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="rounded-3xl border border-primary/20 bg-surface p-6 sm:p-8 shadow-card text-left space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 pb-4 border-b border-rule">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">Convention de Traitement des Données</h1>
              <p className="text-xs text-text-soft">Conformité Loi n° 2008-12 (CDP Sénégal)</p>
            </div>
          </div>

          <p className="text-sm text-text-soft leading-relaxed">
            Avant de réaliser votre premier import d&apos;élèves sur EduCom, la loi sénégalaise encadre la responsabilité du traitement des données scolaires :
          </p>

          <div className="bg-sunk/60 rounded-2xl p-5 space-y-3 text-xs leading-relaxed text-text">
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-primary shrink-0">1.</span>
              <p>
                <strong>{schoolName}</strong> agit en qualité de <strong>Responsable de Traitement</strong> et s&apos;engage à informer les familles de la tenue du registre numérique.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-primary shrink-0">2.</span>
              <p>
                <strong>EduCom Technologies</strong> intervient exclusivement en qualité de <strong>Sous-Traitant technique</strong> assurant la sécurité, le chiffrement et l&apos;étanchéité des données.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger font-medium">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              size="lg"
              block
              loading={acceptingDpa}
              onClick={handleAcceptDpa}
              className="h-12 text-sm font-semibold"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Reconnaître et continuer vers l&apos;importation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER SUCCESS / RÉSULTAT PARTIEL ---
  if (currentState === "SUCCESS" && importResult) {
    const rejectedCount = importResult.rejectedRows?.length || 0;
    const isPartial = rejectedCount > 0;

    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-center space-y-8 animate-in fade-in">
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
            isPartial ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
          } mb-2`}
        >
          {isPartial ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            {isPartial
              ? `Importation partielle : ${importResult.importedCount} élèves importés`
              : `🎉 Importation réussie : ${importResult.importedCount} élèves inscrits !`}
          </h1>
          <p className="text-sm text-text-soft max-w-md mx-auto mt-2">
            {importResult.classesCreated.length > 0
              ? `${importResult.classesCreated.length} nouvelle(s) classe(s) créée(s) : ${importResult.classesCreated.join(", ")}.`
              : "Les effectifs ont été mis à jour dans vos classes existantes."}
          </p>
        </div>

        {/* Alerte des lignes rejetées si import partiel */}
        {isPartial && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-bold text-amber-900">
                  {rejectedCount} ligne{rejectedCount > 1 ? "s" : ""} non importée{rejectedCount > 1 ? "s" : ""}
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadRejectedRows(importResult.rejectedRows)}
                className="text-xs bg-white border-amber-300 hover:bg-amber-50 text-amber-900"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Télécharger pour correction (.csv)
              </Button>
            </div>

            <p className="text-xs text-amber-800">
              Les élèves avec des données valides ont été enregistrés. Vous pouvez télécharger le fichier des lignes rejetées contenant le motif exact de l&apos;erreur.
            </p>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-amber-200 bg-white/70 p-3 space-y-1.5 text-xs text-amber-950 font-mono">
              {importResult.rejectedRows.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-2 border-b border-amber-100 pb-1">
                  <span>Ligne {r.rowNumber} : {r.data.firstName} {r.data.lastName} ({r.data.className || "Sans classe"})</span>
                  <span className="font-sans text-[11px] text-red-600 shrink-0 font-medium">↳ {r.reason}</span>
                </div>
              ))}
              {rejectedCount > 10 && (
                <p className="text-[11px] text-amber-700 italic pt-1">... et {rejectedCount - 10} autre(s) ligne(s).</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/dashboard/students">
            <Button size="lg" className="w-full sm:w-auto">
              <Users className="h-4 w-4 mr-2" />
              Consulter la liste des élèves
            </Button>
          </Link>
          <Button variant="secondary" size="lg" onClick={reset} className="w-full sm:w-auto">
            Importer un autre fichier
          </Button>
        </div>
      </div>
    );
  }

  // --- RENDER MAPPING WIZARD ---
  if (currentState === "MAPPING") {
    return (
      <MappingWizard
        rawHeaders={rawHeaders}
        rawRows={rawRows}
        savedMapping={savedMapping}
        onCancel={() => setCurrentState("UPLOAD")}
        onMappingComplete={async (mappedData, mappingToSave) => {
          setParsedData(mappedData);
          if (mappingToSave) {
            setSavedMapping(mappingToSave);
            saveImportMappingAction(mappingToSave).catch(console.error);
          }
          await fetchPreview(mappedData);
        }}
      />
    );
  }

  // --- RENDER IMPORTING ---
  if (currentState === "IMPORTING") {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-text">Importation en cours...</h2>
        <p className="text-text-soft text-sm">
          Création des classes, inscription des élèves et normalisation des dossiers.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ── BANDEAU ACCUEIL & MODÈLE CSV ── */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-primary-ink">
              {isFirstClass ? "Importez votre première classe" : "Importation de dossiers élèves"}
            </h2>
            <p className="text-xs text-text-soft leading-relaxed">
              EduCom s&apos;adapte aux fichiers de votre établissement. Vous pouvez aussi télécharger notre modèle officiel prêt à l&apos;emploi.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={downloadCsvTemplate}
          className="shrink-0 text-xs bg-white hover:bg-gray-50 border-primary/20 text-primary font-semibold self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Télécharger le modèle CSV
        </Button>
      </div>

      {/* ── 3 MODES D'ENTRÉE ── */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-sunk rounded-xl border border-rule">
        <button
          type="button"
          onClick={() => setInputMode("FILE")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            inputMode === "FILE"
              ? "bg-surface text-primary shadow-xs border border-rule/50"
              : "text-text-soft hover:text-text"
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          Fichier Excel / CSV
        </button>
        <button
          type="button"
          onClick={() => setInputMode("PASTE")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            inputMode === "PASTE"
              ? "bg-surface text-primary shadow-xs border border-rule/50"
              : "text-text-soft hover:text-text"
          }`}
        >
          <ClipboardPaste className="h-4 w-4" />
          Copier-coller
        </button>
        <button
          type="button"
          onClick={() => setInputMode("MANUAL")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            inputMode === "MANUAL"
              ? "bg-surface text-primary shadow-xs border border-rule/50"
              : "text-text-soft hover:text-text"
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Saisie directe
        </button>
      </div>

      {currentState === "UPLOAD" && (
        <>
          {inputMode === "FILE" && (
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-rule bg-surface"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sunk text-text-soft">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text">Sélectionnez votre fichier de classe</h3>
              <p className="mt-1 text-xs text-text-soft">Formats acceptés : .xlsx, .xls ou .csv (virgule ou point-virgule)</p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileParse(e.target.files[0]);
                    }
                  }}
                />
                <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()}>
                  Parcourir mon ordinateur
                </Button>
              </div>
            </div>
          )}

          {inputMode === "PASTE" && (
            <div className="rounded-2xl border border-rule bg-surface p-6 space-y-4 text-left">
              <label className="block text-xs font-bold text-text uppercase tracking-wider">
                Collez votre liste d&apos;élèves
              </label>
              <p className="text-xs text-text-soft">
                Copiez les colonnes depuis votre tableur Excel (Prénom, Nom, Classe, Téléphone tuteur).
              </p>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Aminata	Fall	Terminale S2	Moussa Fall	77 123 45 67&#10;Fatou	Ndiaye	Terminale S2	Awa Ndiaye	77 987 65 43"
                className="w-full rounded-xl border border-rule p-3 font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <div className="flex justify-end">
                <Button size="md" onClick={handlePastedData} disabled={!pastedText.trim()}>
                  Analyser les données collées
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {inputMode === "MANUAL" && (
            <div className="rounded-2xl border border-rule bg-surface p-6 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">Saisie rapide d&apos;élèves</h3>
                  <p className="text-xs text-text-soft">Complétez directement les lignes ci-dessous.</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setManualRows([
                      ...manualRows,
                      { firstName: "", lastName: "", className: "", emergencyContact: "", emergencyPhone: "" },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter une ligne
                </Button>
              </div>

              <div className="space-y-2">
                {manualRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={r.firstName}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i].firstName = e.target.value;
                        setManualRows(updated);
                      }}
                      className="flex-1 h-9 px-3 rounded-lg border border-rule text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Nom"
                      value={r.lastName}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i].lastName = e.target.value;
                        setManualRows(updated);
                      }}
                      className="flex-1 h-9 px-3 rounded-lg border border-rule text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Classe (ex: Terminale S2)"
                      value={r.className || ""}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i].className = e.target.value;
                        setManualRows(updated);
                      }}
                      className="flex-1 h-9 px-3 rounded-lg border border-rule text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Tuteur"
                      value={r.emergencyContact || ""}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i].emergencyContact = e.target.value;
                        setManualRows(updated);
                      }}
                      className="flex-1 h-9 px-3 rounded-lg border border-rule text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Téléphone"
                      value={r.emergencyPhone || ""}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i].emergencyPhone = e.target.value;
                        setManualRows(updated);
                      }}
                      className="flex-1 h-9 px-3 rounded-lg border border-rule text-xs"
                    />
                    {manualRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setManualRows(manualRows.filter((_, idx) => idx !== i))}
                        className="p-2 text-text-soft hover:text-danger rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button size="md" onClick={handleManualData}>
                  Valider la saisie
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* ── PRÉVISUALISATION, CRÉATION DES CLASSES ET CONFIRMATION ── */}
      {currentState === "PREVIEW" && previewResult && (
        <div className="rounded-3xl border border-rule bg-surface shadow-sm overflow-hidden text-left animate-in fade-in space-y-6 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-rule">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-surface rounded-xl border border-rule shadow-xs">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-text text-sm">{file?.name || "Données importées"}</h3>
                <p className="text-xs text-text-soft">
                  {previewResult.validRows} élève{previewResult.validRows > 1 ? "s" : ""} valide{previewResult.validRows > 1 ? "s" : ""} détecté{previewResult.validRows > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="p-1.5 text-text-soft hover:text-text hover:bg-rule rounded-full transition-colors"
              title="Annuler"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface border border-rule rounded-2xl p-4 shadow-2xs">
              <span className="text-2xl font-bold text-text block">{previewResult.validRows}</span>
              <span className="text-xs text-text-soft">Élèves valides</span>
            </div>
            <div className="bg-surface border border-rule rounded-2xl p-4 shadow-2xs">
              <span className="text-2xl font-bold text-text block">{previewResult.classesDetected.length}</span>
              <span className="text-xs text-text-soft">Classes détectées</span>
            </div>
            <div className="bg-surface border border-rule rounded-2xl p-4 shadow-2xs">
              <span className="text-2xl font-bold text-emerald-600 block">
                {previewResult.invalidRows === 0 ? "100%" : `${previewResult.validRows}/${previewResult.totalRows}`}
              </span>
              <span className="text-xs text-text-soft">Taux d&apos;intégrité</span>
            </div>
          </div>

          {/* ── SECTION CRÉATION DE CLASSES ET CYCLES (LOT 19/3) ── */}
          {confirmedClasses.length > 0 && (
            <div className="rounded-2xl border border-primary/30 bg-primary/2 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-bold text-text">
                  {confirmedClasses.length} classe{confirmedClasses.length > 1 ? "s" : ""} seront créée{confirmedClasses.length > 1 ? "s" : ""} : {confirmedClasses.map((c) => c.name).join(", ")}
                </h4>
              </div>
              <p className="text-xs text-text-soft">
                Ces classes n&apos;existent pas encore dans votre école. EduCom a automatiquement déduit leur cycle et leur série. Vous pouvez les ajuster :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {confirmedClasses.map((c, i) => (
                  <div key={i} className="rounded-xl border border-rule bg-white p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-text">{c.name}</span>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Nouvelle classe
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-text-soft uppercase mb-1">Cycle</label>
                        <select
                          value={c.cycle}
                          onChange={(e) => {
                            const updated = [...confirmedClasses];
                            updated[i].cycle = e.target.value as EducationalCycle;
                            if (updated[i].cycle !== "SECONDAIRE") updated[i].serie = null;
                            setConfirmedClasses(updated);
                          }}
                          className="w-full h-8 rounded-lg border border-rule text-xs px-2 bg-white"
                        >
                          <option value="PRESCOLAIRE">Préscolaire</option>
                          <option value="ELEMENTAIRE">Élémentaire</option>
                          <option value="MOYEN">Moyen (Collège)</option>
                          <option value="SECONDAIRE">Secondaire (Lycée)</option>
                          <option value="AUTRE">Autre</option>
                        </select>
                      </div>

                      {c.cycle === "SECONDAIRE" && (
                        <div>
                          <label className="block text-[10px] font-semibold text-text-soft uppercase mb-1">Série</label>
                          <select
                            value={c.serie || ""}
                            onChange={(e) => {
                              const updated = [...confirmedClasses];
                              updated[i].serie = e.target.value || null;
                              setConfirmedClasses(updated);
                            }}
                            className="w-full h-8 rounded-lg border border-rule text-xs px-2 bg-white font-semibold text-primary"
                          >
                            <option value="">Aucune</option>
                            <option value="S1">S1 (Sciences exactes)</option>
                            <option value="S2">S2 (Sciences expérimentales)</option>
                            <option value="L1">L1 (Lettres classiques)</option>
                            <option value="L2">L2 (Lettres modernes)</option>
                            <option value="STEG">STEG (Sciences éco)</option>
                            <option value="STIDD">STIDD (Sciences tech)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION DÉDUPLICATION TUTEURS (LOT 19/5) ── */}
          {previewResult.guardianConflicts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-700" />
                <h4 className="text-sm font-bold text-amber-900">
                  Déduplication des tuteurs ({previewResult.guardianConflicts.length} numéro{previewResult.guardianConflicts.length > 1 ? "s" : ""} partagé{previewResult.guardianConflicts.length > 1 ? "s" : ""})
                </h4>
              </div>
              <p className="text-xs text-amber-800">
                Un numéro de téléphone du fichier correspond à un parent déjà enregistré avec un nom différent. Choisissez comment traiter chaque cas :
              </p>

              <div className="space-y-2.5 pt-1">
                {previewResult.guardianConflicts.map((c, i) => {
                  const decision = guardianDecisions[c.phone] || "SEPARATE";
                  return (
                    <div key={i} className="rounded-xl border border-amber-200 bg-white p-3 text-xs space-y-2 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-mono font-bold text-gray-900">{c.phone}</span>
                        <span className="text-gray-500">
                          Élève concerné : <strong>{c.studentName}</strong>
                        </span>
                      </div>
                      <p className="text-gray-600 text-[11px]">
                        Existant en base : <strong>{c.existingName}</strong> · Fichier : <strong>{c.incomingName}</strong>
                      </p>
                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`guard_${c.phone}`}
                            checked={decision === "SEPARATE"}
                            onChange={() => setGuardianDecisions((d) => ({ ...d, [c.phone]: "SEPARATE" }))}
                            className="text-primary"
                          />
                          <span className="font-semibold text-gray-800">Ce sont deux personnes différentes (Créer profil distinct)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`guard_${c.phone}`}
                            checked={decision === "MERGE"}
                            onChange={() => setGuardianDecisions((d) => ({ ...d, [c.phone]: "MERGE" }))}
                            className="text-primary"
                          />
                          <span className="font-semibold text-gray-800">Fusionner avec {c.existingName}</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doublons élèves */}
          {previewResult.duplicatesCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <h4 className="font-bold text-amber-900">
                  Doublons potentiels détectés ({previewResult.duplicatesCount})
                </h4>
                <p className="text-amber-800 mt-0.5">
                  Certains élèves portent les mêmes nom et prénom qu&apos;un élève déjà enregistré ({previewResult.duplicateNames.join(", ")}...).
                </p>
                <label className="mt-2.5 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-3.5 h-3.5 text-primary rounded"
                  />
                  <span className="font-semibold text-amber-900">Ignorer les doublons</span>
                </label>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="border-t border-rule pt-4 flex justify-between items-center">
            <Button variant="ghost" size="md" onClick={() => setCurrentState("MAPPING")}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Modifier les colonnes
            </Button>
            <Button variant="primary" size="md" onClick={handleUpload}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Lancer l&apos;importation ({skipDuplicates ? previewResult.validRows - previewResult.duplicatesCount : previewResult.validRows} élèves)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
