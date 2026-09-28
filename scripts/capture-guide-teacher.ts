/**
 * Fixtures pour capturer les VRAIES captures d'écran du guide « Enseignant »
 * (27 sept. 2026, demande de Kory : « on n'invente rien sur les images »).
 *
 * Compte de sonde éphémère (même garde-fou et même méthode que
 * `verify-render-dossier.ts`) : créé, utilisé pour se connecter et prendre les
 * captures dans un vrai navigateur, puis entièrement supprimé.
 *
 *   npx tsx scripts/capture-guide-teacher.ts create   → crée le compte + jeu de données, affiche email/mot de passe
 *   npx tsx scripts/capture-guide-teacher.ts wipe      → supprime tout ce que « create » a fait
 */
import { prisma } from "./_env";
import { resoudreCible } from "./_cible";
import { createAdminClient } from "../src/lib/supabase/admin";
import { currentAcademicYear } from "../src/lib/academicYear";
import fs from "node:fs";
import path from "node:path";

const TAG = "GUIDECAPTURE";
const PASSWORD = "Guide-Capture-27sept-2026!";
const MANIFEST = path.join(__dirname, ".guide-capture-manifest.json");

type Manifest = { authId: string; userId: string; classId: string; studentIds: string[]; subjectId: string | null; email: string };

async function create() {
  // `SCHOOL_ID` explicite obligatoire (`_cible.ts`) : `findFirst` visait la
  // première école onboardée trouvée — sur cette base, une école RÉELLE avec
  // de vrais clients, jamais un bac à sable dédié (piège trouvé le 28 sept. 2026).
  const cible = await resoudreCible("un compte de sonde jetable pour le guide enseignant", prisma as never);
  if (!cible) throw new Error("SCHOOL_ID requis — voir la liste ci-dessus.");
  const school = await prisma.school.findUnique({ where: { id: cible.id }, select: { id: true, name: true, activeAcademicYear: true } });
  if (!school) throw new Error("École introuvable.");
  const annee = currentAcademicYear(school);

  const email = `${TAG.toLowerCase()}.${Date.now()}@sonde.invalid`;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`Création du compte : ${error?.message}`);

  const user = await prisma.user.create({
    data: { id: data.user.id, email, firstName: "Aïssatou", lastName: "Ndiaye", role: "TEACHER", schoolId: school.id },
  });

  const classe = await prisma.class.create({ data: { name: "CM2 A", schoolId: school.id, teacherId: user.id } });

  const subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });
  if (subject) {
    await prisma.teachingAssignment.create({ data: { schoolId: school.id, teacherId: user.id, classId: classe.id, subjectId: subject.id } });
  }

  const noms = ["Awa Diop", "Moussa Fall", "Fatou Sarr", "Ibrahima Ba", "Khadija Sy", "Modou Diagne"];
  const studentIds: string[] = [];
  for (const nomComplet of noms) {
    const [firstName, ...reste] = nomComplet.split(" ");
    const s = await prisma.student.create({
      data: { firstName, lastName: reste.join(" "), schoolId: school.id, status: "ENROLLED" },
      select: { id: true },
    });
    await prisma.enrollment.create({ data: { studentId: s.id, classId: classe.id, academicYear: annee } });
    studentIds.push(s.id);
  }

  // Quelques notes déjà saisies, pour que le tableau de bord et l'écran de
  // saisie ne soient pas vides — un vrai enseignant a toujours un peu d'avance.
  const term = await prisma.term.findFirst({ where: { schoolId: school.id } });
  if (subject && term) {
    for (const studentId of studentIds.slice(0, 4)) {
      await prisma.grade.create({
        data: {
          studentId, classId: classe.id, subjectId: subject.id, teacherId: user.id, termId: term.id,
          value: 12 + Math.round(Math.random() * 6), max: 20, type: "EXAM",
        },
      });
    }
  }

  const manifest: Manifest = { authId: data.user.id, userId: user.id, classId: classe.id, studentIds, subjectId: subject?.id ?? null, email };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log("═".repeat(60));
  console.log(`École utilisée : ${school.name}`);
  console.log(`Email  : ${email}`);
  console.log(`Mot de passe : ${PASSWORD}`);
  console.log("═".repeat(60));
}

async function wipe() {
  if (!fs.existsSync(MANIFEST)) { console.log("Rien à nettoyer (manifeste absent)."); return; }
  const m: Manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const admin = createAdminClient();
  await prisma.grade.deleteMany({ where: { teacherId: m.userId } }).catch(() => {});
  await prisma.enrollment.deleteMany({ where: { studentId: { in: m.studentIds } } });
  await prisma.student.deleteMany({ where: { id: { in: m.studentIds } } });
  await prisma.teachingAssignment.deleteMany({ where: { teacherId: m.userId } }).catch(() => {});
  await prisma.class.deleteMany({ where: { id: m.classId } });
  await prisma.user.deleteMany({ where: { id: m.userId } });
  await admin.auth.admin.deleteUser(m.authId).catch(() => {});
  fs.unlinkSync(MANIFEST);
  console.log("✓ Compte et fixtures de capture supprimés — aucun résidu.");
}

const cmd = process.argv[2];
(cmd === "create" ? create() : cmd === "wipe" ? wipe() : Promise.reject(new Error("Usage: create | wipe")))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
