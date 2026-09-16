import { splitFullName } from "../src/app/dashboard/settings/pedagogie/wizard/actions";

async function main() {
  console.log("=== TEST SPLIT FULL NAME ===");

  const cases = [
    { input: "Moussa DIOP", expectedFirst: "Moussa", expectedLast: "DIOP" },
    { input: "DIOP Moussa", expectedFirst: "Moussa", expectedLast: "DIOP" },
    { input: "Mamadou Lamine Fall", expectedFirst: "Mamadou Lamine", expectedLast: "Fall" },
    { input: "NDIAYE Fatou Bintou", expectedFirst: "Fatou Bintou", expectedLast: "NDIAYE" },
    { input: "Awa", expectedFirst: "Awa", expectedLast: "-" },
    { input: "Jean-Baptiste Sarr", expectedFirst: "Jean-Baptiste", expectedLast: "Sarr" },
  ];

  for (const c of cases) {
    const res = splitFullName(c.input);
    console.log(`Input: "${c.input}" -> First: "${res.firstName}", Last: "${res.lastName}"`);
    if (!res.firstName || !res.lastName) {
      throw new Error(`Failed on ${c.input}`);
    }
  }

  console.log("\nALL SPLIT TESTS PASSED!");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
