import { ListChecks, MessageSquareQuote, BookX, NotebookText } from "lucide-react";
import { VERDICTS, libelleJour, type SnapshotBilan } from "@/lib/bilanRegles";
import type { ObservationFamille } from "@/lib/bilanSemaine";

/**
 * Bilan de la semaine — ce que lit le parent (v2, par matière). 26 sept. 2026.
 * Même carte pour l'aperçu de l'enseignant et l'espace famille.
 */
const TON = {
  COMPETENT: "border-success/40",
  PROGRES: "border-warning/50",
  AIDE: "border-danger/40",
} as const;

export default function CarteBilan({ s, compact = false }: { s: SnapshotBilan; compact?: boolean }) {
  const v = s.verdict ? VERDICTS[s.verdict] : null;
  return (
    <article className={`overflow-hidden rounded-2xl border-2 bg-surface ${s.verdict ? TON[s.verdict] : "border-rule"}`}>
      <header className={`border-b border-rule bg-sunk/40 ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-faint">Bilan de la semaine · {s.semaine}</p>
        <h3 className="mt-0.5 text-lg font-bold text-text">
          {s.eleve.split(" ")[0]} {v && <span className="ml-1 text-base">— {v.emoji} {v.libelle}</span>}
        </h3>
        <p className="text-xs text-text-soft">
          {s.classe} · {s.enseignant}
        </p>
      </header>

      <div className={compact ? "px-4 py-3" : "px-5 py-4"}>
        {s.matieres.length > 0 && (
          <ul className="divide-y divide-rule">
            {s.matieres.map((m) => (
              <li key={m.nom} className="py-2 first:pt-0">
                <div className="flex items-baseline gap-2">
                  <span aria-hidden="true">{m.statut === "TRAVAIL" ? "❌" : "✅"}</span>
                  <span className="font-bold text-text">{m.nom}</span>
                  <span className={`text-xs font-semibold ${m.statut === "TRAVAIL" ? "text-danger" : "text-success"}`}>
                    {m.statut === "TRAVAIL" ? "à travailler" : "point fort"}
                  </span>
                </div>
                <div className="ml-6 mt-0.5 space-y-0.5 text-sm text-text">
                  {(m.points.length > 0 || m.notes.length > 0) && (
                    <p>
                      {m.points.join(", ")}
                      {m.points.length > 0 && m.notes.length > 0 && " · "}
                      {m.notes.length > 0 && <span className="font-semibold tabular-nums">{m.notes.join(" · ")}</span>}
                    </p>
                  )}
                  {m.commentaires.map((c, i) => (
                    <p key={i} className="text-text-soft">
                      « {c} »
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        {(s.leconsNonSues.length > 0 || s.devoirsNonFaits.length > 0) && (
          <div className="mt-2 space-y-1 text-sm">
            {s.leconsNonSues.length > 0 && (
              <p className="flex items-center gap-2 text-text">
                <BookX aria-hidden="true" className="h-4 w-4 text-danger" /> Leçons non apprises : {s.leconsNonSues.join(", ")}
              </p>
            )}
            {s.devoirsNonFaits.length > 0 && (
              <p className="flex items-center gap-2 text-text">
                <NotebookText aria-hidden="true" className="h-4 w-4 text-danger" /> Devoirs non faits : {s.devoirsNonFaits.join(", ")}
              </p>
            )}
          </div>
        )}

        {s.actions.length > 0 && (
          <div className="mt-3 rounded-xl bg-primary-ink/[0.05] p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-text">
              <ListChecks aria-hidden="true" className="h-4 w-4 text-primary-ink" /> Ce week-end, pour l&apos;aider
            </p>
            <ul className="mt-1.5 space-y-1">
              {s.actions.map((a, i) => (
                <li key={i} className="text-sm text-text">
                  <span className="font-semibold">{a.sujet} →</span> {a.texte}
                </li>
              ))}
            </ul>
          </div>
        )}

        {s.commentaire && (
          <p className="mt-3 flex items-start gap-2 text-sm italic text-text">
            <MessageSquareQuote aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-soft" />
            <span>
              « {s.commentaire} » <span className="not-italic text-text-soft">— {s.enseignant}</span>
            </span>
          </p>
        )}
      </div>
    </article>
  );
}

/** Observations déjà envoyées cette semaine (point du jour), avant le bilan du vendredi. */
export function ObservationsSemaine({ prenom, liste }: { prenom: string; liste: ObservationFamille[] }) {
  return (
    <article className="rounded-2xl border border-rule bg-surface px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-faint">Cette semaine · au jour le jour</p>
      <h3 className="mt-0.5 text-base font-bold text-text">Les remarques des enseignants sur {prenom}</h3>
      <ul className="mt-2 space-y-2">
        {liste.map((o) => (
          <li key={o.id} className="text-sm text-text">
            <span className="text-xs font-semibold capitalize text-text-faint">{libelleJour(o.date)}</span>
            <p>
              {o.kind === "TRAVAIL" ? "❌" : "✅"} <strong>{o.matiere}</strong>
              {o.topics.length > 0 && ` — ${o.topics.join(", ")}`}
              {o.note && <span className="font-semibold tabular-nums"> · {o.note}</span>}
            </p>
            {o.commentaire && <p className="text-text-soft">« {o.commentaire} »</p>}
            {o.action && <p className="text-primary-ink">→ {o.action}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-text-faint">Le bilan complet de la semaine arrive en fin de semaine.</p>
    </article>
  );
}
