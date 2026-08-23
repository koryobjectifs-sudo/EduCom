import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePathAccess } from "@/lib/documentContext";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { loadBulletin } from "@/lib/gradeEntry";
import { pickCurrentTerm } from "@/lib/terms";
import { sortClasses } from "@/lib/classOrder";
import { evaluationKind } from "@/lib/bulletin";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataState } from "@/components/dashboard/DataState";
import ReportCardGenerator from "./Generator";

export const metadata = { title: "Bulletins | EduCom" };

/**
 * Générateur de bulletins.
 *
 * ═══ LES `searchParams` SONT ENFIN LUS ═══
 *
 * ⚠️ **Quatre écrans envoyaient déjà des paramètres à cette page, qui les
 * jetait tous** : `CompletionClient` (`classId` + `termId`), `StudentListClient`,
 * la fiche élève et `DraftsList` (`studentId`). L'utilisateur cliquait
 * « Générer un bulletin » sur un élève précis et retombait sur trois sélecteurs
 * vides. Quatre chemins morts, corrigés ici.
 *
 * `studentId` seul suffit : la classe se déduit de l'inscription, le trimestre
 * du calendrier. C'est la règle du produit — si EduCom peut savoir, il ne
 * demande pas.
 */
export default async function ReportCardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /**
   * ⚠️ **Garde ajoutée le 22 août 2026.** Cette page n'en avait AUCUNE : elle
   * authentifiait, résolvait l'école, et servait les bulletins de toutes les
   * classes à quiconque était connecté — un **parent** compris, qui héritait du
   * chemin par le préfixe `/dashboard/documents`. Fuite reproduite en sonde.
   */
  const { schoolId, user } = await requirePathAccess("/dashboard/documents/report-card");
  const role = user.role as RoleType;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);

  const studentId = one("studentId") ?? null;
  let classId = one("classId");
  let termId = one("termId");
  const evaluationId = one("evaluationId");

  // ── Résolution de ce qui manque, jamais une question posée à l'utilisateur ──
  if (studentId && !classId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, class: { schoolId } },
      orderBy: { createdAt: "desc" },
      select: { classId: true },
    });
    classId = enrollment?.classId;
  }

  const termRows = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
  });
  if (!termId) termId = pickCurrentTerm(termRows).current?.id;

  const [classes, evaluations] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true, cycle: true } }),
    termId
      ? prisma.evaluation.findMany({
          where: { schoolId, termId },
          select: { id: true, name: true, type: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const ordered = sortClasses(classes as never[]) as unknown as { id: string; name: string }[];

  /**
   * ⚠️ **PLUS DE SÉLECTEUR VIDE À L'ARRIVÉE.**
   *
   * Sans `classId`, l'écran s'ouvrait sur « Choisissez une classe » alors qu'il
   * connaissait déjà les classes de l'école, le trimestre courant et l'endroit
   * où des notes existent. Une question posée à l'utilisateur dont le produit a
   * la réponse est une question de trop.
   *
   * ⚠️ **On préfère une classe qui porte des notes sur ce trimestre.** Ouvrir
   * sur la première classe de l'ordre pédagogique (le CI) donnerait souvent un
   * bulletin entièrement vide, et l'écran paraîtrait cassé alors qu'il aurait
   * simplement mal choisi. À défaut de notes nulle part, on retombe sur la
   * première classe — un bulletin vide est alors la vérité.
   */
  if (!classId && termId && ordered.length > 0) {
    const notees = await prisma.grade.groupBy({
      by: ["classId"],
      where: { termId, class: { schoolId } },
      _count: { _all: true },
    });
    const avecNotes = new Set(notees.map((g) => g.classId));
    classId = ordered.find((c) => avecNotes.has(c.id))?.id ?? ordered[0].id;
  }

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { classId, termId, evaluationId, studentId: studentId ?? undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/dashboard/documents/report-card?${p.toString()}`;
  };

  const loaded = classId && termId
    ? await loadBulletin({ schoolId, userId: user.id, role }, { classId, termId, evaluationId })
    : null;

  const Selectors = (
    <div className="space-y-4 print:hidden">
      <Row label="Classe">
        {ordered.map((c) => (
          <Pill key={c.id} href={link({ classId: c.id, studentId: undefined })} active={c.id === classId}>{c.name}</Pill>
        ))}
      </Row>
      <Row label="Trimestre">
        {termRows.map((t) => (
          <Pill key={t.id} href={link({ termId: t.id, evaluationId: undefined })} active={t.id === termId}>{t.name}</Pill>
        ))}
      </Row>
      <Row label="Portée">
        {/* ⚠️ « Tout le trimestre » agrège contrôles ET composition — la chaîne
            que `loadBulletin()` rend enfin possible. */}
        <Pill href={link({ evaluationId: undefined })} active={!evaluationId}>Tout le trimestre</Pill>
        {evaluations.map((e) => (
          <Pill key={e.id} href={link({ evaluationId: e.id })} active={e.id === evaluationId}>
            {e.name}
            <span className="ml-1.5 opacity-70">
              {evaluationKind(e.type) === "COMPOSITION" ? "· composition" : "· contrôle"}
            </span>
          </Pill>
        ))}
      </Row>
    </div>
  );

  return (
    <div className="space-y-5 pb-12">
      <div className="print:hidden">
        <PageHeader
          breadcrumb={[
            { label: "Accueil", href: "/dashboard" },
            { label: "Documents", href: "/dashboard/documents" },
            { label: "Bulletins" },
          ]}
          title="Bulletins"
          description="Générés automatiquement à partir des notes saisies."
        />
      </div>

      {Selectors}

      {!loaded ? (
        <div className="print:hidden">
          <DataState
            kind="empty"
            icon={FileText}
            /* ⚠️ Cet état ne se rencontre plus que si l'école n'a RIEN — pas de
               trimestre, ou pas de classe. Il nomme donc ce qui manque
               réellement au lieu de demander un choix impossible. */
            title={termRows.length === 0 ? "Aucun trimestre déclaré" : "Aucune classe"}
            description={
              termRows.length === 0
                ? "Déclarez au moins un trimestre pour produire des bulletins."
                : "Créez une classe et inscrivez-y des élèves pour produire des bulletins."
            }
            action={{
              label: termRows.length === 0 ? "Configurer le calendrier" : "Ouvrir l'annuaire",
              href: termRows.length === 0 ? "/dashboard/settings/pedagogie#calendrier" : "/dashboard/directory",
            }}
          />
        </div>
      ) : (
        <ReportCardGenerator
          bulletin={loaded.bulletin}
          klass={loaded.klass}
          term={loaded.term}
          evaluation={loaded.evaluation}
          academicYear={loaded.academicYear}
          school={await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true, logo: true, signature: true, stamp: true },
          })}
          canEditCouncil={hasAccess(role, "/dashboard/documents/validation")}
          focusStudentId={studentId}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-role-meta font-semibold uppercase tracking-wider text-text-faint">{label}</span>
      {children}
    </div>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-control border px-3 py-1.5 text-role-meta font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "border-primary bg-primary text-white shadow-card"
          : "border-rule bg-surface text-text-soft hover:border-primary/30 hover:text-primary"
      }`}
    >
      {children}
    </Link>
  );
}
