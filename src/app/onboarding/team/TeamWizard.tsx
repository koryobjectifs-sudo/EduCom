"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Plus, Trash2, Check, Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ROLE_LABELS, type RoleType } from "@/lib/permissions";
import { bulkInviteTeam } from "./actions";
import { toast } from "sonner";

type MemberDraft = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleType;
  classId?: string;
};

type Props = {
  schoolId: string;
  schoolName: string;
  existingTeachers: any[];
  existingClasses: any[];
};

const ASSIGNABLE: RoleType[] = ["TEACHER", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "ADMIN"];

export default function TeamWizard({ schoolId, schoolName, existingTeachers, existingClasses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const step = parseInt(searchParams.get("step") ?? "1", 10);
  const setStep = (s: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("step", s.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const [members, setMembers] = useState<MemberDraft[]>([
    { id: "1", firstName: "", lastName: "", email: "", role: "TEACHER" }
  ]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const addMember = () => {
    setMembers([...members, { id: Math.random().toString(), firstName: "", lastName: "", email: "", role: "TEACHER" }]);
  };

  const removeMember = (id: string) => {
    if (members.length > 1) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const updateMember = (id: string, field: keyof MemberDraft, value: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const validMembersStep1 = members.every(m => m.firstName.trim() && m.lastName.trim() && m.email.trim());
  const hasTeachers = members.some(m => m.role === "TEACHER");

  async function handleFinish() {
    setBusy(true);
    const res = await bulkInviteTeam(members);
    setBusy(false);
    if (res.success && res.results) {
      setResults(res.results);
      setStep(4);
    } else {
      toast.error("Une erreur est survenue: " + res.error);
    }
  }

  // --- Step 4 : Succès ---
  if (step === 4 && results) {
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-6">
          <Check className="h-8 w-8" />
        </div>

        <h1 className="text-[24px] font-bold tracking-tight text-text">
          Équipe créée avec succès
        </h1>
        <p className="mt-2 text-[14px] text-text-soft">
          Les invitations ont été générées. Copiez les liens et envoyez-les à vos collaborateurs.
        </p>

        <div className="mt-8 text-left bg-surface border border-rule rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-3">
          {results.map((r, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-sunk/30 rounded-lg">
              <div className="min-w-0 pr-4">
                <div className="font-medium text-sm text-text truncate">{r.email}</div>
                {r.success ? (
                  <div className="text-xs text-primary font-mono mt-1 truncate max-w-[200px] sm:max-w-[300px]">Lien : {r.link}</div>
                ) : (
                  <div className="text-xs text-danger mt-1">{r.error}</div>
                )}
              </div>
              {r.success && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(`Rejoignez notre espace EduCom : ${r.link}`);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button size="lg" onClick={() => router.push("/dashboard")} className="w-full">
            Accéder au tableau de bord
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.section>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-16 rounded-full transition-colors duration-300 ${
                i + 1 === step ? "bg-primary" : i + 1 < step ? "bg-primary/30" : "bg-rule"
              }`}
            />
          ))}
        </div>
        <div className="text-[12px] font-semibold tracking-wider text-text-faint">
          Étape {step} sur 3
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full relative"
        >
          {/* ETAPE 1: Ajout + Rôles */}
          {step === 1 && (
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
                Constituez votre équipe
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center px-4">
                Ajoutez les collaborateurs qui vous aideront à gérer {schoolName}.
              </p>

              <div className="mt-6 space-y-4 max-h-[400px] overflow-y-auto px-1 pb-4">
                {members.map((m, index) => (
                  <div key={m.id} className="relative p-4 border border-rule/50 rounded-xl bg-surface/50 space-y-3">
                    <div className="absolute right-2 top-2">
                      <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)} disabled={members.length === 1} className="text-danger/70 hover:text-danger hover:bg-danger/10 h-7 w-7 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pr-8">
                      <Input
                        label="Prénom"
                        value={m.firstName}
                        onChange={(e) => updateMember(m.id, "firstName", e.target.value)}
                        placeholder="Ex: Aminata"
                        autoFocus={index === members.length - 1}
                      />
                      <Input
                        label="Nom"
                        value={m.lastName}
                        onChange={(e) => updateMember(m.id, "lastName", e.target.value)}
                        placeholder="Ex: Ndiaye"
                      />
                    </div>
                    <Input
                      label="Email"
                      value={m.email}
                      type="email"
                      onChange={(e) => updateMember(m.id, "email", e.target.value)}
                      placeholder="aminata@ecole.com"
                    />
                    <Select
                      label="Rôle"
                      value={m.role}
                      onChange={(e) => updateMember(m.id, "role", e.target.value)}
                    >
                      {ASSIGNABLE.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                      ))}
                    </Select>
                  </div>
                ))}

                <Button variant="ghost" onClick={addMember} className="w-full border border-dashed border-rule/70 hover:bg-sunk/50 hover:border-text-faint text-text-soft h-12">
                  <Plus className="mr-2 h-4 w-4" /> Ajouter un autre membre
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
                <Button size="lg" variant="ghost" onClick={() => router.push("/dashboard")}>
                  Ignorer
                </Button>
                <Button size="lg" onClick={() => setStep(hasTeachers ? 2 : 3)} disabled={!validMembersStep1}>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ETAPE 2: Affectation (Professeurs) */}
          {step === 2 && (
            <div>
              <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
                Affectation des professeurs
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center px-4">
                Associez vos professeurs à leur classe principale (facultatif).
              </p>

              <div className="mt-6 space-y-4">
                {members.filter(m => m.role === "TEACHER").map(teacher => (
                  <div key={teacher.id} className="p-4 border border-rule/50 rounded-xl bg-surface/50">
                    <div className="font-semibold text-sm text-text mb-3">
                      {teacher.firstName} {teacher.lastName}
                    </div>
                    <Select
                      label="Classe"
                      value={teacher.classId || ""}
                      onChange={(e) => updateMember(teacher.id, "classId", e.target.value)}
                    >
                      <option value="">Ne pas affecter pour le moment</option>
                      {existingClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
                <Button size="lg" variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button size="lg" onClick={() => setStep(3)}>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ETAPE 3: Envoi / Validation */}
          {step === 3 && (
            <div>
              <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
                Résumé des ajouts
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center px-4">
                Vous êtes sur le point de créer {members.length} compte(s) pour votre équipe.
              </p>

              <div className="mt-6 bg-surface border border-rule rounded-xl p-4 space-y-3">
                {members.map(m => (
                  <div key={m.id} className="flex justify-between items-center text-sm border-b border-rule/30 last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="font-medium text-text">{m.firstName} {m.lastName}</div>
                      <div className="text-text-soft text-xs">{m.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-medium">{ROLE_LABELS[m.role].label}</div>
                      {m.role === "TEACHER" && m.classId && (
                        <div className="text-text-soft text-xs">
                          {existingClasses.find(c => c.id === m.classId)?.name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
                <Button size="lg" variant="ghost" onClick={() => setStep(hasTeachers ? 2 : 1)} disabled={busy}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button size="lg" onClick={handleFinish} loading={busy}>
                  Créer les comptes <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
