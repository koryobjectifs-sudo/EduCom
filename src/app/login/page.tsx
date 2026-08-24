"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck, Smartphone, Building2 } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { GoogleAuthButton } from "@/components/ui/GoogleAuthButton";

/**
 * Connexion — chantier PLG.
 *
 * ═══ CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ═══
 *
 * ⚠️ **Un témoignage inventé.** L'écran affichait une citation signée « Seydou
 * Diop, Directeur, Complexe Scolaire Excellence ». Cette personne n'existe pas.
 * Une fausse recommandation sur la page où l'on saisit son mot de passe est le
 * pire endroit possible pour mentir : c'est précisément là que l'utilisateur
 * décide s'il fait confiance au produit.
 *
 * ⚠️ **Deux commandes qui ne faisaient rien** : « Mot de passe oublié ? »
 * pointait vers `#`, et « Se souvenir de moi » n'était lu par aucune action —
 * Supabase gère déjà la persistance de session par cookie. Un bouton inerte
 * coûte plus cher qu'un bouton absent : il fait douter de tout le reste.
 *
 * ⚠️ **Le verre dépoli et le halo bleu.** `backdrop-blur` sur un panneau
 * flottant, halo de 800 px, dégradés : c'est la signature visuelle d'une
 * maquette générée, pas d'un outil scolaire. Remplacés par un aplat de la
 * couleur d'ancrage.
 *
 * ═══ CE QUI LES REMPLACE ═══
 *
 * Trois affirmations **vraies et vérifiées** (lots 13 à 17 et durcissement RLS
 * du 19 août). Elles rassurent mieux qu'un témoignage, et elles engagent le
 * produit sur ce qu'il fait réellement.
 *
 * ⚠️ L'écran utilise le socle (`Button`, `Input`, tokens) au lieu de réécrire
 * des champs à la main : c'est la règle du lot 04, que cette page ignorait.
 */

const PREUVES = [
  {
    icon: Building2,
    titre: "Chaque école ne voit que ses données",
    detail: "Le cloisonnement est vérifié à chaque requête, pas seulement à l'écran.",
  },
  {
    icon: ShieldCheck,
    titre: "Les pièces des élèves restent privées",
    detail: "Aucun document n'a d'adresse publique : les liens sont temporaires.",
  },
  {
    icon: Smartphone,
    titre: "Utilisable depuis un téléphone",
    detail: "Les écrans sont conçus et mesurés pour un écran de 390 px.",
  },
];

/**
 * ⚠️ `/auth/callback` renvoyait `?error=Invalid_Auth_Code` que cette page ne
 * lisait pas : après un lien de confirmation expiré, l'utilisateur voyait un
 * formulaire vide, sans savoir que son clic avait échoué ni pourquoi. Les deux
 * seuls cas possibles sont nommés ici.
 */
const MESSAGES_LIEN: Record<string, string> = {
  lien_invalide:
    "Ce lien de confirmation a déjà servi ou a expiré. Connectez-vous ci-dessous ; si cela ne fonctionne pas, écrivez-nous.",
  lien_incomplet:
    "Ce lien de confirmation est incomplet. Ouvrez-le directement depuis l'e-mail, sans le recopier.",
  espace_absent:
    "Votre compte existe, mais aucun établissement ne lui est rattaché. Écrivez-nous : nous terminons la configuration de votre espace.",
};

/**
 * ⚠️ `useSearchParams()` impose une frontière `<Suspense>` : sans elle, Next
 * refuse de rendre la page statiquement et l'échec ne se voit qu'à la
 * compilation de production. Le formulaire est donc isolé dans un composant
 * interne, et l'export par défaut ne fait que le suspendre.
 */
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const parametres = useSearchParams();
  const messageLien = MESSAGES_LIEN[parametres.get("erreur") ?? ""];
  /** Où la personne voulait aller avant d'être renvoyée ici (posé par `proxy.ts`). */
  const suite = parametres.get("suite") ?? "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur("");
    const result = await login(new FormData(e.currentTarget));
    // Une connexion réussie redirige côté serveur : on ne repasse jamais ici.
    if (result?.error) {
      setErreur(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-sunk lg:flex-row">
      {/* ─── Formulaire ─── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="w-full max-w-sm rounded-surface border border-rule bg-surface p-8 shadow-card">
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
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

          <h1 className="text-role-page font-bold tracking-tight text-text">Connexion</h1>
          <p className="mt-2 text-role-body text-text-soft">
            Accédez à l&apos;espace de votre établissement.
          </p>

          {/* ⚠️ `role="alert"` : l'échec doit être annoncé, pas seulement coloré. */}
          {messageLien && !erreur && (
            <p
              role="status"
              className="mt-6 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5 text-role-body leading-relaxed text-warning"
            >
              {messageLien}
            </p>
          )}

          {erreur && (
            <p
              role="alert"
              className="mt-6 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-body leading-relaxed text-danger"
            >
              {erreur}
            </p>
          )}

          <div className="mt-6">
            <GoogleAuthButton mode="login" />
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
            {/* Reprise de la destination demandée. La valeur vient de l'URL et
                l'action la revalide : chemin interne uniquement. */}
            <input type="hidden" name="suite" value={suite} />
            <Input
              label="Adresse e-mail"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="direction@votre-ecole.sn"
            />
            <Input
              label="Mot de passe"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
            <Button type="submit" size="lg" block loading={loading}>
              Se connecter
              {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-8 text-role-body text-text-soft">
            Votre établissement n&apos;est pas encore sur EduCom ?{" "}
            <Link href="/register" className="font-semibold text-primary underline-offset-2 hover:underline">
              Créer l&apos;espace de mon école
            </Link>
          </p>
        </div>
      </div>

      {/* ─── Preuve, pas décor ───
          Masqué sous 1024 px : sur un téléphone, la seule chose utile est le
          formulaire. Y empiler des arguments repousserait le bouton hors écran. */}
      <div className="hidden bg-primary px-16 py-16 lg:flex lg:w-[42%] lg:flex-col lg:justify-center">
        <p className="text-role-section font-semibold leading-snug text-white">
          Le dossier de chaque élève, les bulletins, les frais et les documents
          officiels — au même endroit.
        </p>
        <ul className="mt-10 space-y-7">
          {PREUVES.map((p) => (
            <li key={p.titre} className="flex gap-4">
              <p.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-white/70" />
              <span>
                <span className="block text-role-body font-semibold text-white">{p.titre}</span>
                <span className="mt-0.5 block text-role-meta leading-relaxed text-white/70">{p.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sunk" />}>
      <LoginForm />
    </Suspense>
  );
}
