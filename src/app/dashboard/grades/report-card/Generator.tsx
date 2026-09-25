"use client";

import { useState, useEffect } from "react";
import { Printer, Users, Sparkles, Palette, Check, Sliders, ShieldCheck, X, Eye, ArrowLeft } from "lucide-react";
import type { OfficialBulletinData } from "@/lib/bulletin/loadOfficialBulletin";
import { BulletinSecondaireSheet } from "@/components/grades/BulletinSecondaireSheet";
import { BulletinElementaireSheet } from "@/components/grades/BulletinElementaireSheet";
import { ResponsiveBulletinContainer } from "@/components/grades/ResponsiveBulletinContainer";
import SharedColorPicker from "@/components/ui/SharedColorPicker";
import { saveSchoolBulletinSettings } from "./actions";

export default function ReportCardGenerator({
  data,
  canPrint = true,
  focusStudentId = null,
  embed = false,
}: {
  data: OfficialBulletinData;
  canPrint?: boolean;
  focusStudentId?: string | null;
  embed?: boolean;
}) {
  const defaultSchoolColor = data.school.primaryColor || "#1e40af";
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(focusStudentId);
  const [monochrome, setMonochrome] = useState<boolean>(false);
  const [showMobilePreview, setShowMobilePreview] = useState<boolean>(false);

  // Réglages de personnalisation (chargés depuis l'école)
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);
  const [accentColor, setAccentColor] = useState<string>(
    data.school.bulletinAccentColor || defaultSchoolColor
  );
  const [watermark, setWatermark] = useState<boolean>(
    data.school.bulletinWatermark ?? false
  );
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(
    data.school.bulletinWatermarkOpacity ?? 0.06
  );
  const [logoPosition, setLogoPosition] = useState<"LEFT" | "CENTER" | "RIGHT">(
    (data.school.bulletinLogoPosition as "LEFT" | "CENTER" | "RIGHT") || "CENTER"
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  // Synchronisation systématique à la lecture des préférences de l'école active
  useEffect(() => {
    setAccentColor(data.school.bulletinAccentColor || defaultSchoolColor);
    setWatermark(data.school.bulletinWatermark ?? false);
    setWatermarkOpacity(data.school.bulletinWatermarkOpacity ?? 0.06);
    setLogoPosition((data.school.bulletinLogoPosition as "LEFT" | "CENTER" | "RIGHT") || "CENTER");
  }, [data.school, defaultSchoolColor]);

  useEffect(() => {
    if (showMobilePreview) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setShowMobilePreview(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [showMobilePreview]);

  const handleSaveDefaults = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await saveSchoolBulletinSettings({
        bulletinAccentColor: accentColor,
        bulletinWatermark: watermark,
        bulletinWatermarkOpacity: watermarkOpacity,
        bulletinLogoPosition: logoPosition,
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setShowCustomizer(false);
        }, 800);
      } else {
        alert(res.error || "Erreur lors de l'enregistrement.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const students = selectedStudentId
    ? (data.students as any[]).filter((s) => s.studentId === selectedStudentId)
    : (data.students as any[]);

  return (
    <div className="space-y-4">
      {/* ── BARRE D'ACTIONS ET CONTRÔLES D'IMPRESSION ── */}
      {!embed && (
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-rule bg-surface px-4 py-3 shadow-2xs">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-text">
                  {students.length} bulletin{students.length > 1 ? "s" : ""} — {data.classe.name}
                </p>
                <span className="inline-flex items-center rounded-pill bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {data.cycle === "ELEMENTAIRE" ? "Élémentaire (Domaines)" : "Secondaire (Coefficients)"}
                </span>
                {data.term.isT3 && (
                  <span className="inline-flex items-center rounded-pill bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    3e Trimestre · Orientation
                  </span>
                )}
              </div>
              <p className="text-xs text-text-soft mt-0.5">
                {data.term.name} · Année scolaire {data.school.activeAcademicYear}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Filtre par élève */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Users className="h-3.5 w-3.5 text-text-soft shrink-0" />
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(e.target.value || null)}
                  className="h-8.5 w-full sm:w-auto rounded-control border border-rule bg-surface px-2.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
                >
                  <option value="">Tous les élèves ({data.students.length})</option>
                  {(data.students as any[]).map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.lastName.toUpperCase()} {s.firstName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bouton Personnaliser */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCustomizer((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 h-8.5 rounded-control border px-2.5 text-xs font-medium transition-colors ${
                  showCustomizer
                    ? "border-primary bg-primary text-white font-semibold shadow-xs"
                    : "border-rule bg-surface text-text hover:bg-surface-subtle"
                }`}
                title={showCustomizer ? "Fermer la personnalisation" : "Personnaliser les couleurs, filigranes et logo du bulletin"}
              >
                {showCustomizer ? <X className="h-3.5 w-3.5" /> : <Palette className="h-3.5 w-3.5" />}
                {showCustomizer ? "Fermer" : "Personnaliser"}
              </button>

              {/* Toggle Monochrome */}
              <button
                type="button"
                onClick={() => setMonochrome(!monochrome)}
                className={`inline-flex items-center gap-1.5 h-8.5 rounded-control border px-2.5 text-xs font-medium transition-colors ${
                  monochrome
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-rule bg-surface text-text hover:bg-surface-subtle"
                }`}
                title="Activer le mode monochrome noir & blanc pour économiser l'encre"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {monochrome ? "Noir & Blanc" : "Couleur École"}
              </button>

              {/* Bouton d'impression (Desktop) */}
              {canPrint && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden md:inline-flex items-center gap-1.5 h-8.5 rounded-control bg-primary px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-hover"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer A4
                </button>
              )}
            </div>

            {/* Bouton d'aperçu dédié sur mobile — visible en pleine largeur */}
            <div className="w-full md:hidden pt-1">
              <button
                type="button"
                onClick={() => setShowMobilePreview(true)}
                className="flex items-center justify-center gap-2 w-full h-10.5 rounded-control bg-primary px-4 text-xs font-bold text-white shadow-sm hover:bg-primary-hover active:scale-[0.99] transition-all"
                title="Ouvrir l'aperçu du bulletin en plein écran"
              >
                <Eye className="h-4 w-4" />
                <span>Aperçu du bulletin {selectedStudentId ? "(1 sélectionné)" : `(${students.length})`}</span>
              </button>
            </div>
          </div>

          {/* ── PANNEAU DE PERSONNALISATION DU BULLETIN ── */}
          {showCustomizer && (
            <div className="rounded-surface border border-rule bg-surface p-4 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-rule/60 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                    Personnalisation du document
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-soft hidden sm:inline">
                    Ces réglages s&apos;appliquent à l&apos;ensemble des bulletins imprimés
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCustomizer(false);
                    }}
                    className="p-1 rounded-control text-text-soft hover:text-text hover:bg-surface-subtle transition-colors cursor-pointer"
                    title="Fermer la personnalisation"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                {/* 1. Couleur d'accent (Palette partagée 36 teintes) */}
                <div className="lg:col-span-2 space-y-2">
                  <SharedColorPicker
                    mode="bulletin"
                    value={accentColor}
                    onChange={setAccentColor}
                    defaultSchoolColor={defaultSchoolColor}
                    label="Couleur d'accent du document"
                  />
                </div>

                {/* 2 & 3. Filigrane & Logo */}
                <div className="space-y-4 rounded-control bg-surface-subtle/50 p-3.5 border border-rule/60 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Filigrane Logo */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="toggleWatermark" className="font-semibold text-text cursor-pointer">
                          Logo en filigrane de fond
                        </label>
                        <input
                          type="checkbox"
                          id="toggleWatermark"
                          checked={watermark}
                          onChange={(e) => setWatermark(e.target.checked)}
                          className="h-4 w-4 rounded border-rule text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>
                      {watermark ? (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[11px] text-text-soft">
                            <span>Opacité du filigrane :</span>
                            <span className="font-mono font-bold text-text">
                              {Math.round(watermarkOpacity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.02"
                            max="0.25"
                            step="0.01"
                            value={watermarkOpacity}
                            onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1.5 bg-ground rounded-lg cursor-pointer"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-text-faint">
                          Activer pour afficher le logo de l&apos;école en arrière-plan centré sur la page A4.
                        </p>
                      )}
                    </div>

                    {/* Position du logo */}
                    <div className="space-y-2 pt-3 border-t border-rule/40">
                      <label className="font-semibold text-text block">
                        Position du logo dans l&apos;en-tête
                      </label>
                      <div className="inline-flex rounded-control border border-rule bg-ground p-0.5 w-full">
                        {(
                          [
                            { id: "LEFT", label: "Gauche" },
                            { id: "CENTER", label: "Centre" },
                            { id: "RIGHT", label: "Droite" },
                          ] as const
                        ).map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setLogoPosition(pos.id)}
                            className={`flex-1 py-1 text-center text-xs font-medium rounded-control transition-all ${
                              logoPosition === pos.id
                                ? "bg-surface font-bold text-primary shadow-xs"
                                : "text-text-soft hover:text-text"
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton Sauvegarder pour l'école */}
              <div className="flex items-center justify-between pt-2 border-t border-rule/40">
                <p className="text-[11px] text-text-soft">
                  Enregistrez ces préférences pour qu&apos;elles soient appliquées automatiquement à chaque édition.
                </p>
                <button
                  type="button"
                  onClick={handleSaveDefaults}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 h-8 rounded-control bg-gray-900 px-3 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Enregistré par défaut !
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {isSaving ? "Enregistrement..." : "Enregistrer pour l'école"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RENDU DES FEUILLES A4 ── */}
      {students.length === 0 ? (
        <div className="rounded-surface border border-dashed border-rule bg-surface-subtle/50 p-8 text-center text-xs text-text-soft print:hidden space-y-1">
          <p className="font-semibold text-text text-sm">
            Aucun élève en {data.classe.name} à {data.school.name}
          </p>
          <p>Cette classe ne compte actuellement aucun élève inscrit pour l&apos;établissement actif ({data.school.name}).</p>
        </div>
      ) : (
        <>
          {/* ── CARTE D'APERÇU MOBILE (Bouton d'aperçu du bulletin sur smartphone) ── */}
          <div className="md:hidden rounded-xl border border-rule/60 bg-surface p-4 text-center shadow-2xs space-y-3 print:hidden">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {selectedStudentId
                  ? `Bulletin de ${students[0]?.firstName} ${students[0]?.lastName.toUpperCase()}`
                  : `${students.length} bulletin${students.length > 1 ? "s" : ""} — ${data.classe.name}`}
              </h3>
              <p className="text-xs text-text-soft mt-0.5">
                {data.term.name} · {data.cycle === "ELEMENTAIRE" ? "Élémentaire (Domaines)" : "Secondaire (Coefficients)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMobilePreview(true)}
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-control bg-primary px-4 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover active:scale-[0.99] transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>Aperçu du bulletin ({students.length})</span>
            </button>
          </div>

          {/* ── RENDU NORMAL SUR DESKTOP ET IMPRESSION (Non altéré) ── */}
          <div className="hidden md:block space-y-8 print:block print:space-y-0">
            {students.map((student, idx) => (
              <ResponsiveBulletinContainer
                key={student.studentId}
                isFirst={idx === 0}
                studentName={`${student.lastName} ${student.firstName}`}
              >
                <div
                  className="rounded-surface border border-rule bg-white shadow-sm print:border-none print:shadow-none print:p-0"
                  style={{
                    pageBreakAfter: idx < students.length - 1 ? "always" : "auto",
                    breakAfter: idx < students.length - 1 ? "page" : "auto",
                  }}
                >
                  {data.cycle === "SECONDAIRE" ? (
                    <BulletinSecondaireSheet
                      student={student}
                      school={data.school}
                      className={data.classe.name}
                      termName={data.term.name}
                      isT3={data.term.isT3}
                      monochrome={monochrome}
                      accentColor={accentColor}
                      watermark={watermark}
                      watermarkOpacity={watermarkOpacity}
                      logoPosition={logoPosition}
                    />
                  ) : (
                    <BulletinElementaireSheet
                      student={student}
                      school={data.school}
                      className={data.classe.name}
                      termName={data.term.name}
                      isT3={data.term.isT3}
                      monochrome={monochrome}
                      accentColor={accentColor}
                      watermark={watermark}
                      watermarkOpacity={watermarkOpacity}
                      logoPosition={logoPosition}
                    />
                  )}
                </div>
              </ResponsiveBulletinContainer>
            ))}
          </div>

          {/* ── MODALE D'APERÇU PLEIN ÉCRAN SUR MOBILE (Page adéquate avec retour au clic extérieur) ── */}
          {showMobilePreview && (
            <div
              className="fixed inset-0 z-[120] flex flex-col bg-black/80 backdrop-blur-md md:hidden animate-in fade-in duration-200"
              onClick={(e) => {
                // Dès que je clique en dehors du bulletin (fond sombre), je retourne !
                if (e.target === e.currentTarget) {
                  setShowMobilePreview(false);
                }
              }}
            >
              {/* Barre d'en-tête de l'aperçu mobile avec bouton retour */}
              <div className="flex items-center justify-between border-b border-white/15 bg-gray-900/95 px-4 py-3 text-white backdrop-blur-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMobilePreview(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 active:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retour</span>
                </button>

                <div className="text-center min-w-0 px-2">
                  <h3 className="text-xs font-bold text-white truncate">
                    {selectedStudentId
                      ? `${students[0]?.lastName.toUpperCase()} ${students[0]?.firstName}`
                      : `Bulletins — ${data.classe.name}`}
                  </h3>
                  <p className="text-[10px] text-gray-300 truncate">
                    {data.term.name} · {students.length} élève{students.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canPrint && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-primary-hover transition-colors"
                      title="Imprimer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Imprimer</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMobilePreview(false)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Fermer l'aperçu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Zone de visualisation défilante centrée */}
              <div
                className="flex-1 overflow-y-auto p-3 space-y-6 flex flex-col items-center"
                onClick={(e) => {
                  // Clic en dehors du bulletin (sur les marges) -> retour immédiat !
                  if (e.target === e.currentTarget) {
                    setShowMobilePreview(false);
                  }
                }}
              >
                <p className="text-[11px] text-gray-300/80 text-center pt-1 pb-1">
                  Touchez l&apos;arrière-plan ou le bouton retour pour quitter l&apos;aperçu.
                </p>

                {students.map((student, idx) => (
                  <div
                    key={student.studentId}
                    className="w-full flex justify-center py-2 cursor-pointer"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setShowMobilePreview(false);
                      }
                    }}
                  >
                    <div
                      className="w-full max-w-[794px] cursor-default"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ResponsiveBulletinContainer
                        isFirst={idx === 0}
                        studentName={`${student.lastName} ${student.firstName}`}
                      >
                        <div className="rounded-surface border border-rule bg-white shadow-2xl">
                          {data.cycle === "SECONDAIRE" ? (
                            <BulletinSecondaireSheet
                              student={student}
                              school={data.school}
                              className={data.classe.name}
                              termName={data.term.name}
                              isT3={data.term.isT3}
                              monochrome={monochrome}
                              accentColor={accentColor}
                              watermark={watermark}
                              watermarkOpacity={watermarkOpacity}
                              logoPosition={logoPosition}
                            />
                          ) : (
                            <BulletinElementaireSheet
                              student={student}
                              school={data.school}
                              className={data.classe.name}
                              termName={data.term.name}
                              isT3={data.term.isT3}
                              monochrome={monochrome}
                              accentColor={accentColor}
                              watermark={watermark}
                              watermarkOpacity={watermarkOpacity}
                              logoPosition={logoPosition}
                            />
                          )}
                        </div>
                      </ResponsiveBulletinContainer>
                    </div>
                  </div>
                ))}

                <div className="pt-2 pb-8">
                  <button
                    type="button"
                    onClick={() => setShowMobilePreview(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/30 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Retour</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
