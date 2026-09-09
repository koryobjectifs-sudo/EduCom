import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Re-evaluating Prisma client instance
const globalForPrisma = global as unknown as { prisma?: PrismaClient; pool?: Pool };

const connectionString = `${process.env.DATABASE_URL}`;

const parsedLimit = parseInt(new URL(connectionString).searchParams.get("connection_limit") || "5", 10);

const pool =
  globalForPrisma.pool ||
  new Pool({
    connectionString,
    max: parsedLimit,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
