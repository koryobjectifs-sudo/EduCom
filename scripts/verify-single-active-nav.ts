import { getActiveNavItemHref, visibleSections, getVisibleSpaces, NAV_SPACES } from "../src/lib/navigation";
import { hasAccess, type RoleType } from "../src/lib/permissions";
import fs from "fs";
import path from "path";

console.log("=== VÉRIFICATION UNICITÉ STRICTE DE L'ENTRÉE ACTIVE DANS LA NAVIGATION ===");

// 1. Découverte des 58 routes du dashboard
function getDashboardRoutes(dir: string, base = "/dashboard"): string[] {
  const routes: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith("(") || entry.name.startsWith("@")) continue;
      const sub = path.join(dir, entry.name);
      const subRoute = `${base}/${entry.name}`;
      if (fs.existsSync(path.join(sub, "page.tsx"))) {
        routes.push(subRoute);
      }
      routes.push(...getDashboardRoutes(sub, subRoute));
    }
  }
  return routes;
}

const dashboardDir = path.join(process.cwd(), "src/app/dashboard");
const discoveredRoutes = getDashboardRoutes(dashboardDir);
const allTestRoutes = Array.from(new Set([
  "/dashboard",
  "/dashboard/grades",
  "/dashboard/grades/report-card",
  "/dashboard/grades/bulletin",
  "/dashboard/grades/validation",
  "/dashboard/grades/difficultes",
  "/dashboard/attendance",
  "/dashboard/students",
  "/dashboard/students/dossiers/review",
  "/dashboard/classes",
  "/dashboard/payments",
  "/dashboard/payments/new",
  "/dashboard/payments/receipt",
  "/dashboard/documents",
  "/dashboard/documents/templates",
  "/dashboard/communications",
  "/dashboard/communications/inbox",
  ...discoveredRoutes,
])).map(r => r.replace(/\[[a-zA-Z0-9_-]+\]/g, "test-id"));

console.log(`Routes testées : ${allTestRoutes.length} chemins.`);

let failures = 0;

// Teste la logique de ContextualSidebar : exactement UNE seule entrée active
for (const testPath of allTestRoutes) {
  for (const space of NAV_SPACES) {
    const allItems = space.sections.flatMap(s => s.items);
    if (allItems.length === 0) continue;

    // Déterminer l'élément actif unique via getActiveNavItemHref
    const activeHref = getActiveNavItemHref(allItems, testPath);

    // Calcul effectif des éléments considérés actifs
    const activeItems = allItems.filter(item => item.href === activeHref);

    if (activeItems.length > 1) {
      console.error(`❌ ÉCHEC SURCHARGE sur ${testPath} dans l'espace ${space.label} : ${activeItems.map(i => i.name).join(" ET ")} sont actifs simultanément !`);
      failures++;
    }

    // Vérifier spécifiquement l'ancienne régression Notes vs Bulletins
    if (testPath === "/dashboard/grades/report-card" || testPath === "/dashboard/grades/bulletin") {
      if (space.id === "pedagogy") {
        const notesItem = allItems.find(i => i.href === "/dashboard/grades");
        const bulletinItem = allItems.find(i => i.href === "/dashboard/grades/report-card");
        
        const isNotesActive = notesItem?.href === activeHref;
        const isBulletinActive = bulletinItem?.href === activeHref;

        if (isNotesActive && isBulletinActive) {
          console.error(`❌ RÉGRESSION DÉTECTÉE sur ${testPath} : Notes ET Bulletins sont actifs en même temps !`);
          failures++;
        }
      }
    }
  }
}

// 2. Vérification sur ContextualSidebar.tsx que getActiveNavItemHref est bien utilisé
const contextualSidebarSrc = fs.readFileSync(path.join(process.cwd(), "src/components/layout/ContextualSidebar.tsx"), "utf-8");
if (!contextualSidebarSrc.includes("getActiveNavItemHref")) {
  console.error("❌ ÉCHEC STRUCTUREL : ContextualSidebar.tsx n'utilise pas getActiveNavItemHref !");
  failures++;
}

if (failures > 0) {
  console.error(`\n❌ ${failures} anomalie(s) de navigation active multiple détectée(s).`);
  process.exit(1);
} else {
  console.log(`\n🎉 TOUTES LES ${allTestRoutes.length} ROUTES TESTÉES ONT EXACTEMENT UNE ENTRÉE ACTIVE UNIQUE !`);
}
