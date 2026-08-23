import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { BoardRow } from "@/lib/gradeEntry";

/**
 * Le tableau de travail d'un trimestre — contrôles ou composition.
 *
 * ═══ TROIS ÉTATS, TROIS VERBES ═══
 *
 * `Commencer` (rien de saisi) · `Continuer` (saisie entamée) · `Terminé`. Le
 * verbe dit ce qui se passe au clic ; il ne décrit pas un statut abstrait.
 *
 * ⚠️ **Aucun sélecteur.** Chaque ligne porte déjà classe, matière, trimestre et
 * évaluation dans son lien : le moteur de saisie ne redemande rien. C'est tout
 * l'intérêt d'entrer par le travail plutôt que par la configuration.
 *
 * Rendu côté serveur, sans état : la navigation passe par l'URL, donc l'écran
 * fonctionne avant même l'hydratation.
 *
 * ⚠️ **La date de l'évaluation s'affiche sous son nom, quand elle existe.** Elle
 * n'est pas décorative : une composition déplacée par la direction se lit ici,
 * sur l'écran où l'enseignant vient travailler, sans qu'il ait à chercher. Une
 * évaluation sans date reste sans date — aucune n'est inventée pour remplir la
 * colonne (voir `src/lib/pedagogy.ts`).
 */
export function BoardTable({ rows, empty }: { rows: BoardRow[]; empty: React.ReactNode }) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-rule">
            <th className="px-5 py-2.5 text-role-meta font-semibold uppercase tracking-wider text-text-faint">Évaluation</th>
            <th className="px-3 py-2.5 text-role-meta font-semibold uppercase tracking-wider text-text-faint">Classe</th>
            <th className="px-3 py-2.5 text-role-meta font-semibold uppercase tracking-wider text-text-faint">Matière</th>
            <th className="px-3 py-2.5 text-right text-role-meta font-semibold uppercase tracking-wider text-text-faint">Progression</th>
            <th className="px-5 py-2.5 text-right text-role-meta font-semibold uppercase tracking-wider text-text-faint">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((r) => {
            const done = r.total > 0 && r.entered >= r.total;
            const pct = r.total > 0 ? Math.round((r.entered / r.total) * 100) : 0;
            const verb = done ? "Terminé" : r.entered > 0 ? "Continuer" : "Commencer";

            return (
              <tr key={r.key} className="group transition-colors duration-200 hover:bg-sunk/50">
                <td className="px-5 py-3">
                  <Link href={r.href} className="block font-semibold text-text focus-visible:outline-none focus-visible:underline">
                    {r.evaluationName}
                  </Link>
                  {r.evaluationDate && (
                    <span className="mt-0.5 block text-role-meta tabular-nums text-text-faint">
                      {new Date(r.evaluationDate).toLocaleDateString("fr-FR", {
                        weekday: "short", day: "numeric", month: "long",
                      })}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-role-body text-text-soft">{r.className}</td>
                <td className="px-3 py-3 text-role-body text-text-soft">{r.subjectLabel}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2.5">
                    <div className="hidden h-1.5 w-20 overflow-hidden rounded-pill bg-sunk sm:block">
                      <div
                        className={`h-full rounded-pill transition-all duration-500 ${done ? "bg-success" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-role-body font-semibold tabular-nums ${done ? "text-success" : "text-text"}`}>
                      {r.entered}/{r.total}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={r.href}
                    className={`inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1.5 text-role-meta font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      done
                        ? "border-success/20 bg-success/10 text-success hover:border-success/40"
                        : "border-rule bg-surface text-text-soft group-hover:border-primary/30 group-hover:text-primary"
                    }`}
                  >
                    {done
                      ? <Check aria-hidden="true" className="h-3.5 w-3.5" />
                      : <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />}
                    {verb}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
