/**
 * Règles d'accès de la Communauté (sans base) :  npx tsx scripts/verify-community-access.ts
 */
import { peutPublier, peutModerer, filtreVisible, canalVisible, peutGererCanaux, lireEspace, type CanalAcces } from "../src/lib/community";
import { reglesDuCanal, regleValide } from "../src/lib/audience";

let echecs = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) echecs++; };
const a = (role: string) => ({ userId: "u", schoolId: "S1", role });
const tout = { toutesClasses: true, classIds: [] };
const prof = { toutesClasses: false, classIds: ["cm2a"] };
const parent = { toutesClasses: false, classIds: ["cm2a"] };

ok(peutPublier(a("ADMIN"), tout, "ECOLE"), "admin publie pour l'école");
ok(peutPublier(a("SECRETARY"), tout, "ECOLE"), "secrétariat publie pour l'école");
ok(!peutPublier(a("TEACHER"), prof, "ECOLE"), "enseignant ne publie PAS pour l'école");
ok(peutPublier(a("TEACHER"), prof, "CLASSE", "cm2a"), "enseignant publie dans SA classe");
ok(!peutPublier(a("TEACHER"), prof, "CLASSE", "3ea"), "enseignant ne publie pas dans une autre classe");
ok(!peutPublier(a("PARENT"), parent, "CLASSE", "cm2a"), "parent ne publie pas");
ok(!peutPublier(a("PARENT"), parent, "ECOLE"), "parent ne publie pas pour l'école");
ok(!peutPublier(a("ACCOUNTANT"), tout, "ECOLE"), "comptable ne publie pas pour l'école");
ok(peutModerer("OWNER") && peutModerer("ADMIN") && !peutModerer("TEACHER") && !peutModerer("PARENT"), "modération : direction seule");

const fp = JSON.stringify(filtreVisible(a("PARENT"), parent));
ok(fp.includes('"schoolId":"S1"') && fp.includes('"hiddenAt":null') && fp.includes('"in":["cm2a"]'), "parent : son école, non masqué, classes de ses enfants");
ok(JSON.stringify(filtreVisible(a("PARENT"), parent, "3ea")).includes("__aucun__"), "parent : autre classe demandée → rien");
ok(!JSON.stringify(filtreVisible(a("ADMIN"), tout)).includes("hiddenAt"), "direction : voit aussi le masqué");
ok(JSON.stringify(filtreVisible(a("TEACHER"), prof, "ECOLE")).includes('"audience":"ECOLE"'), "filtre « L'école »");

// ═══ Canaux (26 sept. 2026) ═══
const canal = (kind: CanalAcces["kind"], o: Partial<CanalAcces> = {}): CanalAcces => ({
  id: `c-${kind}`, name: kind.toLowerCase(), description: null, kind, regles: reglesDuCanal({ kind }), membersCanPost: false, createdById: "dir", estMembre: false, ...o,
});
ok(canalVisible(a("PARENT"), canal("PARENTS")), "canal Parents : visible par un parent");
ok(!canalVisible(a("PARENT"), canal("PERSONNEL")), "canal Personnel : invisible pour un parent");
ok(canalVisible(a("TEACHER"), canal("PERSONNEL")) && canalVisible(a("ACCOUNTANT"), canal("PERSONNEL")), "canal Personnel : visible par l'équipe");
ok(!canalVisible(a("PARENT"), canal("MEMBRES")), "canal sur invitation : invisible sans invitation");
ok(canalVisible(a("PARENT"), canal("MEMBRES", { estMembre: true })), "canal sur invitation : visible par un parent invité");
ok(!canalVisible(a("TEACHER"), canal("MEMBRES")), "canal sur invitation : invisible pour un enseignant non invité");
ok(canalVisible(a("ADMIN"), canal("MEMBRES")), "canal sur invitation : visible par la direction (modération)");
ok(peutGererCanaux("OWNER") && peutGererCanaux("SECRETARY") && !peutGererCanaux("TEACHER") && !peutGererCanaux("PARENT"), "créer un canal : direction et secrétariat");

const comite = canal("MEMBRES", { estMembre: true, membersCanPost: true });
const annonces = canal("PARENTS");
const pc = { ...parent, canaux: [comite, annonces] };
ok(peutPublier(a("PARENT"), pc, "CANAL", comite.id), "parent membre publie si « tout le monde peut publier »");
ok(!peutPublier(a("PARENT"), pc, "CANAL", annonces.id), "parent ne publie pas dans un canal réservé à la direction");
ok(peutPublier(a("SECRETARY"), { ...tout, canaux: [annonces] }, "CANAL", annonces.id), "secrétariat publie dans tout canal visible");
ok(!peutPublier(a("PARENT"), pc, "CANAL", "inconnu"), "canal hors périmètre : pas de publication");
ok(JSON.stringify(filtreVisible(a("PARENT"), pc, "canal:inconnu")).includes("__aucun__"), "canal hors périmètre : rien n'est lu");
ok(JSON.stringify(filtreVisible(a("PARENT"), pc, `canal:${comite.id}`)).includes(`"channelId":"${comite.id}"`), "canal visible : ses publications");
ok(JSON.stringify(filtreVisible(a("PARENT"), pc)).includes(`"in":["${comite.id}","${annonces.id}"]`), "fil : inclut les canaux visibles, et eux seuls");
ok(lireEspace("cm2a").type === "CLASSE" && lireEspace("classe:x").id === "x" && lireEspace("canal:y").type === "CANAL", "anciens liens de classe compris");

// ═══ Comptabilité et élèves (26 sept. 2026) ═══
ok(!canalVisible(a("STUDENT"), canal("PARENTS")) && !canalVisible(a("STUDENT"), canal("PERSONNEL")), "rôle inconnu (élève) : aucun canal");
ok(JSON.stringify(filtreVisible(a("STUDENT"), { toutesClasses: false, classIds: [] }, "classe:cm2a")).includes("__aucun__"), "rôle inconnu (élève) : aucune classe");
ok(!peutPublier(a("ACCOUNTANT"), { toutesClasses: false, classIds: [] }, "CLASSE", "cm2a"), "comptable : ne publie dans aucune classe");

// ═══ Audience « @ » (26 sept. 2026) ═══
const r = (regles: string[], o: Partial<CanalAcces> = {}) => canal("REGLES", { regles, ...o });
ok(!canalVisible(a("PARENT"), r([]), ["cm2a"]) && !canalVisible(a("TEACHER"), r([]), ["cm2a"]), "aucune règle : privé (ni parents ni enseignants)");
ok(canalVisible(a("ADMIN"), r([])), "aucune règle : la direction voit (modération)");
ok(canalVisible(a("PARENT"), r(["PARENTS_CLASSE:cm2a"]), ["cm2a"]), "@parents-CM2 : un parent du CM2 voit");
ok(!canalVisible(a("PARENT"), r(["PARENTS_CLASSE:cm2a"]), ["3ea"]), "@parents-CM2 : un parent d'une autre classe ne voit pas");
ok(!canalVisible(a("TEACHER"), r(["PARENTS_CLASSE:cm2a"]), ["cm2a"]), "@parents-CM2 : l'enseignant du CM2 n'est pas inclus d'office");
ok(canalVisible(a("TEACHER"), r(["PROFS_CLASSE:cm2a"]), ["cm2a"]) && !canalVisible(a("TEACHER"), r(["PROFS_CLASSE:cm2a"]), ["3ea"]), "@profs-CM2 : ses enseignants seulement");
ok(canalVisible(a("TEACHER"), r(["ROLE:TEACHER"])) && !canalVisible(a("SECRETARY"), r(["ROLE:TEACHER"])), "@enseignants : les enseignants seulement");
ok(!canalVisible(a("ACCOUNTANT"), r(["PARENTS"])) && !canalVisible(a("STUDENT"), r(["PARENTS", "PERSONNEL"])), "@tous-les-parents : ni la comptabilité ni un rôle inconnu");
ok(canalVisible(a("PARENT"), r([], { estMembre: true })), "personne nommée : voit le canal");
ok(regleValide("PARENTS_CLASSE:x") && !regleValide("ROLE:PARENT") && !regleValide("TOUT") && !regleValide(42), "règles inconnues refusées");

console.log(echecs ? `\n${echecs} échec(s)` : "\nTout est bon.");
process.exit(echecs ? 1 : 0);
