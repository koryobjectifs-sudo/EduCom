"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check, GraduationCap, School, Building, Baby, UserPlus, CheckSquare, Square,
} from "lucide-react";
import { LEVELS, classesForLevels } from "@/lib/curriculum";
import { completeOnboarding, checkDuplicateSchoolAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n";

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
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const step = parseInt(searchParams.get("step") ?? "1", 10);
  const setStep = (s: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("step", s.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const [schoolName, setSchoolName] = useState(initialSchoolName === "École en configuration" ? "" : initialSchoolName);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [niveaux, setNiveaux] = useState<string[]>(["Primaire"]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(["CI", "CP", "CE1", "CE2", "CM1", "CM2"]);
  const [firstName, setFirstName] = useState(initialUserName === "À configurer" ? "" : "");
  const [lastName, setLastName] = useState("");

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ classes: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{ name: string; city: string } | null>(null);

  const { t } = useTranslation();

  // Basculer un niveau et synchroniser les classes proposées
  const toggleNiveau = (levelId: string) => {
    const isAdding = !niveaux.includes(levelId);
    const updatedNiveaux = isAdding ? [...niveaux, levelId] : niveaux.filter((l) => l !== levelId);
    setNiveaux(updatedNiveaux);

    const levelObj = LEVELS.find((l) => l.id === levelId);
    if (levelObj) {
      if (isAdding) {
        setSelectedClasses((prev) => Array.from(new Set([...prev, ...levelObj.classes])));
      } else {
        const classesToRemove = new Set(levelObj.classes as readonly string[]);
        setSelectedClasses((prev) => prev.filter((c) => !classesToRemove.has(c)));
      }
    }
  };

  // Basculer une classe individuelle dans l'aperçu en direct
  const toggleClass = (className: string) => {
    setSelectedClasses((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className]
    );
  };

  // Toutes les classes candidates pour les cycles sélectionnés
  const candidateClasses = useMemo(() => {
    return classesForLevels(niveaux);
  }, [niveaux]);

  async function finish() {
    setBusy(true);
    setErreur(null);

    const res = await completeOnboarding({
      schoolName,
      address,
      phone,
      email,
      levels: niveaux,
      selectedClasses,
      firstName,
      lastName,
    });

    if (!res.success) {
      setBusy(false);
      setErreur(res.error ?? t("onboarding", "errorFallback"));
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
        className="w-full text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-6">
          <Check className="h-8 w-8" />
        </div>

        <h1 className="text-[32px] font-black tracking-tight text-text sm:text-[36px]">
          {t("onboarding", "successTitle")}
        </h1>

        <p
          className="mt-4 text-[15px] leading-relaxed text-text-soft max-w-md mx-auto"
          dangerouslySetInnerHTML={{
            __html: t("onboarding", "successDesc", { schoolName: `<strong>${schoolName}</strong>` }),
          }}
        />

        <div className="mt-10 pt-8 border-t border-rule/50">
          <div className="flex flex-col items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => router.push("/dashboard/students/import")}
              className="w-full sm:w-auto text-base h-12 px-8"
            >
              <UserPlus aria-hidden="true" className="mr-2 h-5 w-5" />
              {t("onboarding", "importBtn")}
            </Button>
            <p className="text-[12px] text-text-soft mb-2">{t("onboarding", "importDesc")}</p>
            <Button
              size="lg"
              variant="ghost"
              onClick={async () => {
                setBusy(true);
                try {
                  const { injectDemoData } = await import("./demo-actions");
                  await injectDemoData();
                  setBusy(false);
                  router.push("/onboarding/team");
                } catch (e) {
                  console.error(e);
                  setBusy(false);
                  setErreur("Une erreur s'est produite lors de la génération des données.");
                }
              }}
              className="w-full sm:w-auto text-text-soft hover:text-text mt-2"
              loading={busy}
            >
              {busy ? t("onboarding", "demoLoading") : t("onboarding", "demoBtn")}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => router.push("/onboarding/team")}
              className="w-full sm:w-auto text-text-soft hover:text-text mt-2"
            >
              {t("onboarding", "accessBtn")}
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-10 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" className="h-7 w-auto object-contain" />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-14 rounded-full transition-colors duration-300 ${
                i + 1 === step ? "bg-primary" : i + 1 < step ? "bg-primary/30" : "bg-rule"
              }`}
            />
          ))}
        </div>
        <div className="text-[12px] font-semibold tracking-wider text-text-faint">
          {t("onboarding", "stepXofY", { step, total: 4 })}
        </div>
      </div>

      {erreur && (
        <div
          role="alert"
          className="mb-6 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] leading-relaxed text-danger"
        >
          {erreur}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full relative"
        >
          {/* ═══════════════ ÉTAPE 1 : IDENTITÉ & CYCLES D'ENSEIGNEMENT ═══════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex justify-end -mb-2">
                <LanguageSwitcher />
              </div>
              <div className="text-center">
                <h1 className="text-[24px] font-black tracking-tight text-text sm:text-[28px]">
                  {t("onboarding", "step1Title")}
                </h1>
                <p className="mt-1.5 text-[14px] leading-relaxed text-text-soft">
                  Identifiez votre établissement et sélectionnez les cycles d&apos;enseignement proposés.
                </p>
              </div>

              {/* 1. Nom de l'établissement */}
              <div>
                <Input
                  label={t("onboarding", "schoolNameLabel")}
                  value={schoolName}
                  onChange={(e) => {
                    setSchoolName(e.target.value);
                    if (e.target.value.trim().length >= 3) {
                      checkDuplicateSchoolAction(e.target.value)
                        .then((res) => {
                          if (res.duplicateFound && res.school) {
                            setDuplicateInfo(res.school);
                          } else {
                            setDuplicateInfo(null);
                          }
                        })
                        .catch(() => setDuplicateInfo(null));
                    } else {
                      setDuplicateInfo(null);
                    }
                  }}
                  placeholder={t("onboarding", "schoolNamePlaceholder")}
                  autoFocus
                />
              </div>

              {duplicateInfo && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">⚠️</span>
                    <div className="text-[13px]">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        {t("onboarding", "duplicateWarningTitle", {
                          name: duplicateInfo.name,
                          city: duplicateInfo.city,
                        })}
                      </p>
                      <p className="mt-1 text-amber-800 dark:text-amber-300/90 leading-relaxed">
                        {t("onboarding", "duplicateWarningBody")}
                      </p>
                      <div className="mt-2.5">
                        <a
                          href="/invite"
                          className="inline-flex items-center text-[12px] font-semibold text-primary hover:underline"
                        >
                          {t("onboarding", "joinWithInvite")}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Type d'établissement / Cycles (sélection multiple & cumul) */}
              <div className="pt-2 border-t border-rule/30">
                <label className="block text-[13px] font-semibold text-text mb-1">
                  Type d&apos;établissement · Cycles d&apos;enseignement
                </label>
                <p className="text-[12px] text-text-soft mb-3">
                  Sélectionnez un ou plusieurs cycles. EduCom configure automatiquement vos classes, matières et coefficients.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {NIVEAUX.map((n) => {
                    const Icon = n.icon;
                    const checked = niveaux.includes(n.id);
                    return (
                      <label
                        key={n.id}
                        className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                          checked
                            ? "border-primary bg-primary/[0.03] shadow-[0_0_8px_rgba(var(--color-primary),0.08)] ring-1 ring-primary"
                            : "border-rule/60 bg-surface hover:border-rule hover:bg-sunk/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleNiveau(n.id)}
                        />
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                            checked
                              ? "bg-primary text-white shadow-sm"
                              : "bg-sunk text-text-faint group-hover:text-text-soft"
                          }`}
                        >
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-[13px] font-bold transition-colors ${
                              checked ? "text-primary" : "text-text"
                            }`}
                          >
                            {n.label}
                          </div>
                          <div className="text-[11px] text-text-soft truncate">{n.desc}</div>
                        </div>
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all duration-200 ${
                            checked
                              ? "border-primary bg-primary text-white"
                              : "border-rule bg-transparent group-hover:border-text-faint"
                          }`}
                        >
                          {checked && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Aperçu en direct des classes générées (décochables) */}
              {candidateClasses.length > 0 && (
                <div className="rounded-xl border border-rule/60 bg-sunk/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-text-soft">
                      Aperçu des classes ({selectedClasses.length}/{candidateClasses.length} actives)
                    </span>
                    <span className="text-[11px] text-text-faint">
                      Cliquez pour personnaliser
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {candidateClasses.map((cls) => {
                      const isChecked = selectedClasses.includes(cls.name);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClass(cls.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium border transition-all ${
                            isChecked
                              ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                              : "bg-surface border-rule text-text-faint line-through opacity-60 hover:opacity-100"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-text-faint" />
                          )}
                          <span>{cls.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-5 border-t border-rule/30">
                <Button
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={!schoolName.trim() || niveaux.length === 0 || selectedClasses.length === 0}
                >
                  {t("common", "continue")}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════ ÉTAPE 2 : ADRESSE & LOCALISATION ═══════════════ */}
          {step === 2 && (
            <div>
              <h1 className="text-[24px] font-black tracking-tight text-text text-center sm:text-[28px]">
                {t("onboarding", "step2Title")}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-text-soft text-center">
                {t("onboarding", "step2Desc")}
              </p>

              <div className="mt-6">
                <Input
                  label={t("onboarding", "addressLabel")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("onboarding", "addressPlaceholder")}
                  autoFocus
                />
              </div>

              <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
                <Button size="lg" variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
                  {t("common", "back")}
                </Button>
                <Button size="lg" onClick={() => setStep(3)} disabled={!address.trim() || address.trim().length < 3}>
                  {t("common", "continue")}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════ ÉTAPE 3 : CONTACT (TÉLÉPHONE & E-MAIL) ═══════════════ */}
          {step === 3 && (
            <div>
              <h1 className="text-[24px] font-black tracking-tight text-text text-center sm:text-[28px]">
                {t("onboarding", "step3Title")}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-text-soft text-center">
                {t("onboarding", "step3Desc")}
              </p>

              <div className="mt-6 space-y-4">
                <PhoneInput
                  label={t("onboarding", "phoneLabel")}
                  value={phone}
                  onChange={(val) => setPhone(val || "")}
                  placeholder={t("onboarding", "phonePlaceholder")}
                />
                <Input
                  label={t("onboarding", "emailLabel")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("onboarding", "emailPlaceholder")}
                  type="email"
                />
              </div>

              <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
                <Button size="lg" variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
                  {t("common", "back")}
                </Button>
                <Button size="lg" onClick={() => setStep(4)} disabled={!phone.trim() || !email.trim()}>
                  {t("common", "continue")}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════ ÉTAPE 4 : DIRECTION / RESPONSABLE ═══════════════ */}
          {step === 4 && (
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <School className="h-6 w-6" />
              </div>

              <h1 className="text-[24px] font-black tracking-tight text-text text-center sm:text-[28px]">
                {t("onboarding", "step5Title")}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-text-soft text-center px-4">
                {t("onboarding", "step5Desc")}
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label={t("onboarding", "firstNameLabel")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t("onboarding", "firstNamePlaceholder")}
                    autoFocus
                  />
                  <Input
                    label={t("onboarding", "lastNameLabel")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t("onboarding", "lastNamePlaceholder")}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-5 border-t border-rule/30">
                <Button size="lg" variant="ghost" onClick={() => setStep(3)} disabled={busy}>
                  <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
                  {t("common", "back")}
                </Button>
                <Button
                  size="lg"
                  onClick={finish}
                  disabled={!firstName.trim() || !lastName.trim() || busy}
                  loading={busy}
                >
                  {t("onboarding", "finishBtn")}
                  {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
