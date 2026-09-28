import { defineConfig } from "prisma/config";

// Le schéma est une COPIE de ../prisma/schema.prisma (scripts/schema.mjs).
// Aucune migration ici : la base appartient à EduCom.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
