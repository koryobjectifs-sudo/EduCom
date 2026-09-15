/**
 * Chargeur de données officiel pour les deux gabarits de bulletins — lot 18/4.
 *
 * ⚠️ Respecte l'étanchéité des cycles :
 *  - Secondaire / Moyen : moteur secondaire (MD, Compo, MM, Coef, Points, Totaux, Avis conseil)
 *  - Élémentaire / Préscolaire : moteur élémentaire (Domaines, Sous-disciplines, Sous-totaux, pas de coef)
 */
import { prisma } from "@/lib/prisma";
import { calculerClasseSecondaire } from "@/lib/notes/secondaire-classe";
import { calculerClasseElementaire } from "@/lib/notes/elementaire-classe";
import { proposerDistinction, isTroisiemeTrimestre } from "@/lib/notes/conseil";

export type OfficialSecondarySubject = {
  id: string;
  name: string;
  md: number | null;
  compo: number | null;
  mm: number | null;
  coefficient: number;
  points: number | null;
  appreciation: string;
};

export type OfficialSecondaryStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  ien: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  subjects: OfficialSecondarySubject[];
  totalCoefficients: number;
  totalPoints: number;
  moyenneGenerale: number | null;
  rang: number | null;
  headcount: number;
  distinctionRetenue: string | null;
  distinctionProposee: string | null;
  sanctionTravail: string | null;
  sanctionConduite: string | null;
  observationsConseil: string | null;
  decisionOrientation: string | null;
  absencesJustifiees: number;
  absencesNonJustifiees: number;
};

export type OfficialElementaireSubDiscipline = {
  id: string;
  name: string;
  scale: number;
  note: number | null;
};

export type OfficialElementaireDomain = {
  id: string;
  name: string;
  moyenneSur10: number | null;
  subDisciplines: OfficialElementaireSubDiscipline[];
};

export type OfficialElementaireStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  ien: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  domains: OfficialElementaireDomain[];
  totalPoints: number | null;
  totalMaximum: number | null;
  moyenneGeneraleSur10: number | null;
  moyenneGeneraleSur20: number | null;
  rang: number | null;
  headcount: number;
  appreciationTitulaire: string | null;
  distinctionRetenue: string | null;
  distinctionProposee: string | null;
  decisionOrientation: string | null;
  absencesJustifiees: number;
  absencesNonJustifiees: number;
};

export type OfficialSchoolMetadata = {
  id: string;
  name: string;
  logo: string | null;
  signature: string | null;
  stamp: string | null;
  primaryColor: string | null;
  activeAcademicYear: string;
  regionAcademique: string;
  inspectionAcademique: string;
  inspectionIEF: string;
  proviseurName?: string | null;
  professeurPrincipal?: string | null;
};

export type OfficialBulletinData =
  | {
      cycle: "SECONDAIRE";
      school: OfficialSchoolMetadata;
      classe: { id: string; name: string; serie: string | null };
      term: { id: string; name: string; isT3: boolean };
      students: OfficialSecondaryStudent[];
    }
  | {
      cycle: "ELEMENTAIRE";
      school: OfficialSchoolMetadata;
      classe: { id: string; name: string; serie: string | null };
      term: { id: string; name: string; isT3: boolean };
      students: OfficialElementaireStudent[];
    };

export async function loadOfficialBulletin(params: {
  schoolId: string;
  classId: string;
  termId: string;
  studentId?: string | null;
}): Promise<OfficialBulletinData | null> {
  const { schoolId, classId, termId, studentId } = params;

  const [school, classe, terms, enrollments, totalClassCount] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        logo: true,
        signature: true,
        stamp: true,
        primaryColor: true,
        activeAcademicYear: true,
        regionAcademique: true,
        inspectionAcademique: true,
        inspectionIEF: true,
        users: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
          select: { firstName: true, lastName: true },
          take: 1,
        },
      },
    }),
    prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.term.findMany({
      where: { schoolId },
      select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
      orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    }),
    prisma.enrollment.findMany({
      where: { classId, ...(studentId ? { studentId } : {}) },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            ien: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
    prisma.enrollment.count({
      where: { classId },
    }),
  ]);

  if (!school || !classe) return null;
  const term = terms.find((t) => t.id === termId);
  if (!term) return null;

  const isT3 = isTroisiemeTrimestre(term, terms);
  const headcount = totalClassCount || enrollments.length;
  const studentIds = enrollments.map((e) => e.studentId);

  const schoolMeta: OfficialSchoolMetadata = {
    id: school.id,
    name: school.name,
    logo: school.logo,
    signature: school.signature,
    stamp: school.stamp,
    primaryColor: school.primaryColor,
    activeAcademicYear: school.activeAcademicYear || "2026-2027",
    regionAcademique: school.regionAcademique || "Dakar",
    inspectionAcademique: school.inspectionAcademique || "Inspection d'Académie de Dakar",
    inspectionIEF: school.inspectionIEF || "IEF de Dakar",
    proviseurName: school.users[0]
      ? `${school.users[0].firstName} ${school.users[0].lastName}`
      : null,
    professeurPrincipal: classe.teacher
      ? `${classe.teacher.firstName} ${classe.teacher.lastName}`
      : null,
  };

  const isElementaire =
    classe.cycle === "ELEMENTAIRE" ||
    classe.cycle === "PRESCOLAIRE" ||
    ["ci", "cp", "ce1", "ce2", "cm1", "cm2"].some((l) =>
      classe.name.toLowerCase().trim().startsWith(l),
    );

  // TermReview pour assiduité, distinctions, sanctions et observations
  const reviews = await prisma.termReview.findMany({
    where: { classId, termId: term.id, studentId: { in: studentIds } },
  });
  const reviewMap = new Map(reviews.map((r) => [r.studentId, r]));

  if (!isElementaire) {
    // ═════════════════ CYCLE SECONDAIRE / MOYEN ═════════════════
    const [calculSec, appreciations, compoGrades] = await Promise.all([
      calculerClasseSecondaire({ schoolId, classId, termId: term.id }),
      prisma.subjectAppreciation.findMany({
        where: { termId: term.id, studentId: { in: studentIds } },
        select: { studentId: true, subjectId: true, comment: true },
      }),
      prisma.grade.findMany({
        where: { classId, termId: term.id, studentId: { in: studentIds }, type: "EXAM" },
        select: { studentId: true, subjectId: true, value: true },
      }),
    ]);

    const appMap = new Map(appreciations.map((a) => [`${a.studentId}:${a.subjectId}`, a.comment]));
    const compoMap = new Map(compoGrades.map((g) => [`${g.studentId}:${g.subjectId}`, g.value]));
    const calculStudentMap = new Map(calculSec.eleves.map((el) => [el.studentId, el]));

    const students: OfficialSecondaryStudent[] = enrollments.map((e) => {
      const calc = calculStudentMap.get(e.studentId);
      const rev = reviewMap.get(e.studentId);

      const subjects: OfficialSecondarySubject[] = (calc?.matieres ?? []).map((m) => {
        const comment = appMap.get(`${e.studentId}:${m.subjectId}`) ?? "";
        const compoVal = compoMap.get(`${e.studentId}:${m.subjectId}`) ?? null;
        return {
          id: m.subjectId,
          name: m.name,
          md: m.md,
          compo: compoVal,
          mm: m.mm,
          coefficient: m.coefficient,
          points: m.points,
          appreciation: comment,
        };
      });

      const mg = calc?.moyenneGenerale ?? null;

      return {
        studentId: e.studentId,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        ien: e.student.ien,
        gender: e.student.gender,
        dateOfBirth: e.student.dateOfBirth,
        subjects,
        totalCoefficients: calc?.totalCoefficients ?? 0,
        totalPoints: calc?.totalPoints ?? 0,
        moyenneGenerale: mg,
        rang: calc?.rang ?? null,
        headcount: calculSec.effectif || headcount,
        distinctionRetenue: rev?.distinctionRetenue ?? null,
        distinctionProposee: proposerDistinction(mg),
        sanctionTravail: rev?.sanctionTravail ?? null,
        sanctionConduite: rev?.sanctionConduite ?? null,
        observationsConseil: rev?.observationsConseil ?? null,
        decisionOrientation: isT3 ? rev?.decisionOrientation ?? null : null,
        absencesJustifiees: rev?.absencesJustifiees ?? 0,
        absencesNonJustifiees: rev?.absencesNonJustifiees ?? 0,
      };
    });

    return {
      cycle: "SECONDAIRE",
      school: schoolMeta,
      classe: { id: classe.id, name: classe.name, serie: classe.serie },
      term: { id: term.id, name: term.name, isT3 },
      students,
    };
  } else {
    // ═════════════════ CYCLE ÉLÉMENTAIRE ═════════════════
    const [domaines, gradesRaw] = await Promise.all([
      prisma.gradeDomain.findMany({
        where: { schoolId, isActive: true },
        orderBy: { order: "asc" },
        include: {
          subDisciplines: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      }),
      prisma.grade.findMany({
        where: {
          classId,
          termId: term.id,
          studentId: { in: studentIds },
          subDisciplineId: { not: null },
        },
        select: { studentId: true, subDisciplineId: true, value: true },
      }),
    ]);

    const calculElem = await calculerClasseElementaire({
      schoolId,
      classId,
      termId: term.id,
      bareme: 10,
    });
    const calculStudentMap = new Map(calculElem.eleves.map((el) => [el.studentId, el]));
    const gradePairMap = new Map(
      gradesRaw.map((g) => [`${g.studentId}:${g.subDisciplineId}`, g.value]),
    );

    const students: OfficialElementaireStudent[] = enrollments.map((e) => {
      const calc = calculStudentMap.get(e.studentId);
      const rev = reviewMap.get(e.studentId);

      const domainList: OfficialElementaireDomain[] = domaines.map((d) => {
        const dRes = calc?.domaines.find((cd) => cd.domainId === d.id);
        const subList: OfficialElementaireSubDiscipline[] = d.subDisciplines.map((sd) => {
          const val = gradePairMap.get(`${e.studentId}:${sd.id}`) ?? null;
          return {
            id: sd.id,
            name: sd.name,
            scale: sd.scale,
            note: val,
          };
        });

        return {
          id: d.id,
          name: d.name,
          moyenneSur10: dRes?.moyenne ?? null,
          subDisciplines: subList,
        };
      });

      const mgSur10 = calc?.moyenneGeneraleSur10 ?? null;
      const mgSur20 = mgSur10 !== null ? Math.round(mgSur10 * 2 * 100) / 100 : null;

      return {
        studentId: e.studentId,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        ien: e.student.ien,
        gender: e.student.gender,
        dateOfBirth: e.student.dateOfBirth,
        domains: domainList,
        totalPoints: calc?.totalPoints ?? null,
        totalMaximum: calc?.totalMaximum ?? null,
        moyenneGeneraleSur10: mgSur10,
        moyenneGeneraleSur20: mgSur20,
        rang: calc?.rang ?? null,
        headcount: calculElem.effectif || headcount,
        appreciationTitulaire: rev?.appreciationTitulaire ?? null,
        distinctionRetenue: rev?.distinctionRetenue ?? null,
        distinctionProposee: proposerDistinction(mgSur20),
        decisionOrientation: isT3 ? rev?.decisionOrientation ?? null : null,
        absencesJustifiees: rev?.absencesJustifiees ?? 0,
        absencesNonJustifiees: rev?.absencesNonJustifiees ?? 0,
      };
    });

    return {
      cycle: "ELEMENTAIRE",
      school: schoolMeta,
      classe: { id: classe.id, name: classe.name, serie: classe.serie },
      term: { id: term.id, name: term.name, isT3 },
      students,
    };
  }
}
