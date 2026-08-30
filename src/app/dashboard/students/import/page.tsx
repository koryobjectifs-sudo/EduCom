"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
// @ts-ignore
import { readSheet } from "read-excel-file/browser";
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, X, Users, School, ArrowRight, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { importStudents, previewImport, ImportRow, ImportPreviewResult } from "./actions";
import Link from "next/link";

type ImportState = "UPLOAD" | "PREVIEW" | "IMPORTING" | "SUCCESS";

type ClassSummary = { name: string; count: number };

export default function ImportStudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentState, setCurrentState] = useState<ImportState>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);
  const [importedTotal, setImportedTotal] = useState(0);
  
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  const normalizeHeaders = (header: string) => {
    const h = header.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (h.includes("matricule")) return "matricule";
    if (h.includes("prenom")) return "firstName";
    if (h.includes("nom")) return "lastName";
    if (h.includes("sexe") || h.includes("genre")) return "gender";
    if (h.includes("date") || h.includes("naissance")) return "dateOfBirth";
    if (h.includes("classe") || h.includes("niveau")) return "className";
    if (h.includes("parent") || h.includes("tuteur")) return "emergencyContact";
    if (h.includes("telephone") || h.includes("tel")) return "emergencyPhone";
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
              console.error(results.errors);
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
        setCurrentState("SUCCESS");
      }
    } catch (err) {
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

  // --- RENDER STATES ---

  if (currentState === "SUCCESS") {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 text-success mb-2">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text">🎉 Votre école prend forme</h1>
        <p className="text-lg text-text-soft">
          Les données ont été intégrées à votre établissement avec succès.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto mt-8">
          <div className="bg-surface border border-rule rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-role-body font-semibold text-text-soft uppercase tracking-wide">Effectif ajouté</h2>
            </div>
            <p className="text-3xl font-bold text-text">{importedTotal} <span className="text-lg font-medium text-text-soft">élèves</span></p>
          </div>
          <div className="bg-surface border border-rule rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <School className="w-5 h-5 text-primary" />
              <h2 className="text-role-body font-semibold text-text-soft uppercase tracking-wide">Classes structurées</h2>
            </div>
            <p className="text-3xl font-bold text-text">{classSummary.length} <span className="text-lg font-medium text-text-soft">classes</span></p>
          </div>
        </div>

        {classSummary.length > 0 && (
          <div className="max-w-xl mx-auto mt-6 bg-white border border-rule rounded-2xl overflow-hidden shadow-sm text-left">
            <div className="bg-sunk/50 px-6 py-3 border-b border-rule">
              <h3 className="text-sm font-semibold text-text">Répartition par classe</h3>
            </div>
            <ul className="divide-y divide-rule max-h-64 overflow-y-auto">
              {classSummary.map(cs => (
                <li key={cs.name} className="px-6 py-3 flex items-center justify-between hover:bg-sunk/30 transition-colors">
                  <span className="font-medium text-text">{cs.name}</span>
                  <span className="text-role-body text-text-soft">{cs.count} élève{cs.count > 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-8">
          <Link href="/dashboard/directory" className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-8 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2">
            Voir mon école <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (currentState === "IMPORTING") {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-text">Importation en cours...</h2>
        <p className="text-text-soft text-lg">Nous structurons les classes et inscrivons les élèves.</p>
        <p className="text-sm text-text-muted">Cela peut prendre quelques instants pour de gros fichiers.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Importation massive d'élèves</h1>
        <p className="mt-2 text-role-body text-text-soft">
          Importez un fichier Excel (.xlsx) ou CSV pour ajouter plusieurs élèves et créer leurs classes automatiquement.
        </p>
      </div>

      {currentState === "UPLOAD" && (
        <div
          className={`mt-4 border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-rule bg-surface"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sunk">
            <UploadCloud className="h-6 w-6 text-text-soft" />
          </div>
          <h3 className="mt-4 text-role-body font-semibold text-text">Sélectionnez un fichier</h3>
          <p className="mt-2 text-sm text-text-soft">Glissez-déposez votre fichier ici, ou cliquez pour parcourir.</p>
          <div className="mt-6">
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
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Parcourir les fichiers
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-control border border-danger/30 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-role-body font-medium">{error}</p>
        </div>
      )}

      {currentState === "PREVIEW" && previewResult && file && (
        <div className="mt-8 rounded-3xl border border-rule bg-surface shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="border-b border-rule p-5 sm:px-6 flex items-center justify-between bg-sunk/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl border border-rule shadow-sm">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text text-lg">{file.name}</h3>
                <p className="text-sm text-text-soft">Prêt pour l'importation</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="p-2 text-text-soft hover:text-text hover:bg-rule rounded-full transition-colors"
              title="Annuler"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <h4 className="text-sm font-semibold text-text-soft uppercase tracking-wider mb-4">Résumé des détections</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-rule rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                <span className="text-3xl font-bold text-text mb-1">{previewResult.validRows}</span>
                <span className="text-sm font-medium text-text-soft">Élèves valides détectés</span>
              </div>
              <div className="bg-white border border-rule rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                <span className="text-3xl font-bold text-text mb-1">{previewResult.classesCount}</span>
                <span className="text-sm font-medium text-text-soft">Classes à créer ou rattacher</span>
              </div>
              {previewResult.invalidRows > 0 ? (
                <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                  <span className="text-3xl font-bold text-warning mb-1">{previewResult.invalidRows}</span>
                  <span className="text-sm font-medium text-warning">Lignes ignorées (nom manquant)</span>
                </div>
              ) : (
                <div className="bg-success/5 border border-success/20 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                  <span className="text-3xl font-bold text-success mb-1">0</span>
                  <span className="text-sm font-medium text-success">Ligne invalide</span>
                </div>
              )}
            </div>

            {previewResult.duplicatesCount > 0 && (
              <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-800">Attention, doublons potentiels détectés</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      <strong>{previewResult.duplicatesCount} élèves</strong> dans ce fichier semblent déjà exister dans votre établissement (même prénom et nom).
                    </p>
                    <div className="mt-2 text-xs text-amber-600 bg-amber-100/50 p-2 rounded-lg inline-block">
                      Ex: {previewResult.duplicateNames.join(", ")}{previewResult.duplicatesCount > 5 ? "..." : ""}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="skipDuplicates" 
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="w-4 h-4 text-primary border-amber-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="skipDuplicates" className="text-sm font-medium text-amber-800 cursor-pointer">
                        Ignorer ces doublons (ne pas les ré-importer)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-rule pt-6 flex justify-between items-center">
              <Button variant="ghost" onClick={reset}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleUpload} size="lg" icon={<CheckCircle2 className="w-4 h-4" />}>
                Importer {skipDuplicates ? previewResult.validRows - previewResult.duplicatesCount : previewResult.validRows} élèves
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
