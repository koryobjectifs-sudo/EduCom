"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, MailCheck } from "lucide-react";
import { register } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { GoogleAuthButton } from "@/components/ui/GoogleAuthButton";

/**
 * Création de l'espace d'un établissement — chantier PLG.
 *
 * ═══ UNE PROMESSE DE SÉCURITÉ QUI ÉTAIT FAUSSE ═══
 *
 * ⚠️ L'écran affirmait : « Vos données sont chiffrées et sauvegardées
 * quotidiennement. » Ni l'un ni l'autre n'a jamais été vérifié — et la connexion
 * à la base se faisait **en clair** jusqu'au 19 août 2026. Promettre le
 * chiffrement sur la page où une directrice confie l'identité de ses élèves est
 * la faute la plus coûteuse du produit : elle est fausse, et elle est opposable.
 * Retirée. Ce qui la remplace est vérifié (voir `rappel.md` §42).
 *
 * ⚠️ « Conditions d'utilisation » pointait vers `#`. Aucun texte n'existe
 * (`rappel.md` §41). Un lien mort sous un bouton d'engagement contractuel vaut
 * moins que pas de lien du tout : la mention dit désormais la vérité.
 *
 * ═══ FRICTION ═══
 *
 * Cinq champs, et pas un de plus : le nom de l'école, l'identité de la personne,
 * de quoi se reconnecter. Téléphone, adresse, effectif et cycles n'ouvrent aucune
 * valeur à cette étape — ils sont demandés plus tard, quand ils servent.
 */

/** Ce qui suit immédiatement l'inscription. Écrit ici pour supprimer l'inconnu. */
const SUITE = [
  "Configuration de votre école",
  "Importation de vos élèves",
  "Votre premier tableau de bord",
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [dejaInscrit, setDejaInscrit] = useState(false);
  /**
   * ⚠️ Le projet Supabase exige la confirmation de l'adresse
   * (`mailer_autoconfirm: false`) : `signUp()` renvoie alors un compte SANS
   * session. Jusqu'ici l'action redirigeait quand même vers `/onboarding`, qui
   * exige une session — la personne atterrissait sur `/login` sans explication,
   * convaincue que son inscription avait échoué. Cet état-ci le dit.
   */
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur("");
    setDejaInscrit(false);
    const result = await register(new FormData(e.currentTarget));
    if (result && "confirmationRequise" in result) {
      setConfirmation(result.email);
      setLoading(false);
      return;
    }
    if (result && "error" in result) {
      setErreur(result.error);
      setDejaInscrit(Boolean(result.dejaInscrit));
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sunk px-5 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" width={156} height={28} className="h-7 w-auto" />
          </Link>

          <div className="rounded-surface border border-rule bg-surface p-7 shadow-card sm:p-9">
            <MailCheck aria-hidden="true" className="h-6 w-6 text-primary" />
            <h1 className="mt-4 text-role-page font-bold tracking-tight text-text">
              Confirmez votre adresse
            </h1>
            <p className="mt-3 text-role-body leading-relaxed text-text-soft">
              Votre espace est créé. Nous venons d&apos;envoyer un lien à{" "}
              <span className="font-semibold text-text">{confirmation}</span>. Ouvrez-le
              depuis ce téléphone ou cet ordinateur : il vous connectera et vous mènera à
              l&apos;installation de votre école.
            </p>

            {/* ⚠️ Dire ce qui peut mal tourner vaut mieux que le découvrir. */}
            <p className="mt-5 rounded-control border border-rule bg-ground p-4 text-role-meta leading-relaxed text-text-soft">
              Le message peut mettre quelques minutes, et atterrir dans les
              indésirables. S&apos;il n&apos;arrive pas du tout, écrivez-nous : notre
              service d&apos;envoi est encore limité, et nous confirmerons votre compte
              nous-mêmes.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-control border border-rule bg-surface px-5 text-role-body font-semibold text-text shadow-card transition-colors hover:bg-sunk"
            >
              Aller à la connexion
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-sunk p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-[380px] my-auto rounded-[20px] border border-rule/40 bg-surface p-6 sm:p-7 shadow-sm relative z-10">
        <div className="mb-6 flex flex-col items-center justify-center relative">
          <Link href="/" className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-full text-text-soft transition-colors hover:bg-sunk hover:text-text" aria-label="Retour à l'accueil">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
          <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" className="h-6 w-auto object-contain" />
        </div>

        <h1 className="text-[20px] font-bold tracking-tight text-text text-center">
          Créer votre espace
        </h1>
        <p className="mt-1.5 text-[13px] text-text-soft text-center leading-relaxed">
          Trois minutes pour démarrer votre école.
        </p>

          {erreur && (
            <div
              role="alert"
              className="mt-6 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-body leading-relaxed text-danger"
            >
              {erreur}
              {/* ⚠️ Une adresse déjà inscrite n'est pas une faute de saisie :
                  l'écran doit donner la sortie, pas seulement le constat. */}
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

          <div className="relative mt-6 mb-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-rule" />
            </div>
            <div className="relative flex justify-center text-role-meta">
              <span className="bg-surface px-2 text-text-faint">ou avec votre e-mail</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Adresse e-mail"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="direction@votre-ecole.sn"
              />
              <Input
                label="Mot de passe"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" size="lg" block loading={loading}>
              Créer l&apos;espace de mon école
              {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-4 text-[12px] text-center leading-relaxed text-text-faint">
            En créant votre espace, vous acceptez nos conditions d'utilisation.
          </p>

          <p className="mt-6 text-center text-[13px] text-text-soft">
            Votre école est déjà sur EduCom ?{" "}
            <Link href="/login" className="font-semibold text-text underline-offset-2 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

      {/* ─── Ce qui vient après, écrit noir sur blanc ─── */}
      <div className="mt-6 hidden w-full max-w-2xl px-4 text-center xl:block">
        <p className="text-[12px] font-semibold text-text-soft mb-3 uppercase tracking-wider">
          Ensuite, dans l'ordre :
        </p>
        <ul className="flex items-start justify-center gap-6 text-left">
          {SUITE.map((etape, i) => (
            <li key={etape} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface border border-rule/50 text-[11px] font-bold text-text-soft shadow-sm"
              >
                {i + 1}
              </span>
              <span className="text-[12px] font-medium text-text-soft">{etape}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[12px] text-text-faint flex items-center justify-center gap-2">
          <Check aria-hidden="true" className="h-3.5 w-3.5" />
          Rien n'est facturé aujourd'hui
        </p>
      </div>
    </div>
  );
}
