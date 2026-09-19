import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Re-evaluating Prisma client instance
const globalForPrisma = global as unknown as { prisma?: PrismaClient; pool?: Pool };

const connectionString = `${process.env.DATABASE_URL}`;

let schema: string | undefined;
let parsedLimit = 5;
try {
  const parsedUrl = new URL(connectionString);
  parsedLimit = parseInt(parsedUrl.searchParams.get("connection_limit") || "5", 10);
  schema = parsedUrl.searchParams.get("schema") || undefined;
} catch {}

const pool =
  globalForPrisma.pool ||
  new Pool({
    connectionString,
    max: parsedLimit,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool, schema ? { schema } : undefined);

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

if (process.env.NODE_ENV !== "production") {
  const EXPECTED_MODELS = [
    "user",
    "school",
    "student",
    "class",
    "enrollment",
    "grade",
    "reportCard",
    "evaluation",
    "term",
    "subject",
    "invoice",
    "payment",
    "attendance",
    "schoolDocument",
    "studentDocument",
    "documentReminder",
    "documentFolder",
    "message",
    "whatsAppConversation",
    "teachingAssignment",
  ] as const;

  const missing = EXPECTED_MODELS.filter((m) => (basePrisma as any)[m] === undefined);
  if (missing.length > 0) {
    const errorMsg = "Client Prisma obsolète — relancez prisma generate et redémarrez";
    console.error(`\n[PRISMA GUARD] ⛔ Modèle(s) manquant(s) sur le client Prisma : ${missing.join(", ")}`);
    console.error(`[PRISMA GUARD] ⛔ ${errorMsg}\n`);
    throw new Error(errorMsg);
  }
}

export const prisma =
  process.env.NODE_ENV !== "production"
    ? new Proxy(basePrisma, {
        get(target, prop, receiver) {
          const val = Reflect.get(target, prop, receiver);
          if (
            val === undefined &&
            typeof prop === "string" &&
            !prop.startsWith("$") &&
            !prop.startsWith("_") &&
            prop !== "then" &&
            prop !== "toJSON"
          ) {
            const errorMsg = "Client Prisma obsolète — relancez prisma generate et redémarrez";
            console.error(`\n[PRISMA GUARD] ⛔ Modèle '${prop}' introuvable sur le client Prisma.`);
            console.error(`[PRISMA GUARD] ⛔ ${errorMsg}\n`);
            throw new Error(errorMsg);
          }
          return val;
        },
      })
    : basePrisma;

