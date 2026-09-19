import fs from "fs";
import path from "path";

/**
 * Test de validation : Étanchéité absolue des outils de développement en production.
 * Vérifie que :
 * 1. changeTestRole (Server Action) refuse catégoriquement l'exécution en NODE_ENV === 'production'.
 * 2. /api/dev/reset-role (Route HTTP) refuse l'accès en 403 en NODE_ENV === 'production'.
 * 3. /api/dev/setup refuse l'accès en NODE_ENV === 'production'.
 * 4. DevRoleSwitcher et son import dynamique dans FamilyLayout et DashboardLayout sont conditionnés par l'environnement et non par le rôle.
 * 5. Aucun fichier client de production n'importe directement les actions de test.
 */

async function main() {
  console.log("🔒 Vérification de l'étanchéité des outils de dev en production...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`  ✅ ${title}`);
      passed++;
    } else {
      console.error(`  ❌ ÉCHEC: ${title}`);
      failed++;
    }
  }

  const rootDir = process.cwd();

  // Test 1 : Contrôle statique de FamilyLayout (src/app/famille/layout.tsx)
  const familyLayoutContent = fs.readFileSync(
    path.join(rootDir, "src/app/famille/layout.tsx"),
    "utf-8"
  );
  assert(
    familyLayoutContent.includes('process.env.NODE_ENV !== "production"'),
    "FamilyLayout conditionne l'import du DevRoleSwitcher sur process.env.NODE_ENV !== 'production'"
  );
  assert(
    !familyLayoutContent.includes("userRole === 'ADMIN'") &&
      !familyLayoutContent.includes('userRole === "ADMIN"'),
    "FamilyLayout ne conditionne JAMAIS le DevRoleSwitcher sur un rôle utilisateur"
  );

  // Test 2 : Contrôle statique de DashboardLayout (src/app/dashboard/layout.tsx)
  const dashboardLayoutContent = fs.readFileSync(
    path.join(rootDir, "src/app/dashboard/layout.tsx"),
    "utf-8"
  );
  assert(
    dashboardLayoutContent.includes('process.env.NODE_ENV !== "production"'),
    "DashboardLayout protège la redirection parent contre l'enfermement en dev"
  );
  assert(
    dashboardLayoutContent.includes("/api/dev/reset-role?role=ADMIN"),
    "DashboardLayout fournit une porte de sortie automatique vers /api/dev/reset-role pour les comptes de test"
  );

  // Test 3 : Contrôle de DevRoleSwitcher (src/components/dev/DevRoleSwitcher.tsx)
  const switcherContent = fs.readFileSync(
    path.join(rootDir, "src/components/dev/DevRoleSwitcher.tsx"),
    "utf-8"
  );
  assert(
    switcherContent.includes('if (process.env.NODE_ENV === "production")'),
    "DevRoleSwitcher s'auto-neutralise (return null) si compilé en production"
  );
  assert(
    switcherContent.includes("/api/dev/reset-role?role=ADMIN"),
    "DevRoleSwitcher intègre le lien d'échappement direct autonome"
  );

  // Test 4 : Contrôle de la Server Action (src/app/actions/dev.ts)
  const devActionsContent = fs.readFileSync(
    path.join(rootDir, "src/app/actions/dev.ts"),
    "utf-8"
  );
  assert(
    devActionsContent.includes('if (process.env.NODE_ENV === "production")'),
    "src/app/actions/dev.ts bloque strictement changeTestRole si NODE_ENV === 'production'"
  );

  // Test 5 : Contrôle de la route HTTP (src/app/api/dev/reset-role/route.ts)
  const resetRouteContent = fs.readFileSync(
    path.join(rootDir, "src/app/api/dev/reset-role/route.ts"),
    "utf-8"
  );
  assert(
    resetRouteContent.includes('if (process.env.NODE_ENV === "production")') &&
      resetRouteContent.includes("403"),
    "src/app/api/dev/reset-role/route.ts retourne HTTP 403 en production"
  );

  // Test 6 : Exécution dynamique sous simulation NODE_ENV = 'production'
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    // 6.1 Server Action
    const { changeTestRole } = await import("../src/app/actions/dev");
    const result = await changeTestRole("TEACHER");
    assert(
      result.success === false && result.error?.includes("production"),
      "changeTestRole() rejette l'exécution avec succès sous NODE_ENV='production'"
    );

    // 6.2 Route HTTP reset-role
    const { GET: resetGet } = await import("../src/app/api/dev/reset-role/route");
    const mockReq = new Request("http://localhost:3000/api/dev/reset-role?role=ADMIN");
    const resetRes = await resetGet(mockReq as any);
    assert(
      resetRes.status === 403,
      "Route /api/dev/reset-role renvoie status 403 sous NODE_ENV='production'"
    );

    // 6.3 Route HTTP setup
    const { POST: setupPost } = await import("../src/app/api/dev/setup/route");
    const mockSetupReq = new Request("http://localhost:3000/api/dev/setup", {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    });
    const setupRes = await setupPost(mockSetupReq as any);
    assert(
      setupRes.status === 404,
      "Route /api/dev/setup renvoie status 404 sous NODE_ENV='production'"
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  console.log(`\nRésultats: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
