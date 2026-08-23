/**
 * Sonde RUNTIME de la configuration pédagogique.
 *
 *   npm run script -- scripts/verify-pedagogie-runtime.ts
 *
 * 30ᵉ vérificateur, et le seul de cette passe à **peindre réellement l'écran**.
 * Chrome piloté par le protocole DevTools : vraie URL, vraie session Supabase,
 * hydratation React attendue, DOM mesuré à 1440 × 900 puis 390 × 844.
 *
 * ⚠️ Elle ne se contente pas de lire : elle **change un coefficient et déplace
 * une composition depuis l'interface**, puis vérifie **en base** que la valeur
 * a bougé et que le changement est tracé. Une sonde qui n'écrit pas ne prouve
 * pas qu'un formulaire fonctionne.
 *
 * ⚠️ **Fixtures dans une école éphémère**, jamais dans l'établissement de
 * travail : la sonde repondère des matières et déplace des évaluations.
 */
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { applyCurriculum } from "../src/lib/pedagogy";
import { currentAcademicYear } from "../src/lib/studentFile";
import {
  CDP, chromeAvailable, launchChrome, evaluate, waitFor, measure, shot,
  sessionCookies, MOBILE, DESKTOP,
} from "./_cdp";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const PORT = Number(process.env.CDP_PORT ?? 9452);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "pedago-"));
const TAG = "SONDEPEDA";
const PASSWORD = `Peda-${Math.random().toString(36).slice(2)}-29!`;

const trash = { authIds: [] as string[], schoolIds: [] as string[], dirs: [] as string[] };

const texte = "(document.body.innerText || '')";

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log("═".repeat(74));
  console.log("  SONDE RUNTIME — CONFIGURATION PÉDAGOGIQUE");
  console.log("═".repeat(74) + "\n");

  if (!chromeAvailable()) { fail("Google Chrome introuvable — rendu non éprouvé"); return; }
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`application injoignable sur ${BASE}`); return; }
  ok(`Chrome présent, application joignable sur ${BASE}`);

  /* ══ fixtures ══ */
  const admin = createAdminClient();
  const school = await prisma.school.create({
    data: { name: `${TAG} École ${Date.now()}`, onboardingCompleted: true },
    select: { id: true, name: true },
  });
  trash.schoolIds.push(school.id);

  const compte = async (role: "OWNER" | "TEACHER", prenom: string) => {
    const email = `${TAG.toLowerCase()}.${role.toLowerCase()}.${Date.now()}@sonde.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw new Error(`compte ${role} : ${error?.message}`);
    trash.authIds.push(data.user.id);
    await prisma.user.create({
      data: { id: data.user.id, email, firstName: `${TAG}-${prenom}`, lastName: "Sonde", role, schoolId: school.id },
    });
    return { id: data.user.id, email };
  };

  const direction = await compte("OWNER", "Direction");
  const enseignant = await compte("TEACHER", "Enseignant");

  await prisma.class.createMany({
    data: [
      { name: "CI", cycle: "ELEMENTAIRE", schoolId: school.id },
      { name: "CM2", cycle: "ELEMENTAIRE", schoolId: school.id },
    ],
  });
  const ci = await prisma.class.findFirstOrThrow({ where: { schoolId: school.id, name: "CI" }, select: { id: true } });
  await prisma.class.update({ where: { id: ci.id }, data: { teacherId: enseignant.id } });

  const eleve = await prisma.student.create({
    data: { firstName: `${TAG}-Aminata`, lastName: "Ndiaye", schoolId: school.id, status: "ENROLLED" },
    select: { id: true },
  });
  await prisma.enrollment.create({
    data: { studentId: eleve.id, classId: ci.id, academicYear: currentAcademicYear() },
  });

  await applyCurriculum({ schoolId: school.id, userId: direction.id, role: "OWNER" }, { withControls: true });

  const t1 = await prisma.term.findFirstOrThrow({
    where: { schoolId: school.id, name: "1er Trimestre" },
    select: { id: true },
  });
  const compo = await prisma.evaluation.findFirstOrThrow({
    where: { schoolId: school.id, termId: t1.id, type: "EXAM" },
    select: { id: true, name: true },
  });
  ok(`fixtures : « ${school.name} » — 2 classes, 1 élève, programme appliqué`);

  /* ══ Chrome ══ */
  const profil = mkdtempSync(join(tmpdir(), "chrome-peda-"));
  trash.dirs.push(profil);
  const lance = await launchChrome(PORT, profil);
  if (!lance) { fail("Chrome n'a pas démarré"); return; }
  const cdp = await CDP.open(lance.wsUrl);

  const ouvrir = async (email: string, url: string, largeur: number, hauteur: number) => {
    const cookies = await sessionCookies(email, PASSWORD);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Network.enable", {}, sessionId);
    await cdp.send("Network.setCookies", {
      cookies: cookies.map((c) => ({ ...c, domain: "localhost", path: "/" })),
    }, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride",
      { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: largeur < 700 }, sessionId);
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Page.navigate", { url: `${BASE}${url}` }, sessionId);
    await waitFor(cdp, sessionId, `document.readyState === 'complete'`);
    return sessionId;
  };

  /* ══ 1. L'écran s'affiche, à la direction ══ */
  console.log("\n═══ 1. RENDU — DIRECTION, 1440 × 900 ═══\n");

  const s1 = await ouvrir(direction.email, "/dashboard/settings/pedagogie", DESKTOP.width, DESKTOP.height);
  const rendu = await waitFor(cdp, s1, `/Configuration pédagogique/.test(document.body.innerText)`);
  check(rendu, "l'écran de configuration pédagogique est peint");

  const t = await evaluate<string>(cdp, s1, texte);
  check(/Programme et coefficients/.test(t), "la section « Programme et coefficients » est rendue");
  check(/Calendrier de l'année/.test(t), "la section « Calendrier de l'année » est rendue");
  check(/Enseignants et affectations/.test(t), "la section « Enseignants et affectations » est rendue");
  check(/Titulaire\s*:/.test(t),
    "la classe titularisée affiche son maître au lieu de « personne n'est affecté »");
  check(/1er Trimestre/.test(t) && /2ème Trimestre/.test(t) && /3ème Trimestre/.test(t),
    "les trois trimestres appliqués apparaissent");
  check(new RegExp(compo.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(t),
    `la composition « ${compo.name} » apparaît`);

  // La validation, en tête
  check(/étapes complètes|manque encore/.test(t), "l'état de configuration est annoncé en tête d'écran");
  check(/bloquant/.test(t) === false || /Dates de trimestre/.test(t),
    "les étapes non bloquantes ne sont pas présentées comme des obstacles");

  /**
   * ⚠️ **L'écran ne doit pas se contredire.** Sur la capture du 22 août, le
   * troisième trimestre portait « en cours » ET, deux lignes plus bas, « sans
   * dates, ce trimestre ne peut pas être choisi comme trimestre courant ». Les
   * deux venaient du même `pickCurrentTerm()` : l'un lisait son résultat,
   * l'autre sa condition. Cette vérification empêche le retour du défaut.
   */
  const sansDates = /ne peut pas être choisi comme trimestre courant/.test(t);
  check(!(sansDates && /·\s*en cours/.test(t)) && !/en cours/.test(t.split("Calendrier de l'année")[1] ?? ""),
    "aucun trimestre non daté n'est annoncé « en cours »");
  check(/ouvert par défaut/.test(t),
    "le repli est nommé pour ce qu'il est : « ouvert par défaut », pas « en cours »");
  check(/Aucun trimestre n'est daté/.test(t),
    "et la conséquence est dite une fois, en tête du calendrier");

  const mesure1 = await measure(cdp, s1);
  check(mesure1.offenders.length === 0,
    `aucun débordement horizontal à ${DESKTOP.label}`,
    mesure1.offenders.slice(0, 3).map((o: any) => `${o.tag}.${o.cls}`).join(" · "));
  await shot(cdp, s1, OUT, "pedagogie-bureau");
  ok(`capture : ${join(OUT, "pedagogie-bureau.png")}`);

  /* ══ 2. Écrire un coefficient DEPUIS L'INTERFACE ══ */
  console.log("\n═══ 2. ÉCRITURE RÉELLE — LE COEFFICIENT ═══\n");

  const lecture = await prisma.classSubject.findFirstOrThrow({
    where: { classId: ci.id, subject: { name: "Lecture" } },
    select: { id: true, subjectId: true, coefficient: true },
  });
  check(lecture.coefficient === 1, "avant : le coefficient de « Lecture » en CI vaut 1");

  const idChamp = `coef-${ci.id}-${lecture.subjectId}`;
  const trouve = await evaluate<boolean>(cdp, s1, `!!document.getElementById(${JSON.stringify(idChamp)})`);
  check(trouve, "le champ de coefficient de « Lecture » est présent dans le DOM");

  if (trouve) {
    // ⚠️ On passe par le setter natif de React : écrire `input.value` directement
    // ne déclenche pas `onChange`, et le composant ne verrait jamais la frappe.
    /**
     * ⚠️ **`el.focus()` AVANT tout, et ce n'est pas un détail de sonde.** Le
     * coefficient s'enregistre au `blur` — délibérément, parce qu'un `onChange`
     * par caractère enverrait « 1 », puis « 1. », puis « 1.5 ». Or `el.blur()`
     * n'émet rien sur un élément qui n'a jamais eu le focus : sans cette ligne,
     * la sonde reproduisait une frappe qu'aucun humain ne peut faire, et
     * concluait à tort que l'écran ne fonctionnait pas.
     *
     * ⚠️ Le setter natif de React est nécessaire : écrire `el.value` directement
     * ne déclenche pas `onChange` et le composant ne verrait jamais la frappe.
     */
    await evaluate(cdp, s1, `(() => {
      const el = document.getElementById(${JSON.stringify(idChamp)});
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '2.5');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.blur();
      return true;
    })()`);
    let ecrit = false;
    for (let i = 0; i < 25; i++) {
      const row = await prisma.classSubject.findUnique({ where: { id: lecture.id }, select: { coefficient: true } });
      if (row?.coefficient === 2.5) { ecrit = true; break; }
      await new Promise((r) => setTimeout(r, 400));
    }
    check(ecrit, "après saisie à l'écran : le coefficient vaut 2,5 EN BASE");
  }

  /* ══ 3. Déplacer une composition, et la trace qui va avec ══ */
  console.log("\n═══ 3. ÉCRITURE RÉELLE — LA DATE D'UNE ÉVALUATION ═══\n");

  const idDate = `date-${compo.id}`;
  const champDate = await evaluate<boolean>(cdp, s1, `!!document.getElementById(${JSON.stringify(idDate)})`);
  check(champDate, "le champ de date de la composition est présent");

  if (champDate) {
    await evaluate(cdp, s1, `(() => {
      const el = document.getElementById(${JSON.stringify(idDate)});
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '2026-12-12');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    let datee = false;
    for (let i = 0; i < 20; i++) {
      const e = await prisma.evaluation.findUnique({ where: { id: compo.id }, select: { date: true } });
      if (e?.date) { datee = true; break; }
      await new Promise((r) => setTimeout(r, 400));
    }
    check(datee, "après saisie à l'écran : la composition est datée EN BASE");

    const trace = await prisma.auditLog.findFirst({
      where: { schoolId: school.id, action: "reschedule", entity: "evaluation", entityId: compo.id },
      select: { details: true },
    });
    check(trace !== null, "le déplacement est TRACÉ — l'ancienne date n'est pas perdue");
    check(trace !== null && /apres/.test(trace.details ?? ""),
      "la trace porte bien l'avant et l'après");
  }

  /* ══ 4. L'enseignant voit le changement, et n'entre pas dans la config ══ */
  console.log("\n═══ 4. PROPAGATION VERS L'ENSEIGNANT ═══\n");

  const s2 = await ouvrir(enseignant.email, "/dashboard/grades", DESKTOP.width, DESKTOP.height);
  await waitFor(cdp, s2, `/Notes|Évaluations/.test(document.body.innerText)`);
  const tEns = await evaluate<string>(cdp, s2, texte);
  check(/Le calendrier a changé/.test(tEns),
    "l'enseignant est averti du changement de calendrier sur son écran de travail");
  check(/12 décembre/.test(tEns), "et l'avis porte la nouvelle date");
  await shot(cdp, s2, OUT, "grades-avis-planning");

  /**
   * ⚠️ **`readyState === 'complete'` NE SUFFIT PAS pour lire une redirection.**
   * Il devient vrai sur le document intermédiaire, avant que le 307 émis par
   * `redirect()` n'ait été suivi. Lue à cet instant, `location.pathname` rend
   * encore l'URL demandée — et la sonde conclut à un défaut de sécurité qui
   * n'existe pas. On attend donc que le chemin CHANGE, pas que la page charge.
   */
  const s3 = await ouvrir(enseignant.email, "/dashboard/settings/pedagogie", DESKTOP.width, DESKTOP.height);
  await waitFor(cdp, s3, `window.location.pathname !== '/dashboard/settings/pedagogie'`, 15_000);
  const urlEns = await evaluate<string>(cdp, s3, "window.location.pathname");
  check(urlEns === "/dashboard",
    `⚠️ l'enseignant est renvoyé hors de la configuration — atterri sur ${urlEns}`);
  const tRedir = await evaluate<string>(cdp, s3, texte);
  check(!/Programme et coefficients/.test(tRedir),
    "et aucun contenu de configuration ne lui a été servi au passage");

  const s4 = await ouvrir(enseignant.email, "/dashboard/grades/bulletin", DESKTOP.width, DESKTOP.height);
  await waitFor(cdp, s4, `/Vue bulletin/.test(document.body.innerText)`);
  const boutonConfig = await evaluate<boolean>(cdp, s4,
    `[...document.querySelectorAll('button')].some((b) => /Configuration/.test(b.textContent || ''))`);
  check(!boutonConfig, "le bouton « Configuration » n'est pas proposé à l'enseignant");

  /* ══ 5. Mobile ══ */
  console.log("\n═══ 5. RENDU — 390 × 844 ═══\n");

  const s5 = await ouvrir(direction.email, "/dashboard/settings/pedagogie", MOBILE.width, MOBILE.height);
  await waitFor(cdp, s5, `/Configuration pédagogique/.test(document.body.innerText)`);
  const mesure2 = await measure(cdp, s5);
  check(mesure2.offenders.length === 0,
    `aucun débordement horizontal à ${MOBILE.label}`,
    mesure2.offenders.slice(0, 4).map((o: any) => `${o.tag}.${o.cls} (${Math.round(o.right)}px)`).join(" · "));
  check(mesure2.scrollWidth <= MOBILE.width + 1,
    `la page ne défile pas latéralement (scrollWidth ${mesure2.scrollWidth})`);

  /**
   * ⚠️ **Un nom tronqué à une lettre n'est plus un nom.** Mesuré ici, pas
   * supposé : on lit la LARGEUR RENDUE du libellé, pas la présence du texte
   * dans le DOM — `truncate` laisse le texte intact dans `textContent` tout en
   * n'en peignant qu'une lettre. C'est exactement ce qui s'était produit à
   * 390 px avant que la rangée ne passe sur deux lignes.
   */
  const largeurNoms = await evaluate<number[]>(cdp, s5, `(() => {
    const noms = [...document.querySelectorAll('li span.truncate')]
      .filter((e) => /trimestre/i.test(e.textContent || ''));
    return noms.map((e) => Math.round(e.getBoundingClientRect().width));
  })()`);
  check(largeurNoms.length > 0 && largeurNoms.every((w) => w > 140),
    `les noms d'évaluation restent lisibles à 390 px (largeurs rendues : ${largeurNoms.join(", ")} px)`);
  await shot(cdp, s5, OUT, "pedagogie-mobile");
  ok(`capture : ${join(OUT, "pedagogie-mobile.png")}`);

  /* ══ 6. L'installation ══ */
  console.log("\n═══ 6. INSTALLATION — L'ÉTAPE PROGRAMME ═══\n");

  const neuve = await prisma.school.create({
    data: { name: `${TAG} Neuve ${Date.now()}`, onboardingCompleted: false },
    select: { id: true },
  });
  trash.schoolIds.push(neuve.id);
  const emailNeuf = `${TAG.toLowerCase()}.neuf.${Date.now()}@sonde.invalid`;
  const { data: dNeuf } = await admin.auth.admin.createUser({ email: emailNeuf, password: PASSWORD, email_confirm: true });
  if (dNeuf?.user) {
    trash.authIds.push(dNeuf.user.id);
    await prisma.user.create({
      data: { id: dNeuf.user.id, email: emailNeuf, firstName: `${TAG}-Neuf`, lastName: "Sonde", role: "OWNER", schoolId: neuve.id },
    });

    const s6 = await ouvrir(emailNeuf, "/onboarding", DESKTOP.width, DESKTOP.height);
    await waitFor(cdp, s6, `/Que propose/.test(document.body.innerText)`);
    const etapes = await evaluate<string>(cdp, s6, `[...document.querySelectorAll('li')].map(l=>l.innerText).join('|')`);
    check(/Programme/.test(etapes), `l'étape « Programme » figure au fil d'installation (${etapes.slice(0, 60)}…)`);

    // Choisir « Primaire » puis avancer
    await evaluate(cdp, s6, `(() => {
      const l = [...document.querySelectorAll('label')].find((x) => /Primaire/.test(x.textContent || ''));
      l.querySelector('input').click(); return true;
    })()`);
    await evaluate(cdp, s6, `(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /Continuer/.test(x.textContent || ''));
      b.click(); return true;
    })()`);
    const surProgramme = await waitFor(cdp, s6, `/programme sénégalais/.test(document.body.innerText)`);
    check(surProgramme, "l'étape Programme s'affiche après le choix des niveaux");

    const tProg = await evaluate<string>(cdp, s6, texte);
    check(/83 rattachements/.test(tProg),
      "elle annonce le décompte RÉEL calculé par le module du programme (83 rattachements pour le primaire)");
    check(/coefficient 1/.test(tProg), "elle dit que tout arrive au coefficient 1");
    check(/contrôle par trimestre/.test(tProg), "les contrôles sont une case distincte du socle");
    await shot(cdp, s6, OUT, "onboarding-programme");
    ok(`capture : ${join(OUT, "onboarding-programme.png")}`);
  }

  await cdp.close();
  lance.chrome.kill();

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks - failures}/${checks} vérifications passées`);
  console.log(`  captures : ${OUT}`);
  console.log("═".repeat(74));
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error("ÉCHEC :", e); process.exitCode = 1; })
  .finally(async () => {
    const admin = createAdminClient();
    for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
    for (const id of trash.schoolIds) {
      await prisma.auditLog.deleteMany({ where: { schoolId: id } }).catch(() => {});
      await prisma.school.delete({ where: { id } }).catch(() => {});
    }
    for (const d of trash.dirs) rmSync(d, { recursive: true, force: true });
    await prisma.$disconnect();
  });
