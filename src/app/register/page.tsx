"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { register } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { GoogleAuthButton } from "@/components/ui/GoogleAuthButton";
import { createClient } from "@/lib/supabase/client";
import {
  emailSchema,
  passwordSchema,
  personNameSchema,
  schoolNameSchema,
  getPhoneValidationError,
  calculatePasswordStrength,
} from "@/lib/validations";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [dejaInscrit, setDejaInscrit] = useState(false);

  // Form values
  const [schoolName, setSchoolName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Field errors
  const [errors, setErrors] = useState<{
    schoolName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    password?: string;
    termsAccepted?: string;
  }>({});

  // Touched state for onBlur validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function clearStaleSession() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.signOut();
      }
    }
    clearStaleSession();
  }, []);

  const passwordStrength = calculatePasswordStrength(password);

  function validateField(name: string, value: string | boolean): string | undefined {
    switch (name) {
      case "schoolName": {
        const res = schoolNameSchema.safeParse(value);
        return res.success ? undefined : res.error.issues[0]?.message;
      }
      case "firstName": {
        const res = personNameSchema.safeParse(value);
        return res.success ? undefined : (res.error.issues[0]?.message || "Prénom invalide.");
      }
      case "lastName": {
        const res = personNameSchema.safeParse(value);
        return res.success ? undefined : (res.error.issues[0]?.message || "Nom invalide.");
      }
      case "phone": {
        const err = getPhoneValidationError(typeof value === "string" ? value : "");
        return err || undefined;
      }
      case "email": {
        const res = emailSchema.safeParse(value);
        return res.success ? undefined : res.error.issues[0]?.message;
      }
      case "password": {
        const res = passwordSchema.safeParse(value);
        return res.success ? undefined : res.error.issues[0]?.message;
      }
      case "termsAccepted": {
        return value ? undefined : "Veuillez accepter les CGU et la politique de confidentialité.";
      }
      default:
        return undefined;
    }
  }

  function handleBlur(fieldName: string, value: string | boolean) {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const err = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: err }));
  }

  function validateAll(): boolean {
    const newErrors = {
      schoolName: validateField("schoolName", schoolName),
      firstName: validateField("firstName", firstName),
      lastName: validateField("lastName", lastName),
      phone: validateField("phone", phone),
      email: validateField("email", email),
      password: validateField("password", password),
      termsAccepted: validateField("termsAccepted", termsAccepted),
    };

    setErrors(newErrors);
    setTouched({
      schoolName: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      password: true,
      termsAccepted: true,
    });

    return !Object.values(newErrors).some(Boolean);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError("");
    setDejaInscrit(false);

    const isValid = validateAll();
    if (!isValid) {
      setGlobalError("Veuillez corriger les erreurs indiquées ci-dessous.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("schoolName", schoolName);
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("termsAccepted", termsAccepted ? "true" : "false");

    try {
      const result = await register(formData);
      if (result && "confirmationRequise" in result) {
        router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
        return;
      }
      if (result && "error" in result) {
        setGlobalError(result.error);
        if (result.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...result.fieldErrors }));
        }
        setDejaInscrit(Boolean(result.dejaInscrit));
        setLoading(false);
      }
    } catch {
      setGlobalError("Une erreur inattendue est survenue.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center bg-white px-4 py-8 sm:py-12">
      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-soft transition-colors hover:bg-sunk hover:text-text sm:left-6 sm:top-6"
        aria-label="Retour à l'accueil"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      </Link>

      <div className="w-full max-w-[440px]">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" className="h-7 w-auto object-contain" />
        </div>

        <h1 className="mt-6 text-center text-[24px] font-bold tracking-tight text-text sm:text-[28px]">
          Créez l&apos;espace de votre école
        </h1>
        <p className="mt-1.5 text-center text-[14px] leading-relaxed text-text-soft">
          Création sécurisée de votre compte établissement.
        </p>

        {globalError && (
          <div
            role="alert"
            className="mt-5 rounded-control border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-danger"
          >
            {globalError}
            {dejaInscrit && (
              <Link href="/login" className="mt-2 block font-semibold underline">
                Se connecter avec cette adresse
              </Link>
            )}
          </div>
        )}

        <div className="mt-6">
          <GoogleAuthButton mode="signup" />
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-rule" />
          </div>
          <div className="relative flex justify-center text-role-meta">
            <span className="bg-white px-2 text-text-faint">ou avec votre e-mail</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {/* 1. Nom de l'établissement */}
          <Input
            label="Nom de l'établissement"
            id="schoolName"
            name="schoolName"
            type="text"
            required
            placeholder="Ex : Groupe Scolaire Excellence"
            value={schoolName}
            onChange={(e) => {
              setSchoolName(e.target.value);
              if (touched.schoolName) handleBlur("schoolName", e.target.value);
            }}
            onBlur={() => handleBlur("schoolName", schoolName)}
            error={touched.schoolName ? errors.schoolName : undefined}
          />

          {/* 2 & 3. Prénom et Nom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Prénom"
              id="firstName"
              name="firstName"
              type="text"
              required
              placeholder="Amadou"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (touched.firstName) handleBlur("firstName", e.target.value);
              }}
              onBlur={() => handleBlur("firstName", firstName)}
              error={touched.firstName ? errors.firstName : undefined}
            />
            <Input
              label="Nom"
              id="lastName"
              name="lastName"
              type="text"
              required
              placeholder="Diallo"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (touched.lastName) handleBlur("lastName", e.target.value);
              }}
              onBlur={() => handleBlur("lastName", lastName)}
              error={touched.lastName ? errors.lastName : undefined}
            />
          </div>

          {/* 4. Téléphone avec sélecteur pays */}
          <PhoneInput
            id="phone"
            label="Numéro de téléphone"
            required
            defaultCountry="SN"
            placeholder="77 123 45 67"
            value={phone}
            onChange={(val) => {
              setPhone(val || "");
              if (touched.phone) handleBlur("phone", val || "");
            }}
            error={touched.phone ? errors.phone : undefined}
          />

          {/* 5. E-mail */}
          <Input
            label="Adresse e-mail professionnelle"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="direction@votre-ecole.sn"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched.email) handleBlur("email", e.target.value);
            }}
            onBlur={() => handleBlur("email", email)}
            error={touched.email ? errors.email : undefined}
          />

          {/* 6. Mot de passe + Jauge de robustesse */}
          <div>
            <Input
              label="Mot de passe"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Au moins 8 caractères"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (touched.password) handleBlur("password", e.target.value);
              }}
              onBlur={() => handleBlur("password", password)}
              error={touched.password ? errors.password : undefined}
            />

            {/* Indicateur de force */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-text-soft">
                  <span>Robustesse du mot de passe :</span>
                  <span className="font-semibold text-text">{passwordStrength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-ground rounded-full overflow-hidden border border-rule/50">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. CGU Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-left group select-none">
              <input
                type="checkbox"
                name="termsAccepted"
                id="termsAccepted"
                required
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (touched.termsAccepted) handleBlur("termsAccepted", e.target.checked);
                }}
                className="mt-0.5 h-4 w-4 rounded border-rule text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
              <span className="text-[12px] leading-relaxed text-text-soft">
                J&apos;accepte les{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-semibold text-text underline hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Conditions générales d&apos;utilisation
                </Link>{" "}
                et la{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-semibold text-text underline hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Politique de confidentialité
                </Link>
                .
              </span>
            </label>
            {touched.termsAccepted && errors.termsAccepted && (
              <p className="mt-1 text-[12px] text-danger font-medium">{errors.termsAccepted}</p>
            )}
          </div>

          {/* Bouton de soumission */}
          <Button type="submit" size="lg" block loading={loading} className="mt-3">
            Créer l&apos;espace de mon école
            {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-text-soft">
          Votre école est déjà sur EduCom ?{" "}
          <Link href="/login" className="font-semibold text-text underline-offset-2 hover:underline">
            Se connecter
          </Link>
        </p>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Protection des données conforme Loi 2008-12 (CDP Sénégal)</span>
        </div>
      </div>
    </div>
  );
}
