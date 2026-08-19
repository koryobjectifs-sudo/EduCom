/**
 * Vérifie la navigation globale (LOT 06). LECTURE SEULE.
 *
 *   1. PERMISSIONS   les anomalies identifiées à l'audit sont corrigées ;
 *   2. RÔLES         les 7 rôles, entrée par entrée ;
 *   3. LIENS MORTS   toute entrée visible pointe vers une route qui existe ;
 *   4. COHÉRENCE     navigation visible == hasAccess(), sans divergence ;
 *   5. HONNÊTETÉ     aucun contrôle sans handler dans la barre supérieure ;
 *   6. RESPONSIVE    sidebar desktop + tiroir mobile, pas de trou.
 *
 *   npm run script -- scripts/verify-navigation.ts
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { hasAccess, firstAllowedPath, ROLE_PERMISSIONS, type RoleType } from "../src/lib/permissions";
import { NAV_SECTIONS, visibleSections, visibleItems, isActive } from "../src/lib/navigation";

let fail = 0;
const ok = (c: boolean) => (c ? "OK   " : (fail++, "ÉCHEC"));
const code = (p: string) =>
  readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const ROLES = Object.keys(ROLE_PERMISSIONS) as RoleType[];

/** Chemin d'URL → fichier de page. Sert à détecter les liens morts. */
function routeExists(href: string): boolean {
  const seg = href.replace(/^\//, "");
  return existsSync(join("src/app", seg, "page.tsx"));
}

console.log(`\n=== NAVIGATION GLOBALE ===\n`);

// ---- 1. PERMISSIONS ----
console.log(`[1] ANOMALIES DE PERMISSIONS CORRIGÉES`);
console.log(`    ${ok(hasAccess("TEACHER", "/dashboard/grades"))} TEACHER accède à /dashboard/grades`);
console.log(`    ${ok(hasAccess("ACCOUNTANT", "/dashboard/documents"))} ACCOUNTANT accède à /dashboard/documents`);
console.log(`    ${ok(!ROLE_PERMISSIONS.ACCOUNTANT.includes("/dashboard/invoices"))} /dashboard/invoices retiré (route inexistante)`);
console.log(`    ${ok(!hasAccess("PARENT", "/dashboard/settings"))} PARENT n'accède PAS à /dashboard/settings`);
for (const r of ROLES.filter((r) => !["OWNER", "ADMIN"].includes(r))) {
  const allowed = hasAccess(r, "/dashboard/settings");
  console.log(`    ${ok(!allowed)} ${r.padEnd(11)} n'accède pas aux réglages`);
}
console.log(`    ${ok(hasAccess("OWNER", "/dashboard/settings") && hasAccess("ADMIN", "/dashboard/settings"))} OWNER et ADMIN accèdent aux réglages`);

// Garde serveur, pas seulement masquage de lien
const settingsPage = code("src/app/dashboard/settings/page.tsx");
console.log(`    ${ok(/hasAccess\(/.test(settingsPage) && /redirect\(/.test(settingsPage))} le garde des réglages est côté SERVEUR (hasAccess + redirect)`);

// Correspondance exacte : /dashboard$ ne doit pas ouvrir les descendants
console.log(`    ${ok(hasAccess("TEACHER", "/dashboard"))} TEACHER voit l'accueil (correspondance exacte)`);
console.log(`    ${ok(!hasAccess("TEACHER", "/dashboard/payments"))} …sans que cela ouvre /dashboard/payments`);

// Boucle de redirection
console.log(`\n    Cible de redirection par rôle (doit être un chemin autorisé) :`);
for (const r of ROLES) {
  const target = firstAllowedPath(r);
  const reachable = hasAccess(r, target);
  console.log(`      ${ok(reachable)} ${r.padEnd(11)} → ${target}`);
}

// ---- 2 & 3 & 4. RÔLES, LIENS MORTS, COHÉRENCE ----
console.log(`\n[2] NAVIGATION VISIBLE PAR RÔLE`);
const allHrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
for (const r of ROLES) {
  const items = visibleItems(r);
  const sections = visibleSections(r);
  console.log(`\n    ${r} — ${items.length} entrée·s, ${sections.length} section·s`);
  for (const s of sections) {
    const head = s.title ? `${s.title} : ` : "";
    console.log(`      ${head}${s.items.map((i) => i.name).join(" · ")}`);
  }
  // Cohérence : rien de visible sans droit, rien d'autorisé masqué
  const shownButDenied = items.filter((i) => !hasAccess(r, i.href));
  const allowedButHidden = allHrefs.filter((h) => hasAccess(r, h) && !items.some((i) => i.href === h));
  console.log(`      ${ok(shownButDenied.length === 0)} aucune entrée visible sans droit`);
  console.log(`      ${ok(allowedButHidden.length === 0)} aucune entrée autorisée masquée${allowedButHidden.length ? ` (${allowedButHidden.join(", ")})` : ""}`);
}

console.log(`\n[3] LIENS MORTS`);
const dead = allHrefs.filter((h) => !routeExists(h));
console.log(`    ${ok(dead.length === 0)} ${allHrefs.length} entrées déclarées, ${dead.length} lien·s mort·s${dead.length ? ` : ${dead.join(", ")}` : ""}`);
for (const h of allHrefs) {
  console.log(`      ${ok(routeExists(h))} ${h}`);
}

// L'ancien BottomNav visait des routes sans préfixe /dashboard
const OLD_MOBILE = ["/admissions", "/students", "/payments", "/reports"];
const stillDead = OLD_MOBILE.filter((h) => !routeExists(h));
const mobileUsesNav = /visibleSections|SidebarNav/.test(code("src/components/layout/MobileNav.tsx"));
console.log(`    ${ok(mobileUsesNav)} la navigation mobile lit la même table que le desktop`);
console.log(`           (les ${stillDead.length} anciennes cibles mobiles sont toujours inexistantes : ${stillDead.join(", ")})`);
const bottomNavWired = readdirSync("src/components/layout").some(
  (f) => f.endsWith(".tsx") && f !== "BottomNav.tsx" && /BottomNav/.test(code(join("src/components/layout", f)))
);
const layoutWired = /BottomNav/.test(code("src/app/dashboard/DashboardLayoutClient.tsx"));
console.log(`    ${ok(!bottomNavWired && !layoutWired)} l'ancien BottomNav n'est plus monté`);

// ---- 4. ICÔNES ET COULEURS ----
console.log(`\n[4] COHÉRENCE VISUELLE DE LA NAVIGATION`);
const icons = NAV_SECTIONS.flatMap((s) => s.items.map((i) => (i.icon as { displayName?: string }).displayName ?? String(i.icon)));
const dupes = icons.filter((n, i) => icons.indexOf(n) !== i);
console.log(`    ${ok(dupes.length === 0)} ${icons.length} icônes, toutes distinctes${dupes.length ? ` — doublons : ${[...new Set(dupes)].join(", ")}` : ""}`);

const nav = code("src/lib/navigation.ts");
console.log(`    ${ok(!/iconColor|activeBg/.test(nav))} plus de couleur par rubrique (l'ancienne version en avait 9)`);

const side = code("src/components/layout/Sidebar.tsx");
console.log(`    ${ok(/w-60/.test(side))} largeur 240 px (w-60)`);
console.log(`    ${ok(/<span className="truncate">\{item\.name\}<\/span>/.test(side))} libellés permanents`);
console.log(`    ${ok(/aria-current=\{active \? "page"/.test(side))} état actif annoncé par aria-current`);
console.log(`    ${ok(/aria-label="Navigation principale"/.test(side))} <nav> étiqueté`);
console.log(`    ${ok(/text-primary/.test(side) && !/indigo|teal|purple|rose|amber/.test(side))} accent unique, tiré du thème`);
console.log(`    ${ok(!/pointer-events-none/.test(side))} plus d'infobulle inaccessible`);

// isActive : l'accueil ne doit pas rester actif partout
console.log(`    ${ok(isActive("/dashboard", "/dashboard"))} accueil actif sur /dashboard`);
console.log(`    ${ok(!isActive("/dashboard", "/dashboard/students"))} accueil PAS actif sur /dashboard/students`);
console.log(`    ${ok(isActive("/dashboard/students", "/dashboard/students/abc"))} rubrique active sur ses sous-pages`);

// ---- 5. HONNÊTETÉ DE LA BARRE ----
console.log(`\n[5] BARRE SUPÉRIEURE — AUCUNE FAUSSE FONCTIONNALITÉ`);
const top = code("src/components/layout/TopNav.tsx");
console.log(`    ${ok(!/placeholder="Rechercher/.test(top))} champ de recherche factice retiré`);
console.log(`    ${ok(!/<Bell/.test(top))} cloche de notification factice retirée`);
console.log(`    ${ok(!/Mon Profil/.test(top))} entrée « Mon Profil » sans handler retirée`);
console.log(`    ${ok(!/ui-avatars\.com/.test(top))} avatar externe remplacé par des initiales locales`);
console.log(`    ${ok(/logout/.test(top))} déconnexion conservée (elle fonctionnait)`);
console.log(`    ${ok(/href="\/"/.test(top))} lien site public conservé`);
console.log(`    ${ok(/NODE_ENV !== "production"/.test(top))} sélecteur de rôle verrouillé hors production`);
const testRoles = (top.match(/const ALL_TEST_ROLES = \[([^\]]*)\]/) ?? [])[1] ?? "";
const nTest = (testRoles.match(/"/g) ?? []).length / 2;
console.log(`    ${ok(nTest === ROLES.length)} sélecteur de rôle : ${nTest}/${ROLES.length} rôles (l'ancien n'en listait que 4)`);
console.log(`    ${ok(/userName/.test(top))} nom d'utilisateur réel, plus « Admin » en dur`);

// ---- 6. RESPONSIVE ----
console.log(`\n[6] RESPONSIVE`);
console.log(`    ${ok(/hidden w-60 shrink-0 .*lg:flex/.test(side))} sidebar : masquée sous lg, visible dès lg`);
const mob = code("src/components/layout/MobileNav.tsx");
console.log(`    ${ok(/lg:hidden/.test(mob))} tiroir : visible sous lg uniquement`);
console.log(`    ${ok(/role="dialog"/.test(mob) && /aria-modal/.test(mob))} tiroir : role dialog + aria-modal`);
console.log(`    ${ok(/e\.key === "Escape"/.test(mob))} tiroir : fermeture par Escape`);
console.log(`    ${ok(/triggerRef\.current\?\.isConnected/.test(mob))} tiroir : focus rendu au déclencheur`);
console.log(`    ${ok(/setOpen\(false\);\s*\}, \[pathname\]\)/.test(mob))} tiroir : se ferme à la navigation`);
console.log(`    ${ok(/overflow: "hidden"|overflow = "hidden"/.test(mob))} tiroir : défilement d'arrière-plan bloqué`);
const shell = code("src/app/dashboard/DashboardLayoutClient.tsx");
console.log(`    ${ok(/firstAllowedPath/.test(shell))} boucle de redirection corrigée dans la coquille`);
console.log(`    ${ok(!/pb-16/.test(shell))} marge basse réservée au BottomNav retirée`);

console.log(`\n=== RÉSULTAT : ${fail === 0 ? "navigation conforme" : `${fail} ÉCHEC(S)`} ===\n`);
process.exit(fail === 0 ? 0 : 1);
