"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
// @ts-ignore
import { readSheet } from "read-excel-file/browser";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Users,
  School,
  ArrowRight,
  Loader2,
  Info,
  ClipboardPaste,
  Edit3,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  importStudents,
  previewImport,
  getDpaStatusAction,
  acceptDpaAction,
  type ImportRow,
  type ImportPreviewResult,
} from "./actions";
import Link from "next/link";

type ImportState = "UPLOAD" | "PREVIEW" | "IMPORTING" | "SUCCESS";
type InputMode = "FILE" | "PASTE" | "MANUAL";
type ClassSummary = { name: string; count: number };

export default function ImportStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstClass = searchParams.get("first") === "true";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // État DPA (Loi 2008-12 CDP)
  const [dpaAccepted, setDpaAccepted] = useState<boolean | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [acceptingDpa, setAcceptingDpa] = useState(false);

  const [inputMode, setInputMode] = useState<InputMode>("FILE");
  const [currentState, setCurrentState] = useState<ImportState>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);
  const [importedTotal, setImportedTotal] = useState(0);
  const [importedList, setImportedList] = useState<{ id: string; firstName: string; lastName: string; className: string }[]>([]);
  const [firstStudent, setFirstStudent] = useState<{ id: string; firstName: string; lastName: string } | null>(null);

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
    getDpaStatusAction().then((res) => {
      if (res && "accepted" in res) {
        setDpaAccepted(Boolean(res.accepted));
        setSchoolName(res.schoolName || "votre établissement");
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

  const normalizeHeaders = (header: string) => {
    const h = header.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (h.includes("telephone") || h.includes("tel") || h.includes("mobile") || h.includes("cel") || h.includes("contact")) return "emergencyPhone";
    if (h.includes("parent") || h.includes("tuteur") || h.includes("pere") || h.includes("mere") || h.includes("responsable")) return "emergencyContact";
    if (h.includes("matricule") || h.includes("identifiant")) return "matricule";
    if (h.includes("date") || h.includes("naissance") || h.includes("dob")) return "dateOfBirth";
    if (h.includes("sexe") || h.includes("genre")) return "gender";
    if (h.includes("classe") || h.includes("niveau") || h.includes("division")) return "className";
    if (h.includes("prenom")) return "firstName";
    if (h.includes("nom")) return "lastName";
    if (h.includes("statut")) return "status";
    return h;
  };

  const handleFileParse = async (selectedFile: File) => {
    setError(null);
    setParsedData([]);
    setFile(selectedFile);
    setCurrentState("UPLOAD");

    const isCsv = selectedFile.name.endsWith(".csv");
    const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      setError("Format non supporté. Veuillez utiliser un fichier .csv ou .xlsx");
      return;
    }

    try {
      if (isCsv) {
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          transformHeader: normalizeHeaders,
          complete: async (results) => {
            if (results.errors.length > 0) {
              setError("Erreur lors de la lecture du CSV.");
              return;
            }
            const rows = results.data as ImportRow[];
            setParsedData(rows);
            await fetchPreview(rows);
          },
        });
      } else if (isExcel) {
        const rows = await readSheet(selectedFile);
        if (rows.length < 2) {
          setError("Le fichier Excel est vide ou ne contient pas d'en-têtes.");
          return;
        }

        const headers = rows[0].map((h: any) => normalizeHeaders(String(h || "")));
        const dataRows: ImportRow[] = [];

        for (let i = 1; i < rows.length; i++) {
          const rowData = rows[i];
          const obj: any = {};
          headers.forEach((header: string, index: number) => {
            if (header) {
              obj[header] = rowData[index] ? String(rowData[index]) : undefined;
            }
          });
          if (obj.firstName || obj.lastName) {
            dataRows.push(obj as ImportRow);
          }
        }
        setParsedData(dataRows);
        await fetchPreview(dataRows);
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue s'est produite lors de la lecture du fichier.");
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
      // Découper par tabulation ou point-virgule ou virgule
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
      setError("Impossible de détecter des élèves dans le texte collé. Format attendu : Prénom [Tab/Virgule] Nom [Tab/Virgule] Classe");
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
      const result = await importStudents(parsedData, skipDuplicates);
      if (result.error) {
        setError(result.error);
        setCurrentState("PREVIEW");
      } else {
        setImportedTotal(result.count || 0);
        setClassSummary(result.classesSummary || []);
        setImportedList(result.importedStudents || []);
        setFirstStudent(result.firstStudent || null);
        setCurrentState("SUCCESS");
      }
    } catch {
      setError("L'importation a échoué. Veuillez réessayer.");
      setCurrentState("PREVIEW");
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setPreviewResult(null);
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
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-primary shrink-0">3.</span>
              <p>
                Un modèle officiel pré-rempli de déclaration préalable auprès de la <strong>Commission de Protection des Données Personnelles (CDP)</strong> est mis à votre disposition dans vos paramètres.
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

  // --- RENDER SUCCESS ---
  if (currentState === "SUCCESS") {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 mb-2">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text">🎉 Votre classe prend vie !</h1>
        <p className="text-base text-text-soft max-w-md mx-auto">
          {importedTotal} élève{importedTotal > 1 ? "s ont été intégrés" : " a été intégré"} à votre établissement avec succès.
        </p>

        {importedList.length > 0 && (
          <div className="max-w-xl mx-auto mt-6 bg-surface border border-rule rounded-2xl overflow-hidden shadow-sm text-left">
            <div className="bg-sunk/50 px-6 py-3 border-b border-rule flex items-center justify-between">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">Élèves importés</h3>
              <span className="text-xs font-semibold text-primary">{importedList.length} fiches créées</span>
            </div>
            <ul className="divide-y divide-rule max-h-56 overflow-y-auto">
              {importedList.slice(0, 10).map((st) => (
                <li key={st.id} className="px-6 py-2.5 flex items-center justify-between text-xs hover:bg-sunk/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-semibold text-text">{st.firstName} {st.lastName}</span>
                  </div>
                  <span className="text-text-soft bg-sunk px-2 py-0.5 rounded text-[11px]">{st.className}</span>
                </li>
              ))}
              {importedList.length > 10 && (
                <li className="px-6 py-2 text-center text-xs text-text-soft font-medium">
                  + {importedList.length - 10} autres élèves...
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {firstStudent && (
            <Link
              href={`/dashboard/students/${firstStudent.id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-6 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-hover w-full sm:w-auto"
            >
              Voir la fiche de {firstStudent.firstName}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/dashboard/students/import"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-rule bg-surface px-6 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-sunk w-full sm:w-auto"
          >
            Importer le reste de mon école
          </Link>
        </div>
      </div>
    );
  }

  // --- RENDER IMPORTING ---
  if (currentState === "IMPORTING") {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-text">Importation en cours...</h2>
        <p className="text-text-soft text-sm">Nous structurons les classes et inscrivons les élèves.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ── BANDEAU "UNE CLASSE D'ABORD" ── */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-3.5 text-left">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-primary-ink">
            {isFirstClass ? "Importez votre première classe" : "Commençons petit. Importez une seule classe"}
          </h2>
          <p className="text-xs text-text-soft leading-relaxed">
            Vous verrez immédiatement vos effectifs et vos fiches élèves s&apos;organiser. Les autres classes pourront être ajoutées ensuite en quelques secondes.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">Importation des élèves</h1>
          <p className="text-xs text-text-soft mt-1">Choisissez la méthode qui vous convient le mieux.</p>
        </div>
      </div>

      {/* ── 3 VOIES À ÉGALITÉ ── */}
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
              <p className="mt-1 text-xs text-text-soft">Formats acceptés : .xlsx, .xls ou .csv</p>
              <div className="mt-5">
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
                <Button variant="secondary" size="md" onClick={() => fileInputRef.current?.click()}>
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
                placeholder="Aminata	Fall	CE2 A	Moussa Fall	77 123 45 67&#10;Fatou	Ndiaye	CE2 A	Awa Ndiaye	77 987 65 43"
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
                      placeholder="Classe (ex: CE2 A)"
                      value={r.className || ""}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i].className = e.target.value;
                        setManualRows(updated);
                      }}
                      className="w-32 h-9 px-3 rounded-lg border border-rule text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Tél tuteur"
                      value={r.emergencyPhone || ""}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i].emergencyPhone = e.target.value;
                        setManualRows(updated);
                      }}
                      className="w-36 h-9 px-3 rounded-lg border border-rule text-xs"
                    />
                    {manualRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setManualRows(manualRows.filter((_, idx) => idx !== i))}
                        className="p-2 text-text-faint hover:text-danger rounded-lg transition-colors"
                        title="Supprimer"
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

      {/* ── PRÉVISUALISATION ET VALIDATION ── */}
      {currentState === "PREVIEW" && previewResult && file && (
        <div className="rounded-3xl border border-rule bg-surface shadow-sm overflow-hidden text-left animate-in fade-in">
          <div className="border-b border-rule p-5 flex items-center justify-between bg-sunk/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-surface rounded-xl border border-rule shadow-xs">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-text text-sm">{file.name}</h3>
                <p className="text-xs text-text-soft">{previewResult.validRows} élèves prêts pour l&apos;import</p>
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

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-surface border border-rule rounded-2xl p-4 shadow-2xs">
                <span className="text-2xl font-bold text-text block">{previewResult.validRows}</span>
                <span className="text-xs text-text-soft">Élèves valides détectés</span>
              </div>
              <div className="bg-surface border border-rule rounded-2xl p-4 shadow-2xs">
                <span className="text-2xl font-bold text-text block">{previewResult.classesCount}</span>
                <span className="text-xs text-text-soft">Classes créées / rattachées</span>
              </div>
              <div className="bg-surface border border-rule rounded-2xl p-4 shadow-2xs">
                <span className="text-2xl font-bold text-emerald-600 block">
                  {previewResult.invalidRows === 0 ? "100%" : `${previewResult.validRows}/${previewResult.totalRows}`}
                </span>
                <span className="text-xs text-text-soft">Taux d&apos;intégrité</span>
              </div>
            </div>

            {previewResult.duplicatesCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <h4 className="font-bold text-amber-900">Doublons potentiels détectés ({previewResult.duplicatesCount})</h4>
                  <p className="text-amber-800 mt-0.5">
                    Certains élèves existent déjà dans l&apos;établissement.
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

            <div className="border-t border-rule pt-4 flex justify-between items-center">
              <Button variant="ghost" size="md" onClick={reset}>
                Annuler
              </Button>
              <Button variant="primary" size="md" onClick={handleUpload}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Importer {skipDuplicates ? previewResult.validRows - previewResult.duplicatesCount : previewResult.validRows} élèves
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
