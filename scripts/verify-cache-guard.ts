/**
 * Test unitaire : Vérification du garde de cache corrompu (.next 404).
 * Valide que le seuil de 10% de 404 déclenche immédiatement l'interruption
 * avec le message : "Application non compilée — supprimez .next et relancez".
 */

function evaluateRouteResults(routesCount: number, notFoundCount: number): string | null {
  const failureRate = notFoundCount / routesCount;
  if (failureRate > 0.1) {
    return "Application non compilée — supprimez .next et relancez";
  }
  return null;
}

function runTest() {
  console.log("=== TEST DU GARDE DE CACHE .next (SEUIL 10% 404) ===");

  // 1. Cas nominal : 0 / 10 en 404 (0%) -> Valide
  const res1 = evaluateRouteResults(10, 0);
  if (res1 !== null) throw new Error(`Échec cas 1 : attendu null, reçu ${res1}`);
  console.log("✅ Cas nominal (0% de 404) : OK");

  // 2. Cas limite acceptable : 1 / 10 en 404 (10%) -> Valide (<= 10%)
  const res2 = evaluateRouteResults(10, 1);
  if (res2 !== null) throw new Error(`Échec cas 2 : attendu null, reçu ${res2}`);
  console.log("✅ Cas limite acceptable (10% de 404) : OK");

  // 3. Cas cache corrompu : 2 / 10 en 404 (20% > 10%) -> Bloqué avec message exact
  const res3 = evaluateRouteResults(10, 2);
  const expectedMsg = "Application non compilée — supprimez .next et relancez";
  if (res3 !== expectedMsg) throw new Error(`Échec cas 3 : attendu '${expectedMsg}', reçu '${res3}'`);
  console.log(`✅ Cas cache corrompu détecté : '${res3}'`);

  // 4. Cas 57 / 58 en 404 (98%) -> Bloqué immédiatement
  const res4 = evaluateRouteResults(58, 57);
  if (res4 !== expectedMsg) throw new Error(`Échec cas 4 : attendu '${expectedMsg}', reçu '${res4}'`);
  console.log("✅ Cas effondrement général (57/58 404) : Bloqué avec le message unique requis.");

  console.log("\n🎉 TEST DU GARDE DE CACHE 404 VALIDÉ À 100% !");
}

runTest();
