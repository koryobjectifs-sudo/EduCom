/**
 * Sonde END-TO-END — les trois parcours réels d'EduCom.
 *
 *   npm run script -- scripts/verify-parcours.ts
 *
 * 31ᵉ vérificateur, et le premier à jouer des **parcours entiers** plutôt que
 * des écrans isolés :
 *
 *   ① DIRECTRICE  installation → configuration → calendrier → programme →
 *                 évaluations → affectations
 *   ② ENSEIGNANT  arrive → retrouve SA classe sans rien choisir → T1/T2/T3 →
 *                 évaluation → saisit → voit le bulletin bouger → valide → transmet
 *   ③ DIRECTION   avancement → échéances à venir → changements de calendrier →
 *                 retrouve les bulletins
 *
 * ⚠️ **La question posée à chaque écran n'est pas « s'affiche-t-il ? » mais
 * « demande-t-il quelque chose qu'EduCom sait déjà ? »** Un sélecteur vide
 * devant un utilisateur dont on connaît la classe est un échec, même si la page
 * est parfaitement peinte.
 *
 * ⚠️ Tout se joue dans une école éphémère, supprimée dans le `finally`.
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

const PORT = Number(process.env.CDP_PORT ?? 9455);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? mkdtempSync(join(tmpdir(), "parcours-"));
const TAG = "SONDEP31";
const PASSWORD = `Parc-${Math.random().toString(36).slice(2)}-31!`;
const TEXTE = "(document.body.innerText || '')";
const jours = (n: number) => new Date(Date.now() + n * 86_400_000);

const trash = { authIds: [] as string[], schoolIds: [] as string[], dirs: [] as string[] };

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log("═".repeat(74));
  console.log("  SONDE END-TO-END — LES TROIS PARCOURS");
  console.log("═".repeat(74) + "\n");

  if (!chromeAvailable()) { fail("Chrome introuvable"); return; }
  if (!(await fetch(`${BASE}/login`).catch(() => null))?.ok) { fail(`application injoignable sur ${BASE}`); return; }
  ok(`Chrome présent, application joignable sur ${BASE}`);

  const admin = createAdminClient();
  const annee = currentAcademicYear();

  const profil = mkdtempSync(join(tmpdir(), "chrome-parc-"));
  trash.dirs.push(profil);
  const lance = await launchChrome(PORT, profil);
  if (!lance) { fail("Chrome n'a pas démarré"); return; }
  const cdp = await CDP.open(lance.wsUrl);

  /**
   * ⚠️⚠️ **UN CONTEXTE DE NAVIGATION PAR PERSONA — c'est à cela qu'ils servent.**
   *
   * Par défaut, tous les onglets d'un même Chrome partagent **un seul pot à
   * cookies**. Ouvrir la session de l'enseignant écrasait donc celle de la
   * directrice, y compris dans son onglet resté ouvert : tout le parcours ③
   * partait avec le mauvais jeton et échouait en bloc, pendant que les captures
   * montraient un produit parfaitement fonctionnel.
   *
   * ⚠️ **Deux fausses pistes essayées avant celle-ci, et il faut les connaître :**
   *
   *   ① *Reposer les cookies avant chaque navigation.* Insuffisant — Supabase
   *      découpe le jeton en cookies numérotés (`…auth-token.0`, `.1`, `.2`) et
   *      leur NOMBRE dépend de l'utilisateur. Écrire deux morceaux par-dessus
   *      trois laisse le `.2` en place ; le client SSR recolle un jeton corrompu.
   *   ② *Vider le pot avant de le remplir* (`Network.clearBrowserCookies`).
   *      Pire : la commande est **globale au navigateur**, donc elle déconnecte
   *      aussi les autres onglets. Le score est tombé de 37 à 22.
   *
   * `Target.createBrowserContext` donne à chaque persona son **propre pot**,
   * étanche. Les cookies se posent UNE fois, à l'ouverture ; naviguer ensuite ne
   * touche plus à rien. Bénéfice secondaire : une seule authentification
   * Supabase par persona au lieu d'une par navigation.
   */
  const ouvrir = async (email: string, url: string, w = DESKTOP.width, h = DESKTOP.height) => {
    const { browserContextId } = await cdp.send<{ browserContextId: string }>("Target.createBrowserContext", {});
    const { targetId } = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank", browserContextId });
    const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Network.enable", {}, sessionId);
    const cookies = await sessionCookies(email, PASSWORD);
    await cdp.send("Network.setCookies", {
      cookies: cookies.map((c) => ({ ...c, domain: "localhost", path: "/" })),
    }, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 }, sessionId);
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Page.navigate", { url: `${BASE}${url}` }, sessionId);
    await waitFor(cdp, sessionId, `document.readyState === 'complete'`);
    return sessionId;
  };

  const aller = async (s: string, url: string) => {
    await cdp.send("Page.navigate", { url: `${BASE}${url}` }, s);
    await waitFor(cdp, s, `document.readyState === 'complete'`);
  };

  /**
   * ⚠️⚠️ **`readyState === 'complete'` NE SIGNIFIE PAS que le contenu est là.**
   *
   * Next.js **diffuse** le rendu serveur : les frontières de suspense arrivent
   * après. Lire `document.body.innerText` juste après le chargement rend donc
   * une page à moitié vide — et la sonde impute au produit ce qui n'est qu'une
   * mesure prise trop tôt. C'est ce qui a fait déclarer vide un générateur de
   * bulletins qui affichait « CI · 2ème Trimestre · 3 bulletins », capture à
   * l'appui.
   *
   * `voir()` attend donc que le TEXTE ATTENDU apparaisse, et n'échoue qu'au
   * bout du délai. Une assertion de contenu ne se fait plus sur un instantané.
   */
  /**
   * ⚠️ **Insensible à la casse, et ce n'est pas de la complaisance.**
   * `innerText` applique `text-transform` : un titre rendu
   * `uppercase` en CSS ressort « PROCHAINES ÉCHÉANCES » alors que le code
   * source écrit « Prochaines échéances ». Une sonde sensible à la casse
   * échouerait donc sur du texte parfaitement affiché — ce qu'elle a fait.
   */
  /**
   * ⚠️ **`new RegExp(...)` et non un littéral `/.../`.** Interpoler un motif dans
   * un littéral casse dès qu'il contient une barre oblique : `/24/24|.../i` se
   * termine sur le premier `/`, l'expression devient invalide, `evaluate` lève,
   * `waitFor` avale l'erreur et rend `false`. La sonde annonçait alors « pas
   * trouvé » sur un texte parfaitement affiché — et « 24/24 » est exactement le
   * genre de motif qu'on veut chercher sur un écran d'avancement.
   */
  const voir = (s: string, motif: string, ms = 15_000) =>
    waitFor(cdp, s, `new RegExp(${JSON.stringify(motif)}, "i").test(document.body.innerText)`, ms);

  const pasVoir = async (s: string, motif: string, ancre: string) => {
    // On attend d'abord une ancre PRÉSENTE, sinon « absent » serait vrai
    // simplement parce que la page n'a pas fini de se peindre.
    await voir(s, ancre);
    return !(await evaluate<boolean>(cdp, s,
      `new RegExp(${JSON.stringify(motif)}, "i").test(document.body.innerText)`));
  };

  /** Attend qu'une redirection serveur ait ABOUTI, pas que la page ait chargé. */
  const cheminApresRedirection = async (s: string, demande: string) => {
    await waitFor(cdp, s, `window.location.pathname !== ${JSON.stringify(demande)}`, 12_000);
    return evaluate<string>(cdp, s, "window.location.pathname");
  };
  const lire = (s: string) => evaluate<string>(cdp, s, TEXTE);
  const clic = (s: string, motif: string) => evaluate<boolean>(cdp, s,
    `(() => { const b = [...document.querySelectorAll('button, a')].find((x) => /${motif}/.test(x.textContent || '') && !x.disabled); if (!b) return false; b.click(); return true; })()`);

  /**
   * ⚠️ **`readyState === 'complete'` NE PROUVE PAS que React a hydraté.** Le HTML
   * rendu par le serveur contient déjà tous les textes : une attente sur du
   * texte est donc satisfaite AVANT que le moindre gestionnaire ne soit
   * attaché, et un `input.click()` à cet instant ne déclenche rien du tout.
   * C'est ce qui a fait échouer l'installation entière au premier essai — la
   * case « Primaire » se cochait dans le DOM, React ne le voyait pas, et le
   * bouton « Continuer » restait désactivé.
   *
   * On agit donc jusqu'à ce que l'ÉTAT CHANGE, pas jusqu'à ce que le texte
   * existe. Le bouton désactivé est le meilleur témoin d'hydratation qui soit :
   * il ne s'active que si React a reçu le `onChange`.
   */
  const agirJusqua = async (s: string, action: string, preuve: string, essais = 25) => {
    for (let i = 0; i < essais; i++) {
      // ⚠️ La preuve est évaluée AVANT d'agir, pour ne pas cliquer deux fois sur
      // une action déjà accomplie. Corollaire : une preuve toujours vraie fait
      // sortir la boucle SANS jamais agir. Un `(async () => true)()` glissé ici
      // a fait croire pendant deux passages que le bouton « Valider » ne
      // répondait pas — il n'avait simplement jamais été cliqué.
      if (await evaluate<boolean>(cdp, s, `!!(${preuve})`)) return true;
      await evaluate(cdp, s, action).catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
    }
    return evaluate<boolean>(cdp, s, `!!(${preuve})`);
  };

  const compte = async (schoolId: string, role: string, prenom: string) => {
    const email = `${TAG.toLowerCase()}.${prenom.toLowerCase()}.${Date.now()}@sonde.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw new Error(`compte ${role} : ${error?.message}`);
    trash.authIds.push(data.user.id);
    await prisma.user.create({
      data: { id: data.user.id, email, firstName: `${TAG}-${prenom}`, lastName: "Sonde", role: role as never, schoolId },
    });
    return { id: data.user.id, email };
  };

  /* ═══════════════════════════════════════════════════════════════════════
     ① DIRECTRICE — de l'installation à la configuration complète
     ═══════════════════════════════════════════════════════════════════════ */
  console.log("\n═══ ① DIRECTRICE — INSTALLATION ═══\n");

  const ecole = await prisma.school.create({
    data: { name: `${TAG} École ${Date.now()}`, onboardingCompleted: false },
    select: { id: true, name: true },
  });
  trash.schoolIds.push(ecole.id);
  const directrice = await compte(ecole.id, "OWNER", "Directrice");

  const sDir = await ouvrir(directrice.email, "/onboarding");
  check(await waitFor(cdp, sDir, `/Que propose/.test(document.body.innerText)`),
    "l'installation s'ouvre sur la seule question qui construit quelque chose");

  const coche = await agirJusqua(
    sDir,
    `(() => { const l = [...document.querySelectorAll('label')].find((x) => /Primaire/.test(x.textContent||'')); if (l) l.querySelector('input').click(); return true; })()`,
    `[...document.querySelectorAll('button')].some((b) => /Continuer/.test(b.textContent||'') && !b.disabled)`,
  );
  check(coche, "cocher « Primaire » active le bouton Continuer — React a bien reçu le choix");
  check(/6 classes seront créées/.test(await lire(sDir)),
    "l'écran annonce le nombre exact de classes que la sélection produira");

  await clic(sDir, "Continuer");
  check(await waitFor(cdp, sDir, `/programme sénégalais/.test(document.body.innerText)`),
    "étape Programme atteinte, avec le décompte réel annoncé");
  await clic(sDir, "Continuer");
  await waitFor(cdp, sDir, `/Coordonnées/.test(document.body.innerText)`);
  await clic(sDir, "Passer");
  await waitFor(cdp, sDir, `/tarifs officiels/.test(document.body.innerText)`);
  await agirJusqua(
    sDir,
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => /Terminer l'installation/.test(x.textContent||'')); if (b) b.click(); return true; })()`,
    `/est installée|Création de vos classes/.test(document.body.innerText)`,
    10,
  );
  const installee = await waitFor(cdp, sDir, `/est installée/.test(document.body.innerText)`, 90_000);
  check(installee, "l'installation aboutit");

  const bilan = await lire(sDir);
  check(/6 classes/.test(bilan), "6 classes annoncées");
  check(/rattachements aux classes/.test(bilan), "et le programme est annoncé comme installé");

  const [nbClasses, nbLiens, nbTerms, nbEvals] = await Promise.all([
    prisma.class.count({ where: { schoolId: ecole.id } }),
    prisma.classSubject.count({ where: { class: { schoolId: ecole.id } } }),
    prisma.term.count({ where: { schoolId: ecole.id } }),
    prisma.evaluation.count({ where: { schoolId: ecole.id } }),
  ]);
  check(nbClasses === 6 && nbLiens === 83 && nbTerms === 3 && nbEvals === 6,
    `EN BASE : ${nbClasses} classes · ${nbLiens} rattachements · ${nbTerms} trimestres · ${nbEvals} évaluations`);

  /* ── le tableau de bord dit ce qui manque ── */
  console.log("\n═══ ① DIRECTRICE — LE TABLEAU DE BORD SIGNALE LE MANQUE ═══\n");
  await aller(sDir, "/dashboard");
  const tDash = await lire(sDir);
  check(/Configuration pédagogique/.test(tDash),
    "le tableau de bord signale la configuration incomplète (dates manquantes)");

  /* ── configuration : dates depuis l'interface ── */
  console.log("\n═══ ① DIRECTRICE — CALENDRIER ═══\n");
  await aller(sDir, "/dashboard/settings/pedagogie");
  check(/Configuration pédagogique/.test(await lire(sDir)), "l'écran de configuration s'ouvre");

  const termes = await prisma.term.findMany({
    where: { schoolId: ecole.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true },
  });
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  /**
   * ⚠️ **Un seul événement `input`.** React mappe `onChange` sur `input` pour un
   * `<input type="date">` : dispatcher AUSSI `change` déclenchait deux
   * enregistrements concurrents, et le second champ partait pendant que le
   * `router.refresh()` du premier remplaçait le nœud. La deuxième date se
   * perdait, et la sonde l'imputait au produit.
   *
   * ⚠️ On attend ensuite la **confirmation en base**, pas un délai fixe : un
   * `setTimeout` généreux masque les vraies lenteurs et échoue les jours de
   * charge.
   */
  const saisirDate = async (s: string, id: string, valeur: string, confirme: () => Promise<boolean>) => {
    const pose = await evaluate<boolean>(cdp, s, `(() => {
      const el = document.getElementById(${JSON.stringify(id)});
      if (!el) return false;
      el.focus();
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(el, ${JSON.stringify(valeur)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    if (!pose) return false;
    for (let i = 0; i < 25; i++) {
      if (await confirme()) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  };
  // T1 terminé, T2 en cours, T3 à venir — dates saisies À L'ÉCRAN.
  const litT1 = () => prisma.term.findFirst({ where: { id: termes[0].id }, select: { startDate: true, endDate: true } });
  const debutOk = await saisirDate(sDir, `debut-${termes[0].id}`, iso(jours(-60)),
    async () => (await litT1())?.startDate != null);
  const finOk = await saisirDate(sDir, `fin-${termes[0].id}`, iso(jours(-11)),
    async () => (await litT1())?.endDate != null);
  check(debutOk && finOk, "les deux dates du 1er trimestre saisies À L'ÉCRAN sont EN BASE");

  // Les deux autres directement, pour ne pas rejouer six champs.
  await prisma.term.update({ where: { id: termes[1].id }, data: { startDate: jours(-10), endDate: jours(50) } });
  await prisma.term.update({ where: { id: termes[2].id }, data: { startDate: jours(51), endDate: jours(120) } });

  const evals = await prisma.evaluation.findMany({
    where: { schoolId: ecole.id }, select: { id: true, name: true, type: true, termId: true },
  });
  const dater = async (termId: string, type: string, quand: Date) => {
    const e = evals.find((x) => x.termId === termId && String(x.type) === type);
    if (e) await prisma.evaluation.update({ where: { id: e.id }, data: { date: quand } });
  };
  await dater(termes[0].id, "QUIZ", jours(-50));
  await dater(termes[0].id, "EXAM", jours(-15));
  await dater(termes[1].id, "QUIZ", jours(-5));
  await dater(termes[1].id, "EXAM", jours(30));
  await dater(termes[2].id, "QUIZ", jours(70));
  await dater(termes[2].id, "EXAM", jours(110));

  /* ── élèves et enseignants ── */
  const ci = await prisma.class.findFirstOrThrow({ where: { schoolId: ecole.id, name: "CI" }, select: { id: true } });
  const cm2 = await prisma.class.findFirstOrThrow({ where: { schoolId: ecole.id, name: "CM2" }, select: { id: true } });
  const inscrire = async (classId: string, prenoms: string[]) => {
    for (const p of prenoms) {
      const s = await prisma.student.create({
        data: { firstName: `${TAG}-${p}`, lastName: "Ndiaye", schoolId: ecole.id, status: "ENROLLED" },
        select: { id: true },
      });
      await prisma.enrollment.create({ data: { studentId: s.id, classId, academicYear: annee } });
    }
  };
  await inscrire(ci.id, ["Aminata", "Ousmane", "Fatou"]);
  await inscrire(cm2.id, ["Moussa", "Khady"]);

  const maitre = await compte(ecole.id, "TEACHER", "Maitre");
  const prof = await compte(ecole.id, "TEACHER", "Prof");
  const secretaire = await compte(ecole.id, "SECRETARY", "Secretaire");

  /* ── affectations DEPUIS L'INTERFACE ── */
  console.log("\n═══ ① DIRECTRICE — AFFECTATIONS ═══\n");
  await aller(sDir, "/dashboard/settings/pedagogie");
  const affecte = await evaluate<boolean>(cdp, sDir, `(() => {
    const titres = [...document.querySelectorAll('li')].filter((l) => /^CI\\b/.test((l.innerText||'').trim()));
    if (!titres.length) return false;
    const b = [...titres[0].querySelectorAll('button')].find((x) => /Affecter un enseignant/.test(x.textContent||''));
    if (!b) return false;
    b.click(); return true;
  })()`);
  check(affecte, "le formulaire d'affectation s'ouvre sur la classe CI");
  if (affecte) {
    await new Promise((r) => setTimeout(r, 500));
    await evaluate(cdp, sDir, `(() => {
      const sel = document.getElementById('ens-' + ${JSON.stringify(ci.id)});
      const opt = [...sel.options].find((o) => /Maitre/.test(o.textContent||''));
      const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await clic(sDir, "Affecter");
    let pose = false;
    for (let i = 0; i < 20 && !pose; i++) {
      pose = (await prisma.teachingAssignment.count({ where: { classId: ci.id, teacherId: maitre.id } })) > 0;
      if (!pose) await new Promise((r) => setTimeout(r, 400));
    }
    check(pose, "l'affectation « maître unique » saisie à l'écran est EN BASE");
  }

  // Prof de matière sur CM2 : deux matières seulement.
  const matieresCM2 = await prisma.classSubject.findMany({
    where: { classId: cm2.id, subject: { name: { in: ["Lecture", "Grammaire"] } } },
    select: { subjectId: true },
  });
  for (const m of matieresCM2) {
    await prisma.teachingAssignment.create({
      data: { classId: cm2.id, teacherId: prof.id, subjectId: m.subjectId, schoolId: ecole.id },
    });
  }

  /* ── validation : tout est vert ── */
  console.log("\n═══ ① DIRECTRICE — VALIDATION ═══\n");
  await aller(sDir, "/dashboard/settings/pedagogie");
  const tConf = await lire(sDir);
  check(/peut produire des bulletins/.test(tConf), "la configuration est déclarée complète");
  check(!/bloquant/.test(tConf), "plus aucune étape bloquante");
  check(/en cours/.test(tConf), "le trimestre en cours est identifié, dates à l'appui");
  await shot(cdp, sDir, OUT, "1-directrice-configuration");

  /* ═══════════════════════════════════════════════════════════════════════
     ② ENSEIGNANT
     ═══════════════════════════════════════════════════════════════════════ */
  console.log("\n═══ ② ENSEIGNANT — IL ARRIVE, ET N'A RIEN À CHOISIR ═══\n");

  const sEns = await ouvrir(maitre.email, "/dashboard/grades");
  await waitFor(cdp, sEns, `/Évaluations|Notes/.test(document.body.innerText)`);
  const tEns = await lire(sEns);

  check(/CI/.test(tEns), "sa classe apparaît sans qu'il l'ait choisie");
  check(!/CM2/.test(tEns), "et SEULEMENT la sienne — CM2 ne lui appartient pas");
  const termeCourant = await prisma.term.findFirstOrThrow({ where: { id: termes[1].id }, select: { name: true } });
  check(new RegExp(`Contrôles — ${termeCourant.name}`).test(tEns) || new RegExp(termeCourant.name).test(tEns),
    `le trimestre en cours (« ${termeCourant.name} ») est présélectionné`);
  check(/Composition du 2e trimestre|Contrôle du 2e trimestre/.test(tEns),
    "les évaluations du trimestre courant sont listées");
  await shot(cdp, sEns, OUT, "2-enseignant-arrivee");

  /* ── il clique une ligne : tout est déjà résolu ── */
  console.log("\n═══ ② ENSEIGNANT — SAISIE ═══\n");
  const href = await evaluate<string | null>(cdp, sEns,
    `(() => { const a = [...document.querySelectorAll('a')].find((x) => /\\/dashboard\\/grades\\/saisie/.test(x.getAttribute('href')||'')); return a ? a.getAttribute('href') : null; })()`);
  check(href !== null, `la ligne de travail porte un lien complet vers la saisie`);
  check(href !== null && /class=/.test(href) && /term=/.test(href) && /eval=/.test(href),
    `classe, trimestre et évaluation voyagent dans l'URL : ${href?.slice(0, 90)}…`);

  if (href) {
    await aller(sEns, href);
    const tSaisie = await lire(sEns);
    check(/note.{0,3}saisie|reste.{0,3}à noter/i.test(tSaisie), "l'écran de saisie s'ouvre, résolu");
    check(/CI/.test(tSaisie), "sur la bonne classe");
    check(/élève/.test(tSaisie), "avec les élèves déjà chargés");

    const eleves = await evaluate<number>(cdp, sEns, `document.querySelectorAll('tbody tr').length`);
    check(eleves === 3, `les 3 élèves du CI sont listés (${eleves})`);

    // Saisir trois notes réelles.
    const saisi = await evaluate<number>(cdp, sEns, `(() => {
      const champs = [...document.querySelectorAll('tbody input[inputmode="decimal"], tbody input[type="text"], tbody input[type="number"]')];
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const vals = ['14', '11', '17'];
      champs.slice(0, 3).forEach((el, i) => {
        el.focus(); set.call(el, vals[i]);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.blur();
      });
      return Math.min(champs.length, 3);
    })()`);
    check(saisi === 3, `3 notes tapées à l'écran (${saisi} champs trouvés)`);

    let enBase = 0;
    for (let i = 0; i < 25; i++) {
      enBase = await prisma.grade.count({ where: { classId: ci.id } });
      if (enBase >= 3) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    check(enBase >= 3, `les notes sont EN BASE (${enBase})`);

    const notes = await prisma.grade.findMany({ where: { classId: ci.id }, select: { value: true, coefficient: true, teacherId: true } });
    check(notes.every((n) => n.teacherId === maitre.id), "chaque note porte l'identité de son auteur");
    check(notes.some((n) => n.value === 14) && notes.some((n) => n.value === 17),
      "les valeurs enregistrées sont celles tapées");

    const tApres = await lire(sEns);
    check(/3 \/ 3|✓ Évaluation complète/.test(tApres), "la progression se met à jour à l'écran");
    await shot(cdp, sEns, OUT, "2-enseignant-saisie");
  }

  /* ── le bulletin bouge ── */
  console.log("\n═══ ② ENSEIGNANT — LE BULLETIN SUIT ═══\n");
  await aller(sEns, "/dashboard/grades/bulletin");
  check(await voir(sEns, "Aminata|Ousmane|Fatou"),
    "ses élèves sont chargés d'office, sans qu'il choisisse de classe");
  check(await pasVoir(sEns, "Choisissez votre classe", "Vue bulletin"),
    "⚠️ l'écran bulletin ne demande PAS de choisir une classe — l'enseignant n'en a qu'une");
  check(await voir(sEns, "2ème Trimestre"), "et le trimestre en cours est déjà retenu");
  await shot(cdp, sEns, OUT, "2-enseignant-bulletin");

  /* ── l'écran de saisie propose la suite ── */
  console.log("\n═══ ② ENSEIGNANT — L'ÉCRAN PROPOSE LA SUITE ═══\n");
  if (href) {
    await aller(sEns, href);
    check(await voir(sEns, "c.est complet"),
      "la matière terminée est annoncée comme telle");
    check(await voir(sEns, "Matière suivante"),
      "⚠️ et l'écran nomme la MATIÈRE SUIVANTE — plus de cul-de-sac après la dernière note");
    check(await voir(sEns, "Voir le bulletin"), "le bulletin est à un clic");
    const suite = await evaluate<string | null>(cdp, sEns,
      `(() => { const a = [...document.querySelectorAll('a')].find((x) => /Matière suivante/.test(x.textContent||'')); return a ? a.getAttribute('href') : null; })()`);
    check(suite !== null && /subject=/.test(suite), "le lien porte la matière suivante, déjà résolue");
    if (suite) {
      await aller(sEns, suite);
      check(await voir(sEns, "reste.{0,4}à noter|note.{0,4}saisie"),
        "et il atterrit directement sur la saisie de cette matière");
    }
    await shot(cdp, sEns, OUT, "2-enseignant-etape-suivante");
  }

  /* ── valider puis transmettre ── */
  console.log("\n═══ ② ENSEIGNANT — VALIDER ET TRANSMETTRE ═══\n");
  /**
   * ⚠️ On complète les notes restantes EN BASE, pas à l'écran. La saisie par
   * l'interface est déjà prouvée plus haut ; rejouer 8 matières × 3 élèves
   * n'apporterait rien et rendrait la sonde interminable. Ce qui est éprouvé
   * ici, c'est la VALIDATION — et elle exige un bulletin complet.
   */
  const evalCourante = evals.find((e) => e.termId === termes[1].id && String(e.type) === "QUIZ")!;
  const matieresCI = await prisma.classSubject.findMany({ where: { classId: ci.id }, select: { subjectId: true } });
  const elevesCI = await prisma.enrollment.findMany({ where: { classId: ci.id }, select: { studentId: true } });
  for (const e of elevesCI) {
    for (const m of matieresCI) {
      const existe = await prisma.grade.findFirst({
        where: { studentId: e.studentId, subjectId: m.subjectId, termId: termes[1].id, evaluationId: evalCourante.id },
        select: { id: true },
      });
      if (existe) continue;
      await prisma.grade.create({
        data: {
          value: 12, max: 20, coefficient: 1, type: "QUIZ",
          studentId: e.studentId, classId: ci.id, subjectId: m.subjectId,
          termId: termes[1].id, evaluationId: evalCourante.id, teacherId: maitre.id,
        },
      });
    }
  }

  await aller(sEns, "/dashboard/grades/bulletin");
  check(await voir(sEns, "Aminata|Ousmane|Fatou"), "le bulletin complet s'ouvre côté enseignant");

  /**
   * ⚠️ **« Valider » verrouille UN élève et avance au suivant** — c'est le
   * comportement du produit, et c'est le bon : un enseignant relit élève par
   * élève. On clique donc autant de fois qu'il y a d'élèves, exactement comme
   * il le ferait.
   */
  const cliquerValider = `(() => {
     const b = [...document.querySelectorAll('button')]
       .find((x) => /Valider/.test(x.textContent||'')
                 && !/quand m/i.test(x.textContent||'')
                 && !/secr/i.test(x.textContent||'')
                 && !x.disabled);
     if (b) b.click();
     return true;
   })()`;

  let carte = 0;
  for (let tour = 0; tour < elevesCI.length + 2 && carte < elevesCI.length; tour++) {
    await evaluate(cdp, sEns, cliquerValider).catch(() => {});
    for (let i = 0; i < 15; i++) {
      carte = await prisma.reportCard.count({
        where: { classId: ci.id, status: { in: ["VALIDATED", "SUBMITTED", "APPROVED"] } },
      });
      if (carte > tour) break;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  check(carte > 0, `le bouton « Valider » verrouille les bulletins un à un (${carte}/${elevesCI.length})`);
  check(carte === elevesCI.length, `les ${elevesCI.length} élèves du CI sont validés`);

  /* ── et le secrétariat le retrouve ── */
  const depose = await agirJusqua(
    sEns,
    `(() => { const b = [...document.querySelectorAll('button')].find((x) => /Envoyer au secr/i.test(x.textContent||'') && !x.disabled); if (b) b.click(); return true; })()`,
    `[...document.querySelectorAll('button')].some((x) => /Confirmer le dépôt/.test(x.textContent||''))`,
    12,
  );
  check(depose, "« Envoyer au secrétariat » ne s'active qu'une fois TOUS les bulletins validés");
  if (depose) {
    await agirJusqua(
      sEns,
      `(() => { const b = [...document.querySelectorAll('button')].find((x) => /Confirmer le dépôt/.test(x.textContent||'')); if (b) b.click(); return true; })()`,
      `!document.body.innerText.includes('Confirmer le dépôt')`,
      10,
    );
  }
  let deposes = 0;
  for (let i = 0; i < 20; i++) {
    deposes = await prisma.reportCard.count({ where: { classId: ci.id, status: "SUBMITTED" } });
    if (deposes > 0) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  check(deposes > 0, `la classe est déposée au secrétariat (${deposes} bulletin(s) SUBMITTED)`);
  await shot(cdp, sEns, OUT, "2-enseignant-validation");

  /* ═══════════════════════════════════════════════════════════════════════
     ③ DIRECTION
     ═══════════════════════════════════════════════════════════════════════ */
  console.log("\n═══ ③ DIRECTION — AVANCEMENT ET ÉCHÉANCES ═══\n");

  await aller(sDir, "/dashboard/grades");
  check(await voir(sDir, "CM2"), "la direction voit les classes qui ne sont pas les siennes");
  // ⚠️ L'avancement d'une ligne agrégée vaut élèves × matières du périmètre —
  // 3 élèves × 8 matières au CI, et non « 3/3 ». Attendre le mauvais dénominateur
  // faisait échouer une mesure parfaitement juste.
  check(await voir(sDir, "24/24"),
    "avec l'avancement réel : 24 cases pour le CI (3 élèves × 8 matières), toutes saisies");

  await aller(sDir, "/dashboard/settings/pedagogie");
  check(await voir(sDir, "Prochaines échéances"), "les prochaines échéances sont affichées");
  check(await voir(sDir, "Composition du 2e trimestre"), "et elles nomment la composition à venir");

  /* ── changement de calendrier → l'enseignant est prévenu ── */
  console.log("\n═══ ③ DIRECTION — DÉPLACER UNE COMPOSITION ═══\n");
  const compoT2 = evals.find((e) => e.termId === termes[1].id && String(e.type) === "EXAM")!;
  const deplace = await saisirDate(sDir, `date-${compoT2.id}`, iso(jours(35)), async () =>
    (await prisma.auditLog.count({
      where: { schoolId: ecole.id, action: "reschedule", entityId: compoT2.id },
    })) > 0);
  check(deplace, "le déplacement saisi à l'écran est tracé");

  const sEns2 = await ouvrir(maitre.email, "/dashboard/grades");
  await waitFor(cdp, sEns2, `/Évaluations|Notes/.test(document.body.innerText)`);
  const tAvis = await lire(sEns2);
  check(/Le calendrier a changé/.test(tAvis), "et l'enseignant le voit sur son écran de travail");

  /* ── retrouver les bulletins ── */
  console.log("\n═══ ③ DIRECTION — RETROUVER LES BULLETINS ═══\n");
  await aller(sDir, "/dashboard/documents/report-card");
  check(await voir(sDir, "Aminata|Ousmane|Fatou"),
    "⚠️ un bulletin réel est rendu D'EMBLÉE, sans aucune sélection");
  check(await pasVoir(sDir, "Choisissez une classe", "Bulletins"),
    "le générateur ne s'ouvre plus sur un sélecteur vide");
  check(await voir(sDir, "2ème Trimestre"), "sur le trimestre en cours");
  check(await voir(sDir, "bulletins — CI|bulletin — CI"),
    "et sur une classe qui porte réellement des notes, pas la première venue");
  await shot(cdp, sDir, OUT, "3-direction-bulletins");

  /* ── le secrétariat voit arriver le dépôt ── */
  await aller(sDir, "/dashboard");
  check(await voir(sDir, "Bulletins à relire"),
    "⚠️ le dépôt de l'enseignant remonte au tableau de bord de la direction");

  /* ── un parent n'entre pas ── */
  const parent = await compte(ecole.id, "PARENT", "Parent");
  const sPar = await ouvrir(parent.email, "/dashboard/documents/report-card");
  const ouParent = await cheminApresRedirection(sPar, "/dashboard/documents/report-card");
  check(ouParent !== "/dashboard/documents/report-card",
    `⚠️ un PARENT est refusé sur le générateur de bulletins (atterri sur ${ouParent})`);
  check(await pasVoir(sPar, "Aminata|Ousmane|Fatou", "."),
    "et aucune note d'aucun élève ne lui a été servie au passage");

  /* ── secrétaire ── */
  console.log("\n═══ SECRÉTAIRE ═══\n");
  const sSec = await ouvrir(secretaire.email, "/dashboard/settings/pedagogie");
  check(await voir(sSec, "Configuration pédagogique"),
    "la secrétaire accède bien à la configuration pédagogique");
  await aller(sSec, "/dashboard/settings");
  check((await cheminApresRedirection(sSec, "/dashboard/settings")) === "/dashboard",
    "…mais pas aux réglages de l'établissement");

  /* ── mobile ── */
  console.log("\n═══ MOBILE — 390 × 844 ═══\n");
  const sMob = await ouvrir(maitre.email, "/dashboard/grades", MOBILE.width, MOBILE.height);
  await waitFor(cdp, sMob, `/Évaluations|Notes/.test(document.body.innerText)`);
  const mM = await measure(cdp, sMob);
  check(mM.offenders.length === 0, `écran enseignant sans débordement à 390 px`,
    mM.offenders.slice(0, 3).map((o: any) => `${o.tag}.${o.cls}`).join(" · "));

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
