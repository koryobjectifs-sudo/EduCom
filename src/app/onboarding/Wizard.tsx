"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check, GraduationCap, School, Building, Baby, UserPlus,
} from "lucide-react";
import { LEVELS, classesForLevels } from "@/lib/curriculum";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

type WizardProps = { schoolName: string; userName: string };

const NIVEAUX = LEVELS.map((l) => ({
  ...l,
  label: l.id,
  icon: { Maternelle: Baby, Primaire: GraduationCap, "Collège": School, "Lycée": Building }[l.id]!,
  desc: {
    Maternelle: "Petite, moyenne et grande section",
    Primaire: "Du CI au CM2",
    "Collège": "De la 6ᵉ à la 3ᵉ",
    "Lycée": "De la seconde à la terminale",
  }[l.id]!,
}));

export default function Wizard({ schoolName: initialSchoolName, userName: initialUserName }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [schoolName, setSchoolName] = useState(initialSchoolName === "École en configuration" ? "" : initialSchoolName);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [firstName, setFirstName] = useState(initialUserName === "À configurer" ? "" : "");
  const [lastName, setLastName] = useState("");

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ classes: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const toggle = (id: string) =>
    setNiveaux((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  async function finish() {
    setBusy(true);
    setErreur(null);

    const res = await completeOnboarding({
      schoolName,
      address,
      phone,
      email,
      levels: niveaux,
      firstName,
      lastName
    });
    
    if (!res.success) {
      setBusy(false);
      setErreur(res.error ?? "La configuration n'a pas pu être enregistrée.");
      return;
    }

    setBusy(false);
    setDone({ classes: res.classesCreated });
  }

  /* ═══════════════ résultat ═══════════════ */

  if (done) {
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl border border-rule bg-surface p-6 shadow-card sm:p-10 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-6">
          <Check className="h-8 w-8" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-text">
          🎉 Félicitations !
        </h1>

        <p className="mt-4 text-[15px] leading-relaxed text-text-soft max-w-md mx-auto">
          <strong className="text-text font-semibold">{schoolName}</strong> est maintenant configurée dans EduCom. Votre établissement est prêt, commençons à lui donner vie.
        </p>

        <div className="mt-10 pt-8 border-t border-rule/50">
          <div className="flex flex-col items-center justify-center gap-4">
            <Button size="lg" onClick={() => router.push("/dashboard/students/import")} className="w-full sm:w-auto text-base h-12 px-8">
              <UserPlus aria-hidden="true" className="mr-2 h-5 w-5" />
              Importer mes élèves
            </Button>
            <p className="text-[12px] text-text-soft mb-2">
              Commencez par importer votre fichier Excel ou CSV pour configurer votre école plus rapidement.
            </p>
            <Button size="lg" variant="ghost" onClick={async () => {
              setBusy(true);
              const { injectDemoData } = await import("./demo-actions");
              await injectDemoData();
              router.push("/dashboard");
            }} className="w-full sm:w-auto text-text-soft hover:text-text mt-2" loading={busy}>
              {busy ? "Génération en cours..." : "Voir avec des données de démonstration"}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => router.push("/dashboard")} className="w-full sm:w-auto text-text-soft hover:text-text mt-2">
              Accéder à mon école
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${
                i + 1 === step
                  ? "bg-primary"
                  : i + 1 < step
                  ? "bg-primary/30"
                  : "bg-rule"
              }`}
            />
          ))}
        </div>
        <div className="text-[12px] font-semibold tracking-wider text-text-faint">
          ÉTAPE {step} SUR 5
        </div>
      </div>

      {erreur && (
        <div role="alert" className="mb-6 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] leading-relaxed text-danger">
          {erreur}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-2xl border border-rule/40 bg-surface p-5 sm:p-7 shadow-sm"
        >
        
        {step === 1 && (
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
              Quel est le nom de votre établissement ?
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center">
              Commençons par identifier votre école.
            </p>

            <div className="mt-6">
              <Input
                label="Nom de l'établissement"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Complexe scolaire Mariama Bâ"
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end pt-5 border-t border-rule/30">
              <Button size="lg" onClick={() => setStep(2)} disabled={!schoolName.trim()}>
                Continuer
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
              Où se trouve votre établissement ?
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center">
              Indiquez l'adresse de votre école.
            </p>

            <div className="mt-6">
              <Input
                label="Adresse de l'établissement"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Quartier, ville"
                autoFocus
              />
            </div>

            <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
              <Button size="lg" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button size="lg" onClick={() => setStep(3)} disabled={!address.trim()}>
                Continuer
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
              Comment peut-on contacter votre établissement ?
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center">
              Ajoutez les coordonnées officielles de votre école.
            </p>

            <div className="mt-6 space-y-4">
              <Input
                label="Téléphone de l'établissement"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 000 00 00"
                inputMode="tel"
                autoFocus
              />
              <Input
                label="Adresse e-mail de l'établissement"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="direction@ecole.sn"
                type="email"
              />
            </div>

            <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
              <Button size="lg" variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button size="lg" onClick={() => setStep(4)} disabled={!phone.trim() || !email.trim()}>
                Continuer
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
              Quels cycles votre établissement propose-t-il ?
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center">
              Sélectionnez les cycles enseignés dans votre établissement.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {NIVEAUX.map((n) => {
                const Icon = n.icon;
                const checked = niveaux.includes(n.id);
                return (
                  <label
                    key={n.id}
                    className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                      checked
                        ? "border-primary bg-primary/[0.02] shadow-[0_0_12px_rgba(var(--color-primary),0.06)] ring-1 ring-primary"
                        : "border-rule/60 bg-transparent hover:border-rule hover:bg-sunk/30"
                    }`}
                  >
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(n.id)} />
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                      checked ? "bg-primary/10 text-primary" : "bg-sunk text-text-faint group-hover:text-text-soft"
                    }`}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-semibold transition-colors ${checked ? "text-primary" : "text-text"}`}>
                        {n.label}
                      </div>
                    </div>
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all duration-200 ${
                      checked ? "border-primary bg-primary text-white" : "border-rule bg-transparent group-hover:border-text-faint"
                    }`}>
                      {checked && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between pt-5 border-t border-rule/30">
              <Button size="lg" variant="ghost" onClick={() => setStep(3)}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button size="lg" onClick={() => setStep(5)} disabled={niveaux.length === 0}>
                Continuer
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <School className="h-6 w-6" />
            </div>
            
            <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
              Votre école est presque prête !
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-soft text-center px-4">
              Les informations essentielles de votre établissement sont maintenant configurées.
              <br/>Il nous reste simplement à identifier la personne responsable.
            </p>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  autoFocus
                />
                <Input
                  label="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
              <Button size="lg" variant="ghost" onClick={() => setStep(4)} disabled={busy}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button size="lg" onClick={finish} disabled={!firstName.trim() || !lastName.trim() || busy} loading={busy}>
                Terminer
                {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
