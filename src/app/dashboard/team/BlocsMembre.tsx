"use client";

import { Check, Lock } from "lucide-react";
import { CAPACITES, RESERVE_DIRECTION, incluseDansMetier, type Capacite } from "@/lib/capacites";
import type { ConfigEnseignant, DonneesEquipe } from "@/lib/equipe";

/**
 * Blocs communs au parcours « Ajouter un membre » et à la fiche membre :
 * Métier · Classes · Accès. Version condensée (retour de Kory, 27 sept. 2026) :
 * tout doit tenir à l'écran, sans grandes cartes.
 *
 * ═══ CLASSES : on choisit la classe, les matières suivent ═══
 * Choisir une classe lui attribue d'office TOUTES les matières au programme de
 * cette classe (`ClassSubject`). Au collège/lycée, où un professeur n'enseigne
 * souvent qu'une matière, on peut restreindre d'un clic (« Seulement : Maths »).
 * La restriction s'applique à toutes les classes choisies.
 */
export const METIERS: { id: string; emoji: string; nom: string; detail: string }[] = [
  { id: "TEACHER", emoji: "🧑‍🏫", nom: "Enseignant", detail: "Ses classes, notes, présences, familles de ses classes" },
  { id: "SECRETARY", emoji: "🗂️", nom: "Secrétaire", detail: "Élèves, inscriptions, documents, bulletins" },
  { id: "ACCOUNTANT", emoji: "💰", nom: "Comptable", detail: "Factures, paiements, relances, finances" },
  { id: "ASSISTANT", emoji: "🤝", nom: "Assistant", detail: "Aide au secrétariat, sans validation" },
  { id: "ADMIN", emoji: "🏛️", nom: "Administrateur", detail: "Tout l'établissement, comme la direction" },
];

export type Autres = {
  noms: Record<string, string>;
  affectations: { teacherId: string; classId: string; subjectId: string | null }[];
};

const puce = (actif: boolean) =>
  `inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-role-meta font-medium transition-colors ${
    actif ? "border-primary bg-primary text-white" : "border-rule bg-surface text-text hover:border-primary"
  }`;

export function BlocMetier({ role, onChange }: { role: string; onChange: (r: string) => void }) {
  return (
    <div className="divide-y divide-rule overflow-hidden rounded-xl border border-rule">
      {METIERS.map((m) => {
        const actif = role === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={actif}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left ${actif ? "bg-primary/5" : "hover:bg-sunk"}`}
          >
            <span aria-hidden="true" className="w-5 text-center text-base leading-none">{m.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="text-role-label font-semibold text-text">{m.nom}</span>
              <span className="ml-2 text-role-meta text-text-soft">{m.detail}</span>
            </span>
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${actif ? "border-primary bg-primary text-white" : "border-rule"}`}>
              {actif && <Check aria-hidden="true" className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type ClasseD = DonneesEquipe["classes"][number];

/** Lecture de la configuration : classes choisies, matières retenues, « toutes » ou non. */
function lire(sec: ClasseD[], config: ConfigEnseignant) {
  const parId = new Map(sec.map((c) => [c.id, c]));
  const classes = [...new Set(config.matieres.map((m) => m.classId))].filter((id) => parId.has(id));
  const sujets = [...new Set(config.matieres.filter((m) => parId.has(m.classId)).map((m) => m.subjectId))];
  const toutes = classes.every((id) => parId.get(id)!.matieres.every((s) => config.matieres.some((m) => m.classId === id && m.subjectId === s.id)));
  return { classes, sujets, toutes };
}

function produit(sec: ClasseD[], classes: string[], toutes: boolean, sujets: string[]) {
  const parId = new Map(sec.map((c) => [c.id, c]));
  return classes.flatMap((id) =>
    (parId.get(id)?.matieres ?? []).filter((s) => toutes || sujets.includes(s.id)).map((s) => ({ classId: id, subjectId: s.id })),
  );
}

export function BlocClasses({
  donnees,
  config,
  onChange,
  moi,
  autres,
}: {
  donnees: DonneesEquipe;
  config: ConfigEnseignant;
  onChange: (c: ConfigEnseignant) => void;
  /** Membre édité (fiche) — absent à la création. */
  moi?: string;
  autres: Autres;
}) {
  const elem = donnees.classes.filter((c) => c.elementaire);
  const sec = donnees.classes.filter((c) => !c.elementaire);
  const { classes, sujets, toutes } = lire(sec, config);
  const garderElem = config.titulaire.filter((id) => elem.some((c) => c.id === id));
  const principal = config.titulaire.find((id) => sec.some((c) => c.id === id)) ?? "";
  const titulaireAutre = (c: ClasseD) => (c.titulaireId && c.titulaireId !== moi ? autres.noms[c.titulaireId] : null);

  const basculerElem = (id: string) =>
    onChange({ ...config, titulaire: config.titulaire.includes(id) ? config.titulaire.filter((x) => x !== id) : [...config.titulaire, id] });

  const basculerClasse = (id: string) => {
    const suivantes = classes.includes(id) ? classes.filter((x) => x !== id) : [...classes, id];
    const pp = principal && suivantes.includes(principal) ? [principal] : [];
    let matieres = produit(sec, suivantes, toutes, sujets);
    // Classe ajoutée sans aucune des matières retenues : elle garde toutes les
    // siennes, sinon elle disparaîtrait de la sélection sans explication.
    if (!classes.includes(id) && !matieres.some((m) => m.classId === id)) matieres = [...matieres, ...produit(sec, [id], true, [])];
    onChange({ titulaire: [...garderElem, ...pp], matieres });
  };

  // Matières proposées = celles au programme d'au moins une classe choisie.
  const proposees = (() => {
    const m = new Map<string, string>();
    for (const c of sec) if (classes.includes(c.id)) for (const s of c.matieres) m.set(s.id, s.nom);
    return [...m].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  })();
  const choisirToutes = () => onChange({ ...config, matieres: produit(sec, classes, true, []) });
  const basculerSujet = (id: string) => {
    const base = toutes ? [] : sujets;
    const suivants = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    if (!suivants.length) return choisirToutes();
    onChange({ ...config, matieres: produit(sec, classes, false, suivants) });
  };
  const choisirPrincipal = (id: string) => onChange({ ...config, titulaire: [...garderElem, ...(id ? [id] : [])] });

  // Collègues qui ont déjà ces matières dans ces classes (information, pas blocage).
  const collegues = [
    ...new Set(
      autres.affectations
        .filter((a) => a.teacherId !== moi && config.matieres.some((m) => m.classId === a.classId && m.subjectId === a.subjectId))
        .map((a) => autres.noms[a.teacherId])
        .filter(Boolean),
    ),
  ];

  if (!donnees.classes.length) {
    return <p className="rounded-xl border border-dashed border-rule p-3 text-role-label text-text-soft">Aucune classe créée pour l&apos;instant : vous pourrez lui en confier depuis sa fiche.</p>;
  }

  return (
    <div className="space-y-4">
      {elem.length > 0 && (
        <section>
          <h4 className="mb-1.5 text-role-label font-semibold text-text">
            Titulaire de <span className="font-normal text-text-faint">— toutes les matières de la classe</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {elem.map((c) => {
              const actif = config.titulaire.includes(c.id);
              const autre = titulaireAutre(c);
              return (
                <button key={c.id} type="button" onClick={() => basculerElem(c.id)} aria-pressed={actif} className={puce(actif)} title={autre ? `Actuellement : ${autre}${actif ? "" : " — sera remplacé(e)"}` : undefined}>
                  {actif && <Check aria-hidden="true" className="h-3 w-3" />}
                  {c.nom}
                  {autre && !actif && <span className="font-normal text-text-faint">· {autre}</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {sec.length > 0 && (
        <section>
          <h4 className="mb-1.5 text-role-label font-semibold text-text">
            {elem.length ? "Collège / lycée" : "Ses classes"} <span className="font-normal text-text-faint">— les matières de la classe suivent</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {sec.map((c) => {
              const actif = classes.includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => basculerClasse(c.id)} aria-pressed={actif} className={puce(actif)} title={c.matieres.length ? `${c.matieres.length} matières au programme` : "Aucune matière au programme"} disabled={!c.matieres.length}>
                  {actif && <Check aria-hidden="true" className="h-3 w-3" />}
                  {c.nom}
                </button>
              );
            })}
          </div>

          {classes.length > 0 && (
            <div className="mt-3 rounded-xl bg-sunk p-2.5">
              <p className="mb-1.5 text-role-meta text-text-soft">Matières enseignées dans ces classes</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={choisirToutes} aria-pressed={toutes} className={puce(toutes)}>
                  {toutes && <Check aria-hidden="true" className="h-3 w-3" />}
                  Toutes
                </button>
                {proposees.map((s) => {
                  const actif = !toutes && sujets.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => basculerSujet(s.id)} aria-pressed={actif} className={puce(actif)}>
                      {actif && <Check aria-hidden="true" className="h-3 w-3" />}
                      {s.nom}
                    </button>
                  );
                })}
              </div>
              {collegues.length > 0 && <p className="mt-1.5 text-role-meta text-text-faint">Déjà enseigné en partie par : {collegues.join(", ")}.</p>}
            </div>
          )}

          <label className="mt-3 flex flex-wrap items-center gap-2 text-role-label text-text">
            Professeur principal de
            <select value={principal} onChange={(e) => choisirPrincipal(e.target.value)} className="h-7 rounded-control border border-rule bg-surface px-2 text-role-meta">
              <option value="">— aucune (facultatif)</option>
              {sec.map((c) => {
                const autre = titulaireAutre(c);
                return (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                    {autre ? ` (actuellement ${autre})` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        </section>
      )}
    </div>
  );
}

export function BlocAcces({ role, acces, onChange }: { role: string; acces: string[]; onChange: (a: string[]) => void }) {
  const incluses = CAPACITES.filter((c) => incluseDansMetier(role, c.id as Capacite));
  const enPlus = CAPACITES.filter((c) => !incluseDansMetier(role, c.id as Capacite));
  const metier = METIERS.find((m) => m.id === role);
  return (
    <div className="space-y-3">
      <section className="rounded-xl bg-sunk p-2.5">
        <p className="text-role-meta font-semibold uppercase tracking-wide text-text-faint">Déjà inclus avec son métier</p>
        <p className="mt-1 text-role-label text-text">{metier ? `${metier.nom} : ${metier.detail.toLowerCase()}.` : "Accès de son métier."}</p>
        {incluses.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {incluses.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface px-2 py-0.5 text-role-meta text-text-soft">
                <Check aria-hidden="true" className="h-3 w-3 text-success" />
                {c.libelle}
              </span>
            ))}
          </div>
        )}
      </section>

      {enPlus.length > 0 && (
        <section>
          <p className="mb-1 text-role-label font-semibold text-text">
            Permissions additionnelles <span className="font-normal text-text-faint">— facultatif</span>
          </p>
          <div className="divide-y divide-rule overflow-hidden rounded-xl border border-rule">
            {enPlus.map((c) => {
              const actif = acces.includes(c.id);
              return (
                <label key={c.id} className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 ${actif ? "bg-primary/5" : "hover:bg-sunk"}`}>
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--color-primary)]" checked={actif} onChange={() => onChange(actif ? acces.filter((x) => x !== c.id) : [...acces, c.id])} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-role-label font-medium text-text">{c.libelle}</span>
                    <span className="ml-2 text-role-meta text-text-faint">{c.detail}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      <p className="flex items-start gap-1.5 text-role-meta text-text-faint">
        <Lock aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
        <span>Réservé à la direction : {RESERVE_DIRECTION.join(", ").toLowerCase()}.</span>
      </p>
    </div>
  );
}

/** Résumé lisible d'une configuration (récapitulatif). */
export function resume(donnees: DonneesEquipe, config: ConfigEnseignant): string[] {
  const parId = new Map(donnees.classes.map((c) => [c.id, c]));
  const sec = donnees.classes.filter((c) => !c.elementaire);
  const lignes: string[] = [];
  const tit = config.titulaire.map((id) => parId.get(id)).filter(Boolean) as ClasseD[];
  const elem = tit.filter((c) => c.elementaire).map((c) => c.nom);
  if (elem.length) lignes.push(`Titulaire : ${elem.join(", ")}`);
  const { classes, sujets, toutes } = lire(sec, config);
  if (classes.length) {
    const noms = classes.map((id) => parId.get(id)?.nom).join(", ");
    const matieres = toutes
      ? "toutes les matières"
      : sujets
          .map((id) => sec.flatMap((c) => c.matieres).find((s) => s.id === id)?.nom)
          .filter(Boolean)
          .join(", ");
    lignes.push(`${noms} — ${matieres}`);
  }
  const pp = tit.filter((c) => !c.elementaire).map((c) => c.nom);
  if (pp.length) lignes.push(`Prof. principal : ${pp.join(", ")}`);
  return lignes;
}
