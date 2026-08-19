/**
 * Sonde de RENDU — lot 13.1, réserve 1.
 *
 *   npm run script -- scripts/verify-render-dossier.ts
 *
 * ⚠️ **Ni `tsc` ni un vérificateur statique ne prouvent un rendu.** Le lot 08 l'a
 * appris à ses dépens : neuf scripts verts, et l'écran répondait « Element type
 * is invalid ». Ce script demande les pages au serveur de développement **par
 * HTTP, avec une vraie session**, et lit le HTML qui revient.
 *
 * ⚠️ **Aucune route de test n'est ajoutée au dépôt.** Une sonde HTTP posée dans
 * `src/app` serait un contournement d'authentification laissé en production si
 * on oubliait de la retirer. On s'authentifie donc pour de bon : compte de sonde
 * créé dans Supabase Auth, cookies de session dérivés par la même bibliothèque
 * que l'application, puis suppression du compte.
 *
 * Prérequis : `next dev` doit tourner (http://localhost:3000).
 */
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/prisma";
import { createAdminClient } from "../src/lib/supabase/admin";
import { currentAcademicYear } from "../src/lib/studentFile";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";
const TAG = "SONDERENDU";
const PASSWORD = `Sonde-${Math.random().toString(36).slice(2)}-13.1!`;
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const trash = {
  authIds: [] as string[], userIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], reqIds: [] as string[],
};

/** Cookies de session, produits par la bibliothèque qui les lira côté serveur. */
async function cookieHeaderFor(email: string): Promise<string> {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`connexion impossible pour ${email} : ${error?.message}`);

  const jar = new Map<string, string>();
  const ssr = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => { for (const c of list) jar.set(c.name, c.value); },
    },
  });
  await ssr.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  if (jar.size === 0) throw new Error("aucun cookie de session produit");
  return [...jar].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; ");
}

async function get(path: string, cookie: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  const html = await r.text();
  // React insère `<!-- -->` entre deux nœuds de texte : « 3 / 4 » arrive découpé.
  // Sans cette normalisation, une sonde chercherait une chaîne qui n'existe dans
  // aucun HTML rendu par React et conclurait à tort à un chiffre absent.
  const text = html.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { status: r.status, html, text };
}

/** Les signatures d'échec React qui ne se voient pas dans un code HTTP. */
function reactBroken(html: string): string | null {
  for (const p of ["Element type is invalid", "Objects are not valid as a React child",
                   "Cannot read properties of undefined", "Unhandled Runtime Error",
                   "Application error: a server-side exception"]) {
    if (html.includes(p)) return p;
  }
  return null;
}

async function main() {
  console.log("═".repeat(74));
  console.log("  SONDE DE RENDU — DOSSIER ÉLÈVE (lot 13.1, réserve 1)");
  console.log("═".repeat(74) + "\n");

  const up = await fetch(`${BASE}/login`).catch(() => null);
  if (!up || !up.ok) { fail(`serveur de développement injoignable sur ${BASE} — lancez \`npm run dev\``); return; }
  ok(`serveur de développement joignable sur ${BASE}`);

  const admin = createAdminClient();
  const year = currentAcademicYear();
  // ⚠️ L'école doit avoir terminé son installation : `dashboard/layout.tsx`
  // redirige vers `/onboarding` sinon, et la sonde mesurerait une redirection
  // au lieu d'un rendu. Le piège a coûté un premier passage entièrement rouge.
  const school = await prisma.school.findFirst({
    where: { onboardingCompleted: true }, select: { id: true, name: true },
  });
  if (!school) { fail("aucune école n'a terminé son installation — le tableau de bord redirige vers /onboarding"); return; }

  const mk = async (role: string, tag: string) => {
    const email = `${TAG.toLowerCase()}.${tag}.${Date.now()}@sonde.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw new Error(`création du compte ${tag} : ${error?.message}`);
    trash.authIds.push(data.user.id);
    await prisma.user.create({
      data: { id: data.user.id, email, firstName: `${TAG}-${tag}`, lastName: "Sonde", role: role as never, schoolId: school.id },
    });
    trash.userIds.push(data.user.id);
    return { id: data.user.id, email };
  };

  const direction = await mk("OWNER", "direction");
  const prof = await mk("TEACHER", "prof");
  ok(`comptes de sonde créés dans « ${school.name} »`);

  const sienne = await prisma.class.create({ data: { name: `${TAG} classe du prof`, schoolId: school.id, teacherId: prof.id } });
  const autre = await prisma.class.create({ data: { name: `${TAG} autre classe`, schoolId: school.id } });
  trash.classIds.push(sienne.id, autre.id);

  const mkStudent = async (first: string, classId: string) => {
    const s = await prisma.student.create({
      data: { firstName: `${TAG}-${first}`, lastName: "Sonde", schoolId: school.id, status: "ENROLLED" },
      select: { id: true },
    });
    trash.studentIds.push(s.id);
    await prisma.enrollment.create({ data: { studentId: s.id, classId, academicYear: year } });
    return s.id;
  };
  const eleve = await mkStudent("Aminata", sienne.id);
  const eleveHors = await mkStudent("Ousmane", autre.id);

  // Checklist de sonde : une pièce reçue, une manquante, une expirée, une rejetée.
  const mkReq = async (label: string, category: string, validityMonths: number | null) => {
    const r = await prisma.documentRequirement.create({
      data: { label: `${TAG} ${label}`, category: category as never, schoolId: school.id, classId: sienne.id, validityMonths },
    });
    trash.reqIds.push(r.id);
    return r;
  };
  const rRecu = await mkReq("Extrait de naissance", "IDENTITE", null);
  const rManquant = await mkReq("Photo d'identité", "INSCRIPTION", null);
  const rExpire = await mkReq("Certificat médical", "SANTE", 12);
  const rRejete = await mkReq("Bulletin précédent", "SCOLARITE", null);

  const old = new Date(); old.setMonth(old.getMonth() - 13);
  const mkDoc = async (req: { id: string; category: string }, label: string, status: string, createdAt?: Date, note?: string) =>
    prisma.studentDocument.create({
      data: {
        studentId: eleve, requirementId: req.id, label: `${TAG} ${label}`, category: req.category as never,
        storagePath: `${school.id}/${eleve}/sonde/${label}.pdf`, fileName: `${label}.pdf`,
        mimeType: "application/pdf", sizeBytes: 128, status: status as never, academicYear: year,
        uploadedById: direction.id, schoolId: school.id, reviewNote: note ?? null,
        ...(createdAt ? { createdAt } : {}),
      },
    });
  await mkDoc(rRecu, "acte de naissance", "VALIDATED");
  await mkDoc(rExpire, "certificat 2025", "VALIDATED", old);
  await mkDoc(rRejete, "bulletin illisible", "REJECTED", undefined, "Photo floue, page manquante.");
  ok("jeu d'essai : 4 exigées — 1 validée, 1 manquante, 1 expirée, 1 rejetée");

  /* ═══════ 1. DIRECTION — LES TROIS ÉCRANS ═══════ */
  console.log("\n═══ 1. DIRECTION — RENDU DES TROIS ÉCRANS ═══\n");

  const cd = await cookieHeaderFor(direction.email);
  ok("session ouverte (cookies dérivés par @supabase/ssr, comme en navigateur)");

  const annuaire = await get("/dashboard/students", cd);
  check(annuaire.status === 200, `annuaire des élèves → HTTP ${annuaire.status}`);
  check(annuaire.html.includes(`${TAG}-Aminata`), "l'élève de sonde apparaît dans l'annuaire");

  const fiche = await get(`/dashboard/students/${eleve}`, cd);
  check(fiche.status === 200, `fiche élève → HTTP ${fiche.status}`);
  check(fiche.html.includes("Dossier"), "la fiche élève porte bien l'accès au Dossier");
  check(fiche.html.includes("Dossier Médical"), "la direction voit le bloc médical");

  const doss = await get(`/dashboard/students/${eleve}/dossier`, cd);
  check(doss.status === 200, `dossier élève → HTTP ${doss.status}`);
  const broken = reactBroken(doss.html);
  check(broken === null, "aucune erreur React dans la page rendue", broken ?? undefined);
  check(!/Internal Server Error/i.test(doss.html), "aucune erreur serveur dans la page rendue");

  const sections: [string, string][] = [
    ["Identité", "Identité"],
    ["Scolarité", "Scolarité"],
    ["Complétude", "Complétude du dossier"],
    ["Documents manquants", "Documents manquants"],
    ["Documents exigés", "Documents exigés"],
    ["Historique", "Historique"],
  ];
  for (const [name, needle] of sections) check(doss.html.includes(needle), `section « ${name} » présente dans le HTML`);

  check(doss.html.includes(`${TAG} Extrait de naissance`), "une pièce reçue est affichée");
  check(doss.html.includes(`${TAG} Photo d&#x27;identité`) || doss.html.includes(`${TAG} Photo d'identité`),
    "la pièce jamais reçue est affichée parmi les manquantes");
  // Lot 14 — le point d'entrée du scan doit être RENDU, pas seulement écrit.
  check(doss.text.includes("Ajouter un document") && doss.text.includes("Scanner ou importer"),
    "le point d'entrée « Scanner ou importer » est rendu dans le dossier");
  check(doss.html.includes("Jamais reçues"), "le groupe « Jamais reçues » est rendu");
  check(doss.html.includes("Expirées"), "le groupe « Expirées » est rendu — l'expiration se voit à l'écran");
  check(doss.html.includes("Rejetées"), "le groupe « Rejetées » est rendu");
  check(doss.html.includes("Photo floue"), "le motif du rejet est lisible, il ne disparaît pas");
  check(/3 \/ 4/.test(doss.text) && /75 %/.test(doss.text),
    "la complétude affichée correspond au jeu d'essai (3 / 4 — 75 %)");

  /* ═══════ 2. ENSEIGNANT — PÉRIMÈTRE VISIBLE À L'ÉCRAN ═══════ */
  console.log("\n═══ 2. ENSEIGNANT — LE PÉRIMÈTRE SE VOIT ═══\n");

  const cp = await cookieHeaderFor(prof.email);
  const dp = await get(`/dashboard/students/${eleve}/dossier`, cp);
  check(dp.status === 200, `dossier d'un élève de SES classes → HTTP ${dp.status}`);
  check(reactBroken(dp.html) === null, "aucune erreur React dans la vue enseignant");
  check(dp.html.includes("Vue limitée"), "la vue partielle s'annonce à l'écran");
  check(!dp.html.includes(`${TAG} Certificat médical`), "la pièce de santé n'est PAS dans le HTML — pas masquée, absente");
  check(dp.html.includes(`${TAG} Bulletin précédent`), "la pièce pédagogique reste visible");
  check(dp.text.includes("Scanner ou importer"),
    "l'enseignant dispose aussi du scan, dans son périmètre — le lot 14 n'ouvre aucun droit nouveau");

  // ⚠️ Le code HTTP ne fait PAS foi ici. La route porte un `loading.tsx` : Next
  // ouvre le flux — et donc le code 200 — avant que `notFound()` ne soit atteint.
  // Ce qui compte est ce que la page contient : le bloc « introuvable », et
  // aucune donnée de l'élève. C'est aussi pour cela que le message ne dit pas
  // « accès refusé », qui confirmerait l'existence de l'élève.
  const dh = await get(`/dashboard/students/${eleveHors}/dossier`, cp);
  check(dh.text.includes("Page introuvable"),
    `dossier d'un élève HORS de ses classes → « Page introuvable » (HTTP ${dh.status}, flux déjà ouvert par loading.tsx)`);
  check(!dh.html.includes(`${TAG}-Ousmane`) && !dh.html.includes("Complétude du dossier"),
    "aucune donnée de cet élève n'entre dans la page — ni son nom, ni son dossier");

  const ap = await get("/dashboard/students", cp);
  check(ap.status === 200, `annuaire vu par l'enseignant → HTTP ${ap.status}`);
  check(ap.html.includes(`${TAG}-Aminata`) && !ap.html.includes(`${TAG}-Ousmane`),
    "l'annuaire de l'enseignant ne contient que les élèves de ses classes");

  const fp = await get(`/dashboard/students/${eleve}`, cp);
  check(fp.status === 200, `fiche élève vue par l'enseignant → HTTP ${fp.status}`);
  check(fp.html.includes("relèvent du secrétariat"), "les notes médicales sont remplacées par une mention explicite");

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
}

async function wipe() {
  const admin = createAdminClient();
  await prisma.studentDocument.deleteMany({ where: { studentId: { in: trash.studentIds } } });
  await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
  await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
  await prisma.documentRequirement.deleteMany({ where: { id: { in: trash.reqIds } } });
  await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
  await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
  for (const id of trash.authIds) await admin.auth.admin.deleteUser(id);
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    try {
      await wipe();
      const left = await prisma.student.count({ where: { firstName: { startsWith: TAG } } });
      const users = await prisma.user.count({ where: { firstName: { startsWith: TAG } } });
      console.log(left + users === 0
        ? "  ✓ comptes et fixtures de sonde supprimés — aucun résidu"
        : `  ✗ résidus : ${left} élève(s), ${users} compte(s)`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
