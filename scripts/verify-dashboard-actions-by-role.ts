/**
 * Test unitaire et fonctionnel : Droits d'exécution et intégrité par rôle
 * sur le tableau de bord et le rail de navigation.
 *
 * Règle : Pour chaque rôle, AUCUNE action affichée sur l'accueil ou le rail
 * ne doit être refusée lors de son exécution.
 *
 * Exécution :
 *   npx tsx scripts/verify-dashboard-actions-by-role.ts
 */

import { hasAccess, firstAllowedPath, type RoleType } from "../src/lib/permissions";
import { getVisibleSpaces, NAV_SPACES } from "../src/lib/navigation";

const ALL_ROLES: RoleType[] = [
  "OWNER",
  "ADMIN",
  "SECRETARY",
  "ACCOUNTANT",
  "TEACHER",
  "ASSISTANT",
  "PARENT",
];

let failed = 0;
let passed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ÉCHEC: ${label}${detail ? ` (${detail})` : ""}`);
  }
}

console.log("\n════════════════════════════════════════════════════════════════");
console.log(" VÉRIFICATION DES DROITS PAR RÔLE SUR LE TABLEAU DE BORD & LE RAIL");
console.log("════════════════════════════════════════════════════════════════\n");

// 1. VÉRIFICATION DE L'ACCUEIL DU RÔLE PARENT
console.log("── 1. ESPACE PARENT (Atterrissage et Ségrégation) ──");
const parentLanding = firstAllowedPath("PARENT");
assert(
  parentLanding === "/dashboard/grades",
  "firstAllowedPath('PARENT') renvoie explicitement /dashboard/grades",
  `reçu: ${parentLanding}`
);
assert(
  !parentLanding.includes("students"),
  "Un parent n'atterrit JAMAIS sur une route contenant 'students'"
);
assert(
  hasAccess("PARENT", parentLanding),
  "L'URL d'atterrissage du parent est autorisée côté serveur"
);
assert(
  !hasAccess("PARENT", "/dashboard"),
  "Le rôle PARENT n'a pas accès à l'accueil d'administration /dashboard"
);

// 2. VÉRIFICATION DE TOUS LES CHEMINS D'ATTERRISSAGE
console.log("\n── 2. PREMIERS CHEMINS AUTORISÉS (firstAllowedPath) ──");
for (const role of ALL_ROLES) {
  const landing = firstAllowedPath(role);
  assert(
    hasAccess(role, landing),
    `[${role}] firstAllowedPath (${landing}) est autorisé côté serveur`
  );
}

// 3. VÉRIFICATION DES ENTRÉES DU RAIL PAR RÔLE
console.log("\n── 3. INTÉGRITÉ DU RAIL DE NAVIGATION (getVisibleSpaces) ──");
for (const role of ALL_ROLES) {
  const visible = getVisibleSpaces(role);

  for (const space of visible) {
    assert(
      hasAccess(role, space.defaultHref),
      `[${role}] Rail space '${space.label}' -> defaultHref (${space.defaultHref}) autorisé`
    );

    for (const sec of space.sections) {
      for (const item of sec.items) {
        assert(
          hasAccess(role, item.href),
          `[${role}] Rail item '${item.name}' (${item.href}) autorisé`
        );
      }
    }
  }
}

// 4. TESTS CIBLÉS PAR RÔLE SPÉCIFIQUE
console.log("\n── 4. RÈGLES MÉTIER ET DÉCLINAISONS DE SÉCURITÉ ──");

// TEACHER : Pas de "Scolarité" ni registre administratif
const teacherSpaces = getVisibleSpaces("TEACHER");
const teacherHasStudents = teacherSpaces.some((s) => s.id === "students");
assert(
  !teacherHasStudents,
  "[TEACHER] Ne possède AUCUNE entrée 'Scolarité' dans son rail",
  `Espaces: ${teacherSpaces.map((s) => s.id).join(", ")}`
);
assert(
  !hasAccess("TEACHER", "/dashboard/students"),
  "[TEACHER] Accès refusé à /dashboard/students (registre administratif)"
);
assert(
  !hasAccess("TEACHER", "/dashboard/classes"),
  "[TEACHER] Accès refusé à /dashboard/classes (structure administrative)"
);

// SECRETARY : Pas de "Pédagogie" pointant vers report-card
const secretarySpaces = getVisibleSpaces("SECRETARY");
const secretaryPedagogy = secretarySpaces.find((s) => s.id === "pedagogy");
if (secretaryPedagogy) {
  assert(
    secretaryPedagogy.defaultHref !== "/dashboard/grades/report-card",
    "[SECRETARY] 'Pédagogie' ne pointe PAS vers report-card",
    `defaultHref actuel: ${secretaryPedagogy.defaultHref}`
  );
  const hasReportCardItem = secretaryPedagogy.sections.some((s) =>
    s.items.some((it) => it.href === "/dashboard/grades/report-card")
  );
  assert(
    !hasReportCardItem,
    "[SECRETARY] Aucun item 'Bulletins' (report-card) dans la section Pédagogie"
  );
} else {
  assert(true, "[SECRETARY] 'Pédagogie' absent du rail");
}
assert(
  !hasAccess("SECRETARY", "/dashboard/grades/report-card"),
  "[SECRETARY] Accès refusé côté serveur à /dashboard/grades/report-card"
);

// SECRETARY & ASSISTANT : Pas de "Facturation"
assert(
  !hasAccess("SECRETARY", "/dashboard/payments"),
  "[SECRETARY] Pas d'accès à Facturation (/dashboard/payments)"
);
assert(
  !hasAccess("ASSISTANT", "/dashboard/payments"),
  "[ASSISTANT] Pas d'accès à Facturation (/dashboard/payments)"
);

// ACCOUNTANT : Pas de "Nouvel élève" ni "Feuille d'appel"
assert(
  !hasAccess("ACCOUNTANT", "/dashboard/students"),
  "[ACCOUNTANT] Pas d'accès à Nouvel élève (/dashboard/students)"
);
assert(
  !hasAccess("ACCOUNTANT", "/dashboard/attendance"),
  "[ACCOUNTANT] Pas d'accès à Feuille d'appel (/dashboard/attendance)"
);

// 5. VÉRIFICATION DU SCOPE SUR LE POSTE DE DIRECTION
console.log("\n── 5. VÉRIFICATION DU SCOPE SERVEUR DU TABLEAU DE BORD ──");

const checkScope = (role: RoleType) => ({
  money: hasAccess(role, "/dashboard/payments"),
  students: hasAccess(role, "/dashboard/students"),
  validation: hasAccess(role, "/dashboard/grades/validation") || hasAccess(role, "/dashboard/documents/validation"),
  pedagogie: hasAccess(role, "/dashboard/grades") || hasAccess(role, "/dashboard/settings/pedagogie"),
  attendance: hasAccess(role, "/dashboard/attendance"),
  settings: hasAccess(role, "/dashboard/settings"),
});

const secScope = checkScope("SECRETARY");
assert(!secScope.money, "[SECRETARY scope] money === false (bouton Facturation masqué)");
assert(secScope.students, "[SECRETARY scope] students === true (bouton Nouvel élève affiché)");
assert(secScope.attendance, "[SECRETARY scope] attendance === true");
assert(!secScope.settings, "[SECRETARY scope] settings === false (Préparer la rentrée masqué)");

const accScope = checkScope("ACCOUNTANT");
assert(accScope.money, "[ACCOUNTANT scope] money === true (bouton Facturation affiché)");
assert(!accScope.students, "[ACCOUNTANT scope] students === false (bouton Nouvel élève masqué)");
assert(!accScope.attendance, "[ACCOUNTANT scope] attendance === false (Feuille d'appel masquée)");
assert(!accScope.settings, "[ACCOUNTANT scope] settings === false (Préparer la rentrée masqué)");

const astScope = checkScope("ASSISTANT");
assert(!astScope.money, "[ASSISTANT scope] money === false (bouton Facturation masqué)");
assert(astScope.students, "[ASSISTANT scope] students === true (bouton Nouvel élève affiché)");
assert(!astScope.attendance, "[ASSISTANT scope] attendance === false (Feuille d'appel masquée)");
assert(!astScope.settings, "[ASSISTANT scope] settings === false (Préparer la rentrée masqué)");

console.log("\n════════════════════════════════════════════════════════════════");
if (failed === 0) {
  console.log(`✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS (${passed} assertions valides)`);
  console.log("════════════════════════════════════════════════════════════════\n");
  process.exit(0);
} else {
  console.error(`❌ ÉCHEC : ${failed} assertion(s) non valide(s) sur ${passed + failed}`);
  console.log("════════════════════════════════════════════════════════════════\n");
  process.exit(1);
}
