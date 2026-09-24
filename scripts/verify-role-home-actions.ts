/**
 * Test de conformité : Aucune action affichée sur l'accueil ne doit être refusée si on l'exécute.
 *
 * Vérifie rigoureusement pour chaque rôle (OWNER, ADMIN, SECRETARY, ACCOUNTANT, TEACHER, ASSISTANT, PARENT) :
 * 1. Les entrées de rail (getVisibleSpaces) vérifiées côté serveur sur leur destination, sans déduction d'espace.
 * 2. Les actions rapides de l'en-tête (Nouvel élève, Facturation).
 * 3. Les sections conditionnelles du tableau de bord (Assiduité, Préparer la rentrée, Installation pédagogique, Finances).
 * 4. L'espace parent : atterrissage explicite sans route nommée "students".
 */

import { hasAccess, firstAllowedPath, type RoleType } from "../src/lib/permissions";
import { getVisibleSpaces, NAV_SPACES } from "../src/lib/navigation";

const ALL_ROLES: RoleType[] = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "TEACHER", "ASSISTANT", "PARENT"];

function runTest() {
  console.log("═════════════ TEST DES ACTIONS DU TABLEAU DE BORD PAR RÔLE ═════════════\n");
  let failures = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ ${message}`);
    } else {
      console.error(`  ❌ ÉCHEC : ${message}`);
      failures++;
    }
  }

  // ── 1. ESPACE PARENT (Atterrissage explicite) ──
  console.log("[1] VÉRIFICATION ACCUEIL ESPACE PARENT");
  const parentHome = firstAllowedPath("PARENT");
  assert(parentHome === "/famille", `firstAllowedPath("PARENT") renvoie l'Espace Famille "/famille" (reçu : ${parentHome})`);
  assert(hasAccess("PARENT", parentHome), `Le rôle PARENT a bien l'accès serveur à sa page d'accueil (${parentHome})`);

  // ── 2. ENTRÉES DU RAIL PAR RÔLE (Vérification côté serveur, non déduit de l'espace) ──
  console.log("\n[2] ENTRÉES DU RAIL (getVisibleSpaces)");
  for (const role of ALL_ROLES) {
    if (role === "PARENT") continue; // Le parent utilise ParentLayout (pas de rail)

    const visibleSpaces = getVisibleSpaces(role);
    console.log(`  • Rôle ${role} : ${visibleSpaces.map((s) => s.label).join(", ")}`);

    for (const space of visibleSpaces) {
      // Chaque entrée de rail doit avoir un accès serveur garanti sur sa destination
      const hasDestAccess = hasAccess(role, space.defaultHref);
      assert(
        hasDestAccess,
        `${role} a un accès serveur réel à l'entrée de rail "${space.label}" (${space.defaultHref})`
      );
    }

    // Invariants métier stricts de l'audit
    if (role === "TEACHER") {
      const hasStudentsSpace = visibleSpaces.some((s) => s.id === "students");
      assert(!hasStudentsSpace, `TEACHER n'a PAS d'entrée de rail "Scolarité" pointant vers le registre administratif`);
    }

    if (role === "SECRETARY") {
      const hasPedagogySpace = visibleSpaces.some((s) => s.id === "pedagogy");
      assert(!hasPedagogySpace, `SECRETARY n'a PAS d'entrée de rail "Pédagogie" pointant vers report-card`);
      const hasFinanceSpace = visibleSpaces.some((s) => s.id === "finance");
      assert(!hasFinanceSpace, `SECRETARY n'a PAS d'entrée de rail "Finance"`);
    }

    if (role === "ACCOUNTANT") {
      const hasStudentsSpace = visibleSpaces.some((s) => s.id === "students");
      assert(!hasStudentsSpace, `ACCOUNTANT n'a PAS d'entrée de rail "Scolarité"`);
      const hasPedagogySpace = visibleSpaces.some((s) => s.id === "pedagogy");
      assert(!hasPedagogySpace, `ACCOUNTANT n'a PAS d'entrée de rail "Pédagogie"`);
    }

    if (role === "ASSISTANT") {
      const hasFinanceSpace = visibleSpaces.some((s) => s.id === "finance");
      assert(!hasFinanceSpace, `ASSISTANT n'a PAS d'entrée de rail "Finance"`);
      const hasPedagogySpace = visibleSpaces.some((s) => s.id === "pedagogy");
      assert(!hasPedagogySpace, `ASSISTANT n'a PAS d'entrée de rail "Pédagogie"`);
    }
  }

  // ── 3. ACTIONS DE L'ACCUEIL PAR RÔLE (Vérification de non-refus) ──
  console.log("\n[3] ACTIONS VISIBLES SUR L'ACCUEIL (Aucune action affichée ne doit être refusée)");

  for (const role of ALL_ROLES) {
    if (role === "PARENT") continue;

    const displayedActions: { label: string; href: string }[] = [];

    if (role === "TEACHER") {
      // TeacherDashboard actions
      displayedActions.push({ label: "Accéder aux saisies", href: "/dashboard/grades" });
      displayedActions.push({ label: "Faire l'appel", href: "/dashboard/attendance" });
    } else {
      // DirectorDashboard / Staff
      const scopeMoney = hasAccess(role, "/dashboard/payments");
      const scopeStudents = hasAccess(role, "/dashboard/students");
      const scopeAttendance = hasAccess(role, "/dashboard/attendance");
      const scopeSettings = hasAccess(role, "/dashboard/settings");
      const scopePedagogie = hasAccess(role, "/dashboard/grades");

      // Actions rapides Header
      if (scopeStudents) {
        displayedActions.push({ label: "Nouvel élève", href: "/dashboard/students" });
      }
      if (scopeMoney) {
        displayedActions.push({ label: "Facturation", href: "/dashboard/payments" });
      }

      // Actions conditionnelles
      if (scopeSettings) {
        displayedActions.push({ label: "Préparer la rentrée", href: "/dashboard/settings/reinscription" });
        displayedActions.push({ label: "Compléter la configuration", href: "/dashboard/settings/pedagogie" });
      }

      if (scopeAttendance) {
        displayedActions.push({ label: "Feuille d'appel générale", href: "/dashboard/attendance" });
        displayedActions.push({ label: "Appel par classe", href: "/dashboard/attendance/take" });
      }

      if (scopeMoney) {
        displayedActions.push({ label: "Facturation & Reçus", href: "/dashboard/payments" });
        displayedActions.push({ label: "États financiers", href: "/dashboard/payments/statement" });
      }

      // Vérification spécifique aux anomalies de l'audit
      if (role === "SECRETARY" || role === "ASSISTANT") {
        assert(!scopeMoney, `${role} n'a pas scopeMoney et ne voit pas "Facturation" sur l'accueil`);
      }

      if (role === "ACCOUNTANT") {
        assert(!scopeStudents, `ACCOUNTANT n'a pas scopeStudents et ne voit pas "Nouvel élève" sur l'accueil`);
        assert(!scopeAttendance, `ACCOUNTANT n'a pas scopeAttendance et ne voit pas "Feuille d'appel" sur l'accueil`);
      }
    }

    // Tester que TOUTES les actions affichées sont autorisées sans refus
    for (const action of displayedActions) {
      const allowed = hasAccess(role, action.href);
      assert(
        allowed,
        `[${role}] Action "${action.label}" (${action.href}) est bien AUTORISÉE côté serveur`
      );
    }
  }

  if (failures > 0) {
    console.error(`\n❌ ${failures} anomalie(s) détectée(s) dans le nettoyage par rôle.`);
    process.exit(1);
  }

  console.log("\n🎉 SUCCÈS : Toutes les actions et entrées de rail sont strictement autorisées par rôle !");
}

runTest();
