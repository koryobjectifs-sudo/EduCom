/**
 * Vérificateur du lot 17 — diffusion / partage des documents.
 *
 *   npm run script -- scripts/verify-lot-17.ts
 *
 * 25ᵉ vérificateur. Il commence par **interroger réellement** les fournisseurs
 * configurés (lecture seule, aucun envoi), parce que la question centrale du lot
 * n'est pas « le code compile-t-il » mais « qu'est-ce qui peut réellement
 * partir d'ici ». Il crée ensuite de vraies fixtures dans deux écoles, prépare
 * de vraies diffusions, et supprime tout.
 *
 * ⚠️ Aucun invariant figé sur un total : les nombres cités sont ceux des
 * fixtures que ce script vient lui-même de créer.
 *
 * ⚠️ **Aucun message n'est envoyé, à aucun moment.** Les appels réseau de la
 * section A sont des lectures (`GET`) sur le compte configuré.
 */
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { ActorContext } from "../src/lib/audit";
import { hasAccess, type RoleType } from "../src/lib/permissions";
import { BUCKET, currentAcademicYear } from "../src/lib/studentFile";
import { storagePathFor } from "../src/lib/studentFile";
import { schoolStoragePath, CENTRE_PATH, CENTRE_MANAGE_PATH } from "../src/lib/schoolDocuments";
import {
  channels, channel, canSend, noRealSendChannel, normalizePhone, usableEmail,
  DIFFUSION_CHANNELS,
} from "../src/lib/channels";
import {
  prepareDiffusion, recordManualDelivery, diffusedDocumentIds, diffusionHistory,
  FORBIDDEN_STATES, LINK_TTL_SECONDS, MANUAL_DELIVERY, DIFFUSED_ACTION, RECIPIENT_LIMIT,
} from "../src/lib/diffusion";

let checks = 0, failures = 0, skipped = 0;
const ok = (l: string) => { checks++; console.log(`  ✓ ${l}`); };
const fail = (l: string, d?: string) => { checks++; failures++; console.log(`  ✗ ${l}${d ? `\n      ${d}` : ""}`); };
const check = (c: boolean, l: string, d?: string) => (c ? ok(l) : fail(l, d));
const skip = (l: string) => { skipped++; console.log(`  ⃠ NON CONCLUANT — ${l}`); };
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PDF = (tag: string) => Buffer.from(`%PDF-1.4\n${tag}\n%%EOF\n`, "utf8");
const TAG = "SONDE17";
const trash = {
  schoolDocIds: [] as string[], studentDocIds: [] as string[], studentIds: [] as string[],
  classIds: [] as string[], userIds: [] as string[], paths: [] as string[], folderIds: [] as string[],
};

/* ═══════════════════ A. AUDIT RÉEL DES INTÉGRATIONS ═══════════════════ */

async function auditTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token) {
    skip("aucun identifiant Twilio dans l'environnement — rien à interroger");
    return;
  }

  const auth = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
  const get = async (url: string) => {
    const r = await fetch(url, { headers: { Authorization: auth } });
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  };

  try {
    const acct = await get(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`);
    if (acct.status !== 200) {
      check(false, "les identifiants Twilio sont refusés par le fournisseur",
        `HTTP ${acct.status} — ${String(acct.body.message ?? "")}`);
      return;
    }
    ok(`compte Twilio joignable : « ${acct.body.friendly_name} », statut ${acct.body.status}, type ${acct.body.type}`);

    // ⚠️ La question qui compte : ce compte détient-il un expéditeur ?
    const nums = await get(`https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PageSize=50`);
    const owned = Array.isArray(nums.body.incoming_phone_numbers) ? (nums.body.incoming_phone_numbers as unknown[]) : [];
    const list = owned.map((n) => (n as { phone_number: string }).phone_number);
    const senderOwned = from ? list.includes(from.replace(/^whatsapp:/, "")) : false;

    console.log(`      numéros détenus : ${list.length === 0 ? "aucun" : list.join(", ")}`);
    console.log(`      expéditeur configuré : ${from ?? "aucun"}${senderOwned ? " (détenu)" : " (NON détenu par ce compte)"}`);

    // Historique d'émission : la preuve la plus directe qu'un message est parti.
    const msgs = await get(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?PageSize=1`);
    const everSent = Array.isArray(msgs.body.messages) ? (msgs.body.messages as unknown[]).length > 0 : false;
    console.log(`      messages jamais émis par ce compte : ${everSent ? "non — au moins un existe" : "OUI, zéro message"}`);

    // ⚠️ L'invariant testé n'est PAS « Twilio est mort ». C'est : le produit ne
    // doit jamais se dire capable d'envoyer plus que ce que le compte permet.
    const claimsSms = canSend("sms");
    const claimsWa = canSend("whatsapp");
    check(!(claimsSms && !senderOwned),
      "EduCom ne se déclare pas capable d'envoyer un SMS avec un expéditeur que le compte ne détient pas");
    check(!(claimsWa && !(from ?? "").startsWith("whatsapp:")),
      "EduCom ne se déclare pas capable d'envoyer sur WhatsApp sans expéditeur WhatsApp");
  } catch (e) {
    skip(`Twilio injoignable depuis cette machine (${e instanceof Error ? e.message : "erreur réseau"}) — audit réseau non concluant`);
  }
}

async function main() {
  console.log("═".repeat(74));
  console.log("  VÉRIFICATION DU LOT 17 — DIFFUSION / PARTAGE DES DOCUMENTS");
  console.log("═".repeat(74));

  const supabase = createAdminClient();
  const year = currentAcademicYear();

  console.log("\n═══ A. AUDIT RÉEL DES INTÉGRATIONS (lecture seule) ═══\n");
  await auditTwilio();

  // Les intégrations absentes ne se devinent pas : on regarde ce qui est installé.
  const pkg = JSON.parse(read("package.json") || "{}") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const emailSdk = Object.keys(deps).filter((d) => /resend|nodemailer|sendgrid|postmark|mailgun|ses/i.test(d));
  const driveSdk = Object.keys(deps).filter((d) => /googleapis|google-auth|@googleapis/i.test(d));
  check(emailSdk.length === 0 || channel("email").canSend,
    emailSdk.length === 0
      ? "aucun SDK d'e-mail installé — et le produit ne prétend pas en avoir un"
      : `un SDK d'e-mail est installé (${emailSdk.join(", ")}) : la capacité doit être rouverte`);
  check(driveSdk.length === 0 || channel("drive").canSend,
    driveSdk.length === 0
      ? "aucun SDK Google Drive installé — et le produit ne prétend pas en avoir un"
      : `un SDK Drive est installé (${driveSdk.join(", ")}) : la capacité doit être rouverte`);

  /* ═══════ B. LE MODULE DE CAPACITÉ EST LA SEULE AUTORITÉ ═══════ */
  console.log("\n═══ B. CANAUX ═══\n");

  const all = channels();
  check(all.length > 0, `${all.length} canaux décrits`);
  check(all.every((c) => c.reason.trim().length > 0), "chaque canal porte une RAISON, jamais un statut nu");
  check(all.every((c) => c.state !== "OPERATIONNEL" || c.canSend),
    "un canal opérationnel est le seul à pouvoir envoyer");
  check(all.every((c) => c.canSend === (c.state === "OPERATIONNEL")),
    "`canSend` ne peut pas diverger de l'état — aucun demi-succès");

  const chanSrc = strip(read("src/lib/channels.ts"));
  check(/const SEND_IMPLEMENTATIONS[^=]*=\s*\{\s*\}/.test(chanSrc),
    "le registre d'implémentations d'envoi est VIDE — aucun canal ne peut mentir");
  // ⚠️ L'invariant n'est pas « le mot Twilio est absent » — il faut bien nommer
  // les variables qu'on lit. C'est : aucun SDK importé, aucun appel réseau,
  // aucune fonction d'envoi. Le module décrit une capacité, il ne l'exerce pas.
  check(!/from ["'](twilio|nodemailer|resend|googleapis)|require\(["'](twilio|nodemailer)/.test(chanSrc),
    "le module de capacité n'importe aucun SDK de fournisseur");
  check(!/messages\.create|sendMail|\bfetch\(|https?:\/\//.test(chanSrc),
    "il n'effectue aucun appel réseau et n'expose aucune fonction d'envoi : il décrit, il n'envoie pas");
  check(noRealSendChannel(), "aucun canal ne peut envoyer aujourd'hui — et le produit le dit");

  /* ═══════ C. ADRESSES RÉELLEMENT UTILISABLES ═══════ */
  console.log("\n═══ C. ADRESSES ═══\n");

  check(normalizePhone("77 123 45 67") === "+221771234567", "un numéro sénégalais à 9 chiffres est complété en +221");
  check(normalizePhone("+33 6 12 34 56 78") === "+33612345678", "un numéro déjà international est respecté");
  check(normalizePhone("00221771234567") === "+221771234567", "le préfixe 00 est converti");
  check(normalizePhone("12345") === null, "un numéro trop court est REFUSÉ, pas rafistolé");
  check(normalizePhone("") === null && normalizePhone(null) === null, "l'absence de numéro n'invente rien");
  check(usableEmail("A.Diop@Exemple.SN") === "a.diop@exemple.sn", "une adresse valide est normalisée");
  check(usableEmail("pas-une-adresse") === null, "une chaîne sans arobase n'est pas une adresse");

  /* ═══════ D. FIXTURES — DEUX ÉCOLES ═══════ */
  console.log("\n═══ D. FIXTURES ═══\n");

  const schools = await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { students: true } } },
  });
  const peopled = schools.filter((s) => s._count.students > 0).sort((a, b) => b._count.students - a._count.students);
  if (peopled.length < 2) { fail("moins de deux écoles peuplées — isolation non testable"); return; }
  const [A, B] = peopled;

  const mkUser = async (schoolId: string, role: string, tag: string, extra: { phone?: string | null; email?: string } = {}) => {
    const u = await prisma.user.create({
      data: {
        email: extra.email ?? `${TAG.toLowerCase()}.${tag}.${Date.now()}@sonde.invalid`,
        firstName: `${TAG}-${tag}`, lastName: "Sonde", role: role as never, schoolId,
        phone: extra.phone ?? null,
      },
      select: { id: true, role: true, schoolId: true },
    });
    trash.userIds.push(u.id);
    return { userId: u.id, schoolId: u.schoolId, role: u.role } as ActorContext;
  };

  const direction = await mkUser(A.id, "OWNER", "dir");
  const secretary = await mkUser(A.id, "SECRETARY", "sec");
  const teacher = await mkUser(A.id, "TEACHER", "prof");
  const dirB = await mkUser(B.id, "OWNER", "dirb");

  // Trois parents, trois situations de contact RÉELLES.
  const pTel = await mkUser(A.id, "PARENT", "ptel", { phone: "77 123 45 67" });
  const pMail = await mkUser(A.id, "PARENT", "pmail", { phone: null });
  const pRien = await mkUser(A.id, "PARENT", "prien", { phone: "12", email: `${TAG.toLowerCase()}-sans-arobase-${Date.now()}` });

  const sienne = await prisma.class.create({
    data: { name: `${TAG} CM2`, cycle: "ELEMENTAIRE", schoolId: A.id, teacherId: teacher.userId },
    select: { id: true },
  });
  const autre = await prisma.class.create({
    data: { name: `${TAG} 6e`, cycle: "COLLEGE", schoolId: A.id },
    select: { id: true },
  });
  trash.classIds.push(sienne.id, autre.id);

  const mkStudent = async (first: string, classId: string, parentId: string | null) => {
    const s = await prisma.student.create({
      data: { firstName: `${TAG}${first}`, lastName: "Ndiaye", schoolId: A.id, status: "ENROLLED", parentId },
      select: { id: true },
    });
    trash.studentIds.push(s.id);
    await prisma.enrollment.create({ data: { studentId: s.id, classId, academicYear: year } });
    return s.id;
  };
  const eTel = await mkStudent("Aminata", sienne.id, pTel.userId);
  const eMail = await mkStudent("Ousmane", sienne.id, pMail.userId);
  const eRien = await mkStudent("Fatou", sienne.id, pRien.userId);
  const eOrphelin = await mkStudent("Moussa", sienne.id, null);
  await mkStudent("Awa", autre.id, pTel.userId);

  const mkSchoolDoc = async (o: { title: string; status: string; audience?: string; scopeKind?: string; classId?: string | null; schoolId?: string }) => {
    const id = crypto.randomUUID();
    const schoolId = o.schoolId ?? A.id;
    const path = schoolStoragePath(schoolId, id, `${o.title}.pdf`);
    const up = await supabase.storage.from(BUCKET).upload(path, PDF(o.title), { contentType: "application/pdf", upsert: true });
    if (!up.error) trash.paths.push(path);
    const d = await prisma.schoolDocument.create({
      data: {
        id, title: `${TAG} ${o.title}`, status: o.status as never,
        audience: (o.audience ?? "FAMILIES") as never,
        scopeKind: (o.scopeKind ?? "SCHOOL") as never,
        classId: o.classId ?? null,
        storagePath: path, fileName: `${o.title}.pdf`, mimeType: "application/pdf", sizeBytes: PDF(o.title).length,
        academicYear: year, createdById: direction.userId, schoolId,
        ...(o.status === "PUBLISHED" ? { publishedAt: new Date(), publishedById: direction.userId } : {}),
      },
      select: { id: true },
    });
    trash.schoolDocIds.push(d.id);
    return d.id;
  };

  const publie = await mkSchoolDoc({ title: "Reglement interieur", status: "PUBLISHED" });
  const brouillon = await mkSchoolDoc({ title: "Note en preparation", status: "DRAFT" });
  const archive = await mkSchoolDoc({ title: "Reglement 2024", status: "ARCHIVED" });
  const classeSienne = await mkSchoolDoc({ title: "Fournitures CM2", status: "PUBLISHED", scopeKind: "CLASS", classId: sienne.id });
  const classeAutre = await mkSchoolDoc({ title: "Fournitures 6e", status: "PUBLISHED", scopeKind: "CLASS", classId: autre.id });
  const docB = await mkSchoolDoc({ title: "Reglement ecole B", status: "PUBLISHED", schoolId: B.id });

  // Une pièce du dossier d'un élève, catégorie sensible, pour éprouver le §7.
  const mkStudentDoc = async (studentId: string, label: string, category: string) => {
    const id = crypto.randomUUID();
    const path = storagePathFor(A.id, studentId, id, `${label}.pdf`);
    const up = await supabase.storage.from(BUCKET).upload(path, PDF(label), { contentType: "application/pdf", upsert: true });
    if (!up.error) trash.paths.push(path);
    const d = await prisma.studentDocument.create({
      data: {
        id, studentId, label: `${TAG} ${label}`, category: category as never,
        storagePath: path, fileName: `${label}.pdf`, mimeType: "application/pdf", sizeBytes: PDF(label).length,
        status: "VALIDATED", academicYear: year, uploadedById: direction.userId, schoolId: A.id,
      },
      select: { id: true },
    });
    trash.studentDocIds.push(d.id);
    return d.id;
  };
  const pieceScolarite = await mkStudentDoc(eTel, "Bulletin", "SCOLARITE");
  const pieceSante = await mkStudentDoc(eTel, "Certificat medical", "SANTE");
  const pieceOrpheline = await mkStudentDoc(eOrphelin, "Extrait naissance", "IDENTITE");

  ok(`fixtures : 2 écoles, 3 parents (téléphone / e-mail seul / aucun), ${trash.schoolDocIds.length} documents d'établissement, ${trash.studentDocIds.length} pièces élèves`);

  /* ═══════ E. DOCUMENT D'ÉTABLISSEMENT ═══════ */
  console.log("\n═══ E. DIFFUSION D'UN DOCUMENT D'ÉTABLISSEMENT ═══\n");

  const prep = await prepareDiffusion(direction, { target: { kind: "schoolDocument", documentId: publie }, channel: "whatsapp" });
  if ("error" in prep) { fail("la préparation d'un document publié échoue", prep.error); return; }
  ok("un document publié se prépare");
  check(prep.canSend === false, "le paquet préparé déclare `canSend: false` — le serveur le dit, pas l'écran");
  check(/Aucun message n'a été envoyé/.test(prep.notice), "l'avis affiché dit en français que rien n'est parti");
  check(prep.link.ttlSeconds === LINK_TTL_SECONDS && prep.link.ttlSeconds > 0,
    `le lien porte sa durée réelle (${prep.link.ttlSeconds} s)`);
  check(prep.link.url.includes("token=") || prep.link.url.includes("/sign/"),
    "le lien remis est une URL SIGNÉE, pas un chemin public");
  check(prep.text.includes(`${TAG} Reglement interieur`), "le message composé cite le vrai titre du document");

  for (const st of ["DRAFT", "ARCHIVED"] as const) {
    const id = st === "DRAFT" ? brouillon : archive;
    const r = await prepareDiffusion(direction, { target: { kind: "schoolDocument", documentId: id }, channel: "whatsapp" });
    check("error" in r, `un document ${st} est REFUSÉ à la diffusion`, "error" in r ? r.error : "préparé à tort");
  }

  /* ═══════ F. DESTINATAIRES — DONNÉES RÉELLES ═══════ */
  console.log("\n═══ F. DESTINATAIRES ═══\n");

  const byId = new Map(prep.recipients.map((r) => [r.parentId, r]));
  check(byId.has(pTel.userId) && byId.get(pTel.userId)!.available,
    "le parent qui a un numéro exploitable est joignable sur WhatsApp");
  check(byId.has(pMail.userId) && !byId.get(pMail.userId)!.available,
    "le parent sans numéro est marqué INDISPONIBLE sur WhatsApp — pas silencieusement compté");
  check(byId.has(pRien.userId) && !byId.get(pRien.userId)!.available,
    "un numéro inexploitable ne devient pas joignable par indulgence");
  check(prep.studentsWithoutParent >= 1,
    `${prep.studentsWithoutParent} élève(s) sans parent rattaché sont comptés à part : personne ne les joindra`);
  check(prep.recipients.every((r) => r.children.length > 0),
    "chaque destinataire est rattaché à des enfants nommés — jamais un identifiant nu");
  check(prep.availableCount + prep.unavailableCount === prep.recipients.length,
    "les compteurs joignables / indisponibles couvrent exactement la liste");
  check(RECIPIENT_LIMIT > 0, `la liste des destinataires est bornée (${RECIPIENT_LIMIT})`);

  const prepMail = await prepareDiffusion(direction, { target: { kind: "schoolDocument", documentId: publie }, channel: "email" });
  if ("error" in prepMail) { fail("préparation e-mail impossible", prepMail.error); } else {
    const m = new Map(prepMail.recipients.map((r) => [r.parentId, r]));
    check(m.get(pMail.userId)?.available === true,
      "le même parent, sans numéro, EST joignable par e-mail — la disponibilité dépend du canal");
    check(m.get(pRien.userId)?.available === false,
      "une adresse malformée reste indisponible sur le canal e-mail");
    check(prepMail.subject.length > 0, "le canal e-mail produit un objet de message");
  }

  // Portée : un document de classe ne concerne que les familles de cette classe.
  const prepClasse = await prepareDiffusion(direction, { target: { kind: "schoolDocument", documentId: classeSienne }, channel: "whatsapp" });
  if ("error" in prepClasse) { fail("préparation d'un document de classe impossible", prepClasse.error); } else {
    check(prepClasse.totalRecipients <= prep.totalRecipients,
      `la portée « classe » concerne moins de familles que « établissement » (${prepClasse.totalRecipients} ≤ ${prep.totalRecipients})`);
    check(prepClasse.scopeLabel.includes("CM2"), `la portée annoncée est celle du document : « ${prepClasse.scopeLabel} »`);
  }

  /* ═══════ G. PIÈCE ÉLÈVE — PERMISSIONS DU LOT 13 ═══════ */
  console.log("\n═══ G. PIÈCE DU DOSSIER ÉLÈVE ═══\n");

  const pieceOk = await prepareDiffusion(direction, { target: { kind: "studentDocument", documentId: pieceScolarite }, channel: "whatsapp" });
  if ("error" in pieceOk) { fail("la direction ne peut pas préparer une pièce qu'elle voit", pieceOk.error); } else {
    ok("une pièce visible se prépare");
    check(pieceOk.recipients.length === 1, "une pièce d'élève ne vise QUE le parent de cet enfant — jamais un groupe");
    check(pieceOk.recipients[0]?.parentId === pTel.userId, "et c'est bien le parent de cet élève");
  }

  const santeProf = await prepareDiffusion(teacher, { target: { kind: "studentDocument", documentId: pieceSante }, channel: "whatsapp" });
  check("error" in santeProf, "un enseignant ne peut PAS diffuser une pièce SANTE du même élève",
    "error" in santeProf ? santeProf.error : "préparé à tort");
  const scolariteProf = await prepareDiffusion(teacher, { target: { kind: "studentDocument", documentId: pieceScolarite }, channel: "whatsapp" });
  check(!("error" in scolariteProf), "…alors qu'il peut diffuser une pièce SCOLARITE de sa classe — la borne est la catégorie, pas l'élève");
  if ("error" in santeProf && "error" in scolariteProf) {
    // Impossible : le second doit réussir. Laissé pour lisibilité du diagnostic.
  }
  if ("error" in santeProf) {
    const nonExistant = await prepareDiffusion(teacher, { target: { kind: "studentDocument", documentId: crypto.randomUUID() }, channel: "whatsapp" });
    check("error" in nonExistant && nonExistant.error === santeProf.error,
      "le refus et l'inexistant donnent le MÊME message — distinguer confirmerait la pièce cachée");
  }

  const orpheline = await prepareDiffusion(direction, { target: { kind: "studentDocument", documentId: pieceOrpheline }, channel: "whatsapp" });
  if ("error" in orpheline) { fail("préparation impossible pour un élève sans parent", orpheline.error); } else {
    check(orpheline.recipients.length === 0 && orpheline.availableCount === 0,
      "un élève sans parent rattaché n'invente aucun destinataire");
    check(orpheline.studentsWithoutParent === 1, "…et l'écran peut le dire : l'élève est compté comme non joignable");
  }

  /* ═══════ H. ISOLATION ═══════ */
  console.log("\n═══ H. ISOLATION ENTRE ÉTABLISSEMENTS ═══\n");

  const croise = await prepareDiffusion(direction, { target: { kind: "schoolDocument", documentId: docB }, channel: "whatsapp" });
  check("error" in croise, "l'école A ne peut pas préparer la diffusion d'un document de l'école B");
  const croiseInverse = await prepareDiffusion(dirB, { target: { kind: "schoolDocument", documentId: publie }, channel: "whatsapp" });
  check("error" in croiseInverse, "et réciproquement");
  const pieceCroisee = await prepareDiffusion(dirB, { target: { kind: "studentDocument", documentId: pieceScolarite }, channel: "whatsapp" });
  check("error" in pieceCroisee, "une pièce d'élève de A est invisible depuis B");

  if (!("error" in prep)) {
    const foreignParent = await prisma.user.findFirst({ where: { schoolId: B.id, role: "PARENT" }, select: { id: true } });
    check(!prep.recipients.some((r) => r.parentId === foreignParent?.id),
      "aucun destinataire d'un autre établissement n'entre dans la liste");
  }

  /* ═══════ I. LES SEPT RÔLES ═══════ */
  console.log("\n═══ I. PERMISSIONS — LES SEPT RÔLES ═══\n");

  const ROLES: RoleType[] = ["OWNER", "ADMIN", "ACCOUNTANT", "SECRETARY", "ASSISTANT", "TEACHER", "PARENT"];
  for (const role of ROLES) {
    const centre = hasAccess(role, CENTRE_PATH);
    const manage = hasAccess(role, CENTRE_MANAGE_PATH);
    console.log(`      ${role.padEnd(10)} centre=${centre ? "oui" : "non"}  publication=${manage ? "oui" : "non"}`);
  }
  check(ROLES.every((r) => hasAccess(r, CENTRE_PATH)),
    "les sept rôles atteignent le centre — la diffusion n'ouvre aucun chemin nouveau");
  check(ROLES.filter((r) => hasAccess(r, CENTRE_MANAGE_PATH)).every((r) => r === "OWNER" || r === "ADMIN"),
    "publier reste réservé à la direction : diffuser ne contourne pas la publication");

  const diffusionSrc = strip(read("src/lib/diffusion.ts"));
  check(!/ROLE_PERMISSIONS|ROLE_DENIALS|role ===\s*"(OWNER|ADMIN|SECRETARY)"/.test(diffusionSrc),
    "aucune matrice de rôles parallèle dans le module de diffusion");
  check(/canSeeDocument|canSeeStudent|canSeeCategory/.test(diffusionSrc),
    "il réutilise les bornes existantes des lots 13 et 15");

  // Ce que voit un rôle, pas seulement ce qu'il atteint.
  const secretairePrep = await prepareDiffusion(secretary, { target: { kind: "schoolDocument", documentId: publie }, channel: "whatsapp" });
  check(!("error" in secretairePrep), "le secrétariat peut préparer la diffusion d'un document publié");
  const profHorsClasse = await prepareDiffusion(teacher, { target: { kind: "schoolDocument", documentId: classeAutre }, channel: "whatsapp" });
  check("error" in profHorsClasse, "un enseignant ne peut pas diffuser le document d'une classe qui n'est pas la sienne");
  const profSaClasse = await prepareDiffusion(teacher, { target: { kind: "schoolDocument", documentId: classeSienne }, channel: "whatsapp" });
  check(!("error" in profSaClasse), "…mais il peut diffuser celui de SA classe");

  /* ═══════ J. CONFIRMATION HUMAINE ET AUDIT ═══════ */
  console.log("\n═══ J. REMISE DÉCLARÉE ET JOURNAL ═══\n");

  const before = await prisma.auditLog.count({ where: { schoolId: A.id, entity: "diffusion" } });
  const done = await recordManualDelivery(direction, {
    target: { kind: "schoolDocument", documentId: publie },
    channel: "whatsapp",
    parentIds: [pTel.userId, pMail.userId, pRien.userId],
    note: `${TAG} groupe WhatsApp`,
  });
  if ("error" in done) { fail("l'enregistrement d'une remise échoue", done.error); } else {
    check(done.recipients.length === 1,
      "seuls les destinataires RÉELLEMENT joignables sont enregistrés — les autres ne sont pas comptés comme servis");
    check(done.recipients[0].id === pTel.userId, "et c'est bien celui qui a un numéro");
  }

  const after = await prisma.auditLog.count({ where: { schoolId: A.id, entity: "diffusion" } });
  check(after > before, `le journal a gagné ${after - before} ligne(s) — aucune table nouvelle n'a été créée`);

  const docLines = await prisma.auditLog.findMany({
    where: { schoolId: A.id, entity: "schoolDocument", entityId: publie, action: DIFFUSED_ACTION },
    select: { id: true, details: true },
  });
  check(docLines.length === 1, "une ligne porte sur le DOCUMENT lui-même : « a-t-il été diffusé ? » se répond par index");
  const diffusedSet = await diffusedDocumentIds(direction, "schoolDocument", [publie, brouillon]);
  check(diffusedSet.has(publie) && !diffusedSet.has(brouillon), "le compteur de documents diffusés est exact");

  const history = await diffusionHistory(direction, 20);
  check(history.length > 0, `${history.length} événements de diffusion relus depuis AuditLog`);
  const manual = history.find((h) => h.state === "REMIS_MANUELLEMENT");
  check(manual !== undefined, "la remise déclarée apparaît dans l'historique");
  check(manual?.sentByEduCom === false, "…et le journal dit noir sur blanc qu'EduCom n'a rien envoyé");
  check(manual?.who.includes(TAG) === true, `l'acteur est nommé : ${manual?.who}`);
  check(history.some((h) => h.state === "PREPARE"), "les préparations aussi sont tracées, pas seulement les remises");

  const rejected = await recordManualDelivery(direction, {
    target: { kind: "schoolDocument", documentId: publie },
    channel: "whatsapp",
    parentIds: [pMail.userId],
  });
  check("error" in rejected, "déclarer une remise à un destinataire injoignable est REFUSÉ");

  const usurpation = await recordManualDelivery(dirB, {
    target: { kind: "schoolDocument", documentId: publie },
    channel: "whatsapp",
    parentIds: [pTel.userId],
  });
  check("error" in usurpation, "une autre école ne peut pas enregistrer une remise sur un document qui n'est pas le sien");

  /* ═══════ K. ÉTATS INTERDITS ═══════ */
  console.log("\n═══ K. AUCUN ÉTAT INVENTÉ ═══\n");

  const states = await prisma.auditLog.findMany({
    where: { schoolId: A.id, entity: "diffusion" },
    select: { details: true },
  });
  const written = new Set<string>();
  for (const r of states) {
    try { const d = JSON.parse(r.details ?? "{}") as { state?: string }; if (d.state) written.add(d.state); } catch { /* ligne illisible */ }
  }
  console.log(`      états réellement écrits : ${[...written].join(", ") || "aucun"}`);
  for (const forbidden of FORBIDDEN_STATES) {
    check(!written.has(forbidden), `aucune ligne ne prétend « ${forbidden} » — aucun service ne peut l'attester`);
  }
  check(!diffusionSrc.includes('state: "TRANSMIS"') && !diffusionSrc.includes('state: "CONFIRME"'),
    "le code n'écrit nulle part un état de transmission ou d'accusé de réception");
  check(new RegExp(MANUAL_DELIVERY).test(diffusionSrc), `la méthode enregistrée est explicite : ${MANUAL_DELIVERY}`);

  /* ═══════ L. AUCUNE FAUSSE INTÉGRATION ═══════ */
  console.log("\n═══ L. AUCUNE FAUSSE INTÉGRATION ═══\n");

  const centreSrc = strip(read("src/app/dashboard/documents/centre/actions.ts"));
  const dossierSrc = strip(read("src/app/dashboard/students/[id]/dossier/actions.ts"));
  for (const [name, src] of [["centre", centreSrc], ["dossier", dossierSrc], ["diffusion", diffusionSrc]] as const) {
    check(!/twilio|messages\.create|nodemailer|sendMail|googleapis|drive\.files/i.test(src),
      `aucun appel de fournisseur inventé dans ${name}`);
  }
  check(/sent: false/.test(centreSrc) && /sent: false/.test(dossierSrc),
    "les deux points de sortie déclarent explicitement `sent: false`");
  const centreClient = read("src/app/dashboard/documents/centre/CentreClient.tsx");
  check(!/from "@\/lib\/(prisma|channels|diffusion|schoolDocuments)"/.test(centreClient),
    "le client n'importe aucun module serveur — les capacités descendent en props (leçon du lot 13.1)");
  check(!/>\s*Envoyer\s*</.test(centreClient) && !/Message envoyé|Envoyé sur WhatsApp/.test(centreClient),
    "aucun bouton « Envoyer » ni aucun message « envoyé » dans le centre documentaire");

  const commSrc = strip(read("src/app/dashboard/communications/actions.ts"));
  check(/channels\(\)/.test(commSrc),
    "la campagne de messages consulte le module de capacité — plus de « simulation mode »");
  check(!/status:\s*MessageStatus\.SENT/.test(commSrc),
    "elle n'écrit plus `SENT` : aucune ligne ne peut prétendre un envoi qui n'a pas eu lieu");

  /* ═══════ M. ERREURS ═══════ */
  console.log("\n═══ M. CHEMINS D'ERREUR ═══\n");

  const inexistant = await prepareDiffusion(direction, { target: { kind: "schoolDocument", documentId: crypto.randomUUID() }, channel: "whatsapp" });
  check("error" in inexistant, "document inexistant → erreur claire");
  const canalMuet = await prepareDiffusion(direction, { target: { kind: "schoolDocument", documentId: publie }, channel: "drive" });
  check("error" in canalMuet, "un canal qui ne peut rien recevoir refuse la préparation");
  const videSelection = await recordManualDelivery(direction, {
    target: { kind: "schoolDocument", documentId: publie }, channel: "whatsapp", parentIds: [],
  });
  check("error" in videSelection, "aucune sélection → refus explicite, pas une remise vide");

  const echecs = await prisma.auditLog.count({
    where: { schoolId: A.id, entity: "diffusion", action: "diffusion.prepare", details: { contains: '"outcome":"failure"' } },
  });
  check(echecs > 0, `${echecs} tentatives refusées sont tracées — l'audit garde aussi les échecs`);

  /* ═══════ N. PRISMA ═══════ */
  console.log("\n═══ N. SCHÉMA ═══\n");

  const schema = read("prisma/schema.prisma");
  check(!/model\s+Diffusion\b/.test(schema) && !/model\s+DocumentShare\b/.test(schema),
    "aucune table de diffusion n'a été créée — AuditLog suffisait, comme au lot 16");
  check(/entity\s+String/.test(schema), "`AuditLog.entity` reste générique : le nouveau type y entre sans migration");
}

async function cleanup() {
  console.log("\n═══ NETTOYAGE ═══\n");
  const supabase = createAdminClient();
  try {
    if (trash.paths.length) await supabase.storage.from(BUCKET).remove(trash.paths);
    await prisma.auditLog.deleteMany({ where: { OR: [
      { entityId: { in: [...trash.schoolDocIds, ...trash.studentDocIds, ...trash.studentIds] } },
      { userId: { in: trash.userIds } },
    ] } });
    await prisma.studentDocument.deleteMany({ where: { id: { in: trash.studentDocIds } } });
    await prisma.schoolDocument.deleteMany({ where: { id: { in: trash.schoolDocIds } } });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: trash.studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: trash.studentIds } } });
    await prisma.class.deleteMany({ where: { id: { in: trash.classIds } } });
    await prisma.documentFolder.deleteMany({ where: { id: { in: trash.folderIds } } });
    await prisma.user.deleteMany({ where: { id: { in: trash.userIds } } });
    const rest = await prisma.student.count({ where: { firstName: { startsWith: TAG } } })
      + await prisma.user.count({ where: { firstName: { startsWith: TAG } } })
      + await prisma.schoolDocument.count({ where: { title: { startsWith: TAG } } });
    console.log(`  ${rest === 0 ? "✓" : "✗"} fixtures supprimées — reste ${rest} objet(s) marqué(s) ${TAG}`);
  } catch (e) {
    console.log(`  ✗ nettoyage incomplet : ${e instanceof Error ? e.message : String(e)}`);
  }
}

main()
  .catch((e) => { failures++; console.error("\n✗ ERREUR :", e); })
  .finally(async () => {
    await cleanup();
    console.log("\n" + "═".repeat(74));
    console.log(`  ${checks} contrôles — ${checks - failures} réussis, ${failures} échoués${skipped ? `, ${skipped} non concluants` : ""}`);
    console.log("═".repeat(74));
    await prisma.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
