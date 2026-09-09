import { getDictionary, SUPPORTED_LOCALES, resolveLocale } from "../src/lib/i18n";
import { formatIcu, formatXOF } from "../src/lib/i18n/icu";

async function main() {
  console.log("=== SMOKE TEST INTERNATIONALISATION (LOT 4) ===");

  let pass = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      pass++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
    }
  }

  // 1. Test des locales supportées
  assert(SUPPORTED_LOCALES.length === 3, "3 locales supportées (fr, en, pt)");
  assert(SUPPORTED_LOCALES.includes("fr") && SUPPORTED_LOCALES.includes("en") && SUPPORTED_LOCALES.includes("pt"), "Locales: fr, en, pt présentes");
  assert(!SUPPORTED_LOCALES.includes("ar" as any), "L'arabe n'est PAS inclus dans le Lot 1");

  // 2. Résolution des locales
  assert(resolveLocale("fr") === "fr", "resolveLocale('fr') -> 'fr'");
  assert(resolveLocale("en-US") === "en", "resolveLocale('en-US') -> 'en'");
  assert(resolveLocale("pt-BR") === "pt", "resolveLocale('pt-BR') -> 'pt'");
  assert(resolveLocale("es-ES") === "fr", "resolveLocale locale inconnue -> 'fr' (défaut)");

  // 3. Formatage XOF strict (sans décimales)
  const xof1 = formatXOF(125000);
  assert(xof1.includes("125") && xof1.includes("000") && xof1.includes("FCFA") && !xof1.includes(",00") && !xof1.includes(".00"), `formatXOF(125000) strict sans décimales: "${xof1}"`);
  
  const xof2 = formatXOF(0);
  assert(xof2.includes("0") && xof2.includes("FCFA") && !xof2.includes(",00"), `formatXOF(0): "${xof2}"`);

  // 4. Test des pluriels ICU
  const icuFrZero = formatIcu("{count, plural, one {# élève} other {# élèves}}", { count: 0 });
  const icuFrOne = formatIcu("{count, plural, one {# élève} other {# élèves}}", { count: 1 });
  const icuFrMany = formatIcu("{count, plural, one {# élève} other {# élèves}}", { count: 12 });
  assert(icuFrOne === "1 élève", `Pluriel ICU FR (1): "${icuFrOne}"`);
  assert(icuFrMany === "12 élèves", `Pluriel ICU FR (12): "${icuFrMany}"`);

  const icuEnOne = formatIcu("{count, plural, one {# child attached} other {# children attached}}", { count: 1 });
  const icuEnMany = formatIcu("{count, plural, one {# child attached} other {# children attached}}", { count: 3 });
  assert(icuEnOne === "1 child attached", `Pluriel ICU EN (1): "${icuEnOne}"`);
  assert(icuEnMany === "3 children attached", `Pluriel ICU EN (3): "${icuEnMany}"`);

  // 5. Test de complétude et d'intégrité des dictionnaires FR, EN, PT
  const dictFr = getDictionary("fr");
  const dictEn = getDictionary("en");
  const dictPt = getDictionary("pt");

  const sections = ["common", "nav", "auth", "parent", "reinscription", "finance", "settings"] as const;

  for (const locale of ["fr", "en", "pt"] as const) {
    const dict = getDictionary(locale);
    for (const sec of sections) {
      assert(dict[sec] !== undefined, `Dictionnaire [${locale}].${sec} est défini`);
    }
  }

  // Vérifier quelques traductions clés
  assert(dictFr.parent.title === "Paiements & Frais de scolarité", "FR parent.title correct");
  assert(dictEn.parent.title === "Billing & Tuition Payments", "EN parent.title correct");
  assert(dictPt.parent.title === "Pagamentos & Propinas", "PT parent.title correct");

  assert(dictFr.reinscription.title === "Préparer la rentrée", "FR reinscription.title correct");
  assert(dictEn.reinscription.title === "Prepare New School Year", "EN reinscription.title correct");
  assert(dictPt.reinscription.title === "Preparar o Novo Ano", "PT reinscription.title correct");

  console.log(`\nTOTAL: ${pass}/${total} assertions réussies.`);
  if (pass === total) {
    console.log("🎉 Tous les tests i18n sont validés !");
    process.exit(0);
  } else {
    console.error("⚠️ Certains tests i18n ont échoué.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
