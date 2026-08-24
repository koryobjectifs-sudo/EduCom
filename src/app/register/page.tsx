"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, MailCheck } from "lucide-react";
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
  "Vos classes créées d'après les niveaux que vous enseignez",
  "Votre premier élève inscrit",
  "Son certificat de scolarité, prêt à imprimer",
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
    <div className="flex min-h-screen flex-col bg-sunk lg:flex-row">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="w-full max-w-sm rounded-surface border border-rule bg-surface p-8 shadow-card">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
            {/* ⚠️ Addendum PLG — c'était un « E » blanc dans un carré, dessiné en
                HTML, alors que `public/brand/` contient le logotype fini. Sur la
                page où l'on saisit son mot de passe, la marque doit être la
                MÊME que sur la page d'accueil : un substitut de logo à
                l'instant de la connexion ressemble à une page contrefaite. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/educom-logo-officiel.jpg"
              alt="EduCom"
              width={156}
              height={28}
              className="h-7 w-auto"
            />
          </Link>

          <h1 className="text-role-page font-bold tracking-tight text-text">
            Créer l&apos;espace de votre école
          </h1>
          <p className="mt-2 text-role-body text-text-soft">
            Trois minutes, et votre premier document officiel est prêt.
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
            <Input
              label="Nom de l'établissement"
              id="schoolName"
              name="schoolName"
              required
              autoFocus
              placeholder="Complexe scolaire Mariama Bâ"
              hint="Il apparaîtra sur vos bulletins et vos attestations."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Prénom" id="firstName" name="firstName" required autoComplete="given-name" />
              <Input label="Nom" id="lastName" name="lastName" required autoComplete="family-name" />
            </div>
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
              hint="Six caractères au minimum."
            />
            <Button type="submit" size="lg" block loading={loading}>
              Créer l&apos;espace de mon école
              {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </Button>
          </form>

          {/* ⚠️ Aucun lien mort : le texte contractuel n'existe pas encore, et
              l'écran le dit plutôt que de pointer vers `#`. */}
          <p className="mt-4 text-role-meta leading-relaxed text-text-faint">
            Les conditions d&apos;utilisation et la politique de confidentialité
            sont en cours de rédaction ; elles vous seront communiquées avant toute
            mise en service auprès des familles.
          </p>

          <p className="mt-8 text-role-body text-text-soft">
            Votre école est déjà sur EduCom ?{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-2 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      {/* ─── Ce qui vient après, écrit noir sur blanc ───
          Une inscription est un saut dans l'inconnu. Annoncer les trois étapes
          suivantes coûte trois lignes et supprime l'hésitation. */}
      <div className="hidden bg-primary px-16 py-16 lg:flex lg:w-[42%] lg:flex-col lg:justify-center">
        <p className="text-role-section font-semibold leading-snug text-white">
          Après cette page, dans l&apos;ordre :
        </p>
        <ol className="mt-8 space-y-5">
          {SUITE.map((etape, i) => (
            <li key={etape} className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-white/30 text-role-meta font-semibold text-white"
              >
                {i + 1}
              </span>
              <span className="text-role-body leading-relaxed text-white/85">{etape}</span>
            </li>
          ))}
        </ol>
        <p className="mt-10 flex items-start gap-3 text-role-meta leading-relaxed text-white/70">
          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Rien n&apos;est facturé aujourd&apos;hui : EduCom n&apos;a pas encore de
          module de paiement en ligne.
        </p>
      </div>
    </div>
  );
}
