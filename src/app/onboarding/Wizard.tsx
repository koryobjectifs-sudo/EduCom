"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, Check, GraduationCap, School, Building, Baby, UserPlus,
} from "lucide-react";
import { completeOnboarding } from "./actions";
import { createSchedule, upsertFeeItem, activateSchedule } from "../dashboard/settings/fees/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

/**
 * Installation d'un établissement — chantier PLG.
 *
 * ═══ L'ORDRE DES QUESTIONS A ÉTÉ INVERSÉ, ET C'EST LE CŒUR DU CHANGEMENT ═══
 *
 * L'ancienne première étape demandait **téléphone et adresse**. Ces deux champs
 * ne débloquent rien : ils ornent l'en-tête d'un document qu'on n'a pas encore
 * produit. On ouvrait donc l'installation par la seule question qui ne construit
 * rien.
 *
 * Les **niveaux** passent en premier parce qu'ils **fabriquent quelque chose de
 * réel** : les classes de l'établissement, en une sélection. C'est la première
 * fois que l'utilisateur voit EduCom faire un travail à sa place.
 *
 * ═══ CE QUI A ÉTÉ RETIRÉ ═══
 *
 * ⚠️ **Une attente fabriquée.** L'écran final jouait
 * `await new Promise(r => setTimeout(r, 1200))`, commenté « Simulate a bit of
 * loading for the "magical" effect », suivi d'une redirection après 2000 ms.
 * Trois secondes et demie d'attente inventée, sur des connexions où chaque
 * seconde est déjà chère. Supprimées.
 *
 * ⚠️ **« Configuration magique 🪄 » et « Création de la magie… »** : le produit
 * range des dossiers d'élèves, il ne fait pas de magie. Le vocabulaire dit
 * maintenant ce qui se passe.
 *
 * ⚠️ **Verre dépoli, halos, coins de 24 px, ombres de 40 px.** Remplacés par le
 * socle du lot 02. Les champs et les boutons viennent des primitives (lot 04)
 * au lieu d'être réécrits.
 *
 * ═══ CE QUI N'A PAS CHANGÉ ═══
 *
 * L'étape tarifaire du lot 12.2 est **conservée telle quelle** — mêmes actions,
 * mêmes gardes, même modèle. Elle devient seulement **visiblement facultative** :
 * la diriger dès l'installation était une friction, la supprimer aurait été une
 * régression.
 */

type WizardProps = { schoolName: string; userName: string };

const NIVEAUX = [
  { id: "Maternelle", label: "Maternelle", icon: Baby, desc: "Petite, moyenne et grande section", classes: 3 },
  { id: "Primaire", label: "Primaire", icon: GraduationCap, desc: "Du CI au CM2", classes: 6 },
  { id: "Collège", label: "Collège", icon: School, desc: "De la 6ᵉ à la 3ᵉ", classes: 4 },
  { id: "Lycée", label: "Lycée", icon: Building, desc: "De la seconde à la terminale", classes: 3 },
];

const CYCLE_BY_LEVEL: Record<string, string> = {
  Maternelle: "MATERNELLE",
  Primaire: "ELEMENTAIRE",
  Collège: "COLLEGE",
  Lycée: "LYCEE",
};

/** Trois étapes de saisie ; la quatrième est un résultat, pas un formulaire. */
const ETAPES = ["Niveaux", "Coordonnées", "Tarifs"];

export default function Wizard({ schoolName, userName }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ classes: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Étape financière — lot 12.2, inchangée.
   *
   * ⚠️ Ce n'est PAS un second système de setup : elle appelle les actions de
   * `/dashboard/settings/fees`, donc les mêmes gardes, le même modèle et le même
   * audit. Chaînes vides = frais non renseigné ; aucun montant n'est pré-rempli,
   * suggérer un tarif reviendrait à inventer une donnée métier.
   */
  const [registrationFee, setRegistrationFee] = useState("");
  const [tuitionByLevel, setTuitionByLevel] = useState<Record<string, string>>({});
  const [feeError, setFeeError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setNiveaux((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  /** Nombre de classes que la sélection va produire — annoncé avant de valider. */
  const classesPrevues = niveaux.reduce(
    (n, id) => n + (NIVEAUX.find((x) => x.id === id)?.classes ?? 0),
    0,
  );

  const createInitialGrid = async (): Promise<string | null> => {
    const registration = Number(registrationFee);
    const tuitions = Object.entries(tuitionByLevel)
      .filter(([, v]) => v.trim() !== "" && Number(v) > 0)
      .map(([level, v]) => ({ level, amount: Number(v) }));

    const hasRegistration = registrationFee.trim() !== "" && registration > 0;
    if (!hasRegistration && tuitions.length === 0) return null;

    const year = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const created = await createSchedule({ academicYear: year, label: `Grille officielle ${year}` });
    if ("error" in created && created.error) return created.error;
    const scheduleId = (created as { data?: { id: string } }).data?.id;
    if (!scheduleId) return "La grille n'a pas pu être créée.";

    if (hasRegistration) {
      const r = await upsertFeeItem({
        scheduleId, kind: "REGISTRATION" as never, label: "Frais d'inscription",
        amount: registration, cadence: "ONE_OFF" as never, mandatory: true, classId: null, cycle: null,
      });
      if (r.error) return r.error;
    }
    for (const t of tuitions) {
      const r = await upsertFeeItem({
        scheduleId, kind: "TUITION" as never, label: `Scolarité ${t.level.toLowerCase()}`,
        amount: t.amount, cadence: "ANNUAL" as never, mandatory: true,
        classId: null, cycle: CYCLE_BY_LEVEL[t.level] as never,
      });
      if (r.error) return r.error;
    }
    const act = await activateSchedule(scheduleId);
    if (act.error) return act.error;
    return null;
  };

  async function finish() {
    setBusy(true);
    setErreur(null);
    setFeeError(null);

    // ⚠️ Les classes DOIVENT exister avant la grille : une ligne tarifaire visant
    // une classe est vérifiée contre l'école, et le forecast lit les inscriptions.
    const res = await completeOnboarding({ phone, address, levels: niveaux });
    if (!res.success) {
      setBusy(false);
      setErreur(res.error ?? "La configuration n'a pas pu être enregistrée.");
      return;
    }

    // L'échec de la grille n'annule PAS l'installation : l'école reste
    // utilisable, la configuration financière est simplement signalée incomplète.
    const gridError = await createInitialGrid();
    if (gridError) setFeeError(gridError);

    setBusy(false);
    setDone({ classes: res.classesCreated });
  }

  /* ═══════════════ résultat ═══════════════ */

  if (done) {
    return (
      <section className="rounded-surface border border-rule bg-surface p-6 shadow-card sm:p-10">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-pill bg-success/10 text-success"
        >
          <Check className="h-6 w-6" />
        </span>

        <h1 className="mt-5 text-role-page font-bold tracking-tight text-text">
          {schoolName} est installée.
        </h1>

        {/* ⚠️ Un compte RÉEL, renvoyé par le serveur — jamais la somme espérée. */}
        <p className="mt-2 text-role-body leading-relaxed text-text-soft">
          {done.classes > 0
            ? `${done.classes} classe${done.classes > 1 ? "s" : ""} ${done.classes > 1 ? "ont été créées" : "a été créée"} d'après les niveaux que vous enseignez. Vous n'avez rien à saisir de plus.`
            : "Votre espace est prêt. Aucune classe n'a été créée — vous pourrez les ajouter à tout moment."}
        </p>

        {feeError && (
          <p className="mt-4 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5 text-role-meta leading-relaxed text-text-soft">
            La grille tarifaire n&apos;a pas pu être enregistrée ({feeError}). Votre école
            fonctionne normalement ; configurez-la dans Réglages › Grille tarifaire.
          </p>
        )}

        {/* §9 — une seule action suivante, celle qui mène à la première valeur. */}
        <div className="mt-8 rounded-control border border-rule bg-sunk px-4 py-4">
          <p className="text-role-card font-semibold text-text">Prochaine étape : votre premier élève</p>
          <p className="mt-1 text-role-body leading-relaxed text-text-soft">
            Dès qu&apos;un élève est inscrit, vous pouvez éditer son certificat de
            scolarité à l&apos;en-tête de {schoolName} — en une page, prêt à imprimer.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => router.push("/dashboard/students/new")}>
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              Inscrire mon premier élève
            </Button>
            <Button size="lg" variant="secondary" onClick={() => router.push("/dashboard")}>
              Voir le tableau de bord
            </Button>
          </div>
        </div>
      </section>
    );
  }

  /* ═══════════════ saisie ═══════════════ */

  return (
    <section className="rounded-surface border border-rule bg-surface shadow-card">
      {/* En-tête : où suis-je, et combien reste-t-il ? */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-control bg-primary text-role-body font-bold leading-none text-white"
          >
            E
          </span>
          <span className="text-role-card font-semibold text-text">Installation</span>
        </div>
        <ol className="flex items-center gap-2" aria-label={`Étape ${step} sur ${ETAPES.length}`}>
          {ETAPES.map((label, i) => {
            const n = i + 1;
            return (
              <li
                key={label}
                aria-current={n === step ? "step" : undefined}
                className={`text-role-meta font-medium ${n === step ? "text-text" : n < step ? "text-text-soft" : "text-text-faint"}`}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{n}</span>
                {n < ETAPES.length && <span aria-hidden="true" className="ml-2 text-text-faint">›</span>}
              </li>
            );
          })}
        </ol>
      </header>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {erreur && (
          <p role="alert" className="mb-6 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-body text-danger">
            {erreur}
          </p>
        )}

        {/* ─── 1. Niveaux : la seule question obligatoire, et la seule qui construit ─── */}
        {step === 1 && (
          <div>
            <h1 className="text-role-page font-bold tracking-tight text-text">
              Bonjour {userName}. Que propose {schoolName} ?
            </h1>
            <p className="mt-2 text-role-body leading-relaxed text-text-soft">
              Vos classes seront créées automatiquement. C&apos;est la seule information
              indispensable pour commencer.
            </p>

            <fieldset className="mt-6">
              <legend className="sr-only">Niveaux enseignés</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {NIVEAUX.map((n) => {
                  const actif = niveaux.includes(n.id);
                  return (
                    <label
                      key={n.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-control border px-4 py-4 transition-colors ${
                        actif ? "border-primary bg-primary/5" : "border-rule bg-surface hover:bg-sunk"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0"
                        checked={actif}
                        onChange={() => toggle(n.id)}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-role-card font-semibold text-text">
                          <n.icon aria-hidden="true" className="h-4 w-4 text-text-faint" />
                          {n.label}
                        </span>
                        <span className="mt-0.5 block text-role-meta leading-relaxed text-text-soft">
                          {n.desc} · {n.classes} classes
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-role-meta text-text-soft" aria-live="polite">
                {classesPrevues > 0
                  ? `${classesPrevues} classes seront créées.`
                  : "Choisissez au moins un niveau."}
              </p>
              <Button size="lg" disabled={niveaux.length === 0} onClick={() => setStep(2)}>
                Continuer
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── 2. Coordonnées : facultatif, et l'écran le dit ─── */}
        {step === 2 && (
          <div>
            <h1 className="text-role-page font-bold tracking-tight text-text">
              Coordonnées de l&apos;établissement
            </h1>
            <p className="mt-2 text-role-body leading-relaxed text-text-soft">
              Elles s&apos;impriment en en-tête de vos attestations et de vos bulletins.
              Facultatif — vous pourrez les ajouter dans les réglages.
            </p>

            <div className="mt-6 max-w-md space-y-4">
              <Input
                label="Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 000 00 00"
                inputMode="tel"
              />
              <Input
                label="Adresse"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Quartier, ville"
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <Button size="lg" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Retour
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" variant="secondary" onClick={() => setStep(3)}>Passer</Button>
                <Button size="lg" onClick={() => setStep(3)}>
                  Continuer
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. Tarifs : lot 12.2, conservé, rendu explicitement facultatif ─── */}
        {step === 3 && (
          <div>
            <h1 className="text-role-page font-bold tracking-tight text-text">Vos tarifs officiels</h1>
            <p className="mt-2 text-role-body leading-relaxed text-text-soft">
              Vous êtes la source de vérité des tarifs. Ils serviront à calculer
              automatiquement le montant attendu — votre gestionnaire n&apos;aura rien à
              ressaisir. Facultatif : laissez vide pour configurer plus tard.
            </p>

            <div className="mt-6 max-w-md space-y-4">
              <Input
                label="Frais d'inscription"
                hint="Une fois, tous niveaux confondus. En FCFA."
                type="number"
                min="0"
                inputMode="numeric"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                placeholder="0"
                inputClassName="tabular-nums"
              />
              {niveaux.map((level) => (
                <Input
                  key={level}
                  label={`Scolarité annuelle — ${level}`}
                  hint="En FCFA."
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={tuitionByLevel[level] ?? ""}
                  onChange={(e) => setTuitionByLevel({ ...tuitionByLevel, [level]: e.target.value })}
                  placeholder="0"
                  inputClassName="tabular-nums"
                />
              ))}
            </div>

            <p className="mt-5 max-w-xl text-role-meta leading-relaxed text-text-soft">
              Cantine, transport, assurance et tarifs par classe s&apos;ajoutent à tout moment
              dans <span className="font-medium text-text">Réglages › Grille tarifaire</span>.
              Champs vides : aucun montant n&apos;est supposé, et l&apos;application indique
              simplement que la configuration financière est incomplète.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <Button size="lg" variant="ghost" onClick={() => setStep(2)} disabled={busy}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Retour
              </Button>
              <Button size="lg" loading={busy} onClick={finish}>
                {busy ? "Création de vos classes…" : "Terminer l'installation"}
                {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
