"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, AlertCircle, HelpCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  detectFieldForHeader,
  suggestFieldForHeader,
  FIELD_DEFINITIONS,
  type EduComFieldKey,
  type ImportRow,
  type HeaderSuggestion,
} from "./utils";

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
  // Initialisation avec détection automatique intelligente (uniquement les correspondances certaines)
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

  // Correspondances approchantes suggérées (distance Levenshtein 1 ou 2), sans jamais les appliquer en silence
  const suggestions = useMemo(() => {
    const suggs: Record<string, HeaderSuggestion> = {};
    for (const h of rawHeaders) {
      if (!detectFieldForHeader(h, savedMapping)) {
        const s = suggestFieldForHeader(h, 2);
        if (s) suggs[h] = s;
      }
    }
    return suggs;
  }, [rawHeaders, savedMapping]);

  // Vérifier si les champs obligatoires (Prénom et Nom) sont bien mappés
  const mappedFieldValues = Object.values(mapping);
  const hasFirstName = mappedFieldValues.includes("firstName");
  const hasLastName = mappedFieldValues.includes("lastName");
  const hasClassName = mappedFieldValues.includes("className");

  const canContinue = hasFirstName && hasLastName;

  const unmappedHeaders = useMemo(() => {
    return rawHeaders.filter((h) => mapping[h] === "__ignore__");
  }, [rawHeaders, mapping]);

  const headersWithPendingSuggestions = useMemo(() => {
    return unmappedHeaders.filter((h) => suggestions[h] !== undefined);
  }, [unmappedHeaders, suggestions]);

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
      <div className="bg-surface border border-rule rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rule">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-text">Correspondance des colonnes</h2>
            </div>
            <p className="text-xs text-text-soft mt-1">
              EduCom s&apos;adapte au format de votre fichier. Vérifiez la destination de chaque colonne avant l&apos;importation.
            </p>
          </div>
          <span className="text-xs text-text-soft bg-sunk px-3 py-1 rounded-full border border-rule self-start sm:self-auto">
            {rawHeaders.length} colonne{rawHeaders.length > 1 ? "s" : ""} détectée{rawHeaders.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* ── BANDEAU DE SUGGESTION APPROCHANTE (Rattrapage des fautes comme "om" pour "nom") ── */}
        {headersWithPendingSuggestions.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Correspondance approchante proposée (à confirmer)</span>
            </div>
            <p className="text-xs text-amber-800">
              Certaines colonnes ressemblent à des champs connus mais comportent une légère différence d&apos;orthographe. Vous pouvez les associer en un clic :
            </p>
            <div className="space-y-2">
              {headersWithPendingSuggestions.map((header) => {
                const sugg = suggestions[header];
                const fieldDef = FIELD_DEFINITIONS.find((f) => f.key === sugg.field);
                const samples = samplesByHeader[header] || [];
                return (
                  <div
                    key={header}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-amber-200 shadow-xs"
                  >
                    <div>
                      <p className="text-xs text-slate-800 font-medium">
                        La colonne « <span className="font-mono font-bold text-slate-900">{header}</span> » ressemble à{" "}
                        <strong className="text-primary">{fieldDef?.label}</strong> (distance d&apos;édition : {sugg.distance}).
                      </p>
                      {samples.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Valeurs d&apos;exemple : <span className="italic font-medium text-slate-700">{samples.join(" · ")}</span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFieldChange(header, sugg.field)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors shrink-0"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Associer à « {fieldDef?.label} »
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ALERTE CHAMPS OBLIGATOIRES MANQUANTS ── */}
        {!canContinue && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-900">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Champs obligatoires manquants</p>
              <p className="mt-0.5 text-rose-800">
                L&apos;import nécessite au minimum d&apos;associer les colonnes :{" "}
                <strong>{[!hasFirstName && "Prénom", !hasLastName && "Nom de famille"].filter(Boolean).join(" et ")}</strong>.
                Choisissez à quoi correspondent les colonnes ci-dessous.
              </p>
            </div>
          </div>
        )}

        {/* ── LISTE DE TOUTES LES COLONNES AVEC VALEURS D'EXEMPLE ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Configuration de chaque colonne
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rawHeaders.map((header) => {
              const currentField = mapping[header] || "__ignore__";
              const detectedField = FIELD_DEFINITIONS.find((f) => f.key === currentField);
              const sugg = suggestions[header];
              const suggFieldDef = sugg ? FIELD_DEFINITIONS.find((f) => f.key === sugg.field) : null;
              const samples = samplesByHeader[header] || [];
              const isUnmapped = currentField === "__ignore__";

              return (
                <div
                  key={header}
                  className={`rounded-xl border p-4 transition-all ${
                    !isUnmapped
                      ? "border-primary/40 bg-primary/2"
                      : sugg
                      ? "border-amber-300 bg-amber-50/30"
                      : "border-rule bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-text truncate max-w-[200px]" title={header}>
                      « {header} »
                    </span>
                    {!isUnmapped && detectedField ? (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <Check className="h-2.5 w-2.5" /> {detectedField.label}
                      </span>
                    ) : sugg ? (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Suggestion approchante
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        Non appariée
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-text">
                      {!isUnmapped ? (
                        <>
                          Associée à <strong>{detectedField?.label}</strong>. Correct ?
                        </>
                      ) : (
                        <span className="text-slate-600 font-medium">À quoi correspond cette colonne ?</span>
                      )}
                    </p>

                    <select
                      value={currentField}
                      onChange={(e) => handleFieldChange(header, e.target.value as any)}
                      className={`w-full h-9 rounded-lg border px-3 text-xs font-medium focus:outline-none focus:ring-2 ${
                        isUnmapped && sugg
                          ? "border-amber-300 bg-white text-text focus:ring-amber-200"
                          : "border-rule bg-white text-text focus:ring-primary/20"
                      }`}
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

                    {/* Raccourci suggestion rapide si disponible */}
                    {isUnmapped && sugg && suggFieldDef && (
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] text-amber-800">
                          Ressemble à <strong>{suggFieldDef.label}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(header, sugg.field)}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                        >
                          Appliquer
                        </button>
                      </div>
                    )}

                    {/* Aperçu des vraies valeurs */}
                    {samples.length > 0 && (
                      <div className="pt-1 text-[11px] text-text-soft truncate" title={samples.join(", ")}>
                        <span className="font-semibold text-text-faint">Valeurs d&apos;exemples : </span>
                        {samples.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
      </div>
    </div>
  );
}
