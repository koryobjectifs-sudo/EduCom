"use client";

import { useActionState } from "react";
import { createStudent } from "../actions";
import Link from "next/link";
import { ArrowLeft, User, Users, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";

type Class = {
  id: string;
  name: string;
};

export function StudentForm({ classes }: { classes: Class[] }) {
  const [state, formAction, isPending] = useActionState<any, any>(
    async (prevState: any, formData: FormData) => {
      const res = await createStudent(formData);
      if (res?.error) {
        return res;
      }
      return res;
    },
    { error: "" }
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 pb-2">
        <Link
          href="/dashboard/students"
          className="rounded-full p-2 text-text-muted hover:bg-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Nouvelle Admission
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Inscrivez un nouvel élève et renseignez les informations du responsable légal.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-8">
        
        {/* SECTION 1: L'ÉLÈVE */}
        <div className="rounded-3xl border border-border bg-white shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-5 h-5"/>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Informations de l'Élève
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Prénom"
              required
              type="text"
              name="firstName"
              id="firstName"
              defaultValue={state?.formData?.firstName}
            />
            <Input
              label="Nom de famille"
              required
              type="text"
              name="lastName"
              id="lastName"
              defaultValue={state?.formData?.lastName}
            />
            <Input
              label="Date de naissance"
              type="date"
              name="dateOfBirth"
              id="dateOfBirth"
              defaultValue={state?.formData?.dateOfBirth}
            />
            <Select
              label="Classe"
              required
              name="classId"
              id="classId"
              defaultValue={state?.formData?.classId}
            >
                <option value="">Sélectionner une classe...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </Select>
          </div>
        </div>

        {/* SECTION 2: LE PARENT */}
        <div className="rounded-3xl border border-border bg-white shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-[#f3e8ff] flex items-center justify-center text-[#7e22ce]">
              <Users className="w-5 h-5"/>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Responsable Légal
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Prénom du parent"
              required
              type="text"
              name="parentFirstName"
              id="parentFirstName"
              defaultValue={state?.formData?.parentFirstName}
            />
            <Input
              label="Nom du parent"
              required
              type="text"
              name="parentLastName"
              id="parentLastName"
              defaultValue={state?.formData?.parentLastName}
            />
            <Input
              label="Téléphone (WhatsApp)"
              required
              type="tel"
              name="parentPhone"
              id="parentPhone"
              placeholder="+221 ..."
              defaultValue={state?.formData?.parentPhone}
            />
            <Input
              label="Adresse Email"
              type="email"
              name="parentEmail"
              id="parentEmail"
              placeholder="Optionnel"
              defaultValue={state?.formData?.parentEmail}
            />
            <Input
              label="Adresse du domicile"
              type="text"
              name="address"
              id="address"
              placeholder="Optionnel"
              defaultValue={state?.formData?.address}
              className="sm:col-span-2"
            />
          </div>
        </div>

        {/* SECTION 3: DOSSIER MÉDICAL & URGENCE */}
        <div className="rounded-3xl border border-border bg-white shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/></svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Médical & Urgence
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Groupe Sanguin"
              name="bloodGroup"
              id="bloodGroup"
              defaultValue={state?.formData?.bloodGroup || ""}
            >
                <option value="">Non renseigné</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
            </Select>
            <Input
              label="Allergies / Notes médicales"
              type="text"
              name="medicalNotes"
              id="medicalNotes"
              placeholder="Optionnel"
              defaultValue={state?.formData?.medicalNotes}
            />
            <div className="sm:col-span-2 pt-2 border-t border-gray-100 mt-2">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Contact en cas d'urgence</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
              label="Nom du contact"
              type="text"
              name="emergencyContact"
              id="emergencyContact"
              placeholder="Ex: Oncle, Tante..."
              defaultValue={state?.formData?.emergencyContact}
            />
                <Input
              label="Téléphone d'urgence"
              type="tel"
              name="emergencyPhone"
              id="emergencyPhone"
              placeholder="Optionnel"
              defaultValue={state?.formData?.emergencyPhone}
            />
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS & SUBMIT */}
        <div className="bg-[#e0f2fe] rounded-2xl p-5 flex gap-4 items-start">
          <CheckCircle2 className="w-5 h-5 text-[#0369a1] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#0369a1] font-medium leading-relaxed">
            En validant ce formulaire, le système créera automatiquement le dossier de l'élève, l'assignera à sa classe, et générera le profil de contact pour le responsable légal.
          </p>
        </div>

        {state?.error && (
          <p className="text-sm text-error font-medium bg-error/10 p-4 rounded-2xl">{state.error}</p>
        )}

        {state?.requiresConfirmation ? (
          <div className="bg-[#fefce8] border border-[#fef08a] rounded-2xl p-6">
            <h3 className="text-[#854d0e] font-semibold mb-2 flex items-center gap-2">
              <User className="w-5 h-5" /> Parent déjà enregistré
            </h3>
            <p className="text-sm text-[#a16207] mb-5">
              Un parent nommé <strong>{state.existingParentName}</strong> est déjà enregistré dans l'école avec ce numéro de téléphone ou cet email. 
              Voulez-vous attribuer cet élève à ce même responsable légal ?
            </p>
            <div className="flex flex-wrap gap-3">
              <input type="hidden" name="existingParentId" value={state.existingParentId} />
              
              {/* Note: We use hidden fields to preserve the student info on the second submit */}
              <Button type="submit" loading={isPending}>
                {isPending ? "Attribution..." : "Oui, lier à cette famille"}
              </Button>
              
              <Link
                href="/dashboard/students"
                className="px-6 py-2.5 text-sm font-medium text-[#854d0e] bg-white border border-[#fef08a] rounded-xl hover:bg-[#fefce8] transition-colors"
              >
                Annuler
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-3 pt-6">
            <Link
              href="/dashboard/students"
              className="px-6 py-3 text-sm font-medium text-text-primary bg-white border border-border rounded-xl hover:bg-secondary transition-colors"
            >
              Annuler
            </Link>
            <Button type="submit" size="lg" loading={isPending} icon={<Save aria-hidden="true" className="w-4 h-4" />}>
              {isPending ? "Admission en cours..." : "Valider l'admission"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
