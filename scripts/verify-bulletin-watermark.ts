import fs from "fs";
import path from "path";

console.log("=== VÉRIFICATION CONFORMITÉ DU FILIGRANE DU BULLETIN ===");

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
  } else {
    console.error(`  ❌ ÉCHEC : ${msg}`);
    failures++;
  }
}

// 1. BulletinSecondaireSheet.tsx
console.log("\n[1] BulletinSecondaireSheet.tsx :");
const secContent = fs.readFileSync(path.join(process.cwd(), "src/components/grades/BulletinSecondaireSheet.tsx"), "utf-8");

assert(secContent.includes("w-[65%] max-w-[65%] max-h-[65%] object-contain"), "Largeur du filigrane configurée à 65% (dans la plage 60-70%) avec ratio préservé (object-contain)");
assert(secContent.includes("pointer-events-none absolute inset-0 flex items-center justify-center"), "Centrage horizontal et vertical absolu sur toute la page");
assert(secContent.includes("watermarkOpacity ?? school.bulletinWatermarkOpacity ?? 0.06"), "Opacité par défaut fixée à 6% (0.06)");
assert(secContent.includes("WebkitPrintColorAdjust: \"exact\""), "Exact print color adjust configuré pour l'impression");
assert(!secContent.includes("max-h-[320px] max-w-[320px]"), "L'ancienne taille trop petite (320px) a été complètement supprimée");
assert(secContent.includes("bg-gray-100/40") && !secContent.includes('idx % 2 === 1 ? "bg-gray-50/70" : "bg-white"'), "Les lignes du tableau sont translucides (non opaques blanches) pour laisser passer le filigrane");

// 2. BulletinElementaireSheet.tsx
console.log("\n[2] BulletinElementaireSheet.tsx :");
const elemContent = fs.readFileSync(path.join(process.cwd(), "src/components/grades/BulletinElementaireSheet.tsx"), "utf-8");

assert(elemContent.includes("w-[65%] max-w-[65%] max-h-[65%] object-contain"), "Largeur du filigrane configurée à 65% (dans la plage 60-70%) avec ratio préservé (object-contain)");
assert(elemContent.includes("pointer-events-none absolute inset-0 flex items-center justify-center"), "Centrage horizontal et vertical absolu sur toute la page");
assert(elemContent.includes("watermarkOpacity ?? school.bulletinWatermarkOpacity ?? 0.06"), "Opacité par défaut fixée à 6% (0.06)");
assert(elemContent.includes("WebkitPrintColorAdjust: \"exact\""), "Exact print color adjust configuré pour l'impression");
assert(!elemContent.includes("max-h-[320px] max-w-[320px]"), "L'ancienne taille trop petite (320px) a été complètement supprimée");

// 3. Generator.tsx et loadOfficialBulletin.ts
console.log("\n[3] Contrôles d'opacité & réglages :");
const genContent = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/grades/report-card/Generator.tsx"), "utf-8");
const loadContent = fs.readFileSync(path.join(process.cwd(), "src/lib/bulletin/loadOfficialBulletin.ts"), "utf-8");

assert(genContent.includes("bulletinWatermarkOpacity ?? 0.06"), "Générateur : opacité par défaut initialisée à 6%");
assert(loadContent.includes("bulletinWatermarkOpacity ?? 0.06"), "Chargement officiel : opacité par défaut initialisée à 6%");
assert(genContent.includes('min="0.02"') && genContent.includes('max="0.25"'), "Plage d'opacité réglable maintenue de 2% à 25%");

// 4. Styles d'impression (globals.css)
console.log("\n[4] Styles d'impression A4 (globals.css) :");
const cssContent = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf-8");

assert(cssContent.includes("min-height: 275mm !important"), "CSS Print : min-height fixé à 275mm pour garantir le centrage vertical sur A4 même sur bulletin presque vide");
assert(cssContent.includes("-webkit-print-color-adjust: exact !important"), "CSS Print : respect strict des couleurs et opacités à l'impression");

if (failures > 0) {
  console.error(`\n❌ ${failures} erreur(s) détectée(s).`);
  process.exit(1);
} else {
  console.log("\n🎉 TOUTES LES VÉRIFICATIONS DU FILIGRANE SONT CONFORMES ET VALIDÉES !");
}
