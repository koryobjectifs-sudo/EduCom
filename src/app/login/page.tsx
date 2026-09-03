"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, ShieldCheck, Smartphone, Building2 } from "lucide-react";
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
    <div className="flex min-h-[100dvh] flex-col items-center bg-sunk p-4 sm:p-6 overflow-y-auto">
      {/* ─── Formulaire ─── */}
      <div className="w-full max-w-[380px] my-auto rounded-[20px] border border-rule/40 bg-surface p-6 sm:p-7 shadow-sm relative z-10">
        <div className="mb-6 flex flex-col items-center justify-center relative">
          <Link href="/" className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-full text-text-soft transition-colors hover:bg-sunk hover:text-text" aria-label="Retour à l'accueil">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
          <img src="/brand/educom-logo-officiel.jpg" alt="EduCom" className="h-6 w-auto object-contain" />
        </div>

        <h1 className="text-[20px] font-bold tracking-tight text-text text-center">Connexion</h1>
        <p className="mt-1.5 text-[13px] text-text-soft text-center leading-relaxed">
          Accédez à l'espace de votre établissement.
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
              label={
                <span className="flex items-center justify-between w-full">
                  <span>Mot de passe</span>
                  <Link href="/forgot-password" className="text-[13px] font-normal text-primary underline-offset-2 hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </span>
              }
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

          <p className="mt-6 text-center text-[13px] text-text-soft">
            Pas encore sur EduCom ?{" "}
            <Link href="/register" className="font-semibold text-text underline-offset-2 hover:underline">
              Créer un espace
            </Link>
          </p>
        </div>

      <div className="mt-6 hidden w-full max-w-2xl px-4 text-center xl:block">
        <ul className="flex items-start justify-center gap-4">
          {PREUVES.map((p) => (
            <li key={p.titre} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-sm border border-rule/40">
                <p.icon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <span className="block text-[12px] font-semibold text-text">{p.titre}</span>
                <span className="mt-0.5 block text-[12px] text-text-soft leading-relaxed">{p.detail}</span>
              </div>
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
