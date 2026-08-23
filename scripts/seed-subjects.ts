/**
 * Construit l'arbre des matières et le rattache aux classes.
 *
 * Les matières sont définies **explicitement par niveau** : un CI n'a pas le
 * même programme qu'un CM2, et raisonner par exclusions donnait des listes
 * irréalistes (16 matières au CI). Chaque classe déclare ce qu'elle enseigne.
 *
 * Le script SYNCHRONISE : il ajoute ce qui manque et retire ce qui ne devrait
 * plus être là — mais jamais une matière qui porte déjà des notes.
 *
 * ⚠️ GARDE-FOU AJOUTÉ LE 19 AOÛT 2026. Le script visait la PREMIÈRE école de la
 * base : sur une base à trois établissements, il synchronisait les matières
 * d'un établissement choisi par hasard — et il SUPPRIME des matières (celles
 * qui ne portent pas de notes). L'établissement doit donc être nommé.
 *
 *   npm run script -- scripts/seed-subjects.ts                        -> refuse
 *   SCHOOL_ID=<uuid> npm run script -- scripts/seed-subjects.ts        -> essai à blanc
 *   SCHOOL_ID=<uuid> APPLY=1 npm run script -- scripts/seed-subjects.ts -> applique
 */

import { prisma } from "./_env";
import { APPLY, resoudreCible } from "./_cible";



/**
 * ⚠️ **LE PROGRAMME NE VIT PLUS ICI — 22 août 2026.**
 *
 * Il a été déplacé dans `src/lib/curriculum.ts`, importé ci-dessous. La raison
 * est simple : l'application en a besoin. Une école qui s'inscrit doit pouvoir
 * installer ce programme depuis son navigateur, et non attendre qu'un
 * développeur lance ce script avec `SCHOOL_ID=` dans son terminal. Deux copies
 * du programme auraient fini par diverger — celle du script et celle du bouton.
 *
 * ⚠️ **Ce script et `applyCurriculum()` restent DEUX comportements distincts, et
 * il ne faut pas les confondre :**
 *
 *   · **ici** — SYNCHRONISATION : ajoute ce qui manque **et retire** ce qui
 *     n'est pas au programme type (sauf matière notée). Outil de développeur,
 *     essai à blanc par défaut, établissement nommé obligatoire.
 *   · **`applyCurriculum()`** — ADDITION seule : ne supprime jamais rien.
 *     C'est ce que déclenche un bouton dans l'interface, où l'utilisateur ne
 *     peut pas faire d'essai à blanc et où effacer son travail serait
 *     inacceptable.
 *
 * La liste des matières est commune ; la politique d'écriture ne l'est pas.
 */
import {
  SUBJECT_TREE as TREE,
  STANDALONE_SUBJECTS as FLAT,
  PROGRAMME_BY_CLASS as PROGRAMME,
  PROGRAMME_COLLEGE as COLLEGE,
  PROGRAMME_LYCEE as LYCEE,
} from "../src/lib/curriculum";

async function main() {
  const cible = await resoudreCible("les MATIÈRES d'un établissement (et en supprime)", prisma as never);
  if (!cible) return;
  const schoolId = cible.id;

  // --- Ménage : "Math" doublonne "Mathématiques" ---------------------------
  const math = await prisma.subject.findFirst({ where: { schoolId, name: "Math" } });
  const maths = await prisma.subject.findFirst({ where: { schoolId, name: "Mathématiques" } });
  if (math && maths) {
    console.log(`Fusion "Math" -> "Mathématiques"`);
    if (APPLY) {
      await prisma.grade.updateMany({ where: { subjectId: math.id }, data: { subjectId: maths.id } });
      await prisma.subject.delete({ where: { id: math.id } });
    }
  }

  // --- L'arbre -------------------------------------------------------------
  const idByName = new Map<string, string>();

  async function ensureSubject(name: string, parentId: string | null): Promise<string> {
    const existing = await prisma.subject.findFirst({ where: { schoolId, name } });
    if (existing) {
      if (existing.parentId !== parentId && APPLY) {
        await prisma.subject.update({ where: { id: existing.id }, data: { parentId } });
      }
      return existing.id;
    }
    if (!APPLY) return `dry-${name}`;
    const created = await prisma.subject.create({ data: { name, parentId, schoolId } });
    return created.id;
  }

  for (const [group, children] of Object.entries(TREE)) {
    const parentId = await ensureSubject(group, null);
    idByName.set(group, parentId);
    for (const child of children) idByName.set(child, await ensureSubject(child, parentId));
  }
  for (const name of FLAT) {
    if (!idByName.has(name)) idByName.set(name, await ensureSubject(name, null));
  }

  // --- Synchronisation classe <-> matières ---------------------------------
  const classes = await prisma.class.findMany({ where: { schoolId } });
  console.log("Programme par classe :\n");

  for (const cls of classes) {
    const wanted =
      PROGRAMME[cls.name] ??
      (cls.cycle === "LYCEE" ? LYCEE : cls.cycle === "COLLEGE" ? COLLEGE : []);

    if (wanted.length === 0) {
      console.log(`  ${cls.name.padEnd(12)} — aucun programme défini, ignorée`);
      continue;
    }

    const wantedIds = new Set(
      wanted.map((n) => idByName.get(n)).filter(Boolean) as string[]
    );

    const current = await prisma.classSubject.findMany({
      where: { classId: cls.id },
      include: { subject: true },
    });
    const currentIds = new Set(current.map((c) => c.subjectId));

    let added = 0;
    for (const id of wantedIds) {
      if (currentIds.has(id)) continue;
      added++;
      if (APPLY) await prisma.classSubject.create({ data: { classId: cls.id, subjectId: id } });
    }

    let removed = 0;
    let protectedCount = 0;
    for (const link of current) {
      if (wantedIds.has(link.subjectId)) continue;
      // On ne retire jamais une matière déjà notée : ce serait effacer du travail.
      const graded = await prisma.grade.count({
        where: { classId: cls.id, subjectId: link.subjectId },
      });
      if (graded > 0) { protectedCount++; continue; }
      removed++;
      if (APPLY) await prisma.classSubject.delete({ where: { id: link.id } });
    }

    const detail = [
      added ? `+${added}` : null,
      removed ? `-${removed}` : null,
      protectedCount ? `${protectedCount} conservée(s) car notée(s)` : null,
    ].filter(Boolean).join("  ");

    console.log(`  ${cls.name.padEnd(12)} ${wanted.length} matière(s)  ${detail}`);
  }

  if (!APPLY) console.log("\nEssai à blanc : rien écrit. Relance avec APPLY=1.");
  else {
    const links = await prisma.classSubject.count();
    console.log(`\nAppliqué. ${links} rattachements classe↔matière.`);
  }
}

main()
  .catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); })
  // ⚠️ Pas de `pool.end()` ici. Le pool `pg` vit dans `src/lib/prisma.ts`, n'est
  // pas exporté, et `$disconnect()` le relâche. L'appel qui traînait ici datait
  // de l'époque où ce script construisait son propre client : il levait
  // `ReferenceError: pool is not defined` DANS le `finally`, donc APRÈS que les
  // écritures aient été validées — le script sortait en erreur alors que les
  // données étaient bien en base. Motif identique à `seed-classes.ts`.
  .finally(() => prisma.$disconnect());
