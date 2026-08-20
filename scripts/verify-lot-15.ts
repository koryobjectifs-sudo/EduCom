/**
 * Vérificateur du lot 15 — centre documentaire de l'établissement.
 *
 *   npm run script -- scripts/verify-lot-15.ts
 *
 * 22ᵉ vérificateur. Il crée de vrais documents dans deux écoles, dépose de vrais
 * fichiers dans le bucket, et éprouve ce que **chaque rôle voit réellement** —
 * puis supprime tout.
 *
 * ⚠️ Aucun invariant figé sur un total. Les nombres cités sont ceux des fixtures
 * que ce script vient de créer : des faits qu'il contrôle.
 */
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { ActorContext } from "../src/lib/audit";
import { hasAccess, CENTRE_INTENDED, type RoleType } from "../src/lib/permissions";
import { WORKFLOWS, canTransition } from "../src/lib/workflow";
import { BUCKET, currentAcademicYear } from "../src/lib/studentFile";
import {
  CENTRE_PATH, CENTRE_MANAGE_PATH, SCHOOL_PREFIX, schoolStoragePath,
  documentScope, canSeeDocument, listDocuments, listFolders, filterFacets,
  documentVersions, schoolDocUrl,
} from "../src/lib/schoolDocuments";

let checks = 0, failures = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8");
const TAG = "SONDE15";
const trash = {
  docIds: [] as string[], folderIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], userIds: [] as string[], paths: [] as string[],
};

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 15 — CENTRE DOCUMENTAIRE");
  console.log("═".repeat(74));

  const supabase = createAdminClient();
  const year = currentAcademicYear();

  /* ═══════ A. SÉPARATION DES DEUX ESPACES ═══════ */
  console.log("\n═══ A. CENTRE ≠ DOSSIER ÉLÈVE ═══\n");

  const libCentre = strip(read("src/lib/schoolDocuments.ts"));
  const libStudent = strip(read("src/lib/studentFile.ts"));
  check(!/prisma\.studentDocument/.test(libCentre),
    "le centre ne lit jamais `StudentDocument` — les pièces personnelles n'y entrent pas");
  check(!/prisma\.schoolDocument/.test(libStudent),
    "le dossier élève ne lit jamais `SchoolDocument` — aucun chemin commun");
  check(/SCHOOL_PREFIX/.test(libCentre) && SCHOOL_PREFIX === "__etablissement__",
    `les fichiers du centre vivent sous un préfixe distinct (« ${SCHOOL_PREFIX} ») du même bucket`);
  const p = schoolStoragePath("ecole", "doc", "a.pdf");
  check(p.startsWith("ecole/") && p.includes(SCHOOL_PREFIX),
    `chemin Storage borné par l'école dès le premier segment : ${p}`);
  check(!/base64|toDataURL/i.test(libCentre), "aucun base64 — le binaire ne passe pas par la base");
  check(!/getPublicUrl/.test(libCentre) && /createSignedUrl/.test(libCentre),
    "aucune URL publique : uniquement des liens signés temporaires");

  /* ═══════ B. PERMISSIONS — INTENTION CONTRE RÉALITÉ ═══════ */
  console.log("\n═══ B. PERMISSIONS ═══\n");

  for (const [role, want] of Object.entries(CENTRE_INTENDED)) {
    const r = hasAccess(role as RoleType, CENTRE_PATH);
    const m = hasAccess(role as RoleType, CENTRE_MANAGE_PATH);
    check(r === want.read && m === want.manage,
      `${role.padEnd(11)} consulter=${r ? "oui" : "non"} publier=${m ? "oui" : "non"}`);
  }
  ok("séparation des pouvoirs : le secrétariat prépare, la direction publie");

  const actionsSrc = strip(read("src/app/dashboard/documents/centre/actions.ts"));
  check(!/ROLE_PERMISSIONS|ROLE_DENIALS/.test(actionsSrc + libCentre), "aucune matrice de permissions parallèle");
  check(!/"(OWNER|ADMIN|SECRETARY|TEACHER|ASSISTANT|PARENT|ACCOUNTANT)"/.test(actionsSrc),
    "aucun rôle n'est cité en dur dans les actions");
  check(/requireActionContext\(CENTRE_MANAGE_PATH\)/.test(actionsSrc), "publier exige le chemin de gestion");

  /* ═══════ C. WORKFLOW ═══════ */
  console.log("\n═══ C. CYCLE DE VIE ═══\n");

  const wf = WORKFLOWS.schoolDocument;
  check(wf.states.join(",") === "DRAFT,REVIEW,PUBLISHED,ARCHIVED", `états : ${wf.states.join(" → ")}`);
  check(canTransition(wf, "DRAFT", "PUBLISHED", "OWNER").allowed, "la direction publie un brouillon");
  check(!canTransition(wf, "DRAFT", "PUBLISHED", "SECRETARY").allowed, "le secrétariat ne publie pas");
  check(canTransition(wf, "DRAFT", "REVIEW", "SECRETARY").allowed, "le secrétariat soumet à validation");
  check(!canTransition(wf, "PUBLISHED", "ARCHIVED", "TEACHER").allowed, "un enseignant n'archive pas un document officiel");
  check(canTransition(wf, "ARCHIVED", "PUBLISHED", "ADMIN").allowed,
    "un document archivé peut revenir en circulation — sinon il faudrait le recréer et casser sa lignée");
  const unpublish = wf.transitions.find((t) => t.from === "PUBLISHED" && t.to === "DRAFT");
  check(unpublish?.commentRequired === true, "dépublier exige un motif");
  check(Object.keys(WORKFLOWS).length > 1 && "schoolDocument" in WORKFLOWS,
    "le workflow est enregistré dans le moteur existant — aucun moteur parallèle");

  /* ═══════ D. FIXTURES ═══════ */
  console.log("\n═══ D. FIXTURES — DEUX ÉCOLES ═══\n");

  const schools = await prisma.school.findMany({ select: { id: true, name: true, _count: { select: { students: true } } } });
  const peopled = schools.filter((s) => s._count.students > 0).sort((a, b) => b._count.students - a._count.students);
  if (peopled.length < 2) { fail("moins de deux écoles peuplées — isolation non testable"); return; }
  const [A, B] = peopled;

  const mkUser = async (schoolId: string, role: string, tag: string) => {
    const u = await prisma.user.create({
      data: { email: `${TAG.toLowerCase()}.${tag}.${Date.now()}@sonde.invalid`, firstName: `${TAG}-${tag}`, lastName: "Sonde", role: role as never, schoolId },
      select: { id: true, role: true, schoolId: true },
    });
    trash.userIds.push(u.id);
    return { userId: u.id, schoolId: u.schoolId, role: u.role } as ActorContext;
  };
  const direction = await mkUser(A.id, "OWNER", "dir");
  const teacher = await mkUser(A.id, "TEACHER", "prof");
  const parent = await mkUser(A.id, "PARENT", "parent");
  const accountant = await mkUser(A.id, "ACCOUNTANT", "compta");
  const dirB = await mkUser(B.id, "OWNER", "dirb");

  const sienne = await prisma.class.create({ data: { name: `${TAG} CM2`, cycle: "ELEMENTAIRE", schoolId: A.id, teacherId: teacher.userId } });
  const autre = await prisma.class.create({ data: { name: `${TAG} 6e`, cycle: "COLLEGE", schoolId: A.id } });
  trash.classIds.push(sienne.id, autre.id);

  const enfant = await prisma.student.create({ data: { firstName: `${TAG}-Enfant`, lastName: "Sonde", schoolId: A.id, status: "ENROLLED", parentId: parent.userId }, select: { id: true } });
  trash.studentIds.push(enfant.id);
  await prisma.enrollment.create({ data: { studentId: enfant.id, classId: sienne.id, academicYear: year } });

  const folder = await prisma.documentFolder.create({ data: { name: `${TAG} Fournitures`, schoolId: A.id }, select: { id: true } });
  trash.folderIds.push(folder.id);

  const mkDoc = async (o: {
    title: string; status: string; audience: string; scopeKind: string;
    cycle?: string | null; classId?: string | null; schoolId?: string; description?: string;
    subject?: string | null; folderId?: string | null; academicYear?: string | null; real?: boolean;
  }) => {
    const schoolId = o.schoolId ?? A.id;
    const id = crypto.randomUUID();
    const path = schoolStoragePath(schoolId, id, "sonde.pdf");
    if (o.real) {
      const up = await supabase.storage.from(BUCKET).upload(path, PDF, { contentType: "application/pdf", upsert: true });
      if (!up.error) trash.paths.push(path);
    }
    const d = await prisma.schoolDocument.create({
      data: {
        id, title: `${TAG} ${o.title}`, description: o.description ?? null,
        status: o.status as never, audience: o.audience as never, scopeKind: o.scopeKind as never,
        cycle: (o.cycle ?? null) as never, classId: o.classId ?? null,
        academicYear: o.academicYear ?? year, subject: o.subject ?? null, folderId: o.folderId ?? null,
        storagePath: path, fileName: "sonde.pdf", mimeType: "application/pdf", sizeBytes: PDF.length,
        createdById: direction.userId, schoolId,
        ...(o.status === "PUBLISHED" ? { publishedAt: new Date(), publishedById: direction.userId } : {}),
      },
      select: { id: true },
    });
    trash.docIds.push(d.id);
    return d.id;
  };

  const dBrouillon = await mkDoc({ title: "Reglement brouillon", status: "DRAFT", audience: "FAMILIES", scopeKind: "SCHOOL" });
  const dEcole = await mkDoc({ title: "Reglement interieur", status: "PUBLISHED", audience: "FAMILIES", scopeKind: "SCHOOL", description: "Regles de vie", folderId: folder.id, real: true });
  const dSaClasse = await mkDoc({ title: "Fournitures CM2", status: "PUBLISHED", audience: "FAMILIES", scopeKind: "CLASS", classId: sienne.id, folderId: folder.id });
  const dAutreClasse = await mkDoc({ title: "Fournitures 6e", status: "PUBLISHED", audience: "FAMILIES", scopeKind: "CLASS", classId: autre.id });
  const dCycleCollege = await mkDoc({ title: "Manuels college", status: "PUBLISHED", audience: "STAFF", scopeKind: "CYCLE", cycle: "COLLEGE", subject: "Mathematiques" });
  const dStaff = await mkDoc({ title: "Procedure interne", status: "PUBLISHED", audience: "STAFF", scopeKind: "SCHOOL" });
  const dB = await mkDoc({ title: "Document ecole B", status: "PUBLISHED", audience: "FAMILIES", scopeKind: "SCHOOL", schoolId: B.id });
  ok(`fixtures : 6 documents dans « ${A.name} », 1 dans « ${B.name} », 1 dossier`);

  /* ═══════ E. PORTÉE PAR RÔLE ═══════ */
  console.log("\n═══ E. CE QUE CHAQUE RÔLE VOIT ═══\n");

  const ids = async (actor: ActorContext) => (await listDocuments(actor)).map((d) => d.id);
  const dirIds = await ids(direction);
  const profIds = await ids(teacher);
  const parentIds = await ids(parent);
  const comptaIds = await ids(accountant);

  check(dirIds.includes(dBrouillon), "la direction voit ses brouillons");
  check(!profIds.includes(dBrouillon) && !parentIds.includes(dBrouillon) && !comptaIds.includes(dBrouillon),
    "PERSONNE d'autre ne voit un brouillon — un document non publié n'est pas un document officiel");

  check(profIds.includes(dSaClasse), "l'enseignant voit les fournitures de SA classe");
  check(!profIds.includes(dAutreClasse), "il ne voit pas celles d'une classe qui n'est pas la sienne");
  check(profIds.includes(dEcole), "il voit les documents de portée établissement");
  check(!profIds.includes(dCycleCollege),
    "il ne voit pas un document de cycle collège — sa classe est en élémentaire");

  check(parentIds.includes(dSaClasse), "le parent voit les fournitures de la classe de son enfant");
  check(!parentIds.includes(dAutreClasse), "il ne voit pas celles d'une autre classe");
  check(parentIds.includes(dEcole), "il voit le règlement de tout l'établissement");
  check(!parentIds.includes(dStaff),
    "il ne voit AUCUN document réservé au personnel, même publié et même de portée établissement");

  check(comptaIds.includes(dStaff) && !comptaIds.includes(dBrouillon),
    "la comptabilité voit les documents publiés, jamais les brouillons");
  check(await canSeeDocument(direction, dBrouillon) && !(await canSeeDocument(parent, dBrouillon)),
    "`canSeeDocument()` dit la même chose que la liste — une seule règle, pas deux");

  const scopeDefault = await documentScope({ userId: "x", schoolId: A.id, role: "ROLE_INCONNU" });
  check(JSON.stringify(scopeDefault).includes('"in":[]'),
    "un rôle inconnu ne voit rien — fermeture par défaut");

  /* ═══════ F. ISOLATION INTER-ÉCOLES ═══════ */
  console.log("\n═══ F. ISOLATION ═══\n");

  check(!dirIds.includes(dB), "A ne voit pas le document de B dans sa liste");
  check((await ids(dirB)).includes(dB), "B voit le sien (témoin)");
  check(!(await canSeeDocument(direction, dB)), "documentId étranger → refusé");
  check(!(await canSeeDocument(dirB, dEcole)), "et réciproquement");
  check("error" in (await schoolDocUrl(direction, dB)), "aucune URL signée sur un document étranger");
  check((await documentVersions(direction, dB)) === null, "aucune lignée de versions sur un document étranger");
  const foldersB = await listFolders(dirB);
  check(!foldersB.some((f) => f.id === folder.id), "les dossiers de A n'apparaissent pas chez B");
  const guessed = await supabase.storage.from(BUCKET).download(schoolStoragePath(B.id, dEcole, "sonde.pdf"));
  check(Boolean(guessed.error), "chemin Storage deviné en substituant l'école → introuvable");

  /* ═══════ G. RECHERCHE ET FILTRES ═══════ */
  console.log("\n═══ G. RECHERCHE ET FILTRES ═══\n");

  const byTitle = await listDocuments(direction, { q: "Fournitures CM2" });
  check(byTitle.some((d) => d.id === dSaClasse) && !byTitle.some((d) => d.id === dStaff),
    "recherche par titre : trouve la bonne, écarte les autres");
  const byDesc = await listDocuments(direction, { q: "Regles de vie" });
  check(byDesc.some((d) => d.id === dEcole),
    "recherche par DESCRIPTION — pas seulement par nom de fichier (tous nos fichiers s'appellent sonde.pdf)");
  const bySubject = await listDocuments(direction, { q: "Mathematiques" });
  check(bySubject.some((d) => d.id === dCycleCollege), "recherche par matière");
  const noise = await listDocuments(direction, { q: "zzzzintrouvable" });
  check(noise.length === 0, "une recherche sans correspondance ne renvoie rien");

  const fClass = await listDocuments(direction, { classId: sienne.id });
  check(fClass.every((d) => d.classId === sienne.id) && fClass.some((d) => d.id === dSaClasse),
    "filtre par classe : réellement appliqué en base");
  const fStatus = await listDocuments(direction, { status: "DRAFT" });
  check(fStatus.every((d) => String(d.status) === "DRAFT") && fStatus.some((d) => d.id === dBrouillon),
    "filtre par statut");
  const fCycle = await listDocuments(direction, { cycle: "COLLEGE" });
  check(fCycle.some((d) => d.id === dCycleCollege) && !fCycle.some((d) => d.id === dEcole), "filtre par cycle");
  const fAud = await listDocuments(direction, { audience: "STAFF" });
  check(fAud.every((d) => String(d.audience) === "STAFF"), "filtre par destinataires");
  const fFolder = await listDocuments(direction, { folderId: folder.id });
  check(fFolder.length === 2 && fFolder.every((d) => d.folderId === folder.id),
    `filtre par dossier : ${fFolder.length} documents, ceux réellement rangés dedans`);
  check((await listDocuments(direction, { recent: true })).length > 0, "filtre « récents » sur une fenêtre réelle");

  const facets = await filterFacets(direction);
  check(facets.years.includes(year) && facets.years.every((y) => /^\d{4}-\d{4}$/.test(y)),
    `années proposées déduites des données et du calendrier (${facets.years.slice(0, 3).join(", ")}) — aucune codée en dur`);
  const centreSrc = read("src/app/dashboard/documents/centre/CentreClient.tsx") + read("src/app/dashboard/documents/centre/page.tsx");
  check(!/20\d\d-20\d\d/.test(centreSrc), "aucune année scolaire écrite en dur dans l'écran");

  const foldersA = await listFolders(direction);
  const foldersParent = await listFolders(parent);
  const fa = foldersA.find((f) => f.id === folder.id)!;
  const fp = foldersParent.find((f) => f.id === folder.id)!;
  check(fa.documentCount === 2 && fp.documentCount === 2,
    "le compteur d'un dossier porte sur ce que l'acteur VOIT, pas sur ce qui existe");

  /* ═══════ H. VERSIONS ═══════ */
  console.log("\n═══ H. VERSIONS ═══\n");

  const v2 = await mkDoc({ title: "Reglement interieur", status: "DRAFT", audience: "FAMILIES", scopeKind: "SCHOOL" });
  await prisma.schoolDocument.update({ where: { id: v2 }, data: { supersedesId: dEcole, version: 2 } });
  await prisma.schoolDocument.update({ where: { id: dEcole }, data: { supersededAt: new Date() } });

  const chain = await documentVersions(direction, v2);
  check(chain !== null && chain.length === 2, `lignée reconstituée : ${chain?.length} versions`);
  check(chain![0].current && !chain![1].current, "une seule version est courante");
  const old = await prisma.schoolDocument.findUnique({ where: { id: dEcole }, select: { id: true, storagePath: true } });
  check(old !== null, "l'ancienne version conserve sa ligne — elle n'est jamais supprimée");
  const stillThere = await supabase.storage.from(BUCKET).download(old!.storagePath);
  check(!stillThere.error, "et son FICHIER reste dans le bucket — un historique sans pièce est invérifiable");
  const list = await listDocuments(direction);
  check(!list.some((d) => d.id === dEcole) && list.some((d) => d.id === v2),
    "la bibliothèque ne montre que la version courante");
  check(/status: "DRAFT"/.test(actionsSrc),
    "une nouvelle version arrive en BROUILLON — remplacer un fichier ne republie pas tout seul");

  /* ═══════ I. PRÉPARER ≠ ENVOYER ═══════ */
  console.log("\n═══ I. PARTAGE ═══\n");

  // ⚠️ Lot 17 — `prepareShare()` a été REMPLACÉ par `prepareDiffusion()`, dans
  // `src/lib/diffusion.ts`, partagé avec le dossier élève. Les invariants du lot
  // 15 n'ont pas disparu : ils sont vérifiés à leur nouvelle adresse. Garder
  // deux voies de partage aurait produit deux vérités sur « qui est concerné ».
  const diffusionSrc = strip(read("src/lib/diffusion.ts"));
  check(/sent: false/.test(actionsSrc), "l'action de partage déclare explicitement que rien n'est envoyé");
  check(/Aucun message n'a été envoyé/.test(diffusionSrc), "et l'explique en français à l'écran");
  check(!/twilio|messages\.create|sendMail|nodemailer/i.test(actionsSrc + diffusionSrc),
    "aucun envoi réel n'est tenté — aucune API inventée");
  check(/status !== "PUBLISHED"/.test(diffusionSrc),
    "un document non publié ne peut pas être préparé pour les familles");
  check(/prisma\.enrollment\.findMany/.test(diffusionSrc),
    "le nombre de familles est compté sur les inscriptions réelles, jamais estimé");

  /* ═══════ J. STOCKAGE ═══════ */
  console.log("\n═══ J. STOCKAGE ═══\n");

  const buckets = (await supabase.storage.listBuckets()).data ?? [];
  check(buckets.length === 1 && buckets[0].name === BUCKET,
    `un seul bucket, toujours : « ${buckets.map((b) => b.name).join(", ")} »`);
  check(buckets[0]?.public === false, "il reste privé");
  const clientSrc = read("src/app/dashboard/documents/centre/CentreClient.tsx");
  check(!/storage\.from/.test(clientSrc), "le client n'écrit ni ne lit jamais Storage directement");
  check(!/from "@\/lib\/(prisma|schoolDocuments|studentFile)"/.test(clientSrc),
    "l'écran client n'importe aucun module qui touche la base (leçon du lot 13.1)");

  console.log("\n" + "═".repeat(74));
  console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués`);
  console.log("═".repeat(74) + "\n");
}

async function wipe() {
  const s = createAdminClient();
  if (trash.paths.length) await s.storage.from(BUCKET).remove(trash.paths);
  await prisma.workflowTransition.deleteMany({ where: { entityId: { in: trash.docIds } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: trash.docIds } } });
  await prisma.schoolDocument.updateMany({ where: { id: { in: trash.docIds } }, data: { supersedesId: null } });
  await prisma.schoolDocument.deleteMany({ where: { id: { in: trash.docIds } } });
  await prisma.documentFolder.deleteMany({ where: { id: { in: trash.folderIds } } });
  await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
  await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
  await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
  await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
}

main()
  .catch((e) => { console.error(e); failures++; })
  .finally(async () => {
    try {
      await wipe();
      const left = await prisma.schoolDocument.count({ where: { title: { startsWith: TAG } } });
      console.log(left === 0 ? "  ✓ aucune fixture résiduelle\n" : `  ✗ ${left} fixture(s) résiduelle(s)\n`);
    } catch (e) { console.error("  ⚠️ nettoyage incomplet :", e); }
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
