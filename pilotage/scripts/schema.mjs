// Copie le schéma Prisma d'EduCom (source unique : ../prisma/schema.prisma)
// dans pilotage/prisma/, pour générer le client dans pilotage/src/generated.
// La copie est ignorée par Git : aucune dérive possible entre les deux.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ici = dirname(dirname(fileURLToPath(import.meta.url)));
mkdirSync(join(ici, "prisma"), { recursive: true });
copyFileSync(join(ici, "..", "prisma", "schema.prisma"), join(ici, "prisma", "schema.prisma"));
console.log("[pilotage] schéma EduCom copié");
