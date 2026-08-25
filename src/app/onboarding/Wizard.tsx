"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check, GraduationCap, School, Building, Baby, UserPlus,
  BookOpen, Info,
} from "lucide-react";
import { LEVELS, classesForLevels, curriculumProposal } from "@/lib/curriculum";
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

/**
 * ⚠️ Le NOMBRE de classes n'est plus écrit ici. Il valait « classes: 3 » en dur,
 * à côté d'une table de noms tenue dans `onboarding/actions.ts` : l'écran
 * annonçait un chiffre, l'action en créait un autre, et rien ne les liait.
 * `LEVELS` (dans `src/lib/curriculum.ts`) porte les deux, et le compteur se
 * déduit de la liste réelle.
 */
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

const CYCLE_BY_LEVEL: Record<string, string> = Object.fromEntries(
  LEVELS.map((l) => [l.id, l.cycle]),
);

/** Quatre étapes de saisie ; la cinquième est un résultat, pas un formulaire. */
const ETAPES = ["Niveaux", "Programme", "Coordonnées", "Tarifs"];

export default function Wizard({ schoolName, userName }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    classes: number;
    programme: { subjects: number; links: number; terms: number; evaluations: number } | null;
  } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Étape financière — lot 12.2, inchangée.
   *
   * ⚠️ Ce n'est PAS un second système de setup : elle appelle les actions de
   * `/dashboard/settings/fees`, donc les mêmes gardes, le même modèle et le même
   * audit. Chaînes vides = frais non renseigné ; aucun montant n'est pré-rempli,
   * suggérer un tarif reviendrait à inventer une donnée métier.
   */
  /**
   * Étape « Programme » — **proposée, jamais imposée.**
   *
   * ⚠️ Les deux cases sont pré-cochées, et c'est un choix produit assumé : une
   * école sénégalaise qui s'inscrit enseigne, dans son immense majorité, le
   * programme officiel en trois trimestres. Décocher est un geste ; tout saisir
   * à la main en est trois cents. « Proposé » veut dire *modifiable en un clic
   * et annoncé avant d'écrire* — c'est exactement ce que fait cet écran, qui
   * affiche le décompte réel avant validation.
   *
   * ⚠️ Les contrôles sont une case SÉPARÉE parce qu'ils ne sont pas le socle :
   * Kory a arbitré « 3 trimestres + 3 compositions » comme commun, les
   * contrôles comme libres. Les fondre dans la même case aurait effacé cette
   * distinction.
   */
  const [applyProgramme, setApplyProgramme] = useState(true);
  const [withControls, setWithControls] = useState(true);

  const [registrationFee, setRegistrationFee] = useState("");
  const [tuitionByLevel, setTuitionByLevel] = useState<Record<string, string>>({});
  const [feeError, setFeeError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setNiveaux((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  /** Nombre de classes que la sélection va produire — annoncé avant de valider. */
  const classesPrevues = niveaux.reduce(
    (n, id) => n + (NIVEAUX.find((x) => x.id === id)?.classes.length ?? 0),
    0,
  );

  /**
   * Ce que le programme produirait — **calculé, jamais estimé**.
   *
   * `curriculumProposal()` est le module pur du programme : la même fonction que
   * le serveur appellera pour écrire. L'écran ne peut donc pas annoncer un
   * chiffre que l'application démentira ensuite.
   */
  const projection = curriculumProposal(classesForLevels(niveaux), { withControls });

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
    const res = await completeOnboarding({
      phone, address, levels: niveaux,
      programme: { apply: applyProgramme, withControls },
    });
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
    setDone({ classes: res.classesCreated, programme: res.programme ?? null });
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
          Votre école prend forme.
        </h1>

        <p className="mt-4 text-[15px] leading-relaxed text-text-soft max-w-md mx-auto">
          {done.classes > 0
            ? `${done.classes} classe${done.classes > 1 ? "s" : ""} ${done.classes > 1 ? "ont été créées" : "a été créée"}. Vous n'avez rien à saisir de plus pour commencer.`
            : "Votre espace est prêt. Aucune classe n'a été créée — vous pourrez les ajouter à tout moment."}
        </p>

        {done.programme && (
          <p className="mt-3 text-[15px] leading-relaxed text-text-soft max-w-md mx-auto">
            Le programme officiel a été installé. Vos enseignants peuvent saisir des notes dès maintenant.
          </p>
        )}

        {feeError && (
          <p className="mt-6 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-warning-strong max-w-md mx-auto">
            La configuration financière n'a pas pu être finalisée ({feeError}), mais vous pouvez commencer à travailler !
          </p>
        )}

        <div className="mt-10 pt-8 border-t border-rule/50">
          <p className="text-lg font-semibold text-text mb-6">Comment voulez-vous commencer ?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => router.push("/dashboard/students/import")} className="w-full sm:w-auto">
              <UserPlus aria-hidden="true" className="h-5 w-5" />
              Importer mes données
            </Button>
            <Button size="lg" variant="secondary" onClick={async () => {
              setBusy(true);
              const { injectDemoData } = await import("./demo-actions");
              await injectDemoData();
              setBusy(false);
              router.push("/dashboard");
            }} loading={busy} className="w-full sm:w-auto">
              Voir avec des données de démonstration
            </Button>
          </div>
        </div>
      </motion.section>
    );
  }

  /* ═══════════════ saisie ═══════════════ */

  return (
    <div>
      <header className="flex flex-col items-center justify-center gap-3 mb-8">
        <div className="flex items-center gap-1.5">
          {ETAPES.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 === step ? "w-8 bg-primary" : i + 1 < step ? "w-3 bg-primary/40" : "w-3 bg-rule"}`} />
          ))}
        </div>
        <p className="text-sm font-medium text-text-soft">Étape {step} sur {ETAPES.length}</p>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-2xl border border-rule bg-surface shadow-card px-5 py-6 sm:px-8 sm:py-8"
        >
        {erreur && (
          <p role="alert" className="mb-6 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-role-body text-danger">
            {erreur}
          </p>
        )}

        {/* ─── 1. Niveaux : la seule question obligatoire, et la seule qui construit ─── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Commençons par votre établissement.
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-text-soft">
              Sélectionnez les niveaux enseignés. EduCom va générer automatiquement la structure de vos classes.
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

        {/* ─── 2. Programme : le modèle sénégalais, annoncé avant d'être écrit ─── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Comment souhaitez-vous configurer l'année ?
            </h1>
            <p className="mt-2 text-role-body leading-relaxed text-text-soft">
              EduCom peut installer les matières officielles de chaque niveau, les trois
              trimestres et leurs compositions. Vous resterez libre de tout modifier ensuite.
            </p>

            <div className="mt-6 space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-control border px-4 py-4 transition-colors ${
                  applyProgramme ? "border-primary bg-primary/5" : "border-rule bg-surface hover:bg-sunk"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  checked={applyProgramme}
                  onChange={() => setApplyProgramme((v) => !v)}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-role-card font-semibold text-text">
                    <BookOpen aria-hidden="true" className="h-4 w-4 text-text-faint" />
                    Installer le programme officiel
                  </span>
                  {/* ⚠️ Des nombres RÉELS, calculés par le même module que le
                      serveur utilisera pour écrire — jamais une estimation. */}
                  <span className="mt-1 block text-role-meta leading-relaxed text-text-soft">
                    {projection.totals.subjects} matières · {projection.totals.links} rattachements aux
                    classes · {projection.totals.terms} trimestres · {projection.totals.evaluations} évaluations.
                  </span>
                </span>
              </label>

              {/* Les contrôles ne sont PAS le socle : case distincte, décochable. */}
              <label
                className={`ml-0 flex cursor-pointer items-start gap-3 rounded-control border px-4 py-3.5 transition-colors sm:ml-8 ${
                  !applyProgramme
                    ? "border-rule bg-sunk opacity-50"
                    : withControls ? "border-primary/40 bg-primary/5" : "border-rule bg-surface hover:bg-sunk"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  checked={withControls}
                  disabled={!applyProgramme}
                  onChange={() => setWithControls((v) => !v)}
                />
                <span className="min-w-0">
                  <span className="text-role-body font-semibold text-text">
                    Ajouter aussi un contrôle par trimestre
                  </span>
                  <span className="mt-0.5 block text-role-meta leading-relaxed text-text-soft">
                    Sans contrôle, chaque trimestre n&apos;a qu&apos;une note par matière : celle de
                    la composition. Beaucoup d&apos;écoles en ajoutent un — vous pourrez en créer
                    autant que vous voulez plus tard.
                  </span>
                </span>
              </label>
            </div>

            {/* ⚠️ Ce que le modèle NE couvre PAS est dit ici, pas découvert
                trois semaines plus tard devant un bulletin vide. */}
            {applyProgramme && projection.uncovered.length > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-control border border-rule bg-sunk px-3 py-2.5 text-role-meta leading-relaxed text-text-soft">
                <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {projection.uncovered.map((u) => u.className).join(", ")} n&apos;
                  {projection.uncovered.length > 1 ? "auront" : "aura"} pas de matières :{" "}
                  {projection.uncovered[0].reason.toLowerCase()} Vous les composerez à la main.
                </span>
              </p>
            )}

            <p className="mt-5 max-w-xl text-role-meta leading-relaxed text-text-soft">
              {/* Le coefficient est LE point où une valeur inventée ferait des
                  dégâts invisibles : elle déciderait de moyennes réelles. */}
              Toutes les matières arrivent au <span className="font-medium text-text">coefficient 1</span> :
              il n&apos;existe pas de barème national, chaque école a le sien. Les dates de
              trimestre restent vides pour la même raison — ce sont les vôtres.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-rule/70 pt-6">
              <Button size="lg" variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Retour
              </Button>
              <Button size="lg" onClick={() => setStep(3)}>
                Continuer
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── 3. Coordonnées : facultatif, et l'écran le dit ─── */}
        {step === 3 && (
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
              <Button size="lg" variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Retour
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" variant="secondary" onClick={() => setStep(4)}>Passer</Button>
                <Button size="lg" onClick={() => setStep(4)}>
                  Continuer
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. Tarifs : lot 12.2, conservé, rendu explicitement facultatif ─── */}
        {step === 4 && (
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
              <Button size="lg" variant="ghost" onClick={() => setStep(3)} disabled={busy}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Retour
              </Button>
              <div className="flex gap-2">
                <Button size="lg" variant="secondary" onClick={finish} disabled={busy}>
                  Passer cette configuration
                </Button>
                <Button size="lg" loading={busy} onClick={finish}>
                  {busy ? "Création de vos classes…" : "Terminer l'installation"}
                  {!busy && <Check aria-hidden="true" className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
