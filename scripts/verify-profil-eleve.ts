/**
 * SONDE — fiche élève après la passe de présentation.
 *
 * Elle répond à quatre questions que la lecture du code ne tranche pas :
 *
 *   1. les six destinations existantes sont-elles TOUTES encore là, inchangées ?
 *   2. la borne de rôle tient-elle toujours — un enseignant voit-il l'élève
 *      SANS le bloc médical, et l'absence est-elle une non-génération et non un
 *      masquage CSS ?
 *   3. l'écran est-il utilisable au doigt et au clavier ?
 *   4. l'avatar recouvre-t-il encore le nom ?
 *
 * ⚠️ Le chevauchement est mesuré par les RECTANGLES, pas par l'œil : c'est le
 * défaut qui a survécu à trois relectures du source parce qu'il ne se voyait
 * qu'au rendu.
 *
 * Ne modifie rien du produit. École jetable, supprimée à la fin.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { CDP, chromeAvailable, launchChrome, evaluate, waitFor, sessionCookies } from "./_cdp";
import { createAdminClient } from "../src/lib/supabase/admin";

const PORT = Number(process.env.CDP_PORT ?? 9473);
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const TAG = "VERIFPROFIL";
const PASSWORD = `Verif-${Math.random().toString(36).slice(2)}-2026!`;
const SEUIL = 44;

const trash = {
  authIds: [] as string[], userIds: [] as string[], schoolIds: [] as string[],
  classIds: [] as string[], studentIds: [] as string[], invoiceIds: [] as string[], dirs: [] as string[],
};

let reussis = 0, echoues = 0;
const check = (bon: boolean, quoi: string, detail?: string) => {
  console.log(`  ${bon ? "✓" : "✗"} ${quoi}${detail ? `\n      ${detail}` : ""}`);
  bon ? reussis++ : echoues++;
};

/**
 * ⚠️ Attendre un COMPTE stable ne suffit pas.
 *
 * `Page.navigate` rend la main avant que le nouveau document existe. La
 * première évaluation portait donc sur la page PRÉCÉDENTE, dont le compteur
 * `__st.fois` était déjà au-dessus du seuil : la sonde repartait aussitôt et
 * lisait un DOM vide. C'est ce qui a fait croire qu'un enseignant ne voyait
 * plus la fiche, alors que le serveur avait bien exécuté ses huit requêtes.
 *
 * On exige donc EN PLUS un titre non vide — un signal que seule la nouvelle
 * page peut produire — et on remet le compteur à zéro à chaque document.
 */
const STABLE = `(() => {
  // ⚠️ DEUX pièges se cumulent ici, et chacun a produit un faux négatif.
  //
  // 1. \`Page.navigate\` rend la main avant l'existence du nouveau document : la
  //    première évaluation portait sur la page précédente, dont le compteur
  //    était déjà au-dessus du seuil.
  // 2. \`/dashboard/students/loading.tsx\` couvre aussi \`[id]\`. Pendant que les
  //    requêtes tournent, Next diffuse ce SQUELETTE — qui contient des boutons
  //    et des liens en quantité stable. Un critère de comptage le prend pour la
  //    page rendue. C'est ce qui a fait croire qu'un enseignant ne voyait plus
  //    la fiche : on mesurait le squelette, pas le contenu.
  //
  // On exige donc le contenu RÉEL de cette page : le titre de l'élève, ou le
  // message d'absence. Aucun squelette ne produit l'un ou l'autre.
  const h1 = document.querySelector("h1");
  const titre = h1 ? (h1.textContent || "").trim() : "";
  const absent = (document.body.innerText || "").includes("Élève introuvable");
  if (!titre && !absent) return false;
  const cle = location.href + "|" + titre;
  const n = document.querySelectorAll("button, a, td, li, h2").length;
  const s = (window.__st = window.__st || { n: -1, fois: 0, cle: "" });
  if (s.cle !== cle) { s.cle = cle; s.n = -1; s.fois = 0; }
  if (n === s.n) s.fois++; else { s.n = n; s.fois = 0; }
  return s.fois >= 5 && n > 0;
})()`;

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE — fiche élève");
  console.log("═".repeat(74));

  if (!chromeAvailable()) throw new Error("Chrome introuvable");
  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up?.ok) throw new Error(`application injoignable sur ${BASE}`);

  const admin = createAdminClient();
  const stamp = Date.now();
  const school = await prisma.school.create({ data: { name: `${TAG} École`, onboardingCompleted: true }, select: { id: true } });
  trash.schoolIds.push(school.id);

  const mk = async (prenom: string, role: "OWNER" | "TEACHER" | "PARENT") => {
    const e = `${TAG.toLowerCase()}.${prenom.toLowerCase()}.${stamp}@sonde.invalid`;
    const { data } = await admin.auth.admin.createUser({ email: e, password: PASSWORD, email_confirm: true });
    if (!data?.user) throw new Error(`compte ${prenom}`);
    trash.authIds.push(data.user.id);
    await prisma.user.create({
      data: { id: data.user.id, email: e, firstName: prenom, lastName: TAG, role, schoolId: school.id, phone: "+221 77 512 44 08" },
    });
    trash.userIds.push(data.user.id);
    return { id: data.user.id, email: e };
  };
  const directrice = await mk("Aissatou", "OWNER");
  const prof = await mk("Moussa", "TEACHER");
  const parent = await mk("Ibrahima", "PARENT");

  // L'enseignant est titulaire de la classe de l'élève : il DOIT voir la fiche,
  // sans quoi le contrôle « il ne voit pas le médical » serait creux.
  const classes = await prisma.class.createManyAndReturn({
    data: [
      { name: "CM2 A", cycle: "ELEMENTAIRE", schoolId: school.id, teacherId: prof.id },
      { name: "CM1 B", cycle: "ELEMENTAIRE", schoolId: school.id },
    ],
    select: { id: true },
  });
  for (const c of classes) trash.classIds.push(c.id);

  const student = await prisma.student.create({
    data: {
      firstName: "Aminata", lastName: "Ndiaye", schoolId: school.id, status: "ENROLLED",
      dateOfBirth: new Date("2014-03-12"), address: "Villa 42, Cité Keur Gorgui, Dakar",
      bloodGroup: "O+", medicalNotes: "SECRETMEDICAL Allergie aux arachides.",
      emergencyContact: "Ibrahima Ndiaye (père)", emergencyPhone: "+221 77 512 44 08",
      parentId: parent.id,
    },
    select: { id: true },
  });
  trash.studentIds.push(student.id);

  const an = new Date().getFullYear();
  await prisma.enrollment.createMany({
    data: [
      { studentId: student.id, classId: classes[0].id, academicYear: `${an}-${an + 1}` },
      { studentId: student.id, classId: classes[1].id, academicYear: `${an - 1}-${an}` },
    ],
  });
  const f = await prisma.invoice.createManyAndReturn({
    data: [{ title: "Scolarité", totalAmount: 150_000, status: "PENDING", dueDate: new Date(), schoolId: school.id, studentId: student.id }],
    select: { id: true },
  });
  for (const i of f) trash.invoiceIds.push(i.id);

  const profile = mkdtempSync(join(tmpdir(), "cdp-vp-"));
  trash.dirs.push(profile);
  const launched = await launchChrome(PORT, profile);
  if (!launched) throw new Error("Chrome n'a pas ouvert DevTools");
  const { chrome, wsUrl } = launched;
  const cdp = await CDP.open(wsUrl);

  const cibles = new Map<string, string>();  // session -> target, pour réactiver
  const ouvrir = async (email: string) => {
    const cookies = await sessionCookies(email, PASSWORD);
    const t = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const a = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: t.targetId, flatten: true });
    const s = a.sessionId;
    await cdp.send("Page.enable", {}, s);
    await cdp.send("Runtime.enable", {}, s);
    await cdp.send("Network.enable", {}, s);
    await cdp.send("Network.clearBrowserCookies", {}, s);
    for (const c of cookies) await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, s);
    cibles.set(s, t.targetId);
    return s;
  };
  /**
   * ⚠️ Chrome GÈLE le rendu des onglets d'arrière-plan. Dès qu'un second onglet
   * est ouvert (la session enseignant), React n'hydrate plus le premier : ses
   * gestionnaires ne sont jamais attachés, et toute interaction y semble morte.
   * Il faut donc remettre l'onglet au premier plan avant de l'actionner.
   */
  const auPremierPlan = async (s: string) => {
    const t = cibles.get(s);
    if (t) await cdp.send("Target.activateTarget", { targetId: t });
  };
  const poser = async (s: string, w: number, h: number, tactile: boolean) => {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: tactile, maxTouchPoints: 5 }, s);
    await cdp.send("Emulation.setEmitTouchEventsForMouse", { enabled: tactile, configuration: tactile ? "mobile" : "desktop" }, s);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: tactile }, s);
  };
  const aller = async (s: string) => {
    await cdp.send("Page.navigate", { url: `${BASE}/dashboard/students/${student.id}` }, s);
    return waitFor(cdp, s, STABLE, 40_000);
  };

  const sOwner = await ouvrir(directrice.email);

  /* ═══ 1. LES SIX DESTINATIONS ═══ */
  console.log("\n═══ 1. DESTINATIONS EXISTANTES ═══\n");
  await poser(sOwner, 1440, 900, false);
  await aller(sOwner);

  const ATTENDUES: [string, string][] = [
    ["/dashboard/students", "retour"],
    [`/dashboard/students/${student.id}/dossier`, "Dossier"],
    [`/dashboard/documents/certificate?studentId=${student.id}`, "Certificat"],
    [`/dashboard/grades/report-card?studentId=${student.id}`, "Bulletin"],
    [`/dashboard/payments/invoice?studentId=${student.id}`, "Facturer + Créer"],
  ];
  for (const [href, nom] of ATTENDUES) {
    const n = await evaluate<number>(cdp, sOwner, `document.querySelectorAll('a[href="${href}"]').length`);
    check(n >= 1, `destination conservée — ${nom}`, `${n} lien(s) vers ${href}`);
  }
  const nFacturer = await evaluate<number>(cdp, sOwner,
    `document.querySelectorAll('a[href="/dashboard/payments/invoice?studentId=${student.id}"]').length`);
  check(nFacturer === 2, "« Facturer » ET « Créer » sont tous deux présents", `${nFacturer} liens (2 attendus)`);

  const h1 = await evaluate<string>(cdp, sOwner, `(document.querySelector("h1")||{}).textContent || ""`);
  check(h1.trim() === "Aminata Ndiaye", "le titre de page est le nom de l'élève", `« ${h1.trim()} »`);

  /* ═══ 2. CHEVAUCHEMENT AVATAR / NOM ═══ */
  console.log("\n═══ 2. L'AVATAR RECOUVRE-T-IL LE NOM ? ═══\n");
  for (const [nom, w, h, tac] of [["bureau", 1440, 900, false], ["tablette", 768, 1024, true], ["mobile", 390, 844, true]] as const) {
    await poser(sOwner, w, h, tac);
    await aller(sOwner);
    const r = await evaluate<{ chevauche: boolean; av: string; ti: string }>(cdp, sOwner, `(() => {
      const t = document.querySelector("h1");
      const a = [...document.querySelectorAll("span")].find(e => /^[A-ZÀ-Ý]{2}$/.test((e.textContent||"").trim()) && e.getBoundingClientRect().width > 40);
      if (!t || !a) return { chevauche: false, av: "introuvable", ti: "introuvable" };
      const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect();
      const chevauche = ra.right > rt.left + 1 && ra.left < rt.right - 1 && ra.bottom > rt.top + 1 && ra.top < rt.bottom - 1;
      return {
        chevauche,
        av: Math.round(ra.left) + "→" + Math.round(ra.right),
        ti: Math.round(rt.left) + "→" + Math.round(rt.right),
      };
    })()`);
    check(!r.chevauche, `${nom} — l'avatar ne recouvre pas le nom`, `avatar ${r.av} · titre ${r.ti}`);
  }

  /* ═══ 3. TACTILE ═══ */
  console.log("\n═══ 3. AU DOIGT — 390 × 844 ═══\n");
  await poser(sOwner, 390, 844, true);
  await aller(sOwner);
  const coarse = await evaluate<boolean>(cdp, sOwner, `matchMedia("(pointer: coarse)").matches`);
  check(coarse, "l'émulation tactile est RÉELLEMENT active");

  const tactile = await evaluate<{ total: number; sous: string[]; invisibles: string[]; deborde: boolean }>(cdp, sOwner, `(() => {
    const sous = [], invisibles = [];
    const liens = [...document.querySelectorAll("main a, main button")];
    for (const el of liens) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const nom = (el.getAttribute("aria-label") || (el.textContent||"").trim() || el.tagName).slice(0, 24);
      if (r.height < ${SEUIL} - 0.5) sous.push(nom + " (" + Math.round(r.width) + "×" + Math.round(r.height) + ")");
      const st = getComputedStyle(el);
      if (parseFloat(st.opacity) < 0.99) invisibles.push(nom + " opacité " + st.opacity);
    }
    return {
      total: liens.length, sous, invisibles,
      deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  })()`);
  console.log(`      ${tactile.total} commandes mesurées dans le contenu`);
  check(tactile.sous.length === 0, `les commandes atteignent ${SEUIL} px au doigt`,
    tactile.sous.length ? `sous le seuil : ${tactile.sous.join(" · ")}` : undefined);
  check(tactile.invisibles.length === 0, "aucune commande n'est atténuée ou masquée au repos",
    tactile.invisibles.length ? tactile.invisibles.join(" · ") : undefined);
  check(!tactile.deborde, "aucun débordement horizontal à 390 px");

  for (const [nom, w, h] of [["tablette 768", 768, 1024], ["bureau 1440", 1440, 900]] as const) {
    await poser(sOwner, w, h, w < 1024);
    await aller(sOwner);
    const d = await evaluate<boolean>(cdp, sOwner,
      `document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`);
    check(!d, `aucun débordement horizontal — ${nom}`);
  }

  /* ═══ 4. CLAVIER ═══ */
  console.log("\n═══ 4. AU CLAVIER — 1440 × 900 ═══\n");
  await poser(sOwner, 1440, 900, false);
  await aller(sOwner);
  await evaluate(cdp, sOwner, `(() => { document.body.setAttribute("tabindex","-1"); document.body.focus(); return 1; })()`);
  const sansAnneau: string[] = [];
  let atteints = 0, repetitions = 0, precedent = "";
  for (let i = 0; i < 40; i++) {
    for (const type of ["rawKeyDown", "keyUp"] as const) {
      await cdp.send("Input.dispatchKeyEvent", { type, key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sOwner);
    }
    const d = await evaluate<{ sig: string; ok: boolean; nom: string } | null>(cdp, sOwner, `(async () => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      // <nextjs-portal> est la surcouche du serveur de dev, pas le produit.
      if (el.tagName === "NEXTJS-PORTAL" || el.closest("nextjs-portal")) return null;
      // ⚠️ Laisser la transition finir : lue tout de suite, une opacité renvoie
      // sa valeur de DÉPART, et un focus correct passerait pour un défaut.
      await new Promise(r => setTimeout(r, 240));
      const st = getComputedStyle(el);
      const anneau = (parseFloat(st.outlineWidth) > 0 && st.outlineStyle !== "none")
        || (st.boxShadow && st.boxShadow !== "none")
        || (parseFloat(st.opacity) >= 0.99 && el.matches(":focus-visible"));
      return { sig: el.tagName + (el.getAttribute("href")||"") + (el.textContent||"").slice(0,14), ok: !!anneau,
               nom: (el.getAttribute("aria-label") || (el.textContent||"").trim() || el.tagName).slice(0, 28) };
    })()`);
    if (!d) continue;
    if (d.sig === precedent) { if (++repetitions > 3) break; } else repetitions = 0;
    precedent = d.sig;
    atteints++;
    if (!d.ok) sansAnneau.push(d.nom);
  }
  console.log(`      ${atteints} éléments atteints au Tab`);
  check(atteints >= 8, "la tabulation parcourt l'écran", `${atteints} éléments`);
  check(sansAnneau.length === 0, "chaque élément focalisé montre un indicateur",
    sansAnneau.length ? [...new Set(sansAnneau)].slice(0, 5).join(" · ") : undefined);

  /* ═══ 5. LA BORNE DE RÔLE ═══ */
  console.log("\n═══ 5. PERMISSIONS — L'ENSEIGNANT ═══\n");
  const sProf = await ouvrir(prof.email);
  // ⚠️ Chrome ne rend pas un onglet d'arrière-plan : sans cette activation, la
  // sonde mesure un DOM vide et conclut que l'enseignant ne voit plus la fiche.
  // C'est exactement le faux positif observé après l'ajout de la section photo,
  // qui a introduit une seconde cible et laissé celle-ci derrière.
  await auPremierPlan(sProf);
  await poser(sProf, 1440, 900, false);
  const rendu = await aller(sProf);
  const vueProf = await evaluate<{ h1: string; fuite: boolean; sang: boolean; urgence: boolean; mention: boolean }>(cdp, sProf, `(() => {
    const src = document.documentElement.outerHTML;
    return {
      h1: (document.querySelector("h1")||{}).textContent || "",
      // ⚠️ On cherche dans la SOURCE, pas à l'écran : un bloc masqué en CSS
      // resterait lisible par qui sait ouvrir l'inspecteur.
      fuite: src.includes("SECRETMEDICAL"),
      sang: src.includes("Groupe sanguin") || src.includes("GROUPE SANGUIN"),
      urgence: /urgence/i.test(src),
      mention: /relèvent du secr[ée]tariat/i.test(src),
    };
  })()`);
  check(rendu && vueProf.h1.trim() === "Aminata Ndiaye", "l'enseignant titulaire voit bien la fiche", `« ${vueProf.h1.trim()} »`);
  check(!vueProf.fuite, "les notes médicales ne sont PAS dans la source servie à l'enseignant");
  check(!vueProf.sang, "le groupe sanguin n'est PAS dans la source servie à l'enseignant");
  check(vueProf.mention, "la vue partielle est annoncée, pas silencieuse");
  check(vueProf.urgence, "le contact d'urgence reste accessible à l'enseignant");

  /* ═══ 6. PHOTO DE L'ÉLÈVE — DE BOUT EN BOUT ═══ */
  console.log("\n═══ 6. PHOTO — ENVOI RÉEL ═══\n");
  await auPremierPlan(sOwner);
  await poser(sOwner, 1440, 900, false);
  await aller(sOwner);

  const avantBouton = await evaluate<{ bouton: boolean; img: boolean }>(cdp, sOwner, `({
    bouton: !!document.querySelector('button[aria-label*="photo de l"]'),
    img: !!document.querySelector('img[alt*="Photo de"]'),
  })`);
  check(avantBouton.bouton, "l'avatar est une commande pour la direction");
  check(!avantBouton.img, "aucune photo au départ (l'élève vient d'être créé)");

  // Une vraie image PNG 2×2, écrite sur disque puis poussée dans le champ.
  const pngPath = join(tmpdir(), `sonde-${Date.now()}.png`);
  writeFileSync(pngPath, Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4mBgYGBgYEBAA8AAv/EOPvKAAAAAElFTkSuQmCC",
    "base64"));

  // ⚠️ HYDRATATION. Le DOM stabilisé ne prouve PAS que React a attaché ses
  // gestionnaires : le HTML rendu au serveur contient déjà le formulaire et le
  // champ. Pousser le fichier avant l'hydratation ne déclenche donc AUCUN
  // `onChange`, et la sonde conclut à tort que l'envoi est cassé — c'est
  // exactement ce qui est arrivé sur le premier passage après un redémarrage.
  // On attend une preuve d'interactivité : le menu doit réagir au clic.
  const hydrate = await waitFor(cdp, sOwner, `(() => {
    const b = document.querySelector('button[aria-label*="photo de l"]');
    if (!b) return false;
    if (b.getAttribute("aria-expanded") === "true") return true;
    b.click();
    return b.getAttribute("aria-expanded") === "true";
  })()`, 20_000);
  check(hydrate, "la commande photo est hydratée (React a pris la main)");

  const doc = await cdp.send<{ root: { nodeId: number } }>("DOM.getDocument", { depth: -1 }, sOwner);
  const champ = await cdp.send<{ nodeId: number }>("DOM.querySelector",
    { nodeId: doc.root.nodeId, selector: 'input[type="file"][accept*="jpeg"]' }, sOwner);
  check(champ.nodeId > 0, "le champ d'import est présent dans le document");

  if (champ.nodeId > 0) {
    // ⚠️ On pousse le fichier dans le champ puis on déclenche `change` : c'est
    // le chemin réel du produit (soumission automatique au choix du fichier).
    await cdp.send("DOM.setFileInputFiles", { files: [pngPath], nodeId: champ.nodeId }, sOwner);
    await evaluate(cdp, sOwner,
      `(() => { const i = document.querySelector('input[type="file"][accept*="jpeg"]');
                i.dispatchEvent(new Event("change", { bubbles: true })); return 1; })()`);

    const arrivee = await waitFor(cdp, sOwner, `!!document.querySelector('img[alt*="Photo de"]')`, 25_000);
    check(arrivee, "la photo envoyée s'affiche sur la fiche");

    const enBase = await prisma.student.findUnique({ where: { id: student.id }, select: { photoPath: true } });
    check(!!enBase?.photoPath, "le CHEMIN est enregistré en base", enBase?.photoPath ?? "aucun");
    check(!!enBase?.photoPath?.includes(school.id), "le chemin est cloisonné par école");

    if (enBase?.photoPath) {
      const admin2 = createAdminClient();
      const dossier = enBase.photoPath.split("/").slice(0, -1).join("/");
      const { data: liste } = await admin2.storage.from("student-documents").list(dossier);
      check(!!liste && liste.length > 0, "le binaire est réellement dans le bucket privé",
        `${liste?.length ?? 0} objet(s) sous ${dossier}`);
    }

    // ⚠️ PREMIER JET FAUX, corrigé. Il exigeait que le chemin du bucket soit
    // absent de la source — or une URL signée Supabase CONTIENT le chemin,
    // suivi de son jeton (`/object/sign/<chemin>?token=…`). Le contrôle testait
    // donc une propriété impossible à tenir.
    //
    // La vraie garantie n'est pas le secret du chemin — il ne donne rien seul —
    // mais le fait que l'accès soit SIGNÉ et EXPIRANT plutôt que public.
    const lien = await evaluate<{ signe: boolean; publique: boolean; jeton: boolean }>(cdp, sOwner, `(() => {
      const img = document.querySelector('img[alt*="Photo de"]');
      const src = img ? img.getAttribute("src") || "" : "";
      return {
        signe: src.includes("/object/sign/"),
        publique: src.includes("/object/public/"),
        jeton: /[?&]token=/.test(src),
      };
    })()`);
    check(lien.signe && lien.jeton, "la photo est servie par une URL SIGNÉE à jeton");
    check(!lien.publique, "la photo n'est PAS exposée par une URL publique permanente");
  }
  rmSync(pngPath, { force: true });

  console.log("\n" + "═".repeat(74));
  console.log(`  ${reussis + echoues} contrôles — ${reussis} réussis, ${echoues} échoués`);
  console.log("═".repeat(74) + "\n");

  cdp.close(); chrome.kill();
}

main().catch((e) => { echoues++; console.error("  ⛔", e.message ?? e); }).finally(async () => {
  const admin = createAdminClient();
  await prisma.payment.deleteMany({ where: { invoiceId: { in: trash.invoiceIds } } });
  await prisma.invoice.deleteMany({ where: { id: { in: trash.invoiceIds } } });
  await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
  await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
  await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
  await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
  for (const id of trash.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  await prisma.school.deleteMany({ where: { id: { in: trash.schoolIds } } });
  for (const d of trash.dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* déjà parti */ } }
  const reste = await prisma.school.count({ where: { name: { startsWith: TAG } } });
  console.log(reste === 0 ? "  ✓ fixtures supprimées\n" : `  ✗ ${reste} résidu(s)\n`);
  await prisma.$disconnect();
});
