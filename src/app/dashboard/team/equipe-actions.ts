"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "@/lib/actionContext";
import { recordAudit } from "@/lib/audit";
import { emailSchema, nameSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/phone";
import { accesValides, appliquerConfiguration, configValide, configurationDe, motDePasseProvisoire } from "@/lib/equipe";
import { envoyerEmailInvitation } from "@/lib/email";
import type { Role } from "@/generated/prisma/client";

/**
 * Équipe — parcours « Ajouter un membre » et fiche membre (26 sept. 2026).
 * Seule la direction (OWNER, ADMIN) gère l'équipe et les accès : c'est l'un
 * des domaines « toujours réservés à la direction » (`RESERVE_DIRECTION`).
 */
const METIERS: Role[] = ["TEACHER", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "ADMIN"];

type Saisie = {
  prenom: string;
  nom: string;
  telephone?: string;
  email: string;
  mode: "COMPTE" | "LIEN";
  role: string;
  config: unknown;
  acces: unknown;
};

export type ResultatMembre =
  | { ok: true; message: string; telephone: string | null; lien?: string; emailEnvoye?: boolean; emailErreur?: string }
  | { ok: false; error: string };

async function direction() {
  const auth = await requireActionContext("/dashboard/team");
  if (!auth.ok) return { error: auth.error } as const;
  if (auth.ctx.role !== "OWNER" && auth.ctx.role !== "ADMIN") return { error: "Seule la direction gère l'équipe et les accès." } as const;
  return { ctx: auth.ctx } as const;
}

const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

function rafraichir() {
  for (const p of ["/dashboard/team", "/dashboard", "/dashboard/classes", "/dashboard/pedagogy", "/dashboard/grades"]) revalidatePath(p);
}

export async function creerMembre(s: Saisie): Promise<ResultatMembre> {
  const d = await direction();
  if ("error" in d) return { ok: false, error: d.error! };
  const { ctx } = d;
  if (!ctx.emailVerified) return { ok: false, error: "Confirmez d'abord votre adresse e-mail." };

  const prenom = nameSchema.safeParse(s.prenom);
  if (!prenom.success) return { ok: false, error: `Prénom : ${prenom.error.issues[0]?.message ?? "invalide"}` };
  const nom = nameSchema.safeParse(s.nom);
  if (!nom.success) return { ok: false, error: `Nom : ${nom.error.issues[0]?.message ?? "invalide"}` };
  const mail = emailSchema.safeParse(s.email.trim().toLowerCase());
  if (!mail.success) return { ok: false, error: `E-mail : ${mail.error.issues[0]?.message ?? "invalide"}` };
  const email = mail.data;
  if (!METIERS.includes(s.role as Role)) return { ok: false, error: "Choisissez un métier." };
  const role = s.role as Role;
  let telephone: string | null = null;
  if (s.telephone?.trim()) {
    const n = normalizePhone(s.telephone);
    if (!n.isValid) return { ok: false, error: "Téléphone invalide." };
    telephone = n.e164;
  }

  const config = await configValide(ctx.schoolId, s.config);
  const acces = accesValides(role, s.acces);
  const ecole = ctx.school?.name ?? "votre école";

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, error: "Un compte existe déjà avec cet e-mail." };
  }

  if (s.mode === "LIEN") {
    let invitation = await prisma.invitation.findFirst({ where: { email, schoolId: ctx.schoolId, status: "PENDING" } });
    if (invitation) {
      invitation = await prisma.invitation.update({
        where: { id: invitation.id },
        data: { role },
      });
    } else {
      invitation = await prisma.invitation.create({ data: { email, role, schoolId: ctx.schoolId } });
    }
    await prisma.staffSetup.upsert({
      where: { schoolId_email: { schoolId: ctx.schoolId, email } },
      create: { schoolId: ctx.schoolId, email, assignments: config, capabilities: acces, createdById: ctx.userId },
      update: { assignments: config, capabilities: acces, createdById: ctx.userId, appliedAt: null },
    });
    await recordAudit(ctx, { action: "invite", entity: "user", details: { email, role, acces, classes: config.titulaire.length, matieres: config.matieres.length } });
    rafraichir();
    const lien = `${baseUrl()}/invite?token=${invitation.token}`;

    const inviteur = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true, lastName: true },
    });
    const inviteurNom = inviteur ? `${inviteur.firstName} ${inviteur.lastName}`.trim() : "La direction";

    // Envoi de l'e-mail d'invitation via Resend
    const resEmail = await envoyerEmailInvitation({
      destinataire: email,
      nomDestinataire: `${prenom.data} ${nom.data}`,
      nomEcole: ecole,
      role,
      lien,
      inviteurNom,
    });

    return {
      ok: true,
      telephone,
      lien,
      emailEnvoye: resEmail.success,
      emailErreur: resEmail.error,
      message: `Bonjour ${prenom.data}, vous êtes invité(e) à rejoindre l'équipe de ${ecole} sur EduCom.\nCréez votre accès ici : ${lien}\nVos classes et vos accès seront prêts dès votre inscription.`,
    };
  }

  const motDePasse = motDePasseProvisoire();
  let userId: string;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: motDePasse,
      email_confirm: true,
      user_metadata: { firstName: prenom.data, lastName: nom.data, role, schoolId: ctx.schoolId },
    });
    if (error || !data.user) return { ok: false, error: `Création du compte impossible : ${error?.message ?? "erreur inconnue"}` };
    userId = data.user.id;
  } catch {
    return { ok: false, error: "Création de compte indisponible (clé d'administration Supabase absente). Utilisez « Je lui envoie un lien »." };
  }

  await prisma.user.upsert({
    where: { id: userId },
    update: { firstName: prenom.data, lastName: nom.data, role, schoolId: ctx.schoolId, phone: telephone, emailVerified: true },
    create: { id: userId, email, firstName: prenom.data, lastName: nom.data, role, schoolId: ctx.schoolId, phone: telephone, emailVerified: true, password: "" },
  });
  await prisma.schoolMembership
    .upsert({
      where: { userId_schoolId_role: { userId, schoolId: ctx.schoolId, role } },
      create: { userId, schoolId: ctx.schoolId, role, isPrimary: true },
      update: { active: true },
    })
    .catch(() => null);
  await appliquerConfiguration({ schoolId: ctx.schoolId, userId, role, config, acces, parId: ctx.userId });
  await prisma.invitation.deleteMany({ where: { schoolId: ctx.schoolId, email } }).catch(() => null);
  await recordAudit(ctx, { action: "create", entity: "user", entityId: userId, details: { role, acces, classes: config.titulaire.length, matieres: config.matieres.length } });
  rafraichir();
  return {
    ok: true,
    telephone,
    message: `Bonjour ${prenom.data}, votre accès EduCom (${ecole}) est prêt.\nLien : ${baseUrl()}/login\nIdentifiant : ${email}\nMot de passe provisoire : ${motDePasse}\nChangez-le dans « Mon compte » après votre première connexion.`,
  };
}

export async function annulerInvitation(id: string): Promise<{ ok: boolean; error?: string }> {
  const d = await direction();
  if ("error" in d) return { ok: false, error: d.error };
  const inv = await prisma.invitation.findUnique({ where: { id, schoolId: d.ctx.schoolId } });
  if (!inv) return { ok: false, error: "Invitation introuvable." };
  await prisma.invitation.delete({ where: { id } });
  await prisma.staffSetup.deleteMany({ where: { schoolId: d.ctx.schoolId, email: inv.email } }).catch(() => null);
  rafraichir();
  return { ok: true };
}

export async function renvoyerEmailInvitation(id: string): Promise<{ ok: boolean; error?: string }> {
  const d = await direction();
  if ("error" in d) return { ok: false, error: d.error };
  const { ctx } = d;
  const inv = await prisma.invitation.findUnique({
    where: { id, schoolId: ctx.schoolId },
    include: { school: true },
  });
  if (!inv) return { ok: false, error: "Invitation introuvable." };
  if (inv.status !== "PENDING") return { ok: false, error: "Cette invitation a déjà été acceptée." };

  const lien = `${baseUrl()}/invite?token=${inv.token}`;
  const inviteur = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { firstName: true, lastName: true },
  });
  const inviteurNom = inviteur ? `${inviteur.firstName} ${inviteur.lastName}`.trim() : "La direction";

  const res = await envoyerEmailInvitation({
    destinataire: inv.email,
    nomDestinataire: "",
    nomEcole: inv.school?.name ?? "votre école",
    role: inv.role,
    lien,
    inviteurNom,
  });

  if (!res.success) {
    return { ok: false, error: res.error || "Échec de l'envoi de l'e-mail." };
  }

  return { ok: true };
}

/** Fiche membre : métier, classes & matières, accès en plus. Tout est remplacé d'un coup. */
export async function modifierMembre(s: { userId: string; role: string; managerId?: string | null; config: unknown; acces: unknown }): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = await direction();
  if ("error" in d) return { ok: false, error: d.error! };
  const { ctx } = d;
  const cible = await prisma.user.findFirst({ where: { id: s.userId, schoolId: ctx.schoolId }, select: { id: true, role: true } });
  if (!cible) return { ok: false, error: "Membre introuvable." };
  if (cible.role === "PARENT") return { ok: false, error: "Ce compte n'est pas un membre du personnel." };
  if (cible.role === "OWNER" && s.role !== "OWNER") return { ok: false, error: "Le métier du propriétaire ne change pas." };
  const role = (cible.role === "OWNER" ? "OWNER" : s.role) as Role;
  if (role !== "OWNER" && !METIERS.includes(role)) return { ok: false, error: "Métier invalide." };

  const config = await configValide(ctx.schoolId, s.config);
  const acces = accesValides(role, s.acces);
  const managerId = s.managerId || null;
  if (managerId === cible.id) return { ok: false, error: "Un membre ne peut pas être son propre responsable." };
  if (managerId && !(await prisma.user.findFirst({ where: { id: managerId, schoolId: ctx.schoolId, role: { not: "PARENT" } }, select: { id: true } }))) {
    return { ok: false, error: "Responsable introuvable." };
  }
  if (s.managerId !== undefined) await prisma.user.update({ where: { id: cible.id }, data: { managerId } });

  if (role !== cible.role) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: cible.id }, data: { role } }),
      prisma.schoolMembership.updateMany({ where: { userId: cible.id, schoolId: ctx.schoolId, role: cible.role }, data: { role } }),
    ]);
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient().auth.admin.updateUserById(cible.id, { user_metadata: { role } });
    } catch {
      /* non bloquant : la base fait foi */
    }
  }
  const avant = await configurationDe(ctx.schoolId, cible.id);
  await appliquerConfiguration({ schoolId: ctx.schoolId, userId: cible.id, role, config, acces, parId: ctx.userId, etaitEnseignant: cible.role === "TEACHER" });
  await recordAudit(ctx, {
    action: "update_access",
    entity: "user",
    entityId: cible.id,
    details: { roleAvant: cible.role, role, accesAvant: avant.acces, acces, classes: config.titulaire.length, matieres: config.matieres.length },
  });
  rafraichir();
  return { ok: true };
}
