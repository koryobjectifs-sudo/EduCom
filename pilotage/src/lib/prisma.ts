import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Client Prisma du pilotage, branché sur la base d'EduCom (`DATABASE_URL`).
 * Petit pool : un seul utilisateur, quelques lectures par page.
 */
const g = global as unknown as { prismaPilotage?: PrismaClient };
function creer() {
  const url = process.env.DATABASE_URL ?? "";
  let schema: string | undefined;
  try {
    schema = new URL(url).searchParams.get("schema") ?? undefined;
  } catch {
    /* URL absente : l'erreur arrivera à la première requête */
  }
  const pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 15_000 });
  return new PrismaClient({ adapter: new PrismaPg(pool, schema ? { schema } : undefined) });
}
export const prisma = g.prismaPilotage ?? creer();
if (process.env.NODE_ENV !== "production") g.prismaPilotage = prisma;
