"use client";

import { useState, useTransition } from "react";
import { UserPlus, ArrowLeft, ArrowRight, Copy, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { CAPACITES } from "@/lib/capacites";
import type { ConfigEnseignant, DonneesEquipe } from "@/lib/equipe";
import { creerMembre } from "./equipe-actions";
import { BlocAcces, BlocClasses, BlocMetier, METIERS, resume, type Autres } from "./BlocsMembre";

/**
 * « Ajouter un membre » — 4 étapes (maquette validée par Kory, 26 sept. 2026) :
 * Qui ? → Son métier → Ce qu'il enseigne (enseignant seulement) → Accès en plus,
 * puis l'écran « Lui transmettre l'accès » (WhatsApp / copier).
 */
type Etape = "qui" | "metier" | "classes" | "acces" | "fini";

export default function AjouterMembre({ donnees, autres }: { donnees: DonneesEquipe; autres: Autres }) {
  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState<Etape>("qui");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"COMPTE" | "LIEN">("COMPTE");
  const [role, setRole] = useState("");
  const [config, setConfig] = useState<ConfigEnseignant>({ titulaire: [], matieres: [] });
  const [acces, setAcces] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState<{ message: string; telephone: string | null; emailEnvoye?: boolean; emailErreur?: string } | null>(null);
  const [copie, setCopie] = useState(false);
  const [enCours, demarrer] = useTransition();

  const enseignant = role === "TEACHER";
  const ordre: Etape[] = enseignant ? ["qui", "metier", "classes", "acces"] : ["qui", "metier", "acces"];
  const index = ordre.indexOf(etape);

  const fermer = () => {
    setOuvert(false);
    setTimeout(() => {
      setEtape("qui");
      setPrenom("");
      setNom("");
      setTelephone("");
      setEmail("");
      setMode("COMPTE");
      setRole("");
      setConfig({ titulaire: [], matieres: [] });
      setAcces([]);
      setErreur("");
      setResultat(null);
      setCopie(false);
    }, 200);
  };

  const quiValide = prenom.trim().length > 1 && nom.trim().length > 1 && /\S+@\S+\.\S+/.test(email);
  const suivant = () => {
    setErreur("");
    if (etape === "qui" && !quiValide) return setErreur("Prénom, nom et e-mail sont nécessaires.");
    if (etape === "metier" && !role) return setErreur("Choisissez un métier.");
    setEtape(ordre[index + 1]);
  };
  const retour = () => {
    setErreur("");
    setEtape(ordre[Math.max(0, index - 1)]);
  };
  const valider = () =>
    demarrer(async () => {
      setErreur("");
      const r = await creerMembre({ prenom, nom, telephone, email, mode, role, config: enseignant ? config : { titulaire: [], matieres: [] }, acces });
      if (!r.ok) return setErreur(r.error);
      setResultat({ message: r.message, telephone: r.telephone, emailEnvoye: r.emailEnvoye, emailErreur: r.emailErreur });
      setEtape("fini");
    });

  const metier = METIERS.find((m) => m.id === role);
  const accesNoms = CAPACITES.filter((c) => acces.includes(c.id)).map((c) => c.libelle);
  const titres: Record<Etape, [string, string]> = {
    qui: ["Qui rejoint l'équipe ?", "Ses coordonnées pour se connecter."],
    metier: ["Quel est son métier ?", "Le métier donne les accès de base. Un seul choix."],
    classes: ["Ses classes", "Choisissez ses classes : leurs matières suivent, partout (notes, classes, tableau de bord)."],
    acces: ["Ses accès", "Son métier donne déjà l'essentiel. Le reste est facultatif."],
    fini: [`${prenom} fait partie de l'équipe`, mode === "COMPTE" ? "Transmettez-lui son accès." : "Envoyez-lui le lien d'invitation."],
  };

  const whatsapp = () => {
    if (!resultat) return;
    const num = resultat.telephone?.replace(/\D/g, "") ?? "";
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(resultat.message)}`, "_blank", "noopener");
  };
  const copier = async () => {
    if (!resultat) return;
    try {
      await navigator.clipboard.writeText(resultat.message);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papiers refusé : le texte reste sélectionnable */
    }
  };

  return (
    <>
      <Button data-tour="team-invite-btn" onClick={() => setOuvert(true)} icon={<UserPlus aria-hidden="true" className="h-4 w-4" />}>
        Ajouter un membre
      </Button>
      <Modal
        open={ouvert}
        onClose={fermer}
        dismissible={!enCours}
        size="lg"
        title={titres[etape][0]}
        description={
          etape === "fini" ? (
            titres[etape][1]
          ) : (
            <span>
              <span className="font-medium text-text-faint">Étape {index + 1} sur {ordre.length}</span> · {titres[etape][1]}
            </span>
          )
        }
        footer={
          etape === "fini" ? (
            <Button onClick={fermer}>Terminé</Button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              {index > 0 ? (
                <Button variant="ghost" onClick={retour} icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} disabled={enCours}>
                  Retour
                </Button>
              ) : (
                <span />
              )}
              {etape === "acces" ? (
                <Button onClick={valider} loading={enCours}>
                  {mode === "COMPTE" ? "Créer le compte" : "Créer l'invitation"}
                </Button>
              ) : (
                <Button onClick={suivant} icon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>
                  Continuer
                </Button>
              )}
            </div>
          )
        }
      >
        <div className="space-y-4">
          {etape === "qui" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Prénom" required value={prenom} onChange={(e) => setPrenom(e.target.value)} autoFocus />
                <Input label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
                <Input label="Téléphone (WhatsApp)" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="77 123 45 67" />
                <Input label="E-mail (sert d'identifiant)" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <fieldset>
                <legend className="mb-2 text-role-label font-semibold text-text">Comment lui donner accès ?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ["COMPTE", "Je crée son compte direct", "EduCom génère un mot de passe provisoire à lui transmettre."],
                    ["LIEN", "Je lui transmets un lien", "Un lien d'activation sécurisé à lui transmettre (par WhatsApp ou SMS)."],
                  ] as const).map(([id, t, d]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id)}
                      aria-pressed={mode === id}
                      className={`rounded-xl border p-3 text-left ${mode === id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-rule hover:bg-sunk"}`}
                    >
                      <span className="block text-role-label font-semibold text-text">{t}</span>
                      <span className="mt-0.5 block text-role-meta text-text-soft">{d}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {etape === "metier" && <BlocMetier role={role} onChange={setRole} />}

          {etape === "classes" && <BlocClasses donnees={donnees} config={config} onChange={setConfig} autres={autres} />}

          {etape === "acces" && (
            <>
              <BlocAcces role={role} acces={acces} onChange={setAcces} />
              <div className="rounded-xl border border-rule px-3 py-2">
                <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">Récapitulatif</p>
                <p className="mt-0.5 text-role-label font-semibold text-text">
                  {prenom} {nom} · {metier?.nom}
                </p>
                {enseignant &&
                  (resume(donnees, config).length ? (
                    resume(donnees, config).map((l) => (
                      <p key={l} className="text-role-meta text-text-soft">{l}</p>
                    ))
                  ) : (
                    <p className="text-role-meta text-text-soft">Aucune classe pour l&apos;instant — modifiable dans sa fiche.</p>
                  ))}
                {accesNoms.length > 0 && <p className="text-role-meta text-primary">+ {accesNoms.join(", ")}</p>}
              </div>
            </>
          )}

          {etape === "fini" && resultat && (
            <div className="space-y-3">
              <div className="text-center text-4xl" aria-hidden="true">🎉</div>
              {resultat.emailEnvoye && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-role-meta text-emerald-800 text-center">
                  ✉️ Un e-mail d&apos;invitation avec le lien sécurisé a été envoyé à <strong>{email}</strong>.
                </div>
              )}
              {!resultat.emailEnvoye && resultat.emailErreur && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-role-meta text-amber-800 text-center">
                  ⚠️ E-mail non envoyé ({resultat.emailErreur}). Transmettez-lui le lien directement ci-dessous.
                </div>
              )}
              {enseignant && <p className="text-center text-role-body text-text-soft">Ses classes l&apos;attendent dès sa première connexion.</p>}
              <pre className="whitespace-pre-wrap rounded-xl border border-rule bg-sunk p-3 font-sans text-role-body text-text select-all">{resultat.message}</pre>
              <div className="flex flex-wrap gap-2">
                <Button onClick={whatsapp} icon={<MessageCircle aria-hidden="true" className="h-4 w-4" />}>
                  Envoyer sur WhatsApp
                </Button>
                <Button variant="secondary" onClick={copier} icon={copie ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}>
                  {copie ? "Copié" : "Copier"}
                </Button>
              </div>
              {mode === "COMPTE" && <p className="text-role-meta text-text-faint">Le mot de passe provisoire n&apos;est affiché qu&apos;ici : transmettez-le maintenant.</p>}
            </div>
          )}

          {erreur && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-role-label text-danger">{erreur}</p>}
        </div>
      </Modal>
    </>
  );
}
