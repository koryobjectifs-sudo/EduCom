/**
 * Sonde RUNTIME du parcours de PILOTE — inscription, connexion, isolation.
 *
 *   npm run script -- scripts/verify-pilote-auth.ts
 *
 * Elle répond à une seule question, celle du critère de succès :
 *
 *   « Une personne extérieure peut-elle recevoir l'URL publique, créer son
 *     compte, créer son école, se connecter, atteindre sa première valeur, sans
 *     jamais voir les données d'une autre école ? »
 *
 * ⚠️ **Elle ne masque pas le maillon manquant.** L'envoi d'e-mail de Supabase
 * est à court de quota : `auth.signUp()` répond 429 `over_email_send_rate_limit`.
 * La sonde le CONSTATE (section 1), vérifie que le formulaire le dit
 * honnêtement au lieu d'annoncer un succès (section 2), puis crée ses deux
 * comptes par l'API d'administration — étape explicitement déclarée NON
 * PROUVÉE, jamais comptée comme réussie.
 *
 * ⚠️ Rien n'est affaibli pour faire passer un test : la confirmation d'adresse
 * reste exigée par le projet, RLS reste fermée, la clé de service ne quitte pas
 * ce script. Les deux comptes sont confirmés par l'API d'administration, ce que
 * Kory peut faire depuis son tableau de bord Supabase — pas par un contournement
 * du code.
 *
 * ⚠️ **Elle crée deux écoles réelles et les supprime**, ainsi que leurs comptes
 * d'authentification. Tout est préfixé `SONDEPIL`.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { createAdminClient } from "../src/lib/supabase/admin";
import {
  CDP, chromeAvailable, launchChrome, evaluate, waitFor, sessionCookies, MOBILE,
} from "./_cdp";

let checks = 0, failures = 0, nonProuves = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const nonProuve = (l: string, pourquoi: string) => { nonProuves++; console.log(`  ⃠ NON PROUVÉ — ${l}\n      ${pourquoi}`); };

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const PORT = Number(process.env.CDP_PORT ?? 9455);
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TAG = "SONDEPIL";
const STAMP = String(Date.now()).slice(-6);

type Compte = {
  nom: string; email: string; motDePasse: string; ecole: string;
  authId?: string; schoolId?: string; studentId?: string; classId?: string;
  cookies?: { name: string; value: string }[];
};

const A: Compte = { nom: "A", email: `${TAG.toLowerCase()}.a.${STAMP}@gmail.com`, motDePasse: `Pil-A-${STAMP}-2026!`, ecole: `${TAG} Alpha ${STAMP}` };
const B: Compte = { nom: "B", email: `${TAG.toLowerCase()}.b.${STAMP}@gmail.com`, motDePasse: `Pil-B-${STAMP}-2026!`, ecole: `${TAG} Beta ${STAMP}` };

const dirs: string[] = [];
const entete = (c: Compte) => ({ cookie: (c.cookies ?? []).map((k) => `${k.name}=${k.value}`).join("; ") });

/** GET avec la session d'un compte, sans suivre les redirections. */
async function visiter(c: Compte, chemin: string) {
  const r = await fetch(`${BASE}${chemin}`, { headers: entete(c), redirect: "manual" });
  const corps = r.status < 300 ? await r.text() : "";
  return { statut: r.status, vers: r.headers.get("location") ?? "", corps };
}

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE PILOTE — INSCRIPTION RÉELLE · CONNEXION · ISOLATION A/B");
  console.log("═".repeat(74));

  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) { fail(`application injoignable sur ${BASE}`); return; }
  const admin = createAdminClient();

  /* ═══════ 1. CE QUE SUPABASE AUTORISE AUJOURD'HUI ═══════ */
  console.log("\n═══ 1. CONFIGURATION SUPABASE (lecture seule) ═══\n");

  const reglages = await fetch(`${URL_}/auth/v1/settings`, { headers: { apikey: ANON } }).then((r) => r.json());
  check(reglages.disable_signup === false, "l'inscription publique est ACTIVÉE côté Supabase");
  check(reglages.external?.email === true, "le fournisseur e-mail / mot de passe est activé");
  console.log(`      → confirmation d'adresse exigée : ${reglages.mailer_autoconfirm === false ? "OUI" : "non"}`);

  // ⚠️ Une VRAIE tentative, avec un domaine dont les MX existent : c'est le seul
  // moyen de nommer la cause au lieu de la supposer.
  const essai = await fetch(`${URL_}/auth/v1/signup`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${TAG.toLowerCase()}.essai.${STAMP}@gmail.com`, password: `Essai-${STAMP}-2026!` }),
  });
  const detail = await essai.json().catch(() => ({}));
  const codeErreur = detail?.error_code ?? detail?.code ?? "";
  const signUpMarche = essai.status === 200;

  if (signUpMarche) {
    ok("`auth.signUp()` répond 200 — l'inscription publique fonctionne");
    const id = detail?.id ?? detail?.user?.id;
    if (id) await admin.auth.admin.deleteUser(id).catch(() => {});
  } else {
    nonProuve(
      "l'inscription publique de bout en bout par une personne extérieure",
      `\`auth.signUp()\` → HTTP ${essai.status} \`${codeErreur}\`. Le service d'envoi d'e-mails de Supabase refuse. Ce n'est PAS un défaut du code : voir \`rappel.md\` §57.`,
    );
  }

  /* ═══════ 2. LE FORMULAIRE NE MENT PAS ═══════ */
  console.log("\n═══ 2. LE FORMULAIRE D'INSCRIPTION DIT LA VÉRITÉ ═══\n");

  if (!chromeAvailable()) {
    nonProuve("le comportement du formulaire face au refus du fournisseur", "Google Chrome introuvable.");
  } else {
    const profil = mkdtempSync(join(tmpdir(), "cdp-pil-"));
    dirs.push(profil);
    const lance = await launchChrome(PORT, profil);
    if (!lance) { fail("Chrome n'a pas ouvert son point DevTools"); return; }
    const { chrome, wsUrl } = lance;
    const cdp = await CDP.open(wsUrl);
    const cible = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const att = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: cible.targetId, flatten: true });
    const s = att.sessionId;
    await cdp.send("Page.enable", {}, s);
    await cdp.send("Runtime.enable", {}, s);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: MOBILE.width, height: MOBILE.height, deviceScaleFactor: 2, mobile: true }, s);

    const charge = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `${BASE}/register` }, s);
    await charge;
    await waitFor(cdp, s, `document.querySelector('#email')`, 30000);

    const remplir = (sel: string, val: string) => `(() => {
      const el = document.querySelector('${sel}');
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, ${JSON.stringify(val)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return el.value;
    })()`;
    const refuse = `${TAG.toLowerCase()}.refus.${STAMP}@gmail.com`;
    // ⚠️ Le nom ne doit contenir AUCUN mot cherché plus bas : avec « Refusée »,
    // l'attente se reconnaissait dans le formulaire qu'elle venait de remplir et
    // rendait la main avant que le serveur ait répondu.
    await evaluate(cdp, s, remplir("#schoolName", `${TAG} Gamma ${STAMP}`));
    await evaluate(cdp, s, remplir("#firstName", "Sonde"));
    await evaluate(cdp, s, remplir("#lastName", "Pilote"));
    await evaluate(cdp, s, remplir("#email", refuse));
    await evaluate(cdp, s, remplir("#password", `Refus-${STAMP}-2026!`));
    await evaluate(cdp, s, `document.querySelector('form').requestSubmit()`);

    const repondu = await waitFor(cdp, s,
      `!!document.querySelector('[role=alert]') || /Confirmez votre adresse/i.test(document.body.innerText)`, 40000);
    const alerte = await evaluate<string>(cdp, s,
      `(document.querySelector('[role=alert]')?.innerText ?? '').replace(/\\s+/g, ' ')`);
    const texte = await evaluate<string>(cdp, s, `document.body.innerText.replace(/\\s+/g, ' ')`);
    console.log(`      → message affiché : « ${alerte || "(aucun)"} »`);
    check(repondu, "le formulaire répond quelque chose (il ne reste pas figé)");

    if (!signUpMarche) {
      check(/limite/i.test(alerte),
        "il annonce la limite du service d'envoi, en français, sans prétendre que le compte est créé",
        alerte || texte.slice(0, 220));
      check(!/Confirmez votre adresse/i.test(texte),
        "il n'affiche AUCUN écran de succès alors que rien n'a été créé");
    }

    // ⚠️ Le défaut historique : une école était créée avant même de savoir si
    // l'inscription aboutissait. Elle survivait à l'échec.
    const fantome = await prisma.school.count({ where: { email: refuse } });
    check(fantome === 0, "aucun établissement fantôme n'est laissé derrière un échec d'inscription",
      `${fantome} école(s) portant ${refuse}`);

    cdp.close();
    chrome.kill();
  }

  /* ═══════ 3. DEUX COMPTES RÉELS ═══════ */
  console.log("\n═══ 3. DEUX COMPTES, DEUX ÉCOLES ═══\n");

  for (const c of [A, B]) {
    // ⚠️ `createUser` + `email_confirm` est une action d'ADMINISTRATION, celle
    // que Kory peut faire depuis son tableau de bord Supabase. Ce n'est pas un
    // contournement d'Auth : le compte est réel, le mot de passe est réel, et
    // la connexion qui suit passe par le vrai formulaire.
    const { data, error } = await admin.auth.admin.createUser({
      email: c.email, password: c.motDePasse, email_confirm: true,
      user_metadata: { firstName: "Sonde", lastName: c.nom },
    });
    if (error || !data.user) { fail(`compte ${c.nom} — création impossible`, error?.message); return; }
    c.authId = data.user.id;

    // Mêmes écritures que `register/actions.ts`, dans la même transaction.
    await prisma.$transaction(async (tx) => {
      const ecole = await tx.school.create({ data: { name: c.ecole, email: c.email } });
      await tx.user.create({
        data: { id: c.authId!, email: c.email, firstName: "Sonde", lastName: c.nom, role: "ADMIN", schoolId: ecole.id },
      });
      const klass = await tx.class.create({ data: { name: `CM2-${c.nom}`, cycle: "ELEMENTAIRE", schoolId: ecole.id } });
      const eleve = await tx.student.create({
        data: { firstName: `${TAG}-${c.nom}`, lastName: "Ndiaye", schoolId: ecole.id, status: "ENROLLED" },
      });
      // ⚠️ `Enrollment` ne porte PAS de `schoolId` : il le tient de sa classe et
      // de son élève, tous deux rattachés à l'établissement. C'est ce qui rend
      // le contrôle croisé de la section 6 nécessaire — l'inscription seule ne
      // sait pas à quelle école elle appartient.
      await tx.enrollment.create({
        data: { studentId: eleve.id, classId: klass.id, academicYear: "2026-2027" },
      });
      c.schoolId = ecole.id; c.classId = klass.id; c.studentId = eleve.id;
    });
    ok(`compte ${c.nom} créé dans Supabase et rattaché à « ${c.ecole} »`);
  }

  // Le compte est-il RÉELLEMENT chez Supabase, et non seulement dans notre base ?
  for (const c of [A, B]) {
    const { data } = await admin.auth.admin.getUserById(c.authId!);
    check(data?.user?.email === c.email, `compte ${c.nom} — présent dans Supabase Auth (${c.email})`);
    const lien = await prisma.user.findUnique({ where: { id: c.authId! }, select: { schoolId: true } });
    check(lien?.schoolId === c.schoolId, `compte ${c.nom} — rattaché à SON établissement, et à un seul`);
  }

  /* ═══════ 4. CONNEXION RÉELLE ═══════ */
  console.log("\n═══ 4. CONNEXION PAR LE VRAI FORMULAIRE ═══\n");

  for (const c of [A, B]) {
    try {
      c.cookies = await sessionCookies(c.email, c.motDePasse);
      ok(`compte ${c.nom} — signInWithPassword ouvre une session applicative`);
    } catch (e) {
      fail(`compte ${c.nom} — connexion impossible`, e instanceof Error ? e.message : String(e));
    }
  }

  /* ═══════ 5. A → A ET B → B ═══════ */
  console.log("\n═══ 5. CHACUN CHEZ SOI ═══\n");

  // ⚠️ Tant que l'installation n'est pas terminée, le tableau de bord doit
  // renvoyer vers elle : c'est l'entonnoir du chantier PLG, et il doit tenir
  // pour un compte tout neuf — celui d'une personne du pilote, précisément.
  for (const c of [A, B]) {
    const avant = await visiter(c, "/dashboard");
    check(avant.statut >= 300 && avant.vers.includes("/onboarding"),
      `${c.nom} → installation non terminée : le tableau de bord renvoie vers /onboarding`,
      `HTTP ${avant.statut} → ${avant.vers || "aucune redirection"}`);
  }

  // Fixture : on marque l'installation comme terminée, ce que le formulaire
  // d'installation fait lui-même. Le parcours complet est déjà couvert par
  // `verify-plg-runtime.ts` ; le rejouer ici doublonnerait sans rien prouver.
  await prisma.school.updateMany({
    where: { id: { in: [A.schoolId!, B.schoolId!] } },
    data: { onboardingCompleted: true },
  });

  for (const c of [A, B]) {
    const bord = await visiter(c, "/dashboard");
    check(bord.statut === 200, `${c.nom} → son tableau de bord : autorisé`, `HTTP ${bord.statut} ${bord.vers}`);
    check(bord.corps.includes(c.ecole), `${c.nom} → l'écran porte le nom de SON établissement`);
    const fiche = await visiter(c, `/dashboard/students/${c.studentId}`);
    check(fiche.statut === 200 && fiche.corps.includes(`${TAG}-${c.nom}`), `${c.nom} → la fiche de SON élève : autorisée`, `HTTP ${fiche.statut}`);
    const classe = await visiter(c, `/dashboard/classes/${c.classId}`);
    check(classe.statut === 200, `${c.nom} → SA classe : autorisée`, `HTTP ${classe.statut}`);
  }

  /* ═══════ 6. A → B ET B → A ═══════ */
  console.log("\n═══ 6. CHEZ L'AUTRE — TOUT DOIT ÊTRE REFUSÉ ═══\n");

  const croise = async (moi: Compte, autre: Compte) => {
    // ⚠️ Identifiants RÉELS de l'autre école, pas devinés : c'est le pire cas.
    // Une fuite d'identifiant (URL partagée, capture d'écran) suffit à le créer.
    const cas: [string, string][] = [
      [`la fiche de l'élève de ${autre.nom}`, `/dashboard/students/${autre.studentId}`],
      [`le dossier numérique de l'élève de ${autre.nom}`, `/dashboard/students/${autre.studentId}/dossier`],
      [`la classe de ${autre.nom}`, `/dashboard/classes/${autre.classId}`],
      [`la modification de la classe de ${autre.nom}`, `/dashboard/classes/${autre.classId}/edit`],
    ];
    for (const [quoi, chemin] of cas) {
      const r = await visiter(moi, chemin);
      const contenuFuite = r.statut === 200 && (r.corps.includes(`${TAG}-${autre.nom}`) || r.corps.includes(autre.ecole));
      check(!contenuFuite, `${moi.nom} → ${quoi} : REFUSÉ`, `HTTP ${r.statut}${r.vers ? ` → ${r.vers}` : ""} — contenu de l'autre école servi`);
    }
    // Un identifiant inventé ne doit pas se distinguer d'un identifiant interdit.
    const invente = await visiter(moi, `/dashboard/students/00000000-0000-4000-8000-000000000000`);
    const interdit = await visiter(moi, `/dashboard/students/${autre.studentId}`);
    check(invente.statut === interdit.statut,
      `${moi.nom} → « n'existe pas » et « pas le droit » répondent pareil`,
      `inventé ${invente.statut} · interdit ${interdit.statut}`);
  };
  await croise(A, B);
  await croise(B, A);

  /* ═══════ 7. LES DONNÉES DE L'AUTRE NE REMONTENT NULLE PART ═══════ */
  console.log("\n═══ 7. AUCUNE TRACE DE L'AUTRE DANS SES PROPRES ÉCRANS ═══\n");

  for (const [moi, autre] of [[A, B], [B, A]] as [Compte, Compte][]) {
    for (const [quoi, chemin] of [
      ["la liste des élèves", "/dashboard/students"],
      ["la liste des classes", "/dashboard/classes"],
      ["le centre documentaire", "/dashboard/documents/centre"],
      ["les rapports", "/dashboard/reports"],
      ["l'équipe", "/dashboard/team"],
    ] as [string, string][]) {
      const r = await visiter(moi, chemin);
      const fuite = r.corps.includes(`${TAG}-${autre.nom}`) || r.corps.includes(autre.ecole) || r.corps.includes(autre.email);
      check(!fuite, `${moi.nom} → ${quoi} : rien de l'école ${autre.nom}`, `HTTP ${r.statut}`);
    }
  }

  /* ═══════ 8. SANS SESSION, RIEN ═══════ */
  console.log("\n═══ 8. SANS SESSION ═══\n");

  const anonyme: Compte = { nom: "anonyme", email: "", motDePasse: "", ecole: "", cookies: [] };
  for (const chemin of [
    "/dashboard", "/dashboard/students", "/dashboard/classes", "/dashboard/payments",
    "/dashboard/team", "/dashboard/settings", "/dashboard/documents", "/onboarding",
    `/dashboard/students/${A.studentId}`, `/dashboard/classes/${A.classId}`,
  ]) {
    const r = await visiter(anonyme, chemin);
    check(r.statut >= 300 && r.statut < 400 && r.vers.includes("/login"),
      `sans session — ${chemin} renvoie vers la connexion`, `HTTP ${r.statut} → ${r.vers || "aucune redirection"}`);
  }

  const rate = await visiter(anonyme, "/auth/callback");
  check(rate.vers.includes("/login?erreur="), "un lien de confirmation incomplet mène à un message, pas à une page blanche", rate.vers);

  /* ═══════ 9. RLS — LA CLÉ PUBLIQUE NE VOIT RIEN ═══════ */
  console.log("\n═══ 9. RLS — LA CLÉ PUBLIQUE NE VOIT NI A NI B ═══\n");

  for (const c of [A, B]) {
    for (const table of ["School", "Student", "User"]) {
      const r = await fetch(`${URL_}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const corps = await r.text();
      const vu = corps.includes(c.ecole) || corps.includes(`${TAG}-${c.nom}`);
      check(!vu && r.status !== 200, `clé publique → ${table} : refusé (école ${c.nom} invisible)`, `HTTP ${r.status} ${corps.slice(0, 90)}`);
    }
  }
}

async function nettoyer() {
  console.log("\n═══ NETTOYAGE ═══\n");
  const admin = createAdminClient();
  for (const c of [A, B]) {
    if (c.schoolId) await prisma.school.delete({ where: { id: c.schoolId } }).catch(() => {});
    if (c.authId) await admin.auth.admin.deleteUser(c.authId).catch(() => {});
  }
  // Les comptes créés par les essais de la section 1 et 2 (s'ils ont abouti).
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const u of data.users) {
    if ((u.email ?? "").startsWith(TAG.toLowerCase())) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }

  /**
   * ⚠️ Les sections 1 et 2 créent une école EN PASSANT PAR LE VRAI FORMULAIRE :
   * son identifiant n'est donc ni dans `A` ni dans `B`, et la boucle ci-dessus
   * ne supprimait que son compte Supabase. Chaque exécution laissait une école
   * orpheline en base — constaté le 19 août 2026 avec « SONDEPIL Gamma 283226 ».
   *
   * La suppression est bornée au préfixe de sonde, qui n'appartient à aucun
   * établissement réel. C'est une cascade (règle 4 du projet) : on compte donc
   * ce qui est rattaché AVANT de supprimer, et on le dit.
   */
  const orphelines = await prisma.school.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true, name: true, _count: { select: { students: true, users: true, classes: true } } },
  });
  for (const o of orphelines) {
    console.log(`      purge « ${o.name} » — ${o._count.students} élève(s), ${o._count.users} compte(s), ${o._count.classes} classe(s)`);
    await prisma.school.delete({ where: { id: o.id } }).catch(() => {});
  }
  const restesEcoles = await prisma.school.count({ where: { name: { startsWith: TAG } } });
  const restesEleves = await prisma.student.count({ where: { firstName: { startsWith: TAG } } });
  const { data: apres } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const restesComptes = apres.users.filter((u) => (u.email ?? "").startsWith(TAG.toLowerCase())).length;
  check(restesEcoles + restesEleves + restesComptes === 0,
    "toutes les fixtures de sonde ont été retirées",
    `${restesEcoles} école(s), ${restesEleves} élève(s), ${restesComptes} compte(s)`);
}

main()
  .catch((e) => fail(`la sonde s'est interrompue : ${e instanceof Error ? e.message : String(e)}`))
  .then(nettoyer)
  .catch((e) => fail(`le nettoyage a échoué : ${e instanceof Error ? e.message : String(e)}`))
  .finally(async () => {
    for (const d of dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } }
    await prisma.$disconnect();
    console.log(`\n${"═".repeat(74)}`);
    console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoué(s), ${nonProuves} NON PROUVÉ(S)`);
    console.log("═".repeat(74));
    process.exit(failures ? 1 : 0);
  });
