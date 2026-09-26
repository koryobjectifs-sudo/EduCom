/** Règles de la messagerie privée (sans base) :  npx tsx scripts/verify-messagerie-access.ts */
import { filtreConversations, canalDuRole, estPersonnel } from "../src/lib/messagerie";
let e = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) e++; };
const a = (role: string) => ({ userId: "u1", schoolId: "S1", role });
const p = { toutesClasses: false, classIds: ["cm2a"] };
const j = (x: unknown) => JSON.stringify(x);
const EQUIPE_MOI = j({ kind: "EQUIPE", OR: [{ userAId: "u1" }, { userBId: "u1" }] });

ok(j(filtreConversations(a("PARENT"), p)) === j({ schoolId: "S1", kind: "FAMILLE", parentId: "u1" }), "parent : uniquement SES discussions, jamais celles de l'équipe");
const dir = j(filtreConversations(a("ADMIN"), p));
ok(dir.includes('{"kind":"FAMILLE"}') && dir.includes(EQUIPE_MOI), "direction : discussions familles + SES messages d'équipe");
ok(!dir.replace(EQUIPE_MOI, "").includes("EQUIPE"), "direction : ne lit PAS les messages privés entre collègues");
ok(j(filtreConversations(a("SECRETARY"), p)).includes('"canal":"SECRETARIAT"'), "secrétariat : boîte Secrétariat");
const compta = j(filtreConversations(a("ACCOUNTANT"), p));
ok(compta.includes('"canal":"COMPTABILITE"') && !compta.includes("ENSEIGNANT"), "comptable : boîte Comptabilité seulement");
const t = j(filtreConversations(a("TEACHER"), p));
ok(t.includes('"canal":"ENSEIGNANT"') && t.includes('"in":["cm2a"]'), "enseignant : parents de ses classes seulement");
for (const r of ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "TEACHER"]) {
  ok(j(filtreConversations(a(r), p)).includes(EQUIPE_MOI), `${r} : voit ses propres messages d'équipe (et eux seuls)`);
}
ok(j(filtreConversations(a("INCONNU"), p)).includes("__aucun__"), "rôle inconnu (élève compris) : fermé");
ok(canalDuRole("TEACHER") === "ENSEIGNANT" && canalDuRole("OWNER") === "DIRECTION" && canalDuRole("PARENT") === null, "canal d'écriture par rôle");
ok(!estPersonnel("PARENT") && !estPersonnel("STUDENT") && estPersonnel("ACCOUNTANT"), "messages d'équipe : personnel uniquement");
console.log(e ? `\n${e} échec(s)` : "\nTout est bon."); process.exit(e ? 1 : 0);
