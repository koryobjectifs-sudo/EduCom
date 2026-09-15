"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  detectFieldForHeader,
  FIELD_DEFINITIONS,
  type EduComFieldKey,
  type ImportRow,
} from "./actions";

type MappingWizardProps = {
  rawHeaders: string[];
  rawRows: any[];
  savedMapping?: Record<string, string>;
  onMappingComplete: (mappedData: ImportRow[], mappingToSave?: Record<string, string>) => void;
  onCancel: () => void;
};

export function MappingWizard({
  rawHeaders,
  rawRows,
  savedMapping,
  onMappingComplete,
  onCancel,
}: MappingWizardProps) {
  // Initialisation avec détection automatique intelligente
  const [mapping, setMapping] = useState<Record<string, EduComFieldKey | "__ignore__">>(() => {
    const initial: Record<string, EduComFieldKey | "__ignore__"> = {};
    for (const h of rawHeaders) {
      const detected = detectFieldForHeader(h, savedMapping);
      initial[h] = detected || "__ignore__";
    }
    return initial;
  });

  const [rememberMapping, setRememberMapping] = useState(true);

  const handleFieldChange = (header: string, field: EduComFieldKey | "__ignore__") => {
    setMapping((prev) => ({ ...prev, [header]: field }));
  };

  // Extraire les 3 premiers exemples de chaque colonne pour rassurer l'utilisateur
  const samplesByHeader = useMemo(() => {
    const res: Record<string, string[]> = {};
    for (const h of rawHeaders) {
      const samples: string[] = [];
      for (const row of rawRows) {
        let val = row[h];
        if (val === undefined) {
          const matchedKey = Object.keys(row).find((k) => k.trim().replace(/^\uFEFF/, "") === h);
          if (matchedKey) val = row[matchedKey];
        }
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          samples.push(String(val).trim());
          if (samples.length >= 3) break;
        }
      }
      res[h] = samples;
    }
    return res;
  }, [rawHeaders, rawRows]);

  // Vérifier si les champs obligatoires (Prénom et Nom) sont bien mappés
  const mappedFieldValues = Object.values(mapping);
  const hasFirstName = mappedFieldValues.includes("firstName");
  const hasLastName = mappedFieldValues.includes("lastName");
  const hasClassName = mappedFieldValues.includes("className");

  const canContinue = hasFirstName && hasLastName;

  const handleValidate = () => {
    const mappedData: ImportRow[] = rawRows.map((row) => {
      const obj: any = {};
      for (const [header, fieldKey] of Object.entries(mapping)) {
        if (fieldKey !== "__ignore__") {
          let val = row[header];
          if (val === undefined) {
            const matchedKey = Object.keys(row).find((k) => k.trim().replace(/^\uFEFF/, "") === header);
            if (matchedKey) val = row[matchedKey];
          }
          if (val !== undefined && val !== null) {
            obj[fieldKey] = String(val).trim();
          }
        }
      }
      return {
        firstName: obj.firstName || "",
        lastName: obj.lastName || "",
        className: obj.className || "",
        dateOfBirth: obj.dateOfBirth || "",
        gender: obj.gender || "",
        emergencyContact: obj.emergencyContact || "",
        emergencyPhone: obj.emergencyPhone || "",
        matricule: obj.matricule || "",
      };
    });

    const validRows = mappedData.filter((r) => r.firstName || r.lastName);

    // Mémoriser la correspondance si demandée
    const mappingRecord: Record<string, string> = {};
    for (const [header, fieldKey] of Object.entries(mapping)) {
      if (fieldKey !== "__ignore__") {
        mappingRecord[header] = fieldKey;
      }
    }

    onMappingComplete(validRows, rememberMapping ? mappingRecord : undefined);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 text-left animate-in fade-in">
      <div className="bg-surface border border-rule rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rule">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-text">Correspondance des colonnes</h2>
            </div>
            <p className="text-xs text-text-soft mt-1">
              EduCom s&apos;adapte au format de votre école. Vérifiez la destination de chaque colonne.
            </p>
          </div>
          <span className="text-xs text-text-soft bg-sunk px-3 py-1 rounded-full border border-rule self-start sm:self-auto">
            {rawHeaders.length} colonne{rawHeaders.length > 1 ? "s" : ""} détectée{rawHeaders.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Liste modifiable colonne par colonne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {rawHeaders.map((header) => {
            const currentField = mapping[header] || "__ignore__";
            const detectedField = FIELD_DEFINITIONS.find((f) => f.key === currentField);
            const samples = samplesByHeader[header] || [];

            return (
              <div
                key={header}
                className={`rounded-xl border p-4 transition-all ${
                  currentField !== "__ignore__"
                    ? "border-primary/40 bg-primary/2"
                    : "border-rule bg-surface opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-text truncate max-w-[200px]" title={header}>
                    « {header} »
                  </span>
                  {detectedField ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <Check className="h-2.5 w-2.5" /> {detectedField.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      Ignorée
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-text">
                    {currentField !== "__ignore__" ? (
                      <>
                        J&apos;ai trouvé <strong>{header}</strong> → <strong>{detectedField?.label}</strong>. Correct ?
                      </>
                    ) : (
                      <>Associer cette colonne à un champ :</>
                    )}
                  </p>

                  <select
                    value={currentField}
                    onChange={(e) => handleFieldChange(header, e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-rule bg-white px-3 text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="__ignore__">-- Ignorer cette colonne --</option>
                    <optgroup label="Champs obligatoires">
                      <option value="firstName">Prénom de l&apos;élève *</option>
                      <option value="lastName">Nom de famille *</option>
                      <option value="className">Classe</option>
                    </optgroup>
                    <optgroup label="Champs optionnels">
                      <option value="dateOfBirth">Date de naissance</option>
                      <option value="gender">Sexe (M/F)</option>
                      <option value="emergencyContact">Nom du tuteur</option>
                      <option value="emergencyPhone">Téléphone tuteur</option>
                      <option value="matricule">Matricule / Identifiant</option>
                    </optgroup>
                  </select>

                  {/* Aperçu des vraies valeurs */}
                  {samples.length > 0 && (
                    <div className="pt-1 text-[11px] text-text-soft truncate" title={samples.join(", ")}>
                      <span className="font-semibold text-text-faint">Exemples : </span>
                      {samples.join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Option mémoriser mapping */}
        <div className="pt-4 border-t border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text font-medium">
            <input
              type="checkbox"
              checked={rememberMapping}
              onChange={(e) => setRememberMapping(e.target.checked)}
              className="rounded border-rule text-primary focus:ring-primary/20 h-4 w-4"
            />
            <span>Mémoriser cette correspondance pour les prochains imports de l&apos;école</span>
          </label>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Retour
            </Button>
            <Button variant="primary" size="md" disabled={!canContinue} onClick={handleValidate}>
              Continuer vers l&apos;analyse
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {!canContinue && (
          <p className="text-xs text-danger font-medium">
            Veuillez associer au minimum les colonnes <strong>Prénom</strong> et <strong>Nom de famille</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
