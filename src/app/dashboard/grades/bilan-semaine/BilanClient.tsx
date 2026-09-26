"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronDown, Send, Plus, Trash2, BellRing, Search, Settings2, Info, X, Eye, CheckCircle2, Sun } from "lucide-react";
import {
  VERDICTS,
  SUJETS_SPECIAUX,
  construireRecap,
  actionMatiere,
  normaliser,
  libelleJour,
  formaterNote,
  ACTION_LECONS,
  ACTION_DEVOIRS,
  type Verdict,
  type TypeObservation,
} from "@/lib/bilanRegles";
import type { SemaineClasse, MatiereOption } from "@/lib/bilanSemaine";
import CarteBilan from "@/components/bilan/CarteBilan";
import { ajouterObservation, supprimerObservation, envoyerPointDuJour, modifierRecap, envoyerBilans, enregistrerActionsBilan } from "./actions";

/**
 * Bilan de la semaine (v2) — écran enseignant. 26 sept. 2026.
 * À gauche les élèves ; à droite la semaine de l'élève, jour par jour, ses
 * observations et ses notes, et l'aperçu du bilan qu'enverra le professeur principal.
 */
export default function BilanClient(props: {
  classes: { id: string; nom: string }[];
  bilan: SemaineClasse | null;
  semaineActuelle: string;
  aujourdhui: string;
  actionsPerso: Record<string, string>;
  direction: boolean;
}) {
  if (!props.classes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-rule bg-surface px-6 py-10 text-center">
        <p className="text-[15px] font-bold text-text">Aucune classe pour vous.</p>
        <p className="mt-1 text-sm text-text-soft">Le bilan apparaît dès qu&apos;une classe vous est affectée (Pédagogie → Classes / enseignants).</p>
      </div>
    );
  }
  if (!props.bilan) return <p className="text-sm text-text-soft">Classe introuvable.</p>;
  return <Ecran key={`${props.bilan.classe.id}-${props.bilan.semaine}`} {...props} bilan={props.bilan} />;
}

function Ecran({
  classes,
  bilan: s,
  semaineActuelle,
  aujourdhui,
  actionsPerso,
  direction,
}: {
  classes: { id: string; nom: string }[];
  bilan: SemaineClasse;
  semaineActuelle: string;
  aujourdhui: string;
  actionsPerso: Record<string, string>;
  direction: boolean;
}) {
  const router = useRouter();
  const [choisi, setChoisi] = useState<string | null>(s.eleves[0]?.id ?? null);
  const [recherche, setRecherche] = useState("");
  const [enCours, demarrer] = useTransition();

  const semaine = new Date(s.semaine);
  const estActuelle = s.semaine === semaineActuelle;
  const href = (classId: string, iso: string) => `?classId=${classId}&semaine=${iso.slice(0, 10)}`;
  const precedente = new Date(semaine.getTime() - 7 * 86400_000).toISOString();
  const suivante = new Date(semaine.getTime() + 7 * 86400_000).toISOString();

  const recaps = useMemo(
    () =>
      new Map(
        s.eleves.map((e) => [
          e.id,
          construireRecap({
            semaine: s.libelleSemaine,
            eleve: e.nom,
            classe: s.classe.nom,
            enseignant: s.principal ?? s.moi,
            observations: s.observations.filter((o) => o.studentId === e.id),
            notes: s.notes.filter((n) => n.studentId === e.id),
            verdictChoisi: e.verdict,
            commentaire: e.commentaire,
            perso: actionsPerso,
          }),
        ]),
      ),
    [s, actionsPerso],
  );
  const aEnvoyer = [...recaps.values()].filter(Boolean).length;
  const dejaEnvoyes = s.eleves.filter((e) => e.envoyeLe).length;
  const pointDuJour = s.observations.filter((o) => o.estAMoi && !o.prevenu && o.date.slice(0, 10) === aujourdhui.slice(0, 10)).length;
  const eleve = s.eleves.find((e) => e.id === choisi) ?? null;
  const liste = s.eleves.filter((e) => !recherche.trim() || normaliser(e.nom).includes(normaliser(recherche)));

  const lancer = (fn: () => Promise<{ ok: boolean; error?: string }>, succes?: (r: never) => string) =>
    demarrer(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Action impossible.");
      if (succes) toast.success(succes(r as never));
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {/* Classe, semaine, envois */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rule bg-surface p-3">
        <select
          aria-label="Classe"
          value={s.classe.id}
          onChange={(e) => router.push(href(e.target.value, s.semaine))}
          className="min-h-10 rounded-lg border border-rule bg-surface px-3 text-sm font-bold"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 rounded-lg bg-sunk p-1">
          <Link href={href(s.classe.id, precedente)} aria-label="Semaine précédente" className="flex h-8 w-8 items-center justify-center rounded-md text-text-soft hover:bg-surface">
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
          <span className="px-2 text-sm font-semibold text-text">
            {estActuelle ? "Cette semaine" : "Semaine"} · {s.libelleSemaine}
          </span>
          {estActuelle ? (
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center text-text-faint/40">
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <Link href={href(s.classe.id, suivante)} aria-label="Semaine suivante" className="flex h-8 w-8 items-center justify-center rounded-md text-text-soft hover:bg-surface">
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {estActuelle && s.peutObserver && (
            <button
              type="button"
              disabled={enCours || pointDuJour === 0}
              title="Prévient les parents des observations que vous avez notées aujourd'hui"
              onClick={() =>
                lancer(
                  () => envoyerPointDuJour(s.classe.id),
                  (r: { prevenus: number }) => `Point du jour envoyé : ${r.prevenus} famille${r.prevenus > 1 ? "s" : ""} prévenue${r.prevenus > 1 ? "s" : ""}.`,
                )
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-primary-ink ring-1 ring-primary-ink/30 hover:bg-primary-ink/5 disabled:opacity-40"
            >
              <Sun aria-hidden="true" className="h-4 w-4" /> Point du jour ({pointDuJour})
            </button>
          )}
          {s.peutEnvoyer ? (
            <button
              type="button"
              disabled={enCours || aEnvoyer === 0}
              onClick={() => {
                if (!window.confirm(`Envoyer le bilan de la semaine aux parents de ${aEnvoyer} élève${aEnvoyer > 1 ? "s" : ""} ?`)) return;
                lancer(
                  () => envoyerBilans(s.classe.id, s.semaine),
                  (r: { envoyes: number; vides: number; sansParent: number }) =>
                    `Bilan envoyé pour ${r.envoyes} élève${r.envoyes > 1 ? "s" : ""}.${r.sansParent ? ` ${r.sansParent} sans compte parent.` : ""}`,
                );
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary-ink px-5 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:bg-primary-ink/35"
            >
              <Send aria-hidden="true" className="h-4 w-4" /> {dejaEnvoyes ? "Renvoyer" : "Envoyer"} le bilan de la semaine ({aEnvoyer})
            </button>
          ) : (
            <span className="text-xs text-text-soft">Le bilan de la semaine est envoyé par {s.principal ?? "le professeur principal"}.</span>
          )}
        </div>
      </div>

      {!s.peutObserver && (
        <p className="flex items-center gap-2 rounded-xl bg-sunk px-4 py-2.5 text-sm text-text-soft">
          <Info aria-hidden="true" className="h-4 w-4 shrink-0" /> Consultation : seuls les enseignants de la classe et la direction ajoutent des observations.
        </p>
      )}

      {s.eleves.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rule bg-surface p-6 text-sm text-text-soft">Aucun élève inscrit dans cette classe.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Élèves */}
          <aside className="overflow-hidden rounded-2xl border border-rule bg-surface lg:sticky lg:top-4 lg:self-start">
            <div className="border-b border-rule p-2">
              <label className="flex items-center gap-2 rounded-lg bg-sunk px-2.5">
                <Search aria-hidden="true" className="h-4 w-4 text-text-faint" />
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Chercher un élève"
                  aria-label="Chercher un élève"
                  className="min-h-9 w-full border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
                />
              </label>
            </div>
            <ul className="max-h-[70vh] overflow-y-auto py-1">
              {liste.map((e) => {
                const o = s.observations.filter((x) => x.studentId === e.id);
                const t = o.filter((x) => x.kind === "TRAVAIL").length;
                const f = o.filter((x) => x.kind === "FORT").length;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setChoisi(e.id)}
                      aria-current={choisi === e.id ? "true" : undefined}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left ${choisi === e.id ? "bg-primary-ink/[0.08]" : "hover:bg-sunk"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${choisi === e.id ? "font-bold text-text" : "font-medium text-text"}`}>{e.nom}</span>
                        <span className="block text-[11px] text-text-faint">
                          {e.vuLe ? "Bilan vu par la famille" : e.envoyeLe ? "Bilan envoyé" : !e.aUnParent ? "Pas de compte parent" : o.length ? `${o.length} observation${o.length > 1 ? "s" : ""}` : "Rien de noté"}
                        </span>
                      </span>
                      {t > 0 && <span className="rounded-full bg-danger/10 px-1.5 text-[11px] font-bold text-danger">❌ {t}</span>}
                      {f > 0 && <span className="rounded-full bg-success/12 px-1.5 text-[11px] font-bold text-success">✅ {f}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Semaine de l'élève */}
          {eleve && (
            <section className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-text">{eleve.nom}</h2>
                {!eleve.aUnParent && <span className="rounded-full bg-sunk px-2 py-0.5 text-xs text-text-soft">Pas de compte parent : le bilan ne sera lu par personne</span>}
              </div>

              {s.peutObserver && (
                <Formulaire
                  key={eleve.id}
                  s={s}
                  eleveId={eleve.id}
                  aujourdhui={aujourdhui}
                  perso={actionsPerso}
                  enCours={enCours}
                  enregistrer={(input) =>
                    lancer(
                      () => ajouterObservation({ classId: s.classe.id, ...input }),
                      (r: { ajoutees: number; prevenus: number }) =>
                        `Observation enregistrée${r.ajoutees > 1 ? ` pour ${r.ajoutees} élèves` : ""}${r.prevenus ? ` · ${r.prevenus} parent${r.prevenus > 1 ? "s" : ""} prévenu${r.prevenus > 1 ? "s" : ""}` : ""}.`,
                    )
                  }
                />
              )}

              <Chronologie s={s} eleveId={eleve.id} supprimer={(id) => lancer(() => supprimerObservation(id))} enCours={enCours} />

              <div className="grid gap-3 xl:grid-cols-[1fr_320px]">
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-faint">Bilan de la semaine — ce que recevra la famille</p>
                  {recaps.get(eleve.id) ? (
                    <CarteBilan s={recaps.get(eleve.id)!} />
                  ) : (
                    <p className="rounded-2xl border border-dashed border-rule bg-surface p-5 text-sm text-text-soft">Rien pour l&apos;instant : ajoutez une observation, ou saisissez des notes cette semaine.</p>
                  )}
                </div>
                {s.peutEnvoyer && <Recap key={eleve.id} s={s} eleveId={eleve.id} />}
              </div>
            </section>
          )}
        </div>
      )}

      {direction && <ReglagesActions matieres={s.matieres} perso={actionsPerso} />}
    </div>
  );
}

/* ═══════════════════════ Ajouter une observation ═══════════════════════ */

type Saisie = {
  studentIds: string[];
  subjectKey: string;
  date: string;
  kind: TypeObservation;
  topics: string[];
  note: { libelle: string; valeur: number; max: number } | null;
  action: string | null;
  commentaire: string | null;
  prevenir: boolean;
};

function Formulaire({
  s,
  eleveId,
  aujourdhui,
  perso,
  enCours,
  enregistrer,
}: {
  s: SemaineClasse;
  eleveId: string;
  aujourdhui: string;
  perso: Record<string, string>;
  enCours: boolean;
  enregistrer: (input: Saisie) => void;
}) {
  const miennes = s.matieres.filter((m) => m.editable);
  const speciales: MatiereOption[] = (["LECONS", "DEVOIRS", "GENERAL"] as const).map((k) => ({ cle: k, nom: SUJETS_SPECIAUX[k], groupe: null, editable: true, points: [] }));
  const options = [...miennes, ...speciales];
  // Dernier jour possible : aujourd'hui, ou le dimanche d'une semaine passée.
  const finSemaine = new Date(new Date(s.semaine).getTime() + 6 * 86400_000).toISOString();
  const dernierJour = aujourdhui < finSemaine ? aujourdhui : finSemaine;

  const [ouvert, setOuvert] = useState(false);
  const [cle, setCle] = useState(miennes[0]?.cle ?? "LECONS");
  const [kind, setKind] = useState<TypeObservation>("TRAVAIL");
  const [date, setDate] = useState(dernierJour.slice(0, 10));
  const [topics, setTopics] = useState<string[]>([]);
  const [autre, setAutre] = useState("");
  const [note, setNote] = useState<{ libelle: string; valeur: string; max: string }>({ libelle: "", valeur: "", max: "20" });
  const [actionEditee, setActionEditee] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [autres, setAutres] = useState<string[]>([]);
  const [plusieurs, setPlusieurs] = useState(false);

  const matiere = options.find((o) => o.cle === cle) ?? options[0];
  const actionDefaut = actionMatiere(matiere.nom, perso, cle);
  const action = actionEditee ?? actionDefaut;
  const notesSemaine = s.notes.filter((n) => n.studentId === eleveId && n.subjectKey === cle);

  const reinit = () => {
    setTopics([]);
    setAutre("");
    setNote({ libelle: "", valeur: "", max: "20" });
    setActionEditee(null);
    setCommentaire("");
    setAutres([]);
    setPlusieurs(false);
  };
  const soumettre = (prevenir: boolean) => {
    const v = Number(note.valeur.replace(",", "."));
    const m = Number(note.max.replace(",", "."));
    const aNote = note.valeur.trim() !== "";
    enregistrer({
      studentIds: [eleveId, ...autres],
      subjectKey: cle,
      date: new Date(`${date}T00:00:00Z`).toISOString(),
      kind,
      topics: autre.trim() ? [...topics, autre.trim()] : topics,
      note: aNote ? { libelle: note.libelle.trim() || "Devoir", valeur: v, max: m } : null,
      action: kind === "TRAVAIL" ? action : null,
      commentaire: commentaire.trim() || null,
      prevenir,
    });
    reinit();
  };

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-primary-ink/30 bg-surface px-4 py-3 text-left text-sm font-bold text-primary-ink hover:border-primary-ink/60"
      >
        <Plus aria-hidden="true" className="h-4 w-4" /> Ajouter une observation
        <span className="font-normal text-text-soft">— ce qui va, ce qui ne va pas, dans une matière</span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary-ink/40 bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-text">Nouvelle observation</p>
        <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="flex h-8 w-8 items-center justify-center rounded-lg text-text-soft hover:bg-sunk">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-xs font-bold text-text-soft">
          Matière
          <select
            value={cle}
            onChange={(e) => {
              setCle(e.target.value);
              setTopics([]);
              setActionEditee(null);
            }}
            className="mt-1 min-h-10 w-full rounded-lg border border-rule bg-surface px-3 text-sm font-semibold text-text"
          >
            {[...new Set(miennes.map((m) => m.groupe))].map((g) =>
              g ? (
                <optgroup key={g} label={g}>
                  {miennes
                    .filter((m) => m.groupe === g)
                    .map((m) => (
                      <option key={m.cle} value={m.cle}>
                        {m.nom}
                      </option>
                    ))}
                </optgroup>
              ) : (
                miennes
                  .filter((m) => !m.groupe)
                  .map((m) => (
                    <option key={m.cle} value={m.cle}>
                      {m.nom}
                    </option>
                  ))
              ),
            )}
            <optgroup label="Travail personnel">
              {speciales.map((m) => (
                <option key={m.cle} value={m.cle}>
                  {m.nom}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="text-xs font-bold text-text-soft">
          Jour
          <input
            type="date"
            value={date}
            min={s.semaine.slice(0, 10)}
            max={dernierJour.slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block min-h-10 rounded-lg border border-rule px-3 text-sm text-text"
          />
        </label>
        <div className="text-xs font-bold text-text-soft">
          Constat
          <div className="mt-1 flex rounded-lg bg-sunk p-1">
            {(
              [
                ["TRAVAIL", "❌ À travailler"],
                ["FORT", "✅ Point fort"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-8 rounded-md px-3 text-sm font-semibold ${kind === k ? "bg-surface text-text shadow-2xs" : "text-text-soft"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {matiere.cle !== "LECONS" && matiere.cle !== "DEVOIRS" && (
        <div>
          <p className="text-xs font-bold text-text-soft">Sur quoi, précisément ?</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[...new Set([...matiere.points, ...topics])].map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={topics.includes(p)}
                onClick={() => setTopics((t) => (t.includes(p) ? t.filter((x) => x !== p) : [...t, p]))}
                className={`min-h-8 rounded-full px-3 text-sm ${topics.includes(p) ? "bg-primary-ink font-semibold text-white" : "bg-surface text-text ring-1 ring-rule hover:bg-sunk"}`}
              >
                {p}
              </button>
            ))}
            <input
              value={autre}
              onChange={(e) => setAutre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && autre.trim()) {
                  e.preventDefault();
                  setTopics((t) => [...new Set([...t, autre.trim()])]);
                  setAutre("");
                }
              }}
              placeholder="+ autre (Entrée)"
              aria-label="Autre point"
              maxLength={60}
              className="min-h-8 w-40 rounded-full border border-dashed border-rule px-3 text-sm"
            />
          </div>
        </div>
      )}
      {(matiere.cle === "LECONS" || matiere.cle === "DEVOIRS") && (
        <label className="block text-xs font-bold text-text-soft">
          {matiere.cle === "LECONS" ? "Quelle leçon ? (facultatif)" : "Quel devoir ? (facultatif)"}
          <input
            value={autre}
            onChange={(e) => setAutre(e.target.value)}
            placeholder={matiere.cle === "LECONS" ? "Ex. : La phrase interrogative" : "Ex. : Exercices p. 42"}
            maxLength={60}
            className="mt-1 min-h-10 w-full rounded-lg border border-rule px-3 text-sm font-normal text-text"
          />
        </label>
      )}

      {!["LECONS", "DEVOIRS", "GENERAL"].includes(matiere.cle) && (
        <div>
          <p className="text-xs font-bold text-text-soft">Note (facultatif)</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {notesSemaine.map((n, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNote({ libelle: n.libelle, valeur: String(n.valeur), max: String(n.max) })}
                className="min-h-8 rounded-full bg-sunk px-3 text-sm text-text hover:bg-rule/60"
                title="Reprendre cette note de la semaine"
              >
                {n.libelle} {formaterNote(n.valeur, n.max)}
              </button>
            ))}
            <input
              value={note.libelle}
              onChange={(e) => setNote((x) => ({ ...x, libelle: e.target.value }))}
              placeholder="Devoir, interro…"
              aria-label="Intitulé de la note"
              maxLength={60}
              className="min-h-8 w-36 rounded-lg border border-rule px-2 text-sm"
            />
            <input
              value={note.valeur}
              onChange={(e) => setNote((x) => ({ ...x, valeur: e.target.value }))}
              inputMode="decimal"
              placeholder="9"
              aria-label="Note obtenue"
              className="min-h-8 w-14 rounded-lg border border-rule px-2 text-center text-sm"
            />
            <span className="text-sm text-text-soft">/</span>
            <input
              value={note.max}
              onChange={(e) => setNote((x) => ({ ...x, max: e.target.value }))}
              inputMode="decimal"
              aria-label="Note sur"
              className="min-h-8 w-14 rounded-lg border border-rule px-2 text-center text-sm"
            />
          </div>
        </div>
      )}

      {kind === "TRAVAIL" && (
        <label className="block text-xs font-bold text-text-soft">
          Action proposée aux parents
          <input
            value={action}
            onChange={(e) => setActionEditee(e.target.value)}
            maxLength={300}
            className="mt-1 min-h-10 w-full rounded-lg border border-rule px-3 text-sm font-normal text-text"
          />
        </label>
      )}
      <label className="block text-xs font-bold text-text-soft">
        Commentaire (facultatif)
        <input
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          maxLength={500}
          placeholder="Ex. : confond encore ser et estar"
          className="mt-1 min-h-10 w-full rounded-lg border border-rule px-3 text-sm font-normal text-text"
        />
      </label>

      <div>
        <button type="button" onClick={() => setPlusieurs((v) => !v)} aria-expanded={plusieurs} className="text-xs font-semibold text-primary-ink hover:underline">
          {plusieurs ? "Masquer" : "Même observation pour d'autres élèves"}
          {autres.length > 0 && ` (${autres.length})`}
        </button>
        {plusieurs && (
          <div className="mt-2 grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-rule p-2 sm:grid-cols-3">
            {s.eleves
              .filter((e) => e.id !== eleveId)
              .map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={autres.includes(e.id)}
                    onChange={(ev) => setAutres((a) => (ev.target.checked ? [...a, e.id] : a.filter((x) => x !== e.id)))}
                    className="h-4 w-4 accent-[var(--color-primary-ink)]"
                  />
                  <span className="truncate">{e.nom}</span>
                </label>
              ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule pt-3">
        <button
          type="button"
          disabled={enCours}
          onClick={() => soumettre(true)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-primary-ink ring-1 ring-primary-ink/30 hover:bg-primary-ink/5 disabled:opacity-50"
        >
          <BellRing aria-hidden="true" className="h-4 w-4" /> Enregistrer et prévenir le parent
        </button>
        <button
          type="button"
          disabled={enCours}
          onClick={() => soumettre(false)}
          className="min-h-10 rounded-full bg-primary-ink px-5 text-sm font-bold text-white hover:bg-primary-ink-hover disabled:opacity-50"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════ La semaine, jour par jour ═══════════════════════ */

function Chronologie({ s, eleveId, supprimer, enCours }: { s: SemaineClasse; eleveId: string; supprimer: (id: string) => void; enCours: boolean }) {
  const obs = s.observations.filter((o) => o.studentId === eleveId);
  const notes = s.notes.filter((n) => n.studentId === eleveId);
  const jours = [...new Set([...obs.map((o) => o.date.slice(0, 10)), ...notes.map((n) => n.date.slice(0, 10))])].sort();
  if (!jours.length) {
    return <p className="rounded-2xl border border-rule bg-surface p-5 text-sm text-text-soft">Rien de noté cette semaine pour cet élève.</p>;
  }
  return (
    <ol className="space-y-3">
      {jours.map((j) => (
        <li key={j} className="rounded-2xl border border-rule bg-surface">
          <p className="border-b border-rule px-4 py-2 text-xs font-bold uppercase tracking-wide text-text-soft first-letter:uppercase">{libelleJour(`${j}T00:00:00Z`)}</p>
          <ul className="divide-y divide-rule">
            {obs
              .filter((o) => o.date.slice(0, 10) === j)
              .map((o) => (
                <li key={o.id} className="group flex gap-3 px-4 py-2.5">
                  <span aria-hidden="true" className="pt-0.5">
                    {o.kind === "TRAVAIL" ? "❌" : "✅"}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-text">
                      <strong>{o.subjectName}</strong>
                      {o.topics.length > 0 && <span> — {o.topics.join(", ")}</span>}
                      {o.note && <span className="font-semibold tabular-nums"> · {o.note.libelle} {formaterNote(o.note.valeur, o.note.max)}</span>}
                    </p>
                    {o.commentaire && <p className="text-text-soft">« {o.commentaire} »</p>}
                    {o.action && <p className="text-primary-ink">→ {o.action}</p>}
                    <p className="mt-0.5 text-[11px] text-text-faint">
                      {o.auteur}
                      {o.prevenu && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-success">
                          <CheckCircle2 aria-hidden="true" className="h-3 w-3" /> parent prévenu
                        </span>
                      )}
                    </p>
                  </div>
                  {o.estAMoi && (
                    <button
                      type="button"
                      disabled={enCours}
                      aria-label="Supprimer l'observation"
                      onClick={() => {
                        if (window.confirm("Supprimer cette observation ?")) supprimer(o.id);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-faint opacity-0 hover:bg-sunk hover:text-danger focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            {notes
              .filter((n) => n.date.slice(0, 10) === j)
              .map((n, i) => (
                <li key={`n${i}`} className="flex gap-3 px-4 py-2 text-sm text-text-soft">
                  <span aria-hidden="true">📝</span>
                  <span>
                    Note saisie : <strong className="text-text">{n.matiere}</strong> — {n.libelle} <span className="font-semibold tabular-nums text-text">{formaterNote(n.valeur, n.max)}</span>
                  </span>
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/* ═══════════════════════ Verdict et commentaire (professeur principal) ═══════════════════════ */

function Recap({ s, eleveId }: { s: SemaineClasse; eleveId: string }) {
  const router = useRouter();
  const e = s.eleves.find((x) => x.id === eleveId)!;
  const [verdict, setVerdict] = useState<Verdict | null>(e.verdict);
  const [enCours, demarrer] = useTransition();
  const enregistrer = (champ: { commentaire?: string; verdict?: string | null }) =>
    demarrer(async () => {
      const r = await modifierRecap(s.classe.id, s.semaine, eleveId, champ);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  return (
    <div className="space-y-3 rounded-2xl border border-rule bg-surface p-4">
      <p className="text-sm font-bold text-text">Mot du professeur principal</p>
      <label className="block text-xs font-bold text-text-soft">
        Verdict
        <select
          value={verdict ?? ""}
          disabled={enCours}
          onChange={(ev) => {
            const v = (ev.target.value || null) as Verdict | null;
            setVerdict(v);
            enregistrer({ verdict: v });
          }}
          className="mt-1 min-h-10 w-full rounded-lg border border-rule bg-surface px-3 text-sm font-semibold text-text"
        >
          <option value="">Automatique (d&apos;après la semaine)</option>
          {(Object.keys(VERDICTS) as Verdict[]).map((v) => (
            <option key={v} value={v}>
              {VERDICTS[v].emoji} {VERDICTS[v].libelle}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-bold text-text-soft">
        Commentaire général
        <textarea
          defaultValue={e.commentaire}
          rows={4}
          maxLength={600}
          placeholder="Ex. : Bonne semaine dans l'ensemble, attention aux leçons."
          onBlur={(ev) => {
            if (ev.target.value !== e.commentaire) enregistrer({ commentaire: ev.target.value });
          }}
          className="mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm font-normal text-text"
        />
      </label>
      {e.envoyeLe && (
        <p className="flex items-center gap-1.5 text-xs text-text-soft">
          {e.vuLe ? <Eye aria-hidden="true" className="h-3.5 w-3.5 text-success" /> : <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}
          {e.vuLe ? "Vu par la famille" : "Envoyé"} — renvoyez le bilan pour transmettre vos modifications.
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════ Direction : actions proposées ═══════════════════════ */

function ReglagesActions({ matieres, perso }: { matieres: MatiereOption[]; perso: Record<string, string> }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const lignes = [
    ...matieres.map((m) => ({ cle: normaliser(m.nom), nom: m.nom, defaut: actionMatiere(m.nom) })),
    { cle: "LECONS", nom: SUJETS_SPECIAUX.LECONS, defaut: ACTION_LECONS },
    { cle: "DEVOIRS", nom: SUJETS_SPECIAUX.DEVOIRS, defaut: ACTION_DEVOIRS },
  ].filter((l, i, t) => t.findIndex((x) => x.cle === l.cle) === i);
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => Object.fromEntries(lignes.map((l) => [l.cle, perso[l.cle] ?? ""])));
  const [enCours, demarrer] = useTransition();
  return (
    <section className="rounded-2xl border border-rule bg-surface">
      <button type="button" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Settings2 aria-hidden="true" className="h-4 w-4 text-text-soft" />
        <span className="text-sm font-bold text-text">Actions proposées aux parents</span>
        <span className="hidden text-xs text-text-soft sm:inline">— pré-remplies dans chaque observation, modifiables par la direction</span>
        <ChevronDown aria-hidden="true" className={`ml-auto h-4 w-4 text-text-soft transition-transform ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div className="space-y-2 border-t border-rule px-4 py-3">
          {lignes.map((l) => (
            <label key={l.cle} className="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-semibold text-text">{l.nom}</span>
              <input
                value={valeurs[l.cle] ?? ""}
                onChange={(e) => setValeurs((v) => ({ ...v, [l.cle]: e.target.value }))}
                placeholder={l.defaut}
                maxLength={300}
                className="min-h-9 rounded-lg border border-rule px-3 text-sm"
              />
            </label>
          ))}
          <div className="flex items-center justify-end gap-2 pt-1">
            <span className="mr-auto text-xs text-text-faint">Laisser vide = suggestion par défaut (en gris).</span>
            <button
              type="button"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await enregistrerActionsBilan(valeurs);
                  if (r.ok) {
                    toast.success("Actions enregistrées.");
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
              className="min-h-9 rounded-full bg-primary-ink px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
