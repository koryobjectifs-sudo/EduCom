/**
 * Vérificateur de la configuration pédagogique.
 *
 *   npm run script -- scripts/verify-pedagogie.ts
 *
 * 29ᵉ vérificateur. Il crée une **vraie école éphémère**, y applique le
 * programme, éprouve l'idempotence et l'additivité par de vraies écritures, puis
 * supprime tout — y compris en cas d'échec (`finally`).
 *
 * ⚠️ Il lit aussi l'établissement de travail SANS RIEN Y ÉCRIRE, pour confronter
 * le modèle à des données réelles.
 */
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "./_env";
import type { ActorContext } from "../src/lib/audit";
import { hasAccess, type RoleType, ROLE_PERMISSIONS } from "../src/lib/permissions";
import {
  curriculumProposal, curriculumFor, classesForLevels, LEVELS,
  TERM_MODEL, allModelSubjects, PROGRAMME_BY_CLASS,
} from "../src/lib/curriculum";
import {
  applyCurriculum, configurationReadiness, schoolCalendar, programmeByClass,
} from "../src/lib/pedagogy";
import { recordPlanningChange, recentPlanningChanges, outboundNoticeReady } from "../src/lib/planningNotice";
import { buildBulletin } from "../src/lib/bulletin";
import { resolveEntryContext, academicBoard } from "../src/lib/gradeEntry";
import { pickCurrentTerm } from "../src/lib/terms";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");

const trash = { schoolIds: [] as string[] };

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION — CONFIGURATION PÉDAGOGIQUE");
  console.log("═".repeat(74));

  /* ═════════ A. LE MODÈLE, SANS BASE ═════════ */
  console.log("\n═══ A. LE MODÈLE (module pur) ═══\n");

  check(!/from ["']@?\.*\/?(lib\/)?prisma/.test(read("src/lib/curriculum.ts")),
    "`curriculum.ts` n'importe pas Prisma — il reste utilisable côté client");
  check(!/^import /m.test(read("src/lib/curriculum.ts")),
    "`curriculum.ts` n'importe RIEN du tout");

  check(curriculumFor("CI", "ELEMENTAIRE").length === 8, "CI : 8 matières");
  check(curriculumFor("CM2", "ELEMENTAIRE").length === 17, "CM2 : 17 matières");
  check(curriculumFor("CM2 Bilingue", "ELEMENTAIRE").length === 17,
    "« CM2 Bilingue » hérite du programme de CM2 (reconnaissance par préfixe)");
  check(curriculumFor("6ème A", "COLLEGE").length === 9, "« 6ème A » hérite du programme du collège");
  check(curriculumFor("Grande Section", "MATERNELLE").length === 0,
    "la maternelle n'a AUCUN programme préconfiguré — elle ne se note pas par matières");
  check(curriculumFor("Terminale S", "LYCEE").includes("Philosophie"),
    "la philosophie n'apparaît qu'au lycée");

  const projection6 = curriculumProposal(
    Object.keys(PROGRAMME_BY_CLASS).map((n, i) => ({ id: String(i), name: n, cycle: "ELEMENTAIRE" })),
    { withControls: true },
  );
  check(projection6.totals.links === 83,
    `les 6 classes élémentaires produisent 83 rattachements — le compte réel de la base (${projection6.totals.links})`);
  check(projection6.totals.terms === 3 && projection6.totals.evaluations === 6,
    "3 trimestres et 6 évaluations avec les contrôles");
  const sansControles = curriculumProposal(
    Object.keys(PROGRAMME_BY_CLASS).map((n, i) => ({ id: String(i), name: n, cycle: "ELEMENTAIRE" })),
    { withControls: false },
  );
  check(sansControles.totals.evaluations === 3,
    "sans les contrôles : 3 évaluations — le socle, ce sont les compositions");

  check(allModelSubjects().length === 32, "32 matières au modèle complet");
  check(TERM_MODEL.every((t) => !("startDate" in t) && !("endDate" in t)),
    "AUCUNE date par défaut dans le modèle de trimestre");
  const src = read("src/lib/curriculum.ts");
  check(!/coefficient\s*[:=]\s*[2-9]/.test(src),
    "aucun coefficient préconfiguré autre que le défaut du schéma");

  check(classesForLevels(["Primaire"]).length === 6, "le niveau « Primaire » produit 6 classes");
  const totalClasses = LEVELS.reduce((n, l) => n + l.classes.length, 0);
  check(totalClasses === 16, `les 4 niveaux produisent ${totalClasses} classes au total`);

  /* ═════════ B. PAS DE SYSTÈME PARALLÈLE ═════════ */
  console.log("\n═══ B. RÉUTILISATION DE L'EXISTANT ═══\n");

  const seed = read("scripts/seed-subjects.ts");
  check(/from "\.\.\/src\/lib\/curriculum"/.test(seed),
    "`seed-subjects.ts` importe le programme partagé — plus de seconde copie");
  check(!/const TREE: Record/.test(seed), "l'ancienne table `TREE` a bien disparu du script");

  const panneaux = ["ProgrammePanel", "CalendarPanel", "AssignmentsPanel"]
    .map((n) => read(`src/app/dashboard/settings/pedagogie/${n}.tsx`)).join("\n");
  check(/from "@\/app\/dashboard\/grades\/actions"/.test(panneaux),
    "l'écran de configuration importe les actions existantes au lieu de les réécrire");
  check(/TermDates/.test(read("src/app/dashboard/settings/pedagogie/CalendarPanel.tsx")) &&
        /TermDates/.test(read("src/app/dashboard/grades/GradesClient.tsx")),
    "le champ de dates de trimestre est un composant PARTAGÉ par les deux écrans");

  const wizard = read("src/app/onboarding/Wizard.tsx");
  check(/from "@\/lib\/curriculum"/.test(wizard),
    "l'installation calcule sa projection avec le module du programme, pas avec des nombres écrits à la main");
  check(!/classes: 3 \}/.test(wizard), "le compteur de classes écrit en dur a disparu de l'installation");

  const onboarding = read("src/app/onboarding/actions.ts");
  check(/applyCurriculum/.test(onboarding),
    "l'installation appelle `applyCurriculum()` — la MÊME fonction que le bouton de configuration");

  /* ═════════ C. PERMISSIONS ═════════ */
  console.log("\n═══ C. PERMISSIONS ═══\n");

  const CHEMIN = "/dashboard/settings/pedagogie";
  for (const [role, attendu] of [
    ["OWNER", true], ["ADMIN", true], ["SECRETARY", true],
    ["TEACHER", false], ["ACCOUNTANT", false], ["ASSISTANT", false], ["PARENT", false],
  ] as [RoleType, boolean][]) {
    check(hasAccess(role, CHEMIN) === attendu,
      `${role.padEnd(11)} ${attendu ? "accède à" : "n'accède PAS à"} la configuration pédagogique`);
  }
  check(hasAccess("SECRETARY", "/dashboard/settings") === false,
    "⚠️ le secrétariat obtient le pédagogique SANS obtenir les réglages de l'établissement");
  check(ROLE_PERMISSIONS.SECRETARY.includes(CHEMIN),
    "l'autorisation est déclarée explicitement, pas héritée d'un préfixe");

  const actions = read("src/app/dashboard/settings/pedagogie/actions.ts");
  const nbActions = (actions.match(/export async function/g) ?? []).length;
  const nbGardes = (actions.match(/requireActionContext\(CHEMIN\)/g) ?? []).length;
  check(nbActions === nbGardes && nbActions > 0,
    `les ${nbActions} actions de configuration passent toutes par le garde de rôle`);

  const gradesActions = read("src/app/dashboard/grades/actions.ts");
  for (const nom of ["createTerm", "deleteTerm", "setTermDates", "createEvaluation",
                     "deleteEvaluation", "createSubject", "deleteSubject",
                     "addSubjectToClass", "removeSubjectFromClass"]) {
    const i = gradesActions.indexOf(`export async function ${nom}(`);
    const corps = gradesActions.slice(i, i + 700);
    check(i !== -1 && /requireActionContext\(CADRE_ACADEMIQUE\)/.test(corps),
      `${nom}() exige désormais direction ou secrétariat`);
  }
  for (const nom of ["deleteEvaluation", "deleteSubject"]) {
    const i = gradesActions.indexOf(`export async function ${nom}(`);
    const corps = gradesActions.slice(i, i + 1400);
    check(/schoolId/.test(corps) && !/\.delete\(\{ where: \{ id \} \}\)/.test(corps),
      `${nom}() est borné par schoolId — la fuite inter-établissement est fermée`);
  }
  check(/graded > 0/.test(gradesActions.slice(gradesActions.indexOf("export async function deleteSubject("))),
    "deleteSubject() refuse d'effacer une matière portant des notes (cascade)");

  const bulletinPage = read("src/app/dashboard/grades/bulletin/page.tsx");
  check(/canConfigure=\{hasAccess\(/.test(bulletinPage),
    "l'onglet de configuration historique est masqué à qui ne peut pas l'utiliser");

  /* ═════════ D. FIXTURE : APPLICATION RÉELLE ═════════ */
  console.log("\n═══ D. APPLICATION DU PROGRAMME (école éphémère) ═══\n");

  const ecole = await prisma.school.create({
    data: { name: `SONDE-PEDAGOGIE ${Date.now()}` },
    select: { id: true },
  });
  trash.schoolIds.push(ecole.id);

  const acteur: ActorContext = { schoolId: ecole.id, userId: "sonde", role: "OWNER" };

  await prisma.class.createMany({
    data: [
      { name: "CI", cycle: "ELEMENTAIRE", schoolId: ecole.id },
      { name: "CM2", cycle: "ELEMENTAIRE", schoolId: ecole.id },
      { name: "6ème A", cycle: "COLLEGE", schoolId: ecole.id },
      { name: "Petite Section", cycle: "MATERNELLE", schoolId: ecole.id },
    ],
  });

  const r1 = await applyCurriculum(acteur, { withControls: true });
  const attenduLiens = 8 + 17 + 9;
  check(r1.linksCreated === attenduLiens,
    `${r1.linksCreated} rattachements créés (attendu ${attenduLiens} : CI 8 + CM2 17 + 6ème 9)`);
  check(r1.termsCreated === 3, `${r1.termsCreated} trimestres créés`);
  check(r1.evaluationsCreated === 6, `${r1.evaluationsCreated} évaluations créées (3 contrôles + 3 compositions)`);
  check(r1.uncovered.length === 1 && r1.uncovered[0].className === "Petite Section",
    "la maternelle est signalée comme non couverte, pas silencieusement ignorée");

  const termsCrees = await prisma.term.findMany({ where: { schoolId: ecole.id }, select: { startDate: true, endDate: true } });
  check(termsCrees.every((t) => t.startDate === null && t.endDate === null),
    "AUCUNE date n'a été inventée pour les trimestres");
  const coefs = await prisma.classSubject.findMany({ where: { class: { schoolId: ecole.id } }, select: { coefficient: true } });
  check(coefs.every((c) => c.coefficient === 1), `les ${coefs.length} coefficients valent 1 — rien n'est supposé`);

  /* — idempotence — */
  const r2 = await applyCurriculum(acteur, { withControls: true });
  check(r2.subjectsCreated === 0 && r2.linksCreated === 0 && r2.termsCreated === 0 && r2.evaluationsCreated === 0,
    "relancée, l'application ne crée RIEN de plus — elle est idempotente");
  check(r2.alreadyThere.links === attenduLiens,
    `elle reconnaît les ${r2.alreadyThere.links} rattachements existants`);

  /* — additivité : la personnalisation survit — */
  const coran = await prisma.subject.create({ data: { name: "Coran", schoolId: ecole.id }, select: { id: true } });
  const ci = await prisma.class.findFirstOrThrow({ where: { schoolId: ecole.id, name: "CI" }, select: { id: true } });
  await prisma.classSubject.create({ data: { classId: ci.id, subjectId: coran.id, coefficient: 3 } });
  await prisma.term.create({ data: { name: "Rattrapage", schoolId: ecole.id } });

  await applyCurriculum(acteur, { withControls: true });
  const coranSurvit = await prisma.classSubject.findFirst({
    where: { classId: ci.id, subjectId: coran.id },
    select: { coefficient: true },
  });
  check(coranSurvit !== null, "⚠️ la matière ajoutée par l'école SURVIT à une réapplication du modèle");
  check(coranSurvit?.coefficient === 3, "son coefficient personnalisé (3) n'est pas réinitialisé à 1");
  check((await prisma.term.count({ where: { schoolId: ecole.id, name: "Rattrapage" } })) === 1,
    "le trimestre hors modèle n'est pas supprimé");

  /* — sans contrôles — */
  const ecole2 = await prisma.school.create({ data: { name: `SONDE-SOCLE ${Date.now()}` }, select: { id: true } });
  trash.schoolIds.push(ecole2.id);
  await prisma.class.create({ data: { name: "CE1", cycle: "ELEMENTAIRE", schoolId: ecole2.id } });
  const r3 = await applyCurriculum({ schoolId: ecole2.id, userId: "sonde", role: "OWNER" }, { withControls: false });
  check(r3.evaluationsCreated === 3, "sans les contrôles : seules les 3 compositions du socle sont créées");
  const types = await prisma.evaluation.findMany({ where: { schoolId: ecole2.id }, select: { type: true } });
  check(types.every((t) => String(t.type) === "EXAM"), "et elles sont bien de type EXAM (composition)");

  /* ═════════ E. ÉTAT DE LA CONFIGURATION ═════════ */
  console.log("\n═══ E. VALIDATION DE CONFIGURATION ═══\n");

  const etat = await configurationReadiness(acteur);
  check(etat.steps.length === 8, `${etat.steps.length} étapes mesurées`);
  const programme = etat.steps.find((s) => s.id === "programme")!;
  check(programme.state === "partial",
    `« Programme » = partiel (3 classes sur 4 — la maternelle n'en a pas) : « ${programme.display} »`);
  const calendrier = etat.steps.find((s) => s.id === "calendrier")!;
  check(calendrier.state === "todo" && calendrier.blocking === false,
    "« Dates de trimestre » : à faire mais NON bloquant — la saisie fonctionne sans");
  const coefEtape = etat.steps.find((s) => s.id === "coefficients")!;
  check(coefEtape.state === "done",
    "« Coefficients » n'est JAMAIS marqué à faire : tout à 1 est une configuration valide");
  check(etat.steps.every((s) => s.display.length > 0), "chaque étape porte une mesure lisible, pas un booléen");
  check(etat.steps.filter((s) => s.state !== "done").every((s) => s.todo !== null),
    "chaque étape incomplète dit ce qu'il reste à faire");

  /**
   * ⚠️ Le titulaire couvre sa classe. Vérifié ici parce que la mesure a
   * réellement menti une fois : elle annonçait « 0 / 2 affectées » sur une
   * école dont les classes avaient un maître, et poussait donc la direction à
   * réparer ce qui marchait.
   */
  const cm2 = await prisma.class.findFirstOrThrow({ where: { schoolId: ecole.id, name: "CM2" }, select: { id: true } });
  const maitre = await prisma.user.create({
    data: { email: `maitre.${Date.now()}@sonde.invalid`, firstName: "Sonde", lastName: "Maître", role: "TEACHER", schoolId: ecole.id },
    select: { id: true },
  });
  await prisma.class.update({ where: { id: cm2.id }, data: { teacherId: maitre.id } });
  const etatTitulaire = await configurationReadiness(acteur);
  const aff = etatTitulaire.steps.find((s) => s.id === "affectations")!;
  check(/1 \/ 4/.test(aff.display) && /titulaire seul/.test(aff.display),
    `une classe titularisée compte comme couverte : « ${aff.display} »`);
  await prisma.class.update({ where: { id: cm2.id }, data: { teacherId: null } });
  await prisma.user.delete({ where: { id: maitre.id } });

  /* — le repli n'est pas « en cours » — */
  const calSansDates = await schoolCalendar(acteur);
  check(calSansDates.noDatedTerm === false || calSansDates.terms.every((t) => !t.isCurrent),
    "aucun trimestre n'est déclaré « en cours » tant qu'aucun n'est daté");

  const vide = await prisma.school.create({ data: { name: `SONDE-VIDE ${Date.now()}` }, select: { id: true } });
  trash.schoolIds.push(vide.id);
  const etatVide = await configurationReadiness({ schoolId: vide.id, userId: "sonde", role: "OWNER" });
  check(etatVide.canEnterGrades === false, "une école neuve ne peut pas encore produire de bulletins");
  check(etatVide.firstBlocker?.id === "classes", "et le premier obstacle nommé est « Classes »");

  /* ═════════ F. CALENDRIER ET NOTIFICATION ═════════ */
  console.log("\n═══ F. CALENDRIER ET CHANGEMENT DE PLANNING ═══\n");

  const t1 = await prisma.term.findFirstOrThrow({
    where: { schoolId: ecole.id, name: "1er Trimestre" },
    select: { id: true, name: true },
  });
  await prisma.term.update({
    where: { id: t1.id },
    data: { startDate: new Date("2026-10-01"), endDate: new Date("2026-12-20") },
  });

  const compo = await prisma.evaluation.findFirstOrThrow({
    where: { schoolId: ecole.id, termId: t1.id, type: "EXAM" },
    select: { id: true, name: true },
  });
  await prisma.evaluation.update({ where: { id: compo.id }, data: { date: new Date("2026-12-12") } });

  const cal = await schoolCalendar(acteur, new Date("2026-11-15"));
  const bloc = cal.terms.find((t) => t.id === t1.id)!;
  check(bloc.isCurrent, "le trimestre daté et commencé est reconnu comme courant");
  check(bloc.evaluations.some((e) => e.id === compo.id && e.date !== null), "la composition datée apparaît au calendrier");
  check(cal.upcoming.some((e) => e.id === compo.id), "et elle figure dans les prochaines échéances");
  check(cal.undated > 0, `${cal.undated} évaluations sans date sont comptées, pas placées au hasard`);

  await prisma.evaluation.update({ where: { id: compo.id }, data: { date: new Date("2027-06-01") } });
  const horsTrimestre = await schoolCalendar(acteur, new Date("2026-11-15"));
  check(horsTrimestre.terms.find((t) => t.id === t1.id)!.evaluations.find((e) => e.id === compo.id)!.outsideTerm,
    "une date hors de l'intervalle du trimestre est SIGNALÉE, pas corrigée en douce");
  await prisma.evaluation.update({ where: { id: compo.id }, data: { date: new Date("2026-12-12") } });

  const bouge = await recordPlanningChange(acteur, {
    entity: "evaluation", entityId: compo.id, name: compo.name, termName: t1.name,
    from: { start: new Date("2026-12-12") }, to: { start: new Date("2026-12-19") },
  });
  check(bouge, "un déplacement réel est tracé");
  const identique = await recordPlanningChange(acteur, {
    entity: "evaluation", entityId: compo.id, name: compo.name, termName: t1.name,
    from: { start: new Date("2026-12-19") }, to: { start: new Date("2026-12-19") },
  });
  check(!identique, "⚠️ une date RÉÉCRITE À L'IDENTIQUE n'est PAS tracée — sinon l'avertissement perdrait son sens");

  /**
   * ⚠️ Le libellé est vérifié, pas seulement l'enregistrement. Deux défauts de
   * rédaction ont été vus sur capture : un trimestre annoncé « déplacée » (accord
   * féminin figé), et « déplacée du 23 juin au 23 juin » quand seule la date de
   * FIN avait bougé — une phrase qui affirme qu'il ne s'est rien passé.
   */
  await recordPlanningChange(acteur, {
    entity: "term", entityId: t1.id, name: t1.name,
    from: { start: new Date("2026-10-01"), end: new Date("2026-12-20") },
    to: { start: new Date("2026-10-01"), end: new Date("2026-12-23") },
  });
  const avisTrimestre = (await recentPlanningChanges(acteur)).find((n) => n.entity === "term");
  check(avisTrimestre !== undefined && !/déplacée/.test(avisTrimestre.sentence),
    `un trimestre n'est jamais annoncé au féminin : « ${avisTrimestre?.sentence} »`);
  check(avisTrimestre !== undefined && /se termine désormais/.test(avisTrimestre.sentence),
    "et un changement de date de FIN est décrit comme tel, pas comme un déplacement du début");

  const avis = (await recentPlanningChanges(acteur)).filter((n) => n.entity === "evaluation");
  check(avis.length === 1, `${avis.length} avis d'évaluation remonté (un seul par objet, le plus récent)`);
  check(/déplacée du 12 décembre au 19 décembre/.test(avis[0].sentence),
    `la phrase est prête à afficher : « ${avis[0].sentence} »`);

  const autre = await recentPlanningChanges({ schoolId: ecole2.id, userId: "sonde", role: "OWNER" });
  check(autre.length === 0, "⚠️ un autre établissement ne voit PAS ces changements — lecture bornée par schoolId");

  check(outboundNoticeReady() === false,
    "aucun envoi extérieur n'est annoncé : `channels.ts` reste seul juge, et son registre est vide");
  const pageConfig = read("src/app/dashboard/settings/pedagogie/page.tsx");
  check(!/(familles|parents)[^.]{0,40}(prévenu|averti|notifié)s?\b(?![^.]*pas)/i.test(pageConfig),
    "l'écran n'écrit jamais que les familles ont été prévenues");

  /* ═════════ G. PROPAGATION ═════════ */
  console.log("\n═══ G. PROPAGATION DANS LA SAISIE ET LE BULLETIN ═══\n");

  const eleve = await prisma.student.create({
    data: { firstName: "Sonde", lastName: "Pédagogie", schoolId: ecole.id, status: "ENROLLED" },
    select: { id: true },
  });
  await prisma.enrollment.create({ data: { studentId: eleve.id, classId: ci.id, academicYear: "2026-2027" } });

  const lecture = await prisma.classSubject.findFirstOrThrow({
    where: { classId: ci.id, subject: { name: "Lecture" } },
    select: { id: true, subjectId: true },
  });
  await prisma.classSubject.update({ where: { id: lecture.id }, data: { coefficient: 4 } });

  const ctx = await resolveEntryContext(acteur, { classId: ci.id, subjectId: lecture.subjectId, termId: t1.id });
  check(ctx.ok, "le contexte de saisie s'ouvre");
  if (ctx.ok) {
    check(ctx.context.defaultCoefficient === 4,
      `le coefficient configuré (4) devient le défaut de saisie (${ctx.context.defaultCoefficient})`);
    check(ctx.context.rows.every((r) => r.coefficient === 4),
      "et il est appliqué à chaque ligne d'élève non encore notée");
    check(ctx.context.evaluation.date !== null, "la date de l'évaluation remonte jusqu'à l'écran de saisie");
  }

  const bul = buildBulletin({
    students: [{ id: eleve.id, firstName: "Sonde", lastName: "Pédagogie" }],
    subjects: [{ id: lecture.subjectId, name: "Lecture", parentId: null, coefficient: 4 }],
    grades: [],
  });
  check(bul.students[0].blocks[0].lines[0].coefficient === 4,
    "le bulletin affiche le coefficient configuré AVANT la première note");
  const bulSansCoef = buildBulletin({
    students: [{ id: eleve.id, firstName: "Sonde", lastName: "Pédagogie" }],
    subjects: [{ id: lecture.subjectId, name: "Lecture", parentId: null }],
    grades: [],
  });
  check(bulSansCoef.students[0].blocks[0].lines[0].coefficient === null,
    "⚠️ sans coefficient connu il reste `null`, jamais 1 par défaut — sinon il serait indiscernable d'un choix");

  const bulAvecNote = buildBulletin({
    students: [{ id: eleve.id, firstName: "Sonde", lastName: "Pédagogie" }],
    subjects: [{ id: lecture.subjectId, name: "Lecture", parentId: null, coefficient: 4 }],
    grades: [{ studentId: eleve.id, subjectId: lecture.subjectId, value: 15, max: 20, coefficient: 2, kind: "COMPOSITION" }],
  });
  check(bulAvecNote.students[0].blocks[0].lines[0].coefficient === 2,
    "une note déjà saisie garde SON coefficient (2) — la configuration ne repondère pas le passé");

  const board = await academicBoard(acteur, { firstName: "Sonde" }, t1.id);
  const ligne = board.compositions.find((r) => r.evaluationId === compo.id);
  check(ligne?.evaluationDate != null, "le tableau de travail porte la date de l'évaluation");

  /* ═════════ H. L'ÉTABLISSEMENT RÉEL (lecture seule) ═════════ */
  console.log("\n═══ H. SENG.CO ACADEMY — LECTURE SEULE ═══\n");

  const reel = await prisma.school.findFirst({ where: { name: "SENG.CO ACADEMY" }, select: { id: true } });
  if (!reel) {
    console.log("  · établissement absent de cette base — section ignorée");
  } else {
    const acteurReel: ActorContext = { schoolId: reel.id, userId: "sonde", role: "OWNER" };
    const liens = await prisma.classSubject.count({ where: { class: { schoolId: reel.id } } });
    check(liens === 83, `${liens} rattachements classe↔matière (attendu 83 — aucune perte)`);

    const prog = await programmeByClass(acteurReel);
    check(prog.length > 0 && prog.every((p) => p.subjects.every((s) => s.coefficient > 0)),
      `${prog.length} classes, tous les coefficients strictement positifs`);
    const manquants = prog.reduce((n, p) => n + p.missingFromModel.length, 0);
    check(manquants === 0, `aucun écart au programme type (${manquants} matière(s) manquante(s))`);

    const etatReel = await configurationReadiness(acteurReel);
    console.log(`\n    État réel de SENG.CO ACADEMY — ${etatReel.done}/${etatReel.total} étapes :`);
    for (const s of etatReel.steps) {
      const mark = s.state === "done" ? "✓" : s.state === "partial" ? "~" : "·";
      console.log(`      ${mark} ${s.label.padEnd(26)} ${s.display}${s.blocking && s.state !== "done" ? "   [bloquant]" : ""}`);
    }
    check(true, "l'état réel est mesurable de bout en bout");

    const termsReels = await prisma.term.findMany({
      where: { schoolId: reel.id },
      select: { id: true, name: true, startDate: true, createdAt: true },
    });
    const { current } = pickCurrentTerm(termsReels);
    console.log(`      trimestre courant : « ${current?.name ?? "aucun"} »`);
  }

  /* ═════════ bilan ═════════ */
  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks - failures}/${checks} vérifications passées`);
  console.log("═".repeat(74));
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error("ÉCHEC :", e); process.exitCode = 1; })
  .finally(async () => {
    // ⚠️ Nettoyage dans le `finally` : un vérificateur interrompu qui laisse ses
    // fixtures en base pollue tous les suivants. `School` cascade sur tout.
    for (const id of trash.schoolIds) {
      await prisma.school.delete({ where: { id } }).catch(() => {});
    }
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: trash.schoolIds } } }).catch(() => {});
    await prisma.$disconnect();
  });
