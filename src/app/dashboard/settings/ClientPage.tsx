"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { updateSchoolSettings } from "./actions";
import { Save, Building2, Phone, Mail, MapPin, Image as ImageIcon, ChevronRight, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function SettingsClient({ school }: { school: any }) {
  const [isSaving, setIsSaving] = useState(false);
  
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


  const handleSubmit = async (e: React.FormEvent) => {
// ... existing handleSubmit ...
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
// ... existing handleFileUpload ...
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-12">
// ... existing UI sections up to SECTION 3 ...
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Réglages</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gérez les informations de votre établissement.
          </p>
        </div>
        
        <Button
          type="submit"
          size="lg"
          loading={isSaving}
          icon={<Save aria-hidden="true" className="h-4 w-4" />}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
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

      {/* SECTION 3: Finances (Grille tarifaire) */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary ml-4 mb-2 uppercase tracking-wider">Finances</h2>
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-[#fef08a]/40 flex items-center justify-center shadow-sm border border-[#fef08a]">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Grille tarifaire officielle</h3>
                <p className="text-sm text-text-secondary mt-0.5">Définissez les frais de scolarité, inscriptions et autres montants par classe.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.location.href = "/dashboard/settings/fees"}
            >
              Gérer les tarifs <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>


    </form>
  );
}
