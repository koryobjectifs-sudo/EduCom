/**
 * Test d'intégrité de la navigation applicative.
 *
 * Vérifie :
 * 1. Que `/dashboard` n'a aucun espace métier actif (vue d'ensemble sans sidebar).
 * 2. Que CHAQUE sous-route sous /dashboard appartient à l'un des 5 espaces métier (Scolarité, Documents, Pédagogie, Finance, Admin).
 * 3. Qu'AUCUNE route accessible n'est orpheline (c-à-d absente de toute sidebar ou ne résolvant vers aucun élément de navigation).
 * 4. Que Scolarité regroupe élèves, dossiers, admissions, annuaire et classes.
 * 5. Que Documents regroupe documents et communications.
 */
import fs from "fs";
import path from "path";
import { NAV_SPACES, getActiveSpaceId, isActive } from "../src/lib/navigation";

function findDashboardPages(dir: string, base = ""): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dir, dirent.name);
    const relPath = path.join(base, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(findDashboardPages(fullPath, relPath));
    } else if (dirent.name === "page.tsx" || dirent.name === "page.ts") {
      results.push(base);
    }
  }
  return results;
}

const dashboardRoutes = findDashboardPages(path.join(process.cwd(), "src/app/dashboard"), "/dashboard").sort();

console.log("\n=== TEST D'INTÉGRITÉ DU RATTACHEMENT DES ROUTES AUX ESPACES ===\n");
console.log(`Nombre total de routes analysées : ${dashboardRoutes.length}\n`);

let failCount = 0;
const orphanRoutes: string[] = [];
const misassignedRoutes: { route: string; expected: string; got: string | null }[] = [];

for (const route of dashboardRoutes) {
  if (route === "/dashboard") {
    const spaceId = getActiveSpaceId(route, NAV_SPACES);
    if (spaceId !== null) {
      console.error(`❌ [ACCUEIL] /dashboard devrait avoir spaceId = null (aucun espace métier), obtenu: ${spaceId}`);
      failCount++;
      misassignedRoutes.push({ route, expected: "null", got: spaceId });
    } else {
      console.log(`✓ ${route.padEnd(46)} -> [Tableau de bord (Plein écran)] | Espace actif: Aucun (Normal)`);
    }
    continue;
  }

  const spaceId = getActiveSpaceId(route, NAV_SPACES);
  const space = NAV_SPACES.find((s) => s.id === spaceId);

  if (!space) {
    console.error(`❌ [ESPACE INVALIDE] ${route} -> Aucun espace associé`);
    failCount++;
    orphanRoutes.push(route);
    continue;
  }

  // Vérifier si la route matche un élément de sidebar
  let matchedItem = null;
  for (const sec of space.sections) {
    for (const item of sec.items) {
      if (isActive(item.href, route)) {
        matchedItem = item;
        break;
      }
    }
    if (matchedItem) break;
  }

  if (!matchedItem) {
    console.error(`❌ [ORPHELINE] ${route} -> Appartient à [${space.label}] mais aucun item de sidebar ne la couvre !`);
    failCount++;
    orphanRoutes.push(route);
  } else {
    // Vérifications de rattachement métier spécifique
    if (route.startsWith("/dashboard/classes") && spaceId !== "students") {
      misassignedRoutes.push({ route, expected: "students", got: spaceId });
      failCount++;
    } else if (route.startsWith("/dashboard/directory") && spaceId !== "students") {
      misassignedRoutes.push({ route, expected: "students", got: spaceId });
      failCount++;
    } else if (route.startsWith("/dashboard/students") && spaceId !== "students") {
      misassignedRoutes.push({ route, expected: "students", got: spaceId });
      failCount++;
    } else if (route.startsWith("/dashboard/documents") && spaceId !== "documents") {
      misassignedRoutes.push({ route, expected: "documents", got: spaceId });
      failCount++;
    } else if (route.startsWith("/dashboard/communications") && spaceId !== "documents") {
      misassignedRoutes.push({ route, expected: "documents", got: spaceId });
      failCount++;
    }

    console.log(`✓ ${route.padEnd(46)} -> [${space.label.padEnd(10)}] | Couverte par: ${matchedItem.name}`);
  }
}

console.log("\n-------------------------------------------------------------");
if (failCount > 0) {
  console.error(`❌ ÉCHEC : ${failCount} anomalie(s) détectée(s) dans la navigation !`);
  if (orphanRoutes.length > 0) {
    console.error(`Routes orphelines (${orphanRoutes.length}) :`, orphanRoutes);
  }
  if (misassignedRoutes.length > 0) {
    console.error("Routes mal rattachées :", misassignedRoutes);
  }
  process.exit(1);
} else {
  console.log(`✓ SUCCÈS : 100% des ${dashboardRoutes.length} routes sont rattachées à leur espace et couvertes sans aucune orpheline.\n`);
  process.exit(0);
}
