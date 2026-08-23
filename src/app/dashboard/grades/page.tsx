import Link from "next/link";
import { ClipboardList, FileText, GraduationCap, Undo2, Settings, Info, CalendarClock } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { academicBoard } from "@/lib/gradeEntry";
import { getReturnedForTeacher } from "./actions";
import { recentPlanningChanges } from "@/lib/planningNotice";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { DataState } from "@/components/dashboard/DataState";
import { BoardTable } from "@/components/grades/BoardTable";

export const metadata = {
  title: "Notes & Évaluations | EduCom",
  description: "Contrôles, compositions et bulletins du trimestre",
};

/**
 * **Le centre académique** — porte d'entrée de `/dashboard/grades`.
 *
 * ═══ POURQUOI CET ÉCRAN N'EST PAS UNE LISTE DE CLASSES ═══
 *
 * Une première version ouvrait sur « Voici vos classes ». Kory l'a refusée, et
 * il avait raison : cela raconte « un professeur remplit des notes » alors que
 * le produit fait autre chose — il transforme des évaluations en bulletins.
 * L'écran ouvre donc sur **le travail du trimestre**, contrôles d'un côté,
 * composition de l'autre.
 *
 * ═══ CE QUE L'ÉCRAN NE DEMANDE PAS ═══
 *
 * Ni le professeur (la session le dit), ni ses classes (`TeachingAssignment`,
 * avec `Class.teacherId` en filet), ni ses matières (l'affectation), ni
 * l'évaluation. Il reste **un** choix : le trimestre — et il est prérempli.
 *
 * ⚠️ **T1 | T2 | T3 reste toujours accessible.** Le trimestre courant n'est
 * qu'un défaut : consulter ou compléter une période passée est un besoin réel,
 * et l'automatisme ne doit jamais le supprimer.
 *
 * ⚠️ **L'onglet Bulletin ne rend rien ici.** Il renvoie vers
 * `/dashboard/grades/bulletin`, le système de bulletin existant, avec sa
 * validation et son dépôt au secrétariat. Aucune seconde implémentation.
 */
export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { schoolId, user } = await requireSchoolContext();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const vue = one("vue") === "composition" ? "composition" : "controles";

  const board = await academicBoard(
    { schoolId, userId: user.id, role: user.role },
    { firstName: user.firstName?.trim() || null },
    one("t"),
  );

  const { data: returned } = await getReturnedForTeacher();

  /**
   * ⚠️ **Le changement de calendrier est annoncé ICI, sur l'écran de travail.**
   *
   * Sans cela, déplacer une composition est un acte silencieux : la nouvelle
   * date remplace l'ancienne et l'enseignant qui préparait son sujet pour le 12
   * ne l'apprend jamais. C'est la seule notification qu'EduCom puisse honnêtement
   * délivrer aujourd'hui — `src/lib/channels.ts` reste seul juge de ce qui peut
   * QUITTER le produit, et son registre d'envois réels est vide.
   */
  const planning = await recentPlanningChanges({ schoolId, userId: user.id, role: user.role });

  /**
   * ⚠️ **On n'envoie pas un enseignant vers un écran qui le refusera.** Depuis
   * le 22 août 2026, la configuration académique exige direction ou
   * secrétariat : un lien « Configurer » qui mène à une redirection est pire
   * qu'absent, parce qu'il fait porter à l'utilisateur la faute de l'interface.
   * Il reçoit donc l'instruction utile — à qui s'adresser.
   */
  const peutConfigurer = hasAccess(user.role as RoleType, "/dashboard/settings/pedagogie");
  const configHref = peutConfigurer ? "/dashboard/settings/pedagogie" : "/dashboard/grades/bulletin";

  const rows = vue === "composition" ? board.compositions : board.controls;
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    if (board.termId) p.set("t", board.termId);
    p.set("vue", vue);
    for (const [k, v] of Object.entries(patch)) p.set(k, v);
    return `/dashboard/grades?${p.toString()}`;
  };

  const TABS = [
    { key: "controles", label: "Contrôles", icon: ClipboardList, count: board.controls.length },
    { key: "composition", label: "Composition", icon: FileText, count: board.compositions.length },
  ] as const;

  return (
    <div className="space-y-5 pb-12">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-role-page font-semibold tracking-tight text-text">Notes &amp; Évaluations</h1>
          <p className="mt-1 text-role-body text-text-soft">
            {board.wideView
              ? "Le travail d'évaluation de l'établissement, trimestre par trimestre."
              : "Vos contrôles et compositions du trimestre. EduCom connaît déjà vos classes et vos matières."}
          </p>
        </div>
        {peutConfigurer && (
          <Link
            href="/dashboard/settings/pedagogie"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-control border border-rule bg-surface px-3 py-2 text-role-meta font-medium text-text-soft transition-all duration-200 hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Settings aria-hidden="true" className="h-3.5 w-3.5" />
            Trimestres, évaluations et matières
          </Link>
        )}
      </div>

      {/* ── Dossiers renvoyés : sans ce rappel, un renvoi dort ── */}
      {returned && returned.length > 0 && (
        <div className="rounded-surface border border-warning/20 bg-warning/10 px-4 py-3">
          <p className="flex items-center gap-2 text-role-body font-semibold text-warning">
            <Undo2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            {returned.length} dossier{returned.length > 1 ? "s" : ""} renvoyé{returned.length > 1 ? "s" : ""} pour correction
          </p>
          <ul className="mt-1.5 space-y-1">
            {returned.map((r: { key: string; className: string; termName: string; evaluationName: string; count: number; reason?: string }) => (
              <li key={r.key} className="text-role-meta text-warning">
                <strong>{r.className}</strong> — {r.termName} · {r.evaluationName} · {r.count} bulletin{r.count > 1 ? "s" : ""}
                {r.reason && <em className="ml-1">« {r.reason} »</em>}
              </li>
            ))}
          </ul>
          <Link href="/dashboard/grades/bulletin" className="mt-2 inline-block text-role-meta font-semibold text-warning underline underline-offset-2">
            Reprendre la correction
          </Link>
        </div>
      )}

      {/* ── Le calendrier a bougé ── */}
      {planning.length > 0 && (
        <div className="rounded-surface border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="flex items-center gap-2 text-role-body font-semibold text-primary">
            <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0" />
            Le calendrier a changé
          </p>
          <ul className="mt-1.5 space-y-1">
            {planning.map((n) => (
              <li key={n.id} className="text-role-meta text-text-soft">
                <strong className="text-text">{n.name}</strong>
                {n.termName && <span className="text-text-faint"> · {n.termName}</span>} — {n.sentence}
                {n.by && <span className="text-text-faint"> (par {n.by})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Trimestre : T1 | T2 | T3, toujours accessible ── */}
      {board.terms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-role-meta font-semibold uppercase tracking-wider text-text-faint">Trimestre</span>
          {board.terms.map((t) => {
            const active = t.id === board.termId;
            return (
              <Link
                key={t.id}
                href={href({ t: t.id })}
                aria-current={active ? "page" : undefined}
                className={`rounded-control border px-3 py-1.5 text-role-body font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  active
                    ? "border-primary bg-primary text-white shadow-card"
                    : "border-rule bg-surface text-text-soft hover:border-primary/30 hover:text-primary"
                }`}
              >
                {t.name}
                {/* Un trimestre sans dates ne peut pas être « courant » : on le
                    signale plutôt que de le masquer. */}
                {!t.dated && <span className="ml-1.5 text-role-meta opacity-70">· sans dates</span>}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Contrôles | Composition | Bulletin ── */}
      <div className="border-b border-rule">
        <nav className="-mb-px flex flex-wrap gap-6" aria-label="Étapes du trimestre">
          {TABS.map((tab) => {
            const active = vue === tab.key;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={href({ vue: tab.key })}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-role-body font-medium transition-colors duration-200 ${
                  active ? "border-primary text-primary" : "border-transparent text-text-soft hover:border-rule hover:text-text"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-pill px-1.5 py-0.5 text-role-meta tabular-nums ${active ? "bg-primary/10 text-primary" : "bg-sunk text-text-faint"}`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
          {/* Le bulletin est une expérience à part entière, pas un onglet de cet écran. */}
          <Link
            href="/dashboard/grades/bulletin"
            className="inline-flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-role-body font-medium text-text-soft transition-colors duration-200 hover:border-rule hover:text-text"
          >
            <GraduationCap aria-hidden="true" className="h-4 w-4" />
            Bulletin
          </Link>
        </nav>
      </div>

      {/* ── Le travail ── */}
      {board.issue ? (
        <DataState
          kind="empty"
          icon={ClipboardList}
          title={board.termName ? `Rien à saisir sur « ${board.termName} »` : "Le travail du trimestre n'est pas encore ouvert"}
          // ⚠️ La raison vient du serveur ; on n'y ajoute une consigne que
          // lorsque l'utilisateur ne peut PAS agir lui-même.
          description={
            peutConfigurer
              ? board.issue
              : `${board.issue} Demandez à la direction ou au secrétariat d'ouvrir la période.`
          }
          action={peutConfigurer ? { label: "Configurer", href: configHref } : undefined}
        />
      ) : (
        <Card
          flush
          title={vue === "composition" ? `Composition — ${board.termName}` : `Contrôles — ${board.termName}`}
          description={
            vue === "composition"
              ? "L'évaluation principale de la période."
              : "Les évaluations intermédiaires du trimestre."
          }
        >
          <BoardTable
            rows={rows}
            empty={
              <div className="p-4">
                <DataState
                  kind="empty"
                  icon={vue === "composition" ? FileText : ClipboardList}
                  title={vue === "composition" ? "Aucune composition ouverte" : "Aucun contrôle ouvert"}
                  description={
                    vue === "composition"
                      ? `Aucune évaluation de type « Composition / Examen » n'est déclarée sur « ${board.termName} ».`
                      : `Aucune évaluation de type « Contrôle / Devoir » n'est déclarée sur « ${board.termName} ».`
                  }
                  action={peutConfigurer ? { label: "En créer une", href: configHref } : undefined}
                />
              </div>
            }
          />
        </Card>
      )}

      {/* ⚠️ La pondération contrôles / composition n'est PAS arbitrée. L'écran le
          dit plutôt que de laisser croire à une règle qui n'existe pas. */}
      <p className="flex items-start gap-2 text-role-meta leading-relaxed text-text-faint">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        La pondération entre contrôles et composition n'est pas encore arbitrée : le
        bulletin applique pour l'instant une moyenne pondérée par coefficient, toutes
        évaluations confondues.
      </p>
    </div>
  );
}
