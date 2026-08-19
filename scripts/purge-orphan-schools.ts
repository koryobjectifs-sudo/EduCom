/**
 * Supprime les établissements FANTÔMES laissés par les inscriptions échouées.
 *
 * ═══ D'OÙ ILS VIENNENT ═══
 *
 * Avant le 19 août 2026, `register/actions.ts` créait l'école PUIS
 * l'utilisateur, en deux écritures indépendantes. Quand la seconde échouait —
 * adresse déjà inscrite, la plus fréquente — l'école restait, vide et sans
 * propriétaire. La cause est corrigée (les deux écritures sont désormais dans
 * une transaction) ; ce script nettoie ce qu'elle a laissé.
 *
 * ═══ CE QU'IL NE TOUCHE PAS ═══
 *
 * ⚠️ `Enrollment.classId` et `Grade.classId` sont en `onDelete: Cascade`
 * (règle 4 d'`AGENTS.md`) : supprimer une école emporterait silencieusement ce
 * qui lui est rattaché. Le script ne retient donc QUE les écoles dont **tous**
 * les compteurs sont à zéro, et il les affiche avant d'écrire. Une école avec
 * ne serait-ce qu'un utilisateur n'est pas un fantôme : c'est un compte réel
 * qui n'a pas fini son installation.
 *
 *   npm run script -- scripts/purge-orphan-schools.ts          → essai à blanc
 *   APPLY=1 npm run script -- scripts/purge-orphan-schools.ts  → applique
 */
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const APPLY = process.env.APPLY === "1";

async function main() {
  console.log(APPLY ? "== MODE RÉEL ==\n" : "== ESSAI À BLANC (aucune écriture) ==\n");

  const ecoles = await prisma.school.findMany({
    select: {
      id: true, name: true, email: true, createdAt: true,
      _count: {
        select: {
          users: true, students: true, classes: true, invoices: true, payments: true,
          subjects: true, terms: true, messages: true, studentDocuments: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
  const fantomes = ecoles.filter((e) => total(e._count) === 0);

  console.log(`${ecoles.length} établissement(s) en base.\n`);
  for (const e of ecoles) {
    const n = total(e._count);
    const marque = n === 0 ? "FANTÔME" : "       ";
    console.log(`  ${marque}  ${e.name.padEnd(28)} ${e.id.slice(0, 8)}  ${n} objet(s) rattaché(s)  ${e.createdAt.toISOString().slice(0, 10)}`);
  }

  if (fantomes.length === 0) { console.log("\nAucun fantôme. Rien à faire."); return; }

  console.log(`\n${fantomes.length} établissement(s) à supprimer, tous à zéro objet rattaché.`);

  if (!APPLY) {
    console.log("\n→ ESSAI À BLANC. Relancer avec APPLY=1 pour appliquer.");
    return;
  }

  // Sauvegarde avant écriture : la suppression n'est pas réversible.
  const fichier = `backups/ecoles-fantomes-${Date.now()}.json`;
  writeFileSync(fichier, JSON.stringify(fantomes, null, 2), "utf8");
  console.log(`\nSauvegarde : ${fichier}`);

  for (const e of fantomes) {
    // ⚠️ Relecture des compteurs juste avant la suppression : entre l'affichage
    // et l'écriture, quelqu'un a pu s'inscrire.
    const frais = await prisma.school.findUnique({
      where: { id: e.id },
      select: { _count: { select: { users: true, students: true, classes: true } } },
    });
    if (!frais || total(frais._count) > 0) {
      console.log(`  ignoré (n'est plus vide) : ${e.name}`);
      continue;
    }
    await prisma.school.delete({ where: { id: e.id } });
    console.log(`  supprimé : ${e.name} (${e.id.slice(0, 8)})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
