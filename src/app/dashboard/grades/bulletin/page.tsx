import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import GradesClient from "../GradesClient";
import { getTerms, getSubjects, getReturnedForTeacher } from "../actions";
import { sortClasses } from "@/lib/classOrder";
import { hasAccess, type RoleType } from "@/lib/permissions";
import { defaultSelection } from "@/lib/gradeEntry";
import Link from "next/link";
import { Undo2, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Bulletins | EduCom",
  description: "Gestion des notes et des bulletins trimestriels",
};

/** Dossiers renvoyés par la direction : sans ce rappel, un renvoi passe inaperçu. */
function ReturnedBanner({ items }: { items: any[] }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Undo2 className="w-4 h-4 text-amber-600 shrink-0" />
        <h2 className="text-sm font-semibold text-amber-900">
          {items.length} dossier{items.length > 1 ? "s" : ""} renvoyé
          {items.length > 1 ? "s" : ""} pour correction
        </h2>
      </div>
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li key={r.key} className="text-[13px] text-amber-900 flex flex-wrap items-baseline gap-x-2">
            <strong>{r.className}</strong>
            <span className="text-amber-700">
              {r.termName} · {r.evaluationName} — {r.count} bulletin{r.count > 1 ? "s" : ""}
            </span>
            {r.reason && <span className="italic text-amber-700">« {r.reason} »</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-amber-700">
        Sélectionnez la classe concernée ci-dessous : les bulletins sont de nouveau modifiables.
      </p>
    </div>
  );
}

export default async function GradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // Initial fetch for the client component
  const { data: terms } = await getTerms();
  const { data: subjects } = await getSubjects();
  
  // Un enseignant ne voit que ses classes ; direction et secrétariat encadrent
  // l'ensemble et gardent la vue complète. Le professeur principal reste
  // rattaché à sa classe même sans affectation saisie, pour ne pas l'enfermer
  // dehors tant que les affectations ne sont pas renseignées.
  const isTeacher = dbUser.role === "TEACHER";

  let classWhere: any = { schoolId: dbUser.schoolId };
  if (isTeacher) {
    classWhere = {
      schoolId: dbUser.schoolId,
      OR: [
        { teacherId: dbUser.id },
        { assignments: { some: { teacherId: dbUser.id } } },
      ],
    };
  }

  // Le tri se fait en mémoire : l'ordre pédagogique (CI → CM2 → 6ème → Terminale)
  // n'est pas exprimable en `orderBy` SQL sur le seul nom.
  const classes = sortClasses(await prisma.class.findMany({ where: classWhere }));

  const { data: returned } = await getReturnedForTeacher();

  /**
   * ⚠️ **Les défauts sont résolus ICI, côté serveur, et pas dans le client.**
   *
   * La règle du trimestre courant vit dans `pickCurrentTerm()`, module qui
   * importe Prisma : un composant `"use client"` ne peut pas l'appeler. La
   * réécrire là-bas en aurait fait une quatrième copie — et c'est précisément
   * une copie divergente de cette règle qui a effacé la moyenne de
   * l'établissement le 21 août.
   *
   * L'ordre des classes passé ici est celui de `sortClasses()`, donc le défaut
   * est bien la PREMIÈRE classe affichée, pas une autre.
   */
  const defauts = await defaultSelection(
    { schoolId: dbUser.schoolId, userId: dbUser.id, role: dbUser.role },
    classes.map((c: { id: string }) => c.id),
  );

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {/* L'écran bulletin reste accessible et inchangé ; il n'est plus la
              porte d'entrée. On y arrive depuis une classe, on en revient. */}
          <Link
            href="/dashboard/grades"
            className="mb-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Mes classes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Vue bulletin</h1>
          <p className="text-sm text-gray-500">
            Saisie matière par matière sur le bulletin complet d'un élève, validation et dépôt au secrétariat.
          </p>
        </div>
      </div>

      {returned && returned.length > 0 && <ReturnedBanner items={returned} />}

      {/*
        ⚠️ `canConfigure` ne CACHE pas seulement un bouton : depuis le
        22 août 2026, les actions de configuration (trimestres, matières, dates)
        exigent la direction ou le secrétariat. Sans ce drapeau, un enseignant
        verrait un onglet « Configuration » dont chaque bouton répondrait
        « vous n'avez pas les droits ». Une interface ne doit pas proposer ce
        qu'elle sait refuser.

        Le drapeau vient de `hasAccess()`, la MÊME table que le garde serveur :
        l'écran et l'action ne peuvent pas diverger.
      */}
      <GradesClient
        initialTerms={terms || []}
        initialSubjects={subjects || []}
        classes={classes}
        defaults={defauts}
        canConfigure={hasAccess(dbUser.role as RoleType, "/dashboard/settings/pedagogie")}
      />
    </div>
  );
}
