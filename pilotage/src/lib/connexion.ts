"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE, estLocal } from "@/lib/acces";
import { creerJeton, DUREE_SESSION_MS, hacher, motDePasseValide, secret, verifier } from "@/lib/session";

/**
 * Connexion au pilotage (compte propre, sans lien avec EduCom).
 * Blocage : 5 échecs → 15 minutes. Message volontairement identique pour
 * « e-mail inconnu » et « mauvais mot de passe ».
 */
type R = { error: string } | undefined;
const ECHECS_MAX = 5;
const BLOCAGE_MS = 15 * 60 * 1000;

async function ouvrirSession(id: string) {
  (await cookies()).set(COOKIE, creerJeton(id, secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DUREE_SESSION_MS / 1000,
  });
}

export async function seConnecter(_: R, fd: FormData): Promise<R> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const mdp = String(fd.get("motDePasse") ?? "");
  const c = await prisma.pilotageAccount.findUnique({ where: { email } }).catch(() => null);
  if (c?.lockedUntil && c.lockedUntil > new Date()) return { error: "Trop d'essais. Réessayez dans quelques minutes." };
  if (!c || !(await verifier(mdp, c.passwordHash))) {
    if (c) {
      const n = c.failedCount + 1;
      await prisma.pilotageAccount.update({ where: { id: c.id }, data: n >= ECHECS_MAX ? { failedCount: 0, lockedUntil: new Date(Date.now() + BLOCAGE_MS) } : { failedCount: n } });
    }
    return { error: "E-mail ou mot de passe incorrect." };
  }
  await prisma.pilotageAccount.update({ where: { id: c.id }, data: { failedCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await ouvrirSession(c.id);
  redirect("/");
}

export async function seDeconnecter() {
  (await cookies()).delete(COOKIE);
  redirect("/connexion");
}

/** Création du PREMIER compte : seulement en local, et seulement si aucun compte n'existe. */
export async function installer(_: R, fd: FormData): Promise<R> {
  if (!(await estLocal())) return { error: "L'installation n'est possible qu'en local." };
  if ((await prisma.pilotageAccount.count()) > 0) return { error: "Un compte existe déjà : connectez-vous." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const mdp = String(fd.get("motDePasse") ?? "");
  const confirmation = String(fd.get("confirmation") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "E-mail invalide." };
  const faible = motDePasseValide(mdp);
  if (faible) return { error: faible };
  if (mdp !== confirmation) return { error: "Les deux mots de passe diffèrent." };
  const c = await prisma.pilotageAccount.create({ data: { email, passwordHash: await hacher(mdp) } });
  await ouvrirSession(c.id);
  redirect("/");
}
