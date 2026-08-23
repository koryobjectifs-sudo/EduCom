/**
 * Sonde RUNTIME du poste de commandement (tableau de bord).
 *
 *   npm run script -- scripts/verify-dashboard-command.ts
 *   MODE=empty  npm run script -- scripts/verify-dashboard-command.ts
 *   SHOT_DIR=/chemin  … pour conserver les captures
 *
 * Elle crée de vraies fixtures (élèves, classes, factures échues, notes sur deux
 * trimestres, parents sans téléphone, messages, documents), ouvre une **vraie
 * session**, lit le HTML servi, pilote Chrome à 1440 × 900 puis 1024 × 800,
 * éprouve `prefers-reduced-motion`, **puis supprime tout dans son `finally`**.
 *
 * ⚠️ Ce qu'elle garde sous surveillance, et pourquoi :
 *   · aucune fiction réintroduite — pas de « 98 % » de présence, pas de « IA » ;
 *   · la présence reste déclarée non suivie, avec sa raison à l'écran ;
 *   · les dix destinations de CTA répondent 200 (des liens morts avaient été
 *     livrés au lot 06 : `/payments` sans le préfixe `/dashboard`) ;
 *   · aucun bloc laissé à `opacity: 0` en mouvement réduit — le défaut trouvé
 *     le 21 août, où six sections restaient invisibles sous la ligne de
 *     flottaison.
 *
 * ⚠️ Interrompue (Ctrl-C), elle ne joue pas son `finally` et laisse ses fixtures
 * en base — même piège que les autres vérificateurs à fixtures.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { CDP, chromeAvailable, launchChrome, waitFor, shot, sessionCookies } from "./_cdp";

const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR!;
const MODE = process.env.MODE ?? "full";
const TAG = "CMDPROBE";
const PASSWORD = `Cmd-${Math.random().toString(36).slice(2)}-26!`;
const YEAR = "2025-2026";

const trash = {
  authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], invoiceIds: [] as string[], termIds: [] as string[],
  subjectIds: [] as string[], docIds: [] as string[], msgIds: [] as string[],
};
let ko = 0;
const check = (c: boolean, l: string) => { if (!c) ko++; console.log(`  ${c ? "✓" : "✗"} ${l}`); };

async function main() {
  if (!chromeAvailable()) throw new Error("Chrome introuvable");
  const admin = createAdminClient();
  const school = await prisma.school.findFirst({ where: { onboardingCompleted: true }, select: { id: true, name: true } });
  if (!school) throw new Error("aucune école");
  const schoolId = school.id;

  const email = `${TAG.toLowerCase()}.${Date.now()}@sonde.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(String(error?.message));
  trash.authIds.push(data.user.id);
  await prisma.user.create({ data: { id: data.user.id, email, firstName: "Aminata", lastName: "Diop", role: "OWNER", schoolId } });
  trash.userIds.push(data.user.id);
  const actorId = data.user.id;

  if (MODE === "full") {
    // ── Enseignants, dont un affecté à une classe ──
    const teacher = await prisma.user.create({
      data: { email: `${TAG}.prof.${Date.now()}@sonde.invalid`, firstName: `${TAG}-Moussa`, lastName: "Fall", role: "TEACHER", schoolId, phone: "77 111 22 33" },
      select: { id: true },
    });
    trash.userIds.push(teacher.id);

    // ── Deux classes de sonde ──
    const cls: { id: string; name: string }[] = [];
    for (const [name, withTeacher] of [["6e B", true], ["CM2", false]] as const) {
      const c = await prisma.class.create({
        data: { name: `${TAG} ${name}`, cycle: name.startsWith("6") ? "COLLEGE" : "ELEMENTAIRE", schoolId, teacherId: withTeacher ? teacher.id : null },
        select: { id: true, name: true },
      });
      trash.classIds.push(c.id); cls.push(c);
    }

    // ── Parents : 4 joignables, 2 sans téléphone (donnée réelle et actionnable) ──
    const parents: string[] = [];
    for (let i = 0; i < 6; i++) {
      const p = await prisma.user.create({
        data: {
          email: `${TAG}.parent${i}.${Date.now()}@sonde.invalid`,
          firstName: `${TAG}-Parent${i}`, lastName: "Ndiaye", role: "PARENT", schoolId,
          phone: i < 4 ? `77 000 00 0${i}` : null,
        }, select: { id: true },
      });
      trash.userIds.push(p.id); parents.push(p.id);
    }

    // ── 12 élèves inscrits, 2 dossiers en attente ──
    const students: string[] = [];
    for (let i = 0; i < 12; i++) {
      const s = await prisma.student.create({
        data: { firstName: `${TAG}-Élève${i}`, lastName: "Sow", schoolId, status: "ENROLLED", parentId: parents[i % parents.length] },
        select: { id: true },
      });
      trash.studentIds.push(s.id); students.push(s.id);
      await prisma.enrollment.create({ data: { studentId: s.id, classId: cls[i % 2].id, academicYear: YEAR } });
    }
    for (let i = 0; i < 2; i++) {
      const s = await prisma.student.create({
        data: { firstName: `${TAG}-Candidat${i}`, lastName: "Ba", schoolId, status: "PENDING" }, select: { id: true },
      });
      trash.studentIds.push(s.id);
    }

    // ── Factures : 8 payées, 4 échues non soldées ──
    const now = Date.now();
    for (let i = 0; i < 12; i++) {
      const late = i >= 8;
      const inv = await prisma.invoice.create({
        data: {
          title: `${TAG} Scolarité ${late ? "novembre" : "octobre"}`,
          totalAmount: 45000, status: late ? "PENDING" : "PAID",
          dueDate: new Date(now + (late ? -12 : 20) * 864e5),
          schoolId, studentId: students[i], parentId: parents[i % parents.length],
        }, select: { id: true },
      });
      trash.invoiceIds.push(inv.id);
      if (!late) await prisma.payment.create({ data: { amount: 45000, method: "CASH", invoiceId: inv.id, schoolId } });
    }

    // ── Deux trimestres, deux matières, des notes réelles pour la moyenne ──
    const t1 = await prisma.term.create({ data: { name: `${TAG} 1er Trimestre`, schoolId, startDate: new Date(now - 150 * 864e5), endDate: new Date(now - 80 * 864e5) }, select: { id: true } });
    const t2 = await prisma.term.create({ data: { name: `${TAG} 2e Trimestre`, schoolId, startDate: new Date(now - 70 * 864e5), endDate: new Date(now + 10 * 864e5) }, select: { id: true } });
    trash.termIds.push(t1.id, t2.id);

    const subjects: { id: string; name: string }[] = [];
    for (const name of ["Mathématiques", "Français"]) {
      const s = await prisma.subject.create({ data: { name: `${TAG} ${name}`, schoolId }, select: { id: true, name: true } });
      trash.subjectIds.push(s.id); subjects.push(s);
    }

    // Maths baisse en 6e B, Français progresse en CM2 — mouvements RÉELS,
    // calculés par différence de moyennes, pas écrits en dur.
    for (const [ti, term] of [[0, t1], [1, t2]] as const) {
      for (const [si, subj] of subjects.entries()) {
        for (const [ci, c] of cls.entries()) {
          const base = si === 0 && ci === 0 ? (ti === 0 ? 14 : 11) : si === 1 && ci === 1 ? (ti === 0 ? 11 : 14.5) : 13;
          for (let k = 0; k < 6; k++) {
            await prisma.grade.create({
              data: {
                value: Math.min(20, Math.max(0, base + ((k % 3) - 1))), max: 20, coefficient: si === 0 ? 2 : 1,
                type: "EXAM", date: new Date(now - (ti === 0 ? 100 : 20) * 864e5),
                studentId: students[(ci * 6 + k) % students.length], classId: c.id,
                subjectId: subj.id, termId: term.id, teacherId: teacher.id,
              },
            });
          }
        }
      }
    }

    // ── Messages : 10 sortants dont 7 lus, 2 entrants ──
    for (let i = 0; i < 10; i++) {
      const m = await prisma.message.create({
        data: { direction: "OUTBOUND", content: `${TAG} circulaire ${i}`, status: i < 7 ? "READ" : "DELIVERED", schoolId, parentId: parents[i % parents.length] },
        select: { id: true },
      });
      trash.msgIds.push(m.id);
    }
    for (let i = 0; i < 2; i++) {
      const m = await prisma.message.create({
        data: { direction: "INBOUND", content: `${TAG} question ${i}`, status: "DELIVERED", schoolId, parentId: parents[i] },
        select: { id: true },
      });
      trash.msgIds.push(m.id);
    }

    // ── Un document publié, un en attente de validation ──
    for (const [title, status] of [["Circulaire de rentrée", "PUBLISHED"], ["Règlement révisé", "REVIEW"]] as const) {
      const d = await prisma.schoolDocument.create({
        data: {
          title: `${TAG} ${title}`, status: status as never, audience: "FAMILIES", scopeKind: "SCHOOL",
          storagePath: `${schoolId}/probe/${title}.pdf`, fileName: "doc.pdf", mimeType: "application/pdf",
          sizeBytes: 1024, academicYear: YEAR, createdById: actorId, schoolId,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        }, select: { id: true },
      });
      trash.docIds.push(d.id);
    }
    console.log("fixtures : 12 élèves, 2 classes, 12 factures (4 échues), 48 notes, 12 messages, 2 documents");
  } else {
    console.log("mode vide : aucune fixture, on observe l'écran tel que Kory le voit");
  }

  /* ═══════════ rendu réel ═══════════ */
  const cookies = await sessionCookies(email, PASSWORD);
  const Cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(`${BASE}/dashboard`, { headers: { Cookie } });
  const html = await res.text();
  console.log(`\n── HTML de /dashboard (${MODE}) ──`);
  check(res.status === 200, `répond 200 (reçu ${res.status})`);
  check(html.includes("Votre matinée"), "le brief est rendu");
  check(html.includes("À traiter"), "le centre d'attention est rendu");
  check(html.includes("Santé de l&#x27;école") || html.includes("Santé de l'école"), "la santé de l'école est rendue");
  check(html.includes("Aujourd&#x27;hui") || html.includes("Aujourd'hui"), "le bloc du jour est rendu");
  check(html.includes("Parents &amp; communication") || html.includes("Parents & communication"), "le bloc parents est rendu");
  check(html.includes("Activité récente"), "l'activité récente est rendue");

  console.log("\n── Aucune fiction réintroduite ──");
  check(!/98\s*%/.test(html), "pas de « 98 % » (ancien taux de présence en dur)");
  check(html.includes("suivi non activé"), "la présence est déclarée non activée, avec sa raison");
  check(!html.includes("Intelligence artificielle") && !html.includes(">IA<"), "le mot « IA » n'est pas affiché");

  if (MODE === "full") {
    console.log("\n── Les valeurs viennent bien des fixtures ──");
    check(html.includes("Paiements en retard"), "les impayés remontent en urgent");
    check(html.includes("Familles injoignables"), "les 2 familles sans téléphone sont détectées");
    check(html.includes("Classes sans enseignant"), "la classe sans enseignant est détectée");
    check(/Admissions à valider/.test(html), "les 2 admissions en attente remontent");
    check(html.includes("sur 100"), "le score global est publié (≥ 3 axes mesurés)");
    check(!html.includes("Aucune note n&#x27;a encore été saisie") && !html.includes("Aucune note n'a encore été saisie"), "la moyenne académique est calculée");
    // ⚠️ Régression du 21 août : un trimestre sans dates devenait « courant »
    // (les NULL sortent en dernier d'un ORDER BY ASC sous Postgres) et effaçait
    // la moyenne réelle. La base de travail en contient un, nommé « T1 ».
    check(!html.includes("Aucune note exploitable"), "aucun trimestre sans dates ne vole la place du trimestre courant");
  } else {
    console.log("\n── L'écran vide reste honnête ──");
    check(html.includes("axe") && html.includes("mesuré"), "la santé bascule en vue sans score");
  }

  console.log("\n── Toutes les destinations des CTA existent ──");
  for (const path of [
    "/dashboard/reports?dept=finance", "/dashboard/reports?dept=teaching",
    "/dashboard/communications", "/dashboard/classes", "/dashboard/students",
    "/dashboard/payments", "/dashboard/documents", "/dashboard/documents/centre",
    "/dashboard/documents/validation", "/dashboard/team",
  ]) {
    const r = await fetch(`${BASE}${path}`, { headers: { Cookie }, redirect: "manual" });
    check(r.status === 200, `${path} → ${r.status}`);
  }

  const profile = mkdtempSync(join(tmpdir(), "cmd-"));
  const launched = await launchChrome(Number(process.env.CDP_PORT ?? 9460), profile);
  if (!launched) throw new Error("Chrome n'a pas démarré");
  const { chrome, wsUrl } = launched;
  const cdp = await CDP.open(wsUrl);
  const t = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const a = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const session = a.sessionId;
  await cdp.send("Page.enable", {}, session);
  await cdp.send("Runtime.enable", {}, session);
  await cdp.send("Network.enable", {}, session);
  for (const c of cookies) await cdp.send("Network.setCookie", { name: c.name, value: c.value, domain: "localhost", path: "/" }, session);

  for (const [w, h, name] of [[1440, 900, "desktop"], [1280, 900, "laptop"], [1024, 800, "tablette"]] as const) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false }, session);
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `${BASE}/dashboard` }, session);
    await loaded;
    await waitFor(cdp, session, `!!document.querySelector('h1')`);
    // Laisser les apparitions se terminer avant de photographier.
    await new Promise((r) => setTimeout(r, 1800));
    const overflow = await cdp.send<{ result: { value: boolean } }>("Runtime.evaluate", {
      expression: "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1", returnByValue: true,
    }, session);
    check(overflow.result.value === false, `${name} ${w}px : aucun débordement horizontal`);

    /**
     * ⚠️ Le décompte du hero doit égaler le nombre de cartes affichées.
     * Le défaut de la première passe : « 1 point nécessite votre attention »
     * au-dessus de deux cartes, dont une bonne nouvelle.
     */
    const coherent = await cdp.send<{ result: { value: string } }>("Runtime.evaluate", {
      expression: `(() => {
        const h = [...document.querySelectorAll('h2')].find(x => /nécessite\\w* votre attention/.test(x.textContent||''));
        if (!h) return 'absent';
        const n = parseInt((h.textContent||'').match(/\\d+/)?.[0] ?? '-1', 10);
        const wrap = h.parentElement;
        const cards = wrap?.parentElement?.querySelector('ul')?.children.length ?? -1;
        if (n === cards) return 'ok';
        // Sinon le reste DOIT être annoncé explicitement.
        const more = wrap?.querySelector('a[href="#a-traiter"]');
        const m = parseInt((more?.textContent||'').match(/\\d+/)?.[0] ?? '-1', 10);
        return (m > 0 && m + cards === n) ? 'ok' : ('annoncé ' + n + ' / affiché ' + cards + ' / reste ' + m);
      })()`,
      returnByValue: true,
    }, session);
    check(
      coherent.result.value === "ok" || coherent.result.value === "absent",
      `${name} : décompte du hero cohérent (${coherent.result.value})`,
    );

    /** Aucun texte ne doit déborder de sa carte. */
    const spill = await cdp.send<{ result: { value: number } }>("Runtime.evaluate", {
      expression: `[...document.querySelectorAll('main *, section *')]
        .filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0).length`,
      returnByValue: true,
    }, session);
    check(spill.result.value === 0, `${name} : aucun texte ne déborde (${spill.result.value})`);
    console.log(`      → ${await shot(cdp, session, OUT, `${MODE}-${name}`)}`);
  }
  /* ── mouvement réduit : le contenu doit rester VISIBLE ── */
  console.log("\n── prefers-reduced-motion ──");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  }, session);
  const loaded2 = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: `${BASE}/dashboard` }, session);
  await loaded2;
  await waitFor(cdp, session, `!!document.querySelector('h1')`);
  await new Promise((r) => setTimeout(r, 800));
  const hidden = await cdp.send<{ result: { value: number } }>("Runtime.evaluate", {
    expression: `[...document.querySelectorAll('section, .rounded-surface')]
      .filter(el => el.getBoundingClientRect().height > 20 && parseFloat(getComputedStyle(el).opacity) < 0.9).length`,
    returnByValue: true,
  }, session);
  check(hidden.result.value === 0, `aucun bloc laissé invisible (${hidden.result.value} trouvé(s))`);
  console.log(`      → ${await shot(cdp, session, OUT, `${MODE}-mouvement-reduit`)}`);

  chrome.kill();
  console.log(ko === 0 ? "\nTOUT EST VERT\n" : `\n${ko} ÉCHEC(S)\n`);
}

main()
  .catch((e) => { ko++; console.error("ÉCHEC :", e.message); })
  .finally(async () => {
    const admin = createAdminClient();
    await prisma.grade.deleteMany({ where: { OR: [{ term: { id: { in: trash.termIds } } }, { class: { id: { in: trash.classIds } } }] } });
    await prisma.payment.deleteMany({ where: { invoiceId: { in: trash.invoiceIds } } });
    await prisma.invoice.deleteMany({ where: { id: { in: trash.invoiceIds } } });
    await prisma.message.deleteMany({ where: { id: { in: trash.msgIds } } });
    await prisma.schoolDocument.deleteMany({ where: { id: { in: trash.docIds } } });
    await prisma.term.deleteMany({ where: { id: { in: trash.termIds } } });
    await prisma.subject.deleteMany({ where: { id: { in: trash.subjectIds } } });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
    await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
    await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
    for (const id of trash.authIds) await admin.auth.admin.deleteUser(id);
    console.log("fixtures supprimées");
    await prisma.$disconnect();
    process.exit(ko === 0 ? 0 : 1);
  });
