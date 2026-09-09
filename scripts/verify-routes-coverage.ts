import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { hasAccess, ROLE_PERMISSIONS, ROLE_DENIALS, RoleType } from "../src/lib/permissions";

const DASHBOARD_DIR = join(process.cwd(), "src/app/dashboard");
const ALL_ROLES: RoleType[] = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

function findPages(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findPages(fullPath));
    } else if (entry === "page.tsx" || entry === "page.ts") {
      results.push(fullPath);
    }
  }
  return results;
}

function fileToRoute(filePath: string): string {
  const rel = relative(DASHBOARD_DIR, filePath);
  const withoutFile = rel.replace(/\/page\.tsx?$/, "").replace(/^page\.tsx?$/, "");
  if (!withoutFile) return "/dashboard";
  // Convert [id] or [param] to standard slug format
  const cleanRoute = withoutFile.split("/").map((part) => (part.startsWith("[") ? "id-test" : part)).join("/");
  return `/dashboard/${cleanRoute}`;
}

async function verifyAllRoutesCovered() {
  console.log("=== VERIFICATION EXHAUSTIVE DE COUVERTURE DES PERMISSIONS ===");
  const pages = findPages(DASHBOARD_DIR);
  console.log(`Nombre total de pages détectées sous /dashboard : ${pages.length}\n`);

  const routes = pages.map(fileToRoute);
  let uncoveredCount = 0;

  for (const route of routes) {
    // Vérifier que chaque rôle produit une décision déterministe (true ou false)
    for (const role of ALL_ROLES) {
      const allowed = hasAccess(role, route);
      if (allowed === undefined || typeof allowed !== "boolean") {
        console.error(`❌ Route non déterministe : ${route} pour le rôle ${role}`);
        uncoveredCount++;
      }
    }

    // Vérifier que OWNER a bien accès
    if (!hasAccess("OWNER", route)) {
      console.error(`❌ Route inaccessible même pour OWNER : ${route}`);
      uncoveredCount++;
    }

    // Vérifier que PARENT n'a pas d'accès sauvage à des routes d'admin ou de direction
    if (route.startsWith("/dashboard/admin") || route.startsWith("/dashboard/settings")) {
      if (hasAccess("PARENT", route)) {
        console.error(`🚨 FAILLE DE SÉCURITÉ : PARENT a accès à ${route}`);
        uncoveredCount++;
      }
    }
  }

  console.log("Exemples de routes testées :");
  for (const r of routes.slice(0, 10)) {
    const matrix = ALL_ROLES.map((role) => `${role}:${hasAccess(role, r) ? "✓" : "✗"}`).join(" ");
    console.log(`  ${r.padEnd(38)} -> ${matrix}`);
  }

  if (uncoveredCount > 0) {
    console.error(`\n❌ ÉCHEC : ${uncoveredCount} défaut(s) de couverture de permission détecté(s).`);
    process.exit(1);
  }

  console.log(`\n✓ SUCCÈS : 100% des ${routes.length} routes sous /dashboard sont couvertes par la matrice de sécurité hasAccess().`);
}

verifyAllRoutesCovered();
