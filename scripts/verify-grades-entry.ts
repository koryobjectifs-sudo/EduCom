/**
 * Sonde RUNTIME de la saisie des notes.
 *
 *   npm run script -- scripts/verify-grades-entry.ts        (scénarios 1-6)
 *   MODE=empty npm run script -- scripts/verify-grades-entry.ts   (7-8)
 *
 * Elle se connecte **en tant qu'ENSEIGNANT** — pas en direction : tout l'écran
 * repose sur le périmètre du rôle, et le vérifier en `OWNER` ne prouverait rien.
 *
 * ⚠️ Elle éprouve la **sauvegarde automatique de bout en bout** : Chrome tape
 * une note, appuie sur Entrée, puis la sonde relit la base. C'est le seul
 * contrôle qui prouve qu'une note saisie est une note enregistrée.
 *
 * ⚠️ Interrompue (Ctrl-C), elle ne joue pas son `finally` et laisse ses fixtures
 * en base — même piège que les autres vérificateurs à fixtures.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { CDP, chromeAvailable, launchChrome, waitFor, evaluate, shot, sessionCookies } from "./_cdp";

const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR!;
const MODE = process.env.MODE ?? "full";
const TAG = "GRADEPROBE";
const PASSWORD = `Gr-${Math.random().toString(36).slice(2)}-26!`;
const YEAR = "2025-2026";

const trash = {
  authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], termIds: [] as string[], subjectIds: [] as string[],
};
let ko = 0;
const check = (c: boolean, l: string) => { if (!c) ko++; console.log(`  ${c ? "✓" : "✗"} ${l}`); };

async function main() {
  if (!chromeAvailable()) throw new Error("Chrome introuvable");
  const admin = createAdminClient();
  const school = await prisma.school.findFirst({ where: { onboardingCompleted: true }, select: { id: true } });
  if (!school) throw new Error("aucune école");
  const schoolId = school.id;

  // ── L'enseignant : un vrai compte, un vrai rôle TEACHER ──
  const email = `${TAG.toLowerCase()}.${Date.now()}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(String(error?.message));
  trash.authIds.push(data.user.id);
  await prisma.user.create({
    data: { id: data.user.id, email, firstName: "Awa", lastName: `${TAG}-Ndiaye`, role: "TEACHER", schoolId },
  });
  trash.userIds.push(data.user.id);
  const teacherId = data.user.id;

  let ctx: Record<string, string> = {};

  if (MODE === "full") {
    const now = Date.now();
    const term = await prisma.term.create({
      data: {
        name: `${TAG} Trimestre 1`, schoolId,
        startDate: new Date(now - 40 * 864e5), endDate: new Date(now + 50 * 864e5),
      }, select: { id: true },
    });
    trash.termIds.push(term.id);

    const evalA = await prisma.evaluation.create({
      data: { name: `${TAG} Composition 1`, type: "EXAM", termId: term.id, schoolId, date: new Date(now - 5 * 864e5) },
      select: { id: true },
    });
    await prisma.evaluation.create({
      data: { name: `${TAG} Devoir 2`, type: "QUIZ", termId: term.id, schoolId, date: new Date(now + 20 * 864e5) },
    });
    // Un CONTRÔLE déjà passé : c'est lui qui doit peupler l'onglet Contrôles.
    const ctrl1 = await prisma.evaluation.create({
      data: { name: `${TAG} Controle 1`, type: "QUIZ", termId: term.id, schoolId, date: new Date(now - 20 * 864e5) },
      select: { id: true },
    });

    const maths = await prisma.subject.create({ data: { name: `${TAG} Mathematiques`, schoolId }, select: { id: true } });
    const fr = await prisma.subject.create({ data: { name: `${TAG} Francais`, schoolId }, select: { id: true } });
    // Un GROUPE : parent non rattaché, enfant rattaché → bloc de bulletin.
    const eveil = await prisma.subject.create({ data: { name: `${TAG} Eveil`, schoolId }, select: { id: true } });
    const histoire = await prisma.subject.create({
      data: { name: `${TAG} Histoire`, schoolId, parentId: eveil.id }, select: { id: true },
    });
    trash.subjectIds.push(maths.id, fr.id, histoire.id, eveil.id);

    const mkClass = async (name: string, cycle: "COLLEGE" | "ELEMENTAIRE", subjects: string[], count: number) => {
      const c = await prisma.class.create({ data: { name: `${TAG} ${name}`, cycle, schoolId }, select: { id: true } });
      trash.classIds.push(c.id);
      for (const sid of subjects) await prisma.classSubject.create({ data: { classId: c.id, subjectId: sid } });
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const s = await prisma.student.create({
          data: { firstName: `${TAG}-El${i}`, lastName: `Sow${i}`, schoolId, status: "ENROLLED" }, select: { id: true },
        });
        trash.studentIds.push(s.id); ids.push(s.id);
        await prisma.enrollment.create({ data: { studentId: s.id, classId: c.id, academicYear: YEAR } });
      }
      return { id: c.id, students: ids };
    };

    // ① une classe, une matière, saisie PARTIELLE
    const a = await mkClass("6e A", "COLLEGE", [maths.id, fr.id], 10);
    await prisma.teachingAssignment.create({ data: { teacherId, classId: a.id, subjectId: maths.id, schoolId } });
    for (let i = 0; i < 4; i++) {
      await prisma.grade.create({
        data: { value: 12 + i, max: 20, coefficient: 1, type: "EXAM", studentId: a.students[i],
          classId: a.id, subjectId: maths.id, termId: term.id, evaluationId: evalA.id, teacherId },
      });
    }

    // Le contrôle : 3 notes sur 10 élèves → l'onglet Contrôles doit dire 3/10.
    for (let i = 0; i < 3; i++) {
      await prisma.grade.create({
        data: { value: 11 + i, max: 20, coefficient: 1, type: "QUIZ", studentId: a.students[i],
          classId: a.id, subjectId: maths.id, termId: term.id, evaluationId: ctrl1.id, teacherId },
      });
    }

    // ② deux matières dans la même classe, AUCUNE note
    const b = await mkClass("6e B", "COLLEGE", [maths.id, fr.id], 8);
    await prisma.teachingAssignment.create({ data: { teacherId, classId: b.id, subjectId: maths.id, schoolId } });
    await prisma.teachingAssignment.create({ data: { teacherId, classId: b.id, subjectId: fr.id, schoolId } });

    // ③ maître unique (subjectId nul), une seule matière rattachée → COMPLET
    const c = await mkClass("CM2", "ELEMENTAIRE", [fr.id, histoire.id], 6);
    await prisma.teachingAssignment.create({ data: { teacherId, classId: c.id, subjectId: null, schoolId } });
    // ⚠️ Barème SUR 10 : c'est ce qui prouve que `Grade.max` est respecté de la
    // saisie jusqu'au bulletin imprimé. Avec un /20 en dur, ces notes seraient
    // affichées à moitié de leur valeur.
    for (const sid of c.students) {
      await prisma.grade.create({
        data: { value: 8, max: 10, coefficient: 1, type: "EXAM", studentId: sid,
          classId: c.id, subjectId: fr.id, termId: term.id, evaluationId: evalA.id, teacherId },
      });
    }
    // Un avis du conseil DÉJÀ en base : prouve le chemin de lecture.
    await prisma.reportCard.create({
      data: {
        studentId: c.students[0], classId: c.id, termId: term.id, evaluationId: evalA.id,
        schoolId, generalComment: `${TAG} Avis du conseil enregistre`,
      },
    });

    // ④ affecté mais AUCUNE matière rattachée à la classe
    const d = await mkClass("CE1", "ELEMENTAIRE", [], 5);
    await prisma.teachingAssignment.create({ data: { teacherId, classId: d.id, subjectId: maths.id, schoolId } });

    ctx = { classA: a.id, maths: maths.id, term: term.id, evalA: evalA.id, lastStudent: a.students[9], classCM2: c.id, studentCM2: c.students[0] };
    console.log("fixtures : 4 classes, 4 matieres (dont 1 groupe), 29 eleves, 3 evaluations, 19 notes (dont 6 sur 10)");
  } else {
    console.log("mode vide : on observe l'écran tel qu'il est sur la base réelle");
  }

  const cookies = await sessionCookies(email, PASSWORD);
  const Cookie = cookies.map((k) => `${k.name}=${k.value}`).join("; ");

  const raw = await (await fetch(`${BASE}/dashboard/grades`, { headers: { Cookie } })).text();
  /**
   * ⚠️ React insère `<!-- -->` entre deux expressions adjacentes : « 4 / 10 »
   * arrive en `4<!-- --> / <!-- -->10`. Chercher la chaîne telle qu'on la lit à
   * l'écran demande donc de retirer ces marqueurs — sinon on croit à un défaut
   * de l'écran alors que le contrôle est faux.
   */
  const html = raw.replace(/<!--[\s\S]*?-->/g, "");

  console.log(`\n── Le centre académique (${MODE}) ──`);
  check(html.includes("Notes &amp; Évaluations") || html.includes("Notes & Évaluations"), "le titre est « Notes & Évaluations »");
  check(!html.includes("Vos classes</h") && !html.includes("Voici vos classes"), "l'accueil n'ouvre PLUS sur une liste de classes");
  check(!html.includes("Sélectionnez votre classe, saisissez"), "l'ancien sous-titre à trois menus a disparu");
  check(html.includes(">Contrôles<"), "l'onglet Contrôles est présent");
  check(html.includes(">Composition<"), "l'onglet Composition est présent");
  check(html.includes(">Bulletin<"), "l'onglet Bulletin est présent");
  /**
   * ⚠️ Le sélecteur n'existe QUE s'il y a des trimestres. Attendre sa présence
   * sur une base qui n'en a aucun faisait échouer un écran pourtant correct — et
   * « corriger » ce faux échec aurait ajouté un sélecteur vide.
   */
  const termCount = await prisma.term.count({ where: { schoolId } });
  check(
    termCount === 0 ? !html.includes("Trimestre</span>") : html.includes("Trimestre</span>"),
    termCount === 0
      ? "aucun trimestre en base : aucun sélecteur vide affiché"
      : "le sélecteur de trimestre est visible",
  );

  if (MODE === "full") {
    console.log("\n── Contrôles et compositions séparés ──");
    check(html.includes(`${TAG} Controle 1`), "le CONTRÔLE apparaît dans l'onglet Contrôles");
    check(!html.includes(`${TAG} Composition 1`), "la COMPOSITION n'apparaît PAS dans l'onglet Contrôles");
    check(html.includes("3/10"), "progression réelle du contrôle : 3/10");
    check(html.includes(`${TAG} 6e A`), "① classe affectée visible");
    check(html.includes(`${TAG} Trimestre 1`), "le trimestre courant est prérempli");

    // L'onglet Composition, par l'URL — la navigation passe par le serveur.
    const compo = (await (await fetch(`${BASE}/dashboard/grades?vue=composition`, { headers: { Cookie } })).text())
      .replace(/<!--[\s\S]*?-->/g, "");
    check(compo.includes(`${TAG} Composition 1`), "la COMPOSITION apparaît dans l'onglet Composition");
    check(!compo.includes(`${TAG} Controle 1`), "le CONTRÔLE n'apparaît PAS dans l'onglet Composition");
    check(compo.includes("4/10"), "progression réelle de la composition : 4/10");
    /**
     * ③ Maître unique sur CM2. Son périmètre couvre 2 matières — sous le seuil
     * de `SUBJECT_ROW_LIMIT` — donc l'écran affiche **une ligne par matière**
     * plutôt qu'un total agrégé : Français 6/6, Histoire 0/6. C'est le
     * comportement voulu ; l'agrégation ne sert qu'aux périmètres larges
     * (élémentaire à 17 matières), où une ligne par matière serait un mur.
     */
    check(compo.includes("6/6"), "③ maître unique — Français : 6/6");
    check(compo.includes(`${TAG} Histoire`) && compo.includes("0/6"), "③ maître unique — Histoire : 0/6, ligne distincte");

    // Le périmètre : l'enseignant ne voit aucune classe hors affectation.
    const others = await prisma.class.count({ where: { schoolId, NOT: { id: { in: trash.classIds } } } });
    check(others > 0, `l'école compte ${others} autres classes (contrôle de périmètre pertinent)`);
    check(!html.includes(`${TAG} CE1`), "④ classe sans matière rattachée : absente du plan de travail");
  } else {
    console.log("\n── Scénarios 7 et 8 ──");
    check(
      html.includes("Aucun trimestre n&#x27;est encore déclaré")
        || html.includes("Aucune évaluation n&#x27;est ouverte")
        || html.includes("Aucune classe ne vous est encore attribuée")
        || html.includes("sans dates"),
      "⑦⑧ trimestre sans dates / aucune évaluation / aucune classe : la raison est dite",
    );
  }

  /* ═══════ LE BULLETIN — vu par la DIRECTION ═══════
     ⚠️ Un TEACHER n'a pas `/dashboard/documents` : vérifier le bulletin avec sa
     session ne prouverait qu'une redirection. On ouvre donc une seconde session,
     en direction, comme dans la vraie vie. */
  if (MODE === "full" && ctx) {
    const dirEmail = `${TAG.toLowerCase()}.dir.${Date.now()}@sonde.invalid`;
    const dir = await admin.auth.admin.createUser({ email: dirEmail, password: PASSWORD, email_confirm: true });
    if (dir.data.user) {
      trash.authIds.push(dir.data.user.id);
      await prisma.user.create({
        data: { id: dir.data.user.id, email: dirEmail, firstName: `${TAG}-Direction`, lastName: "Sonde", role: "OWNER", schoolId },
      });
      trash.userIds.push(dir.data.user.id);

      const dc = (await sessionCookies(dirEmail, PASSWORD)).map((k) => `${k.name}=${k.value}`).join("; ");
      const get = async (u: string) => {
        const r = await fetch(`${BASE}${u}`, { headers: { Cookie: dc }, redirect: "manual" });
        return { status: r.status, html: (await r.text()).replace(/<!--[\s\S]*?-->/g, "") };
      };

      console.log("\n── Le bulletin, source unique ──");
      const b = await get(`/dashboard/documents/report-card?classId=${ctx.classCM2}&termId=${ctx.term}&evaluationId=${ctx.evalA}`);
      check(b.status === 200, `le bulletin répond 200 (reçu ${b.status})`);
      check(b.html.includes(`${TAG} Eveil`), "les GROUPES de matières sont rendus (bloc « Éveil »)");
      check(b.html.includes("Moyenne du groupe"), "la moyenne de groupe est calculée");
      check(b.html.includes("Note /10"), "le BARÈME RÉEL est respecté : /10, pas /20 en dur");
      check(b.html.includes("8.00"), "la note sur 10 est affichée à sa vraie valeur");
      check(b.html.includes("Moy. classe"), "les statistiques de classe sont présentes");
      check(b.html.includes("Rang :"), "le rang est calculé");

      console.log("\n── Aucune donnée fictive ──");
      check(!b.html.includes("Absences"), "« Absences: 0 » a disparu (aucun modèle de présence)");
      check(!b.html.includes("Retards"), "« Retards: 0 » a disparu");
      check(!b.html.includes("Excellent travail"), "l'appréciation par défaut « Excellent travail. » a disparu");
      check(!b.html.includes("2023-2024"), "l'année scolaire n'est plus figée à 2023-2024");
      check(b.html.includes("2025-2026") || b.html.includes("2026-2027"), "l'année vient de currentAcademicYear()");

      console.log("\n── Avis du conseil ──");
      check(b.html.includes("Avis du conseil"), "le bloc « Avis du conseil » est présent");
      check(b.html.includes(`${TAG} Avis du conseil enregistre`), "generalComment est LU depuis la base");
      check(b.html.includes("<textarea"), "la direction peut le modifier (champ enregistrable)");

      console.log("\n── searchParams réparés ──");
      const byStudent = await get(`/dashboard/documents/report-card?studentId=${ctx.studentCM2}`);
      check(byStudent.status === 200, `« Générer un bulletin » depuis un élève répond 200 (reçu ${byStudent.status})`);
      check(byStudent.html.includes(`${TAG} Eveil`), "la classe et le trimestre sont déduits du seul studentId");

      console.log("\n── Chaîne contrôles + composition → trimestre ──");
      const whole = await get(`/dashboard/documents/report-card?classId=${ctx.classA}&termId=${ctx.term}`);
      check(whole.status === 200, "le bulletin de TRIMESTRE (sans evaluationId) répond 200");
      check(whole.html.includes("toutes les évaluations du trimestre"), "il agrège contrôles ET composition");
    }
  }

  /* ═══════ rendu réel + sauvegarde automatique ═══════ */
  const profile = mkdtempSync(join(tmpdir(), "gr-"));
  const launched = await launchChrome(Number(process.env.CDP_PORT ?? 9490), profile);
  if (!launched) throw new Error("Chrome n'a pas démarré");
  const { chrome, wsUrl } = launched;
  const cdp = await CDP.open(wsUrl);
  const t = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const a2 = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const session = a2.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);
  for (const k of cookies) await cdp.send("Network.setCookie", { name: k.name, value: k.value, domain: "localhost", path: "/" }, session);

  const visit = async (url: string, w: number, h: number) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false }, session);
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url }, session);
    await loaded;
    await waitFor(cdp, session, `!!document.querySelector('h1')`);
    await new Promise((r) => setTimeout(r, 1200));
  };

  console.log("\n── Rendu, trois largeurs ──");
  for (const [w, h, name] of [[1440, 900, "accueil-1440"], [1280, 900, "accueil-1280"], [1024, 800, "accueil-1024"]] as const) {
    await visit(`${BASE}/dashboard/grades`, w, h);
    const over = await evaluate<boolean>(cdp, session, "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1");
    check(over === false, `${name} : aucun débordement horizontal`);
    console.log(`      → ${await shot(cdp, session, OUT, `${MODE}-${name}`)}`);
  }

  if (MODE === "full") {
    console.log("\n── L'écran de saisie ──");
    const url = `${BASE}/dashboard/grades/saisie?class=${ctx.classA}&subject=${ctx.maths}&term=${ctx.term}&eval=${ctx.evalA}`;
    for (const [w, h, name] of [[1440, 900, "saisie-1440"], [1024, 800, "saisie-1024"]] as const) {
      await visit(url, w, h);
      const over = await evaluate<boolean>(cdp, session, "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1");
      check(over === false, `${name} : aucun débordement horizontal`);
      console.log(`      → ${await shot(cdp, session, OUT, `${MODE}-${name}`)}`);
    }

    const inputs = await evaluate<number>(cdp, session, "document.querySelectorAll('tbody input').length");
    check(inputs === 10, `10 champs de note rendus (${inputs})`);
    const filled = await evaluate<string>(cdp, session,
      "[...document.querySelectorAll('header p')].map(p=>p.textContent||'').find(t=>/note[s]? saisie/.test(t))||''");
    check(/^\s*4\s*\/\s*10/.test(filled), `la progression annonce l'existant : « ${filled.trim()} »`);

    /* ═══ LA sauvegarde automatique, de bout en bout ═══ */
    console.log("\n── Sauvegarde automatique (Chrome écrit, la base est relue) ──");
    const before = await prisma.grade.count({
      where: { classId: ctx.classA, subjectId: ctx.maths, termId: ctx.term, evaluationId: ctx.evalA },
    });

    await evaluate(cdp, session, `(() => {
      const el = document.querySelectorAll('tbody input')[9];
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '17');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await evaluate(cdp, session, `(() => {
      const el = document.querySelectorAll('tbody input')[9];
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return true;
    })()`);
    await new Promise((r) => setTimeout(r, 2500));

    const after = await prisma.grade.count({
      where: { classId: ctx.classA, subjectId: ctx.maths, termId: ctx.term, evaluationId: ctx.evalA },
    });
    check(after === before + 1, `une note de plus en base (${before} → ${after})`);

    const written = await prisma.grade.findFirst({
      where: { studentId: ctx.lastStudent, subjectId: ctx.maths, evaluationId: ctx.evalA },
      select: { value: true, max: true, teacherId: true },
    });
    check(written?.value === 17, `la valeur écrite est bien 17 (${written?.value})`);
    check(written?.max === 20, `le barème est conservé (${written?.max})`);
    check(written?.teacherId === teacherId, "la note est attribuée à l'enseignant connecté");

    const badge = await evaluate<string>(cdp, session, "document.body.innerText.includes('Enregistré') ? 'oui' : 'non'");
    check(badge === "oui", "l'écran confirme « Enregistré »");
    console.log(`      → ${await shot(cdp, session, OUT, `${MODE}-saisie-apres-sauvegarde`)}`);

    /* ═══ Hors barème : refusé, et rien n'est écrit ═══ */
    const n0 = await prisma.grade.count({ where: { classId: ctx.classA, subjectId: ctx.maths } });
    await evaluate(cdp, session, `(() => {
      const el = document.querySelectorAll('tbody input')[8];
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '45');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return true;
    })()`);
    await new Promise((r) => setTimeout(r, 1800));
    const n1 = await prisma.grade.count({ where: { classId: ctx.classA, subjectId: ctx.maths } });
    check(n1 === n0, `une note hors barème n'écrit rien (${n0} → ${n1})`);
    const err = await evaluate<string>(cdp, session, "document.body.innerText.includes('Entre 0 et 20') ? 'oui' : 'non'");
    check(err === "oui", "le barème réel est annoncé dans l'erreur");

    /* ═══ Périmètre : une matière non affectée est refusée par le SERVEUR ═══ */
    const frId = (await prisma.subject.findFirst({ where: { name: `${TAG} Francais` }, select: { id: true } }))!.id;
    const forced = `${BASE}/dashboard/grades/saisie?class=${ctx.classA}&subject=${frId}&term=${ctx.term}&eval=${ctx.evalA}`;
    await visit(forced, 1440, 900);
    const shown = await evaluate<string>(cdp, session, "document.querySelector('h1')?.textContent||''");
    check(!shown.includes("Français"), `une matière hors périmètre n'est pas servie (« ${shown.trim()} »)`);
  }

  console.log("\n── prefers-reduced-motion ──");
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, session);
  await visit(`${BASE}/dashboard/grades`, 1440, 900);
  const hidden = await evaluate<number>(cdp, session,
    `[...document.querySelectorAll('li, section, header')].filter(el => el.getBoundingClientRect().height > 20 && parseFloat(getComputedStyle(el).opacity) < 0.5).length`);
  check(hidden === 0, `aucun bloc laissé invisible (${hidden})`);

  chrome.kill();
  console.log(ko === 0 ? "\nTOUT EST VERT\n" : `\n${ko} ÉCHEC(S)\n`);
}

main()
  .catch((e) => { ko++; console.error("ÉCHEC :", e.message); })
  .finally(async () => {
    const admin = createAdminClient();
    await prisma.grade.deleteMany({ where: { OR: [{ classId: { in: trash.classIds } }, { termId: { in: trash.termIds } }] } });
    await prisma.teachingAssignment.deleteMany({ where: { teacherId: { in: trash.userIds } } });
    await prisma.classSubject.deleteMany({ where: { classId: { in: trash.classIds } } });
    await prisma.evaluation.deleteMany({ where: { termId: { in: trash.termIds } } });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
    await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
    await prisma.term.deleteMany({ where: { id: { in: trash.termIds } } });
    await prisma.subject.deleteMany({ where: { id: { in: trash.subjectIds } } });
    await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
    for (const id of trash.authIds) await admin.auth.admin.deleteUser(id);
    console.log("fixtures supprimées");
    await prisma.$disconnect();
    process.exit(ko === 0 ? 0 : 1);
  });
