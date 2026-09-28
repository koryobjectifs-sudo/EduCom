import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lireJeton, secret } from "@/lib/session";

/**
 * Accès au pilotage — compte PROPRE à l'outil (`PilotageAccount`), sans lien
 * avec les comptes EduCom. Cookie httpOnly, SameSite=Strict, 12 h.
 */
export const COOKIE = "pilotage_session";

export type Pilote = { userId: string; email: string };

async function lire(): Promise<Pilote | null> {
  const jeton = (await cookies()).get(COOKIE)?.value;
  const id = lireJeton(jeton, secret());
  if (!id) return null;
  const c = await prisma.pilotageAccount.findUnique({ where: { id }, select: { id: true, email: true } });
  return c ? { userId: `pilotage:${c.id}`, email: c.email } : null;
}

/** Pages : sans session → écran de connexion. */
export const exigerPilotePage = cache(async function exigerPilotePage(): Promise<Pilote> {
  const p = await lire();
  if (!p) redirect("/connexion");
  return p;
});

/** Actions serveur : `null` sans session valide. */
export async function pilote(): Promise<Pilote | null> {
  return lire();
}

/** L'installation (1er compte) n'est ouverte qu'en local. */
export async function estLocal(): Promise<boolean> {
  const hote = ((await headers()).get("host") ?? "").split(":")[0];
  return hote === "localhost" || hote === "127.0.0.1" || hote === "[::1]";
}
