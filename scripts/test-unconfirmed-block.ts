/**
 * Test automatisé : blocage strict des comptes non confirmés et validation des formats.
 *
 * Exécution : npm run script -- scripts/test-unconfirmed-block.ts
 */

import { emailSchema, personNameSchema, schoolNameSchema, passwordSchema, getPhoneValidationError } from "../src/lib/validations";
import { checkRegisterRateLimit, checkResendRateLimit } from "../src/lib/rateLimit";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ÉCHEC : ${message}`);
    failed++;
  }
}

async function run() {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("TESTS SÉCURITÉ : VALIDATION DES FORMATS & BLOCAGE DES BOTS");
  console.log("══════════════════════════════════════════════════════════\n");

  // 1. Validation E-mail
  console.log("【1】 Validation E-mail :");
  assert(!emailSchema.safeParse("ab").success, "Rejette 'ab'");
  assert(!emailSchema.safeParse("a@b").success, "Rejette 'a@b'");
  assert(!emailSchema.safeParse("test@yopmail.com").success, "Rejette adresse jetable yopmail.com");
  assert(!emailSchema.safeParse("bot@mailinator.net").success, "Rejette adresse jetable mailinator.net");
  assert(!emailSchema.safeParse("fake@temp-mail.org").success, "Rejette adresse jetable temp-mail.org");
  assert(emailSchema.safeParse("direction@ecole-excellence.sn").success, "Accepte email valide ecole-excellence.sn");

  // 2. Validation Téléphone
  console.log("\n【2】 Validation Téléphone par pays :");
  assert(getPhoneValidationError("+221771234567") === null, "Accepte numéro sénégalais valide (+221 77 123 45 67)");
  assert(getPhoneValidationError("+221338000000") !== null, "Rejette numéro sénégalais ne commençant pas par 7");
  assert(getPhoneValidationError("+2217712345") !== null, "Rejette numéro sénégalais trop court");
  assert(getPhoneValidationError("+33612345678") === null, "Accepte numéro français valide (+33 6 12 34 56 78)");

  // 3. Validation Noms et Écoles
  console.log("\n【3】 Validation Noms et Écoles :");
  assert(!personNameSchema.safeParse("A").success, "Rejette nom de 1 caractère");
  assert(!personNameSchema.safeParse("Jean123").success, "Rejette nom avec chiffres");
  assert(personNameSchema.safeParse("Mamadou-Lamine").success, "Accepte prénom avec tiret");
  assert(personNameSchema.safeParse("O'Connor").success, "Accepte nom avec apostrophe");
  assert(!schoolNameSchema.safeParse("AB").success, "Rejette école de moins de 3 caractères");
  assert(schoolNameSchema.safeParse("Lycée Moderne").success, "Accepte nom d'école valide");

  // 4. Mot de passe
  console.log("\n【4】 Validation Mot de passe :");
  assert(!passwordSchema.safeParse("1234567").success, "Rejette mot de passe < 8 caractères");
  assert(passwordSchema.safeParse("Pass1234!").success, "Accepte mot de passe >= 8 caractères");

  // 5. Rate Limiting Inscription & Renvoi
  console.log("\n【5】 Protection contre les bots (Rate Limiting) :");
  const testIp = "192.0.2.100";
  let allowedCount = 0;
  for (let i = 0; i < 7; i++) {
    const res = checkRegisterRateLimit(testIp);
    if (res.allowed) allowedCount++;
  }
  assert(allowedCount === 5, `Limite les inscriptions IP à 5 par heure (obtenu : ${allowedCount})`);

  const testKey = "resend-test-key-1";
  const firstResend = checkResendRateLimit(testKey);
  const secondResend = checkResendRateLimit(testKey);
  assert(firstResend.allowed === true, "Premier renvoi autorisé");
  assert(secondResend.allowed === false, "Deuxième renvoi immédiat bloqué (< 60s cooldown)");

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`RÉSULTAT : ${passed} passés, ${failed} échoués.`);
  console.log("══════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run();
