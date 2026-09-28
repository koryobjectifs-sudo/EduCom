/**
 * Accès en plus (capacités) et équipe — règles pures (sans base).
 * npx tsx scripts/verify-capacites.ts
 */
import { hasAccess } from "../src/lib/permissions";
import { aCapacite, cheminsSupplementaires, CAPACITES, estCapacite, incluseDansMetier } from "../src/lib/capacites";
import { accesValides, motDePasseProvisoire } from "../src/lib/equipe";
import { getVisibleSpaces } from "../src/lib/navigation";

let ko = 0;
let n = 0;
const ok = (nom: string, c: boolean, d?: unknown) => {
  n++;
  if (!c) {
    ko++;
    console.error("✗", nom, d ?? "");
  }
};

// Sans accès en plus : l'enseignant n'ouvre ni paiements ni validation.
ok("prof sans extra → pas de paiements", !hasAccess("TEACHER", "/dashboard/payments"));
ok("prof sans extra → pas de validation", !hasAccess("TEACHER", "/dashboard/grades/validation"));
// Avec l'accès « Voir les paiements ».
const lecture = cheminsSupplementaires(["PAIEMENTS_LECTURE"]);
ok("lecture → /payments", hasAccess("TEACHER", "/dashboard/payments", lecture));
ok("lecture → factures", hasAccess("TEACHER", "/dashboard/payments/invoice/abc", lecture));
ok("lecture → PAS encaisser", !hasAccess("TEACHER", "/dashboard/payments/new", lecture));
ok("lecture → PAS finances", !hasAccess("TEACHER", "/dashboard/finance", lecture));
const encaisser = cheminsSupplementaires(["PAIEMENTS_ENCAISSER"]);
ok("encaisser → /payments/new", hasAccess("SECRETARY", "/dashboard/payments/new", encaisser));
const valider = cheminsSupplementaires(["BULLETINS_VALIDER"]);
ok("valider → validation", hasAccess("TEACHER", "/dashboard/grades/validation", valider));
ok("valider → impression", hasAccess("TEACHER", "/dashboard/grades/validation/impression", valider));
ok("valider → PAS réglages", !hasAccess("TEACHER", "/dashboard/settings", valider));
ok("valider → PAS équipe", !hasAccess("TEACHER", "/dashboard/team", valider));
// Le parent n'hérite jamais d'un accès en plus.
ok("parent + extras → refus", !hasAccess("PARENT", "/dashboard/payments/new", encaisser));
// Réservés direction : aucune capacité n'ouvre réglages / équipe.
const tout = cheminsSupplementaires(CAPACITES.map((c) => c.id));
for (const p of ["/dashboard/settings", "/dashboard/team", "/dashboard/grades/council"]) ok(`jamais délégable : ${p}`, !hasAccess("ASSISTANT", p, tout));

ok("comptable inclut lecture paiements", incluseDansMetier("ACCOUNTANT", "PAIEMENTS_LECTURE"));
ok("secrétaire inclut valider", aCapacite("SECRETARY", [], "BULLETINS_VALIDER"));
ok("prof + grant MODERER", aCapacite("TEACHER", ["MODERER"], "MODERER"));
ok("prof sans grant MODERER", !aCapacite("TEACHER", [], "MODERER"));
ok("estCapacite rejette l'inconnu", !estCapacite("SUPPRIMER_TOUT") && estCapacite("MODERER"));

// accesValides : catalogue fermé, doublons et « déjà inclus » retirés.
const v = accesValides("SECRETARY", ["BULLETINS_VALIDER", "PAIEMENTS_LECTURE", "PAIEMENTS_LECTURE", "ADMIN_TOTAL", 3]);
ok("accesValides filtre", JSON.stringify(v) === JSON.stringify(["PAIEMENTS_LECTURE"]), v);
ok("accesValides non-tableau", accesValides("TEACHER", "MODERER").length === 0);

// Mot de passe provisoire : ≥ 8 caractères, lisible.
for (let i = 0; i < 50; i++) {
  const m = motDePasseProvisoire();
  if (m.length < 8 || !/^[A-Za-z]+-\d{4}$/.test(m)) ok("mot de passe provisoire", false, m);
}
ok("mots de passe variés", new Set(Array.from({ length: 30 }, motDePasseProvisoire)).size > 10);

// Navigation : l'entrée Paiements apparaît pour un prof qui a l'accès.
const vis = (extras: string[]) => JSON.stringify(getVisibleSpaces("TEACHER", extras));
ok("navigation : l'accès en plus fait apparaître Paiements", vis(lecture).includes("/dashboard/payments") && !vis([]).includes("/dashboard/payments"));

console.log(ko ? `✗ ${ko}/${n} échec(s)` : `✓ ${n}/${n} vérifications`);
process.exit(ko ? 1 : 0);
