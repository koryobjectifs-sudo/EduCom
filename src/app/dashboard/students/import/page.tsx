"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
// @ts-ignore
import { readSheet } from "read-excel-file/browser";
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { importStudents, ImportRow } from "./actions";

export default function ImportStudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    setSuccess(null);
    setParsedData([]);
    setFile(selectedFile);

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
          complete: (results) => {
            if (results.errors.length > 0) {
              setError("Erreur lors de la lecture du CSV.");
              console.error(results.errors);
              return;
            }
            const rows = results.data as ImportRow[];
            setParsedData(rows);
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
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue s'est produite lors de la lecture du fichier.");
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
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await importStudents(parsedData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`${result.count} élèves ont été importés avec succès.`);
        setTimeout(() => {
          router.push("/dashboard/students");
        }, 2000);
      }
    } catch (err) {
      setError("L'importation a échoué. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Importation massive d'élèves</h1>
        <p className="mt-2 text-role-body text-text-soft">
          Importez un fichier Excel (.xlsx) ou CSV pour ajouter plusieurs élèves et créer leurs classes automatiquement.
        </p>
      </div>

      {!file && (
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

      {success && (
        <div className="mt-6 flex items-start gap-3 rounded-control border border-success/30 bg-success/5 p-4 text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-role-body font-medium">{success}</p>
        </div>
      )}

      {file && !error && parsedData.length > 0 && !success && (
        <div className="mt-8 rounded-surface border border-rule bg-surface shadow-sm overflow-hidden">
          <div className="border-b border-rule p-4 sm:px-6 flex items-center justify-between bg-sunk/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-md border border-rule shadow-sm">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-text">{file.name}</h3>
                <p className="text-sm text-text-soft">{parsedData.length} élèves trouvés</p>
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
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface border-b border-rule text-role-meta text-text-soft">
                <tr>
                  <th className="px-6 py-3 font-medium">Matricule</th>
                  <th className="px-6 py-3 font-medium">Prénom & Nom</th>
                  <th className="px-6 py-3 font-medium">Classe</th>
                  <th className="px-6 py-3 font-medium">Contact Parent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule bg-white">
                {parsedData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="hover:bg-sunk/50 transition-colors">
                    <td className="px-6 py-3 text-text-soft">{row.matricule || "-"}</td>
                    <td className="px-6 py-3 font-medium text-text">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center rounded-full bg-sunk px-2.5 py-0.5 text-xs font-medium text-text-strong">
                        {row.className || "Non assigné"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-text-soft">
                      {row.emergencyContact ? (
                        <>
                          <div className="text-text">{row.emergencyContact}</div>
                          <div className="text-xs">{row.emergencyPhone}</div>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {parsedData.length > 5 && (
            <div className="border-t border-rule bg-sunk/30 px-6 py-3 text-center text-sm text-text-soft">
              ... et {parsedData.length - 5} autres élèves
            </div>
          )}

          <div className="border-t border-rule p-4 sm:px-6 bg-surface flex justify-end gap-3">
            <Button variant="ghost" onClick={reset} disabled={loading}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleUpload} loading={loading}>
              Confirmer l'importation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
