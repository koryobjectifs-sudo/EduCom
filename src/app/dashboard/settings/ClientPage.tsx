"use client";

import { useState } from "react";
import Link from "next/link";
import {
  updateSchoolSettings,
  updateActiveAcademicYear,
  updateSchoolPrimaryColor,
} from "./actions";
import {
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Check,
  Loader2,
  Palette,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  isValidHexColor,
  DEFAULT_EDUCOM_NAVY,
  schoolThemeStyle,
} from "@/lib/theme";
import SharedColorPicker from "@/components/ui/SharedColorPicker";
import { VisualAssetField } from "@/components/settings/VisualAssetField";
import VueRetoursTesteurs from "@/components/feedback/VueRetoursTesteurs";

interface CdpSectionItem {
  label: string;
  value: string;
}

interface CdpSection {
  number: string;
  title: string;
  items: CdpSectionItem[];
}

interface CdpData {
  title: string;
  referenceLaw: string;
  dateGenerated?: string;
  sections: CdpSection[];
}

interface SchoolSettingsProps {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  stamp?: string;
  signature?: string;
  logoSize?: number;
  stampSize?: number;
  signatureSize?: number;
  primaryColor?: string;
  activeAcademicYear?: string;
  dataProcessingAcceptedAt?: string | Date | null;
  waveTermsAcceptedAt?: string | Date | null;
}

export default function SettingsClient({
  school,
  availableYears = [],
}: {
  school: SchoolSettingsProps;
  availableYears?: string[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "charte" | "conformite" | "testeurs">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingColor, setIsApplyingColor] = useState(false);
  const [isUpdatingYear, setIsUpdatingYear] = useState(false);
  const [activeYear, setActiveYear] = useState(school.activeAcademicYear || "2026-2027");
  const [selectedYear, setSelectedYear] = useState(activeYear);
  const [customYear, setCustomYear] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [cdpModalData, setCdpModalData] = useState<CdpData | null>(null);

  const [formData, setFormData] = useState({
    name: school.name || "",
    email: school.email || "",
    phone: school.phone || "",
    address: school.address || "",
    logo: school.logo || "",
    stamp: school.stamp || "",
    signature: school.signature || "",
    logoSize: school.logoSize ?? 80,
    stampSize: school.stampSize ?? 80,
    signatureSize: school.signatureSize ?? 60,
    primaryColor: school.primaryColor || DEFAULT_EDUCOM_NAVY,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleYearChange = async () => {
    const targetYear = isCustomMode ? customYear.trim() : selectedYear;
    if (!targetYear) {
      toast.error("Veuillez sélectionner ou saisir une année scolaire.");
      return;
    }
    if (!/^\d{4}-\d{4}$/.test(targetYear)) {
      toast.error("Format d'année invalide. Exemple : 2026-2027.");
      return;
    }

    setIsUpdatingYear(true);
    const res = await updateActiveAcademicYear(targetYear);
    if (res.success) {
      setActiveYear(targetYear);
      toast.success(`Année active mise à jour : ${targetYear}`, {
        description: "L'ensemble du tableau de bord et des modules est désormais rattaché à cette session.",
      });
      router.refresh();
    } else {
      toast.error(res.error || "Erreur lors du changement d'année scolaire.");
    }
    setIsUpdatingYear(false);
  };

  const handleApplyColor = async (colorOverride?: string) => {
    const color = (colorOverride || formData.primaryColor)?.trim();
    if (!color || !isValidHexColor(color)) {
      toast.error("Couleur invalide", {
        description: "Veuillez entrer ou sélectionner un code hexadécimal valide (#RRGGBB).",
      });
      return;
    }

    setIsApplyingColor(true);
    document.documentElement.style.setProperty("--color-frame-bg", color);
    document.documentElement.style.setProperty("--color-topbar-bg", color);
    document.documentElement.style.setProperty("--color-rail-bg", color);
    document.documentElement.style.setProperty("--color-sidebar-bg", `color-mix(in srgb, ${color} 7%, #F8FAFC)`);
    document.documentElement.style.setProperty("--color-sidebar-hover", `color-mix(in srgb, ${color} 12%, #F1F5F9)`);
    document.documentElement.style.setProperty("--color-sidebar-active", `color-mix(in srgb, ${color} 16%, #FFFFFF)`);
    document.documentElement.style.setProperty("--color-rail-accent", color);

    const res = await updateSchoolPrimaryColor(color);
    if (res.success) {
      toast.success("Couleur appliquée !", {
        description: `La teinte ${color.toUpperCase()} habille désormais le Rail et la TopBar.`,
      });
      router.refresh();
    } else {
      toast.error("Erreur lors de l'application de la couleur", {
        description: res.error || "Impossible d'appliquer la couleur.",
      });
    }
    setIsApplyingColor(false);
  };

  const handleResetColor = async () => {
    setIsApplyingColor(true);
    const defaultNavy = DEFAULT_EDUCOM_NAVY;
    document.documentElement.style.setProperty("--color-frame-bg", defaultNavy);
    document.documentElement.style.setProperty("--color-topbar-bg", defaultNavy);
    document.documentElement.style.setProperty("--color-rail-bg", defaultNavy);
    document.documentElement.style.setProperty("--color-sidebar-bg", `color-mix(in srgb, ${defaultNavy} 7%, #F8FAFC)`);
    document.documentElement.style.setProperty("--color-sidebar-hover", `color-mix(in srgb, ${defaultNavy} 12%, #F1F5F9)`);
    document.documentElement.style.setProperty("--color-sidebar-active", `color-mix(in srgb, ${defaultNavy} 16%, #FFFFFF)`);
    document.documentElement.style.setProperty("--color-rail-accent", "#C084FC");

    setFormData((prev) => ({ ...prev, primaryColor: defaultNavy }));

    const res = await updateSchoolPrimaryColor(null);
    if (res.success) {
      toast.success("Thème officiel EduCom rétabli (#581C87).");
      router.refresh();
    } else {
      toast.error("Erreur lors de la réinitialisation", {
        description: res.error || "Impossible de réinitialiser la couleur.",
      });
    }
    setIsApplyingColor(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const res = await updateSchoolSettings(formData);

    if (res.success) {
      toast.success("Réglages mis à jour avec succès", {
        description: "Vos modifications ont bien été enregistrées.",
      });
      router.refresh();
    } else {
      toast.error("Erreur lors de l'enregistrement", {
        description: res.error || "Veuillez vérifier les informations renseignées.",
      });
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      {/* En-tête compact */}
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Administration" },
        ]}
        title="Établissement & Identité"
        description="Identité officielle, charte visuelle, session scolaire et retours testeurs."
        actions={
          <Button
            type="submit"
            form="settings-form"
            size="sm"
            loading={isSaving}
            icon={<Save aria-hidden="true" className="h-4 w-4" />}
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        }
      />

      {/* Barre d'onglets compacte (Segmented Control) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "general"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Building2 className="h-3.5 w-3.5 text-purple-600" />
          <span>Établissement & Session</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("charte")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "charte"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Palette className="h-3.5 w-3.5 text-purple-600" />
          <span>Charte & Documents</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conformite")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "conformite"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Conformité & Données</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("testeurs")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "testeurs"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-purple-700 bg-purple-50 hover:bg-purple-100/70"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Quiz & Retours Testeurs</span>
        </button>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} className="space-y-5">
        {/* ========================================================================= */}
        {/* ONGLET 1 : ÉTABLISSEMENT & SESSION SCOLAIRE                               */}
        {/* ========================================================================= */}
        {activeTab === "general" && (
          <div className="space-y-3.5">
            {/* Session scolaire active (Compacte & élégante) */}
            <div
              data-tour="settings-academic-year"
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Session Active
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> {activeYear}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Source de vérité pour le tableau de bord, classes, paiements et bulletins.
                  </p>
                </div>
              </div>

              {/* Contrôles de session compacts */}
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                {!isCustomMode ? (
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsCustomMode(true);
                        setCustomYear("");
                      } else {
                        setSelectedYear(e.target.value);
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        Session {y} {y === activeYear ? "(active)" : ""}
                      </option>
                    ))}
                    <option value="__NEW__">+ Autre session...</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Ex: 2027-2028"
                      value={customYear}
                      onChange={(e) => setCustomYear(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 w-28 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="text-[10.5px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={isUpdatingYear}
                  disabled={!isCustomMode && selectedYear === activeYear}
                  onClick={handleYearChange}
                >
                  Basculer
                </Button>

                <Link
                  href="/dashboard/settings/reinscription"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100/80 border border-purple-200/70 text-xs font-semibold transition-colors"
                  title="Réinscription et passage des classes pour la rentrée"
                >
                  <span>Préparer rentrée</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Coordonnées officielles (Grille 2x2 compacte) */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Coordonnées de l&apos;établissement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Nom */}
                <div data-tour="settings-school-name" className="space-y-1">
                  <label htmlFor="name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Nom officiel</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    placeholder="Ex: EduCom Excellence"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="email" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span>Adresse e-mail</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    placeholder="contact@ecole.sn"
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-1">
                  <label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>Téléphone standard</span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    placeholder="+221 77 000 00 00"
                  />
                </div>

                {/* Adresse */}
                <div className="space-y-1">
                  <label htmlFor="address" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>Adresse & Localité</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    placeholder="Dakar, Sénégal"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : CHARTE VISUELLE & DOCUMENTS OFFICIELS                         */}
        {/* ========================================================================= */}
        {activeTab === "charte" && (
          <div className="space-y-3.5">
            {/* Grille compacte des 3 visuels : Logo, Cachet, Signature */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Éléments graphiques officiels
                </h3>
                <p className="text-[10.5px] text-slate-500">
                  Apposés automatiquement sur vos bulletins, reçus, factures et certificats de scolarité.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <VisualAssetField
                  dataTour="settings-logo"
                  label="Logo officiel"
                  field="logo"
                  value={formData.logo}
                  description="En-tête des bulletins et reçus."
                  onChangeValue={(val) => setFormData((prev) => ({ ...prev, logo: val }))}
                />

                <VisualAssetField
                  dataTour="settings-stamp"
                  label="Cachet école"
                  field="stamp"
                  value={formData.stamp}
                  description="Bas des actes certifiés."
                  onChangeValue={(val) => setFormData((prev) => ({ ...prev, stamp: val }))}
                />

                <VisualAssetField
                  dataTour="settings-signature"
                  label="Signature"
                  field="signature"
                  value={formData.signature}
                  description="Signature de la Direction."
                  onChangeValue={(val) => setFormData((prev) => ({ ...prev, signature: val }))}
                />
              </div>
            </div>

            {/* Couleur des cadres du logiciel (Compacte & organisée) */}
            <div
              data-tour="settings-colors"
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full inline-block shadow-2xs border border-black/15 shrink-0"
                    style={{ backgroundColor: formData.primaryColor }}
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Couleur des cadres (TopBar & Rail)
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      Harmonise le bandeau et le rail latéral aux couleurs de votre établissement.
                    </p>
                  </div>
                </div>

                {/* Actions compactes */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetColor}
                    disabled={isApplyingColor}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                  >
                    Rétablir initial
                  </button>

                  <button
                    type="button"
                    data-tour="settings-apply-color-btn"
                    onClick={() => handleApplyColor()}
                    disabled={isApplyingColor}
                    style={{ backgroundColor: isValidHexColor(formData.primaryColor) ? formData.primaryColor : DEFAULT_EDUCOM_NAVY }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isApplyingColor ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Application...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Appliquer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Mini barre d'aperçu en direct discrète et élégante */}
              {(() => {
                const previewColor = isValidHexColor(formData.primaryColor) ? formData.primaryColor : DEFAULT_EDUCOM_NAVY;
                const previewTheme = (schoolThemeStyle(previewColor) ?? {}) as Record<string, string>;
                const previewFrame = previewTheme["--color-topbar-bg"] ?? previewColor;
                const previewSidebar = previewTheme["--color-sidebar-bg"] ?? `color-mix(in srgb, ${previewColor} 7%, #F8FAFC)`;
                return (
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div
                      className="h-6 px-3 flex items-center justify-between text-white text-[10.5px] font-bold"
                      style={{ backgroundColor: previewFrame }}
                    >
                      <span className="truncate">{formData.name || "EduCom Excellence"}</span>
                      <span className="text-[9.5px] font-mono opacity-80 uppercase">{previewColor}</span>
                    </div>
                    <div className="h-5 px-3 flex items-center justify-between text-[10px] border-t border-black/5" style={{ backgroundColor: previewSidebar }}>
                      <span className="text-slate-600 font-medium">Bandeau & Rail personnalisés</span>
                      <span className="text-primary font-bold">Action protégée</span>
                    </div>
                  </div>
                );
              })()}

              {/* Sélecteur de palette partagée compact */}
              <SharedColorPicker
                mode="shell"
                value={formData.primaryColor || ""}
                onChange={(newColor) => {
                  setFormData((prev) => ({ ...prev, primaryColor: newColor }));
                  if (typeof document !== "undefined" && isValidHexColor(newColor)) {
                    document.documentElement.style.setProperty("--color-frame-bg", newColor);
                    document.documentElement.style.setProperty("--color-topbar-bg", newColor);
                    document.documentElement.style.setProperty("--color-rail-bg", newColor);
                    document.documentElement.style.setProperty("--color-sidebar-bg", `color-mix(in srgb, ${newColor} 7%, #F8FAFC)`);
                    document.documentElement.style.setProperty("--color-sidebar-hover", `color-mix(in srgb, ${newColor} 12%, #F1F5F9)`);
                    document.documentElement.style.setProperty("--color-sidebar-active", `color-mix(in srgb, ${newColor} 16%, #FFFFFF)`);
                    document.documentElement.style.setProperty("--color-rail-accent", newColor);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 3 : CONFORMITÉ LÉGALE & PROTECTION DES DONNÉES (CDP)              */}
        {/* ========================================================================= */}
        {activeTab === "conformite" && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Protection des Données Personnelles
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                      CDP Sénégal (Loi 2008-12)
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Gouvernance et déclaration préalable pour la protection des élèves et personnels.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const { getCdpDeclarationDataAction } = await import("./actions");
                  const res = await getCdpDeclarationDataAction();
                  if (res && res.data) {
                    setCdpModalData(res.data);
                  } else {
                    toast.error("Impossible de générer le modèle CDP.");
                  }
                }}
              >
                <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                Déclaration CDP officielle
              </Button>
            </div>

            {/* 3 garanties clés en colonnes compactes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Registre des Traitements</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  Fichiers scolaires répertoriés selon l&apos;art. 18 de la loi sénégalaise.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Étanchéité & Chiffrement</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  Données isolées par établissement et chiffrées au repos et en transit.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Droits d&apos;Accès Familles</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  Droit d&apos;accès, rectification et suppression garanti aux tuteurs légaux.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${school.dataProcessingAcceptedAt ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span>Sous-traitance DPA : <strong>{school.dataProcessingAcceptedAt ? "Validé" : "En cours"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${school.waveTermsAcceptedAt ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span>Wave Business : <strong>{school.waveTermsAcceptedAt ? "Activé" : "Non configuré"}</strong></span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">Établissement enregistré au Sénégal</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 4 : QUIZ & RETOURS TESTEURS PAR MÉTIER                            */}
        {/* ========================================================================= */}
        {activeTab === "testeurs" && (
          <VueRetoursTesteurs userRole="OWNER" />
        )}

        {/* Bouton de sauvegarde principal */}
        {activeTab !== "testeurs" && (
          <div className="flex justify-end pt-2">
            <Button
              data-tour="settings-submit-btn"
              type="submit"
              size="md"
              loading={isSaving}
              icon={<Save aria-hidden="true" className="h-4 w-4" />}
            >
              {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        )}
      </form>

      {/* Modale Déclaration CDP */}
      {cdpModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{cdpModalData.title}</h3>
                  <p className="text-[11px] text-slate-500">Cadre juridique : {cdpModalData.referenceLaw}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCdpModalData(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                Ce document pré-rempli reprend les mentions requises par l&apos;article 18 de la loi n° 2008-12 pour votre déclaration de fichier auprès de la CDP Sénégal.
              </p>

              {cdpModalData.sections.map((sec) => (
                <div key={sec.number} className="space-y-1.5 border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-purple-800 uppercase text-[10.5px] tracking-wider">
                    {sec.number}. {sec.title}
                  </h4>
                  <div className="space-y-1 pl-2">
                    {sec.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                        <span className="font-semibold text-slate-500 w-44 shrink-0">{item.label} :</span>
                        <span className="text-slate-900 font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={() => setCdpModalData(null)}>
                Fermer
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                Imprimer / PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
