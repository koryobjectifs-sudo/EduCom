"use client";

import { useState } from "react";
import { updateSchoolSettings, updateActiveAcademicYear } from "./actions";
import { Save, Building2, Phone, Mail, MapPin, Image as ImageIcon, ChevronRight, UploadCloud, Calendar, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SettingsClient({
  school,
  availableYears = [],
}: {
  school: any;
  availableYears?: string[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const res = await updateSchoolSettings(formData);
    
    if (res.success) {
      toast.success("Réglages mis à jour avec succès", {
        description: "Vos modifications ont bien été enregistrées."
      });
    } else {
      toast.error("Erreur lors de l'enregistrement", {
        description: "Veuillez réessayer plus tard."
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Réglages</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gérez l'année scolaire active et les informations de votre établissement.
          </p>
        </div>
      </div>

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
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            loading={isSaving}
            icon={<Save aria-hidden="true" className="h-4 w-4" />}
          >
            {isSaving ? "Enregistrement..." : "Enregistrer l'identité"}
          </Button>
        </div>

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

      {/* SECTION 2: Identité Visuelle */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary ml-4 mb-2 uppercase tracking-wider">Identité Visuelle</h2>
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden p-2">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            
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
        </div>
        <p className="text-xs text-text-muted ml-4 mt-3">
          Ces éléments visuels apparaîtront sur les factures, bulletins et certificats générés par EduCom.
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
