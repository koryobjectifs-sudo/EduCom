import { prisma } from "@/lib/prisma";
import { studentWhereFor } from "@/lib/studentScope";
import { sortClasses } from "@/lib/classOrder";
import { requireSchoolContext } from "@/lib/documentContext";

/**
 * Chargement de l'annuaire — élèves, classes, enseignants.
 *
 * ⚠️ Ce module ne fait qu'ACCUEILLIR les requêtes qui vivaient dans
 * `directory/page.tsx`. Aucune requête n'a été ajoutée, retirée ni modifiée,
 * et la portée par rôle passe toujours par `studentWhereFor()` : un enseignant
 * ne voit pas plus d'élèves qu'avant.
 *
 * Il existe parce que « Élèves & dossiers » ouvre désormais directement
 * l'annuaire, au lieu d'un menu de quatre cartes. Deux écrans rendent donc le
 * même contenu, et le recopier aurait créé deux vérités qui divergent.
 */
export async function loadDirectory() {
  const { user, schoolId } = await requireSchoolContext();
  const scope = await studentWhereFor({ userId: user.id, schoolId, role: user.role });

  const [studentsData, rawClasses, teachers] = await Promise.all([
    prisma.student.findMany({
      where: { AND: [scope, { schoolId }] },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        status: true,
        parent: { select: { firstName: true, lastName: true, phone: true } },
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            academicYear: true,
            // ⚠️ `classId` EST sélectionné, contrairement à la version d'origine.
            // `DossiersClient` s'en sert pour ranger un élève dans le dossier de
            // sa classe ; sans lui, les 243 élèves tombaient tous dans
            // « Non assignés » — sans erreur ni indice à l'écran.
            classId: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId },
      include: { teacher: true, _count: { select: { enrollments: true } } },
    }),
    prisma.user.findMany({ where: { schoolId, role: "TEACHER" }, orderBy: { firstName: "asc" } }),
  ]);

  const classes = sortClasses(rawClasses);
  return {
    studentsData,
    classes,
    teachers,
    enrolled: studentsData.filter((s) => s.status === "ENROLLED").length,
    pending: studentsData.filter((s) => s.status === "PENDING").length,
  };
}

/** Sous-titre commun aux deux écrans qui affichent l'annuaire. */
export function resumeAnnuaire(d: Awaited<ReturnType<typeof loadDirectory>>): string {
  const n = d.studentsData.length;
  return (
    `${n} élève${n > 1 ? "s" : ""} · ${d.enrolled} inscrit${d.enrolled > 1 ? "s" : ""}` +
    (d.pending > 0 ? ` · ${d.pending} en attente de validation` : "") +
    ` · ${d.classes.length} classe${d.classes.length > 1 ? "s" : ""}`
  );
}
