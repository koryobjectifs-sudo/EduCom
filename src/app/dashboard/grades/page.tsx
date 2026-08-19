import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import GradesClient from "./GradesClient";
import { getTerms, getSubjects, getReturnedForTeacher } from "./actions";
import { sortClasses } from "@/lib/classOrder";
import { Undo2 } from "lucide-react";

export const metadata = {
  title: "Notes & Bulletins | EduCom",
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

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saisie des notes</h1>
          <p className="text-sm text-gray-500">
            Sélectionnez votre classe, saisissez les notes, validez puis déposez au secrétariat.
          </p>
        </div>
      </div>

      {returned && returned.length > 0 && <ReturnedBanner items={returned} />}

      <GradesClient
        initialTerms={terms || []}
        initialSubjects={subjects || []}
        classes={classes}
      />
    </div>
  );
}
