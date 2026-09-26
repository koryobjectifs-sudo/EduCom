/**
 * Messages programmés et mentions de groupe — règles pures (sans base).
 * npx tsx scripts/verify-programmes.ts
 */
import { dateProgrammation } from "../src/lib/programmes";
import { filtreVisible } from "../src/lib/community";

let ko = 0;
const ok = (nom: string, c: boolean, d?: unknown) => {
  if (!c) {
    ko++;
    console.error("✗", nom, d ?? "");
  }
};
const dans = (ms: number) => new Date(Date.now() + ms).toISOString();

ok("passé refusé", dateProgrammation(dans(-60_000)) === null);
ok("moins d'une minute refusé", dateProgrammation(dans(20_000)) === null);
ok("dans 1 h accepté", dateProgrammation(dans(3600_000)) !== null);
ok("au-delà de 60 jours refusé", dateProgrammation(dans(61 * 86400_000)) === null);
ok("texte invalide refusé", dateProgrammation("n'importe quoi") === null && dateProgrammation(42) === null);

const acteur = { userId: "u1", schoolId: "s1", role: "PARENT" };
const f = JSON.stringify(filtreVisible(acteur, { toutesClasses: false, classIds: ["c1"], canaux: [] }, "ECOLE"));
ok("programmés cachés aux autres", f.includes('"createdAt":{"lte"') && f.includes('"authorId":"u1"'), f);
const aucun = filtreVisible(acteur, { toutesClasses: false, classIds: [], canaux: [] }, "classe:c9");
ok("classe hors périmètre : rien", JSON.stringify(aucun) === '{"id":"__aucun__"}', aucun);

console.log(ko ? `${ko} échec(s)` : "Tout est bon.");
process.exit(ko ? 1 : 0);
