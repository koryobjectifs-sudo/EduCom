"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type MappingWizardProps = {
  rawHeaders: string[];
  rawRows: any[];
  onMappingComplete: (mappedData: any[]) => void;
};

const REQUIRED_FIELDS = [
  { key: "firstName", label: "Prénoms", required: true },
  { key: "lastName", label: "Nom de famille", required: true },
  { key: "className", label: "Classe", required: true },
];

const OPTIONAL_FIELDS = [
  { key: "dateOfBirth", label: "Date de naissance" },
  { key: "gender", label: "Sexe (M/F)" },
  { key: "emergencyContact", label: "Nom du tuteur" },
  { key: "emergencyPhone", label: "Téléphone tuteur" },
  { key: "matricule", label: "Matricule" },
];

export function MappingWizard({ rawHeaders, rawRows, onMappingComplete }: MappingWizardProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const lowerHeaders = rawHeaders.map(h => (h || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
      const match = lowerHeaders.findIndex(h => {
        if (field.key === "firstName" && h.includes("prenom")) return true;
        if (field.key === "lastName" && h.includes("nom") && !h.includes("prenom") && !h.includes("tuteur")) return true;
        if (field.key === "className" && (h.includes("classe") || h.includes("niveau"))) return true;
        if (field.key === "dateOfBirth" && (h.includes("date") || h.includes("naissance") || h.includes("dob"))) return true;
        if (field.key === "gender" && (h.includes("sexe") || h.includes("genre"))) return true;
        if (field.key === "emergencyContact" && (h.includes("parent") || h.includes("tuteur") || h.includes("responsable"))) return true;
        if (field.key === "emergencyPhone" && (h.includes("tel") || h.includes("telephone") || h.includes("contact"))) return true;
        if (field.key === "matricule" && (h.includes("matricule") || h.includes("identifiant"))) return true;
        return false;
      });
      if (match !== -1) {
        initial[field.key] = rawHeaders[match];
      }
    });
    return initial;
  });

  const handleSelect = (fieldKey: string, header: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: header }));
  };

  const handleValidate = () => {
    const mappedData = rawRows.map(row => {
      const obj: any = {};
      Object.entries(mapping).forEach(([fieldKey, headerName]) => {
        if (headerName && row[headerName] !== undefined) {
          obj[fieldKey] = String(row[headerName]);
        }
      });
      return obj;
    });
    
    const validMappedData = mappedData.filter(r => r.firstName || r.lastName);
    onMappingComplete(validMappedData);
  };

  const isMissingRequired = REQUIRED_FIELDS.some(f => !mapping[f.key]);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 text-left animate-in fade-in">
      <div className="bg-surface border border-rule rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-text mb-2">Correspondance des colonnes</h2>
        <p className="text-sm text-text-soft mb-6">
          Veuillez vérifier que les colonnes détectées correspondent bien aux champs d'EduCom.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Champs obligatoires</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {REQUIRED_FIELDS.map(f => (
                <div key={f.key} className="bg-sunk rounded-xl p-4 border border-rule">
                  <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                    {f.label} <span className="text-danger">*</span>
                  </label>
                  <select 
                    value={mapping[f.key] || ""} 
                    onChange={e => handleSelect(f.key, e.target.value)}
                    className="w-full h-9 rounded-lg border-rule text-sm"
                  >
                    <option value="">-- Ignorer ce champ --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-rule">
            <h3 className="text-sm font-semibold text-text mb-3">Champs optionnels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {OPTIONAL_FIELDS.map(f => (
                <div key={f.key} className="bg-sunk rounded-xl p-4 border border-rule/50">
                  <label className="block text-xs font-bold text-text-soft uppercase tracking-wider mb-2">
                    {f.label}
                  </label>
                  <select 
                    value={mapping[f.key] || ""} 
                    onChange={e => handleSelect(f.key, e.target.value)}
                    className="w-full h-9 rounded-lg border-rule/50 text-sm"
                  >
                    <option value="">-- Ignorer ce champ --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button 
            size="lg" 
            onClick={handleValidate} 
            disabled={isMissingRequired}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Valider et Prévisualiser
          </Button>
        </div>
      </div>
    </div>
  );
}
