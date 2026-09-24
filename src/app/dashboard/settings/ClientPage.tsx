"use client";

import { useState } from "react";
import Link from "next/link";
import { updateSchoolSettings, updateActiveAcademicYear, updateSchoolPrimaryColor } from "./actions";
import { Save, Building2, Phone, Mail, MapPin, Image as ImageIcon, ChevronRight, UploadCloud, Calendar, ArrowRight, CheckCircle2, ShieldCheck, Check, Loader2, Palette, Sparkles, RotateCcw, Eye, Search, LayoutDashboard, Users, GraduationCap, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getContrastRatioAgainstWhite, isValidHexColor, PRESET_SCHOOL_COLORS, DEFAULT_EDUCOM_NAVY, schoolThemeStyle } from "@/lib/theme";
import SharedColorPicker from "@/components/ui/SharedColorPicker";

export default function SettingsClient({
  school,
  availableYears = [],
}: {
  school: any;
  availableYears?: string[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingColor, setIsApplyingColor] = useState(false);
  const [selectedColorCategory, setSelectedColorCategory] = useState<string>("Tous");
  const [isUpdatingYear, setIsUpdatingYear] = useState(false);
  const [activeYear, setActiveYear] = useState(school.activeAcademicYear || "2026-2027");
  const [selectedYear, setSelectedYear] = useState(activeYear);
  const [customYear, setCustomYear] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [cdpModalData, setCdpModalData] = useState<any>(null);

  // Pas de `schoolId` ici : l'action le résout depuis la session. Le laisser
  // transiter par le client en ferait une valeur falsifiable.
  const [formData, setFormData] = useState({
    name: school.name || "",
    email: school.email || "",
    phone: school.phone || "",
    address: school.address || "",
    logo: school.logo || "",
    stamp: school.stamp || "",
    signature: school.signature || "",
    primaryColor: school.primaryColor || DEFAULT_EDUCOM_NAVY,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
    // Application instantanée aux variables CSS des cadres (TopBar, Rail & Sidebar) sans altérer les boutons
    document.documentElement.style.setProperty("--color-frame-bg", color);
    document.documentElement.style.setProperty("--color-topbar-bg", color);
    document.documentElement.style.setProperty("--color-rail-bg", color);
    document.documentElement.style.setProperty("--color-sidebar-bg", `color-mix(in srgb, ${color} 7%, #F8FAFC)`);
    document.documentElement.style.setProperty("--color-sidebar-hover", `color-mix(in srgb, ${color} 12%, #F1F5F9)`);
    document.documentElement.style.setProperty("--color-sidebar-active", `color-mix(in srgb, ${color} 16%, #FFFFFF)`);
    document.documentElement.style.setProperty("--color-rail-accent", color);

    const res = await updateSchoolPrimaryColor(color);
    if (res.success) {
      toast.success("Couleur des cadres appliquée !", {
        description: `La teinte ${color.toUpperCase()} habille désormais le Rail et la TopBar de votre établissement.`,
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
    document.documentElement.style.setProperty("--color-rail-accent", "#9C0F15");

    setFormData(prev => ({ ...prev, primaryColor: defaultNavy }));

    const res = await updateSchoolPrimaryColor(null);
    if (res.success) {
      toast.success("Thème initial EduCom rétabli", {
        description: "Les cadres ont retrouvé la teinte Navy officielle EduCom (#0E2541).",
      });
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
        description: "Vos modifications ont bien été enregistrées."
      });
      router.refresh();
    } else {
      toast.error("Erreur lors de l'enregistrement", {
        description: res.error || "Veuillez vérifier les informations renseignées."
      });
    }
    
    setIsSaving(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({...prev, [field]: reader.result as string}));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Administration" },
        ]}
        title="Établissement & Identité"
        description="Identité officielle, coordonnées, charte graphique et session active de l'établissement."
        actions={
          <Button
            type="submit"
            form="settings-form"
            size="md"
            loading={isSaving}
            icon={<Save aria-hidden="true" className="h-4 w-4" />}
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        }
      />

      {/* SECTION 0: Année Scolaire Active (Source Unique de Vérité) */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary ml-4 mb-2 uppercase tracking-wider">
          Session & Année scolaire active
        </h2>
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4 max-w-xl">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">
                    Année active : {activeYear}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> En cours
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  L'année scolaire active est la source unique de vérité pour tout votre établissement.
                  Elle détermine la session affichée par défaut sur le tableau de bord, le registre des élèves, les classes, les paiements et les bulletins.
                </p>
                <p className="text-xs text-text-muted pt-1">
                  Changer d'année ne supprime aucune donnée : les effectifs et notes des années précédentes restent archivés et consultables à tout moment.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-secondary/30 p-3 rounded-2xl border border-border shrink-0">
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
                  className="px-3 py-2 bg-white border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      Année {y} {y === activeYear ? "(actuelle)" : ""}
                    </option>
                  ))}
                  <option value="__NEW__">+ Définir une nouvelle session...</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 2027-2028"
                    value={customYear}
                    onChange={(e) => setCustomYear(e.target.value)}
                    className="px-3 py-2 bg-white border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary w-32"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="text-xs text-text-muted hover:text-text-primary underline"
                  >
                    Annuler
                  </button>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={isUpdatingYear}
                disabled={!isCustomMode && selectedYear === activeYear}
                onClick={handleYearChange}
              >
                Basculer la session
              </Button>
            </div>
          </div>

          {/* Accès direct à la réinscription en masse */}
          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 -mx-6 -mb-6 p-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  Préparer la rentrée scolaire (Réinscription en masse)
                </h4>
                <p className="text-xs text-text-secondary">
                  Faites passer automatiquement vos effectifs de classe en classe pour la nouvelle session scolaire.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings/reinscription"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors shrink-0 shadow-xs"
            >
              Préparer la rentrée
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} className="space-y-8">

      {/* SECTION 1: Informations Générales */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary ml-4 mb-2 uppercase tracking-wider">Général</h2>
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border/50">
            
            {/* Nom */}
            <div className="flex items-center justify-between p-4 px-5 bg-white hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 w-1/3">
                <div className="h-8 w-8 rounded-lg bg-[#ffedd5] flex items-center justify-center shadow-sm">
                  <Building2 className="w-4 h-4 text-[#ea580c]" />
                </div>
                <label htmlFor="name" className="text-sm font-medium text-text-primary whitespace-nowrap">Nom de l'école</label>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none text-right text-sm font-medium text-text-secondary focus:text-text-primary focus:ring-0 focus:outline-none placeholder:text-text-muted"
                  placeholder="Ex: EduCom Excellence"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-4 px-5 bg-white hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 w-1/3">
                <div className="h-8 w-8 rounded-lg bg-[#e0f2fe] flex items-center justify-center shadow-sm">
                  <Mail className="w-4 h-4 text-[#0369a1]" />
                </div>
                <label htmlFor="email" className="text-sm font-medium text-text-primary whitespace-nowrap">Email</label>
              </div>
              <div className="flex-1">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none text-right text-sm font-medium text-text-secondary focus:text-text-primary focus:ring-0 focus:outline-none placeholder:text-text-muted"
                  placeholder="contact@ecole.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-4 px-5 bg-white hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 w-1/3">
                <div className="h-8 w-8 rounded-lg bg-[#dcfce3] flex items-center justify-center shadow-sm">
                  <Phone className="w-4 h-4 text-[#15803d]" />
                </div>
                <label htmlFor="phone" className="text-sm font-medium text-text-primary whitespace-nowrap">Téléphone</label>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none text-right text-sm font-medium text-text-secondary focus:text-text-primary focus:ring-0 focus:outline-none placeholder:text-text-muted"
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center justify-between p-4 px-5 bg-white hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 w-1/3">
                <div className="h-8 w-8 rounded-lg bg-[#ffe4e6] flex items-center justify-center shadow-sm">
                  <MapPin className="w-4 h-4 text-[#be123c]" />
                </div>
                <label htmlFor="address" className="text-sm font-medium text-text-primary whitespace-nowrap">Adresse</label>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none text-right text-sm font-medium text-text-secondary focus:text-text-primary focus:ring-0 focus:outline-none placeholder:text-text-muted"
                  placeholder="Dakar, Sénégal"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION 2: Identité Visuelle & Couleur de marque */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary ml-4 mb-2 uppercase tracking-wider">Identité Visuelle & Charte</h2>
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden p-4 space-y-4">
          
          {/* Grille 3 colonnes : Logo, Cachet, Signature */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Logo */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-transparent hover:border-border transition-colors group flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-medium text-text-primary mb-3">Logo de l'école</h3>
              
              <div className="relative mb-4">
                {formData.logo ? (
                  <div className="relative group/img">
                    <img src={formData.logo} alt="Logo" className="h-20 w-20 rounded-2xl object-contain bg-white shadow-sm border border-border p-2" />
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label="Retirer le logo"
                      onClick={() => setFormData(prev => ({...prev, logo: ""}))}
                      icon={<span aria-hidden="true">×</span>}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-pill opacity-0 group-hover/img:opacity-100 transition-opacity"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white shadow-sm border border-border flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-text-muted/40" />
                  </div>
                )}
              </div>
              
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors shadow-sm">
                <UploadCloud className="w-3.5 h-3.5" /> Modifier
                <input type="file" className="sr-only" accept="image/png, image/jpeg" onChange={(e) => handleFileUpload(e, "logo")} />
              </label>
            </div>

            {/* Cachet */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-transparent hover:border-border transition-colors group flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-medium text-text-primary mb-3">Cachet officiel</h3>
              
              <div className="relative mb-4">
                {formData.stamp ? (
                  <div className="relative group/img">
                    <img src={formData.stamp} alt="Cachet" className="h-20 w-20 rounded-2xl object-contain bg-white shadow-sm border border-border p-2" />
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label="Retirer le cachet"
                      onClick={() => setFormData(prev => ({...prev, stamp: ""}))}
                      icon={<span aria-hidden="true">×</span>}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-pill opacity-0 group-hover/img:opacity-100 transition-opacity"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white shadow-sm border border-border flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-text-muted/40" />
                  </div>
                )}
              </div>
              
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors shadow-sm">
                <UploadCloud className="w-3.5 h-3.5" /> Modifier
                <input type="file" className="sr-only" accept="image/png, image/jpeg" onChange={(e) => handleFileUpload(e, "stamp")} />
              </label>
            </div>

            {/* Signature */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-transparent hover:border-border transition-colors group flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-medium text-text-primary mb-3">Signature (Directeur)</h3>
              
              <div className="relative mb-4">
                {formData.signature ? (
                  <div className="relative group/img">
                    <img src={formData.signature} alt="Signature" className="h-20 w-20 rounded-2xl object-contain bg-white shadow-sm border border-border p-2" />
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label="Retirer la signature"
                      onClick={() => setFormData(prev => ({...prev, signature: ""}))}
                      icon={<span aria-hidden="true">×</span>}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-pill opacity-0 group-hover/img:opacity-100 transition-opacity"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white shadow-sm border border-border flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-text-muted/40" />
                  </div>
                )}
              </div>
              
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors shadow-sm">
                <UploadCloud className="w-3.5 h-3.5" /> Modifier
                <input type="file" className="sr-only" accept="image/png, image/jpeg" onChange={(e) => handleFileUpload(e, "signature")} />
              </label>
            </div>

          </div>

          {/* Couleur des Cadres Établissement (Rail & TopBar unifiés Slack-style + Sidebar plus légère) */}
          <div className="mt-4 pt-4 border-t border-border p-4 bg-secondary/20 rounded-2xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full inline-block shadow-2xs border border-black/10 transition-colors duration-200"
                    style={{ backgroundColor: formData.primaryColor }}
                  />
                  Couleur des cadres (TopBar & Rail unifiés Slack-style)
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Habille le Rail et la TopBar avec la couleur de votre école, et la Sidebar contextuelle avec une teinte plus claire. Les boutons d&apos;action restent bleus, constants et accessibles.
                </p>
              </div>

              {/* Actions de couleur */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Bouton Rétablir la couleur initiale EduCom */}
                <button
                  type="button"
                  onClick={() => handleResetColor()}
                  disabled={isApplyingColor}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                  title="Rétablir la couleur EduCom Navy par défaut (#0E2541)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rétablir initial</span>
                </button>

                {/* Bouton d'application directe */}
                <button
                  type="button"
                  onClick={() => handleApplyColor()}
                  disabled={isApplyingColor}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: isValidHexColor(formData.primaryColor) ? formData.primaryColor : DEFAULT_EDUCOM_NAVY }}
                  title="Valider et appliquer cette couleur immédiatement à tout l'espace"
                >
                  {isApplyingColor ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Application...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Appliquer la couleur</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* GRAND APERÇU EN DIRECT DU SHELL (Slack-Style) */}
            {(() => {
              const activePreviewColor = isValidHexColor(formData.primaryColor) ? formData.primaryColor : DEFAULT_EDUCOM_NAVY;
              /**
               * ⚠️ Lit exactement la fonction qui alimente le vrai Shell
               * (`dashboard/layout.tsx`) plutôt que de recalculer sa propre
               * formule : pour les 24 teintes existantes, chaque valeur est
               * identique à l'ancien calcul local (même chaîne de caractères,
               * zéro changement visuel). Pour EduCom Aurora, l'aperçu montre
               * enfin le traitement navy + accents réellement appliqué.
               */
              const previewTheme = (schoolThemeStyle(activePreviewColor) ?? {}) as Record<string, string>;
              const previewFrame = previewTheme["--color-topbar-bg"] ?? activePreviewColor;
              const previewSidebar = previewTheme["--color-sidebar-bg"] ?? `color-mix(in srgb, ${activePreviewColor} 7%, #F8FAFC)`;
              const previewAccent = previewTheme["--color-rail-accent"] ?? activePreviewColor;
              return (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs">
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Aperçu en direct du Shell</span>
                      </div>
                      <span className="text-xs text-text-muted hidden sm:inline">
                        — Mise à jour instantanée avec votre sélection
                      </span>
                    </div>

                    {/* Légende rapide */}
                    <div className="flex items-center gap-3 text-[11px] text-text-secondary flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/15" style={{ backgroundColor: activePreviewColor }} />
                        <span className="font-medium text-slate-700">TopBar & Rail</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/15" style={{ backgroundColor: `color-mix(in srgb, ${activePreviewColor} 20%, #F8FAFC)` }} />
                        <span className="font-medium text-slate-700">Sidebar douce</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block bg-primary border border-primary/30" />
                        <span className="font-semibold text-primary">Boutons (Bleu fixe)</span>
                      </span>
                    </div>
                  </div>

                  {/* Fenêtre maquette Slack-style haute-fidélité */}
                  <div className="w-full rounded-xl border border-black/15 shadow-sm overflow-hidden flex flex-col h-[190px] sm:h-[220px] bg-slate-100 transition-colors duration-200">
                    {/* TopBar unifiée */}
                    <div
                      className="h-8 sm:h-9 w-full flex items-center justify-between px-3 text-white transition-colors duration-200 select-none shrink-0"
                      style={{ backgroundColor: previewFrame }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="flex items-center gap-1 text-white/50 text-[11px]">
                          <span className="cursor-default">‹</span>
                          <span className="cursor-default">›</span>
                        </div>
                        <span className="text-xs font-bold text-white tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
                          {formData.name || "EduCom Excellence"}
                        </span>
                        <span className="text-white/40 text-xs hidden sm:inline">/</span>
                        <span className="text-white/80 text-[11px] hidden sm:inline font-medium">Tableau de bord</span>
                      </div>

                      {/* Barre de recherche Slack-style */}
                      <div className="flex items-center justify-center flex-1 max-w-[180px] sm:max-w-[260px] mx-2">
                        <div className="w-full flex items-center justify-between h-5.5 px-2 rounded-md bg-black/20 border border-white/15 text-[11px] text-white/80">
                          <div className="flex items-center gap-1.5 truncate">
                            <Search className="h-3 w-3 text-white/60 shrink-0" />
                            <span className="truncate text-white/70 text-[10.5px]">Rechercher un élève, classe...</span>
                          </div>
                          <kbd className="hidden sm:inline text-[9px] font-mono bg-white/10 px-1 rounded text-white/80">⌘K</kbd>
                        </div>
                      </div>

                      {/* Avatar profil */}
                      <div className="flex items-center gap-1.5">
                        <div className="h-5.5 w-5.5 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center text-[10px] font-bold">
                          AD
                        </div>
                      </div>
                    </div>

                    {/* Corps : Rail + Espace de travail (Sidebar Contextuelle arrondie + Canvas) */}
                    <div className="flex flex-1 overflow-hidden">
                      {/* 1. AppRail (68px) */}
                      <div
                        className="w-12 sm:w-14 h-full flex flex-col items-center py-2 gap-2 text-white/70 transition-colors duration-200 select-none shrink-0"
                        style={{ backgroundColor: previewFrame }}
                      >
                        <div className="h-6 w-6 rounded-md bg-white/20 text-white flex items-center justify-center shadow-2xs">
                          <LayoutDashboard className="h-3.5 w-3.5" />
                        </div>
                        <div className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                        <div className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60">
                          <GraduationCap className="h-3.5 w-3.5" />
                        </div>
                        <div className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60">
                          <DollarSign className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      {/* Conteneur Espace de travail avec coin supérieur gauche arrondi Slack-style */}
                      <div className="flex flex-1 overflow-hidden sm:rounded-tl-2xl border-t border-l border-black/15 shadow-xs">
                        {/* 2. Contextual Sidebar (Arrondi au coin supérieur gauche contre TopBar & Rail) */}
                        <div
                          className="w-36 sm:w-44 h-full flex flex-col p-2 space-y-1.5 border-r border-slate-200/80 transition-colors duration-200 select-none shrink-0 sm:rounded-tl-2xl"
                          style={{ backgroundColor: previewSidebar }}
                        >
                          <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 px-1.5 pt-0.5">
                            Scolarité
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div
                              className="flex items-center gap-2 px-2 py-1 rounded-md bg-white text-slate-900 font-semibold shadow-2xs border-l-2"
                              style={{ borderLeftColor: previewAccent }}
                            >
                              <span className="truncate text-[11px]">Tableau de bord</span>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md text-slate-600 hover:bg-black/5">
                              <span className="truncate text-[11px]">Élèves & Inscriptions</span>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md text-slate-600 hover:bg-black/5">
                              <span className="truncate text-[11px]">Classes & Bulletins</span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Canevas de Travail Principal (Continu et affleurant) */}
                        <div className="flex-1 bg-white p-3 sm:p-4 overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-[10px] text-text-muted font-medium">Session en cours : {activeYear}</div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                                Tableau de bord
                              </h4>
                            </div>

                            {/* Démonstration Bouton d'action standard : BLEU FIXE ISOLE */}
                            <button
                              type="button"
                              tabIndex={-1}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold shadow-xs cursor-default hover:bg-primary/95"
                            >
                              <span>+ Nouvel élève</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                              <div className="text-[9.5px] text-text-muted uppercase">Effectif total</div>
                              <div className="text-xs sm:text-sm font-bold text-slate-800">428 élèves</div>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                              <div className="text-[9.5px] text-text-muted uppercase">Taux de présence</div>
                              <div className="text-xs sm:text-sm font-bold text-emerald-700">97.8 %</div>
                            </div>
                          </div>
                        </div>

                        {/* Note informative de validation visuelle */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-md mt-1">
                          <span className="truncate">
                            🔒 <strong>Boutons protégés :</strong> restent bleus EduCom pour garantir accessibilité et lisibilité.
                          </span>
                          <span className="font-mono font-semibold text-slate-700 uppercase ml-2">{activePreviewColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

            {/* Palette Partagée 36 Teintes (12 teintes × 3 intensités) + Champ libre + Contraste */}
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
              label="Palette officielle de l'établissement (Shell, Rail & TopBar)"
            />

            <div className="flex items-center justify-end pt-3 border-t border-border/60">

              {/* Bouton secondaire de validation directe */}
              <button
                type="button"
                onClick={() => handleApplyColor()}
                disabled={isApplyingColor}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
              >
                {isApplyingColor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Valider cette couleur</span>
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted ml-4 mt-2">
          Ces éléments visuels et votre couleur d&apos;accent s&apos;appliquent immédiatement à votre espace et sur vos documents officiels.
        </p>
      </div>

      {/* SECTION 4: Conformité Légale & CDP Sénégal (Loi n° 2008-12) */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary ml-4 mb-2 uppercase tracking-wider">
          Conformité légale & Protection des Données (CDP)
        </h2>
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">
                    Modèle officiel de Déclaration Préalable CDP
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    Loi 2008-12
                  </span>
                </div>
                <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                  Document pré-rempli avec les informations officielles de {school.name} (finalités scolaires, catégories d&apos;élèves et de tuteurs, sous-traitance technique EduCom).
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const { getCdpDeclarationDataAction } = await import("./actions");
                const res = await getCdpDeclarationDataAction();
                if (res && "data" in res) {
                  setCdpModalData(res.data);
                } else {
                  toast.error("Impossible de générer le modèle CDP.");
                }
              }}
              className="shrink-0"
            >
              Générer mon document CDP
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${school.dataProcessingAcceptedAt ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>Convention sous-traitance DPA : <strong>{school.dataProcessingAcceptedAt ? "Acceptée" : "En attente du 1er import"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${school.waveTermsAcceptedAt ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span>Conditions spécifiques Wave : <strong>{school.waveTermsAcceptedAt ? "Acceptées" : "Non connectée"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          loading={isSaving}
          icon={<Save aria-hidden="true" className="h-4 w-4" />}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>

    {/* Modale Déclaration CDP */}
    {cdpModalData && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-rule overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-6 border-b border-rule flex items-center justify-between bg-sunk/30">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-bold text-text text-base">{cdpModalData.title}</h3>
                <p className="text-xs text-text-soft">Cadre juridique : {cdpModalData.referenceLaw}</p>
              </div>
            </div>
            <button
              onClick={() => setCdpModalData(null)}
              className="p-2 rounded-full hover:bg-rule text-text-soft hover:text-text transition-colors"
            >
              <span className="sr-only">Fermer</span>
              ×
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 text-xs text-text leading-relaxed">
            <p className="text-text-soft bg-sunk p-3 rounded-xl border border-rule/50">
              Ce document pré-rempli reprend l&apos;ensemble des informations requises par l&apos;article 18 de la loi n° 2008-12 pour votre déclaration de fichier auprès de la Commission de Protection des Données Personnelles (CDP).
            </p>

            {cdpModalData.sections.map((sec: any) => (
              <div key={sec.number} className="space-y-2 border-b border-rule/40 pb-4">
                <h4 className="font-bold text-primary uppercase text-[11px] tracking-wider">
                  {sec.number}. {sec.title}
                </h4>
                <div className="space-y-1.5 pl-2">
                  {sec.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                      <span className="font-semibold text-text-soft w-48 shrink-0">{item.label} :</span>
                      <span className="text-text font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-rule bg-sunk/30 flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={() => setCdpModalData(null)}>
              Fermer
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Imprimer / Enregistrer en PDF
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
