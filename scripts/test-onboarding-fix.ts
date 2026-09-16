import { phoneSchema, schoolNameSchema, personNameSchema, emailSchema } from "../src/lib/validations";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== TEST VALIDATIONS ===");
  
  // Test Phone with national format (9 digits, starts with 7)
  const p1 = phoneSchema.safeParse("781582740");
  console.log("Phone national '781582740':", p1.success ? `SUCCESS (${p1.data})` : `FAIL (${p1.error?.issues[0]?.message})`);
  if (!p1.success || p1.data !== "+221781582740") throw new Error("Phone 781582740 should be valid +221781582740");

  // Test Phone with international format
  const p2 = phoneSchema.safeParse("+221781582740");
  console.log("Phone intl '+221781582740':", p2.success ? `SUCCESS (${p2.data})` : `FAIL (${p2.error?.issues[0]?.message})`);
  if (!p2.success) throw new Error("Phone +221781582740 should be valid");

  // Test School Name
  const s1 = schoolNameSchema.safeParse("Group Scolaire Kory");
  console.log("School name 'Group Scolaire Kory':", s1.success ? "SUCCESS" : `FAIL (${s1.error?.issues[0]?.message})`);
  if (!s1.success) throw new Error("School name should be valid");

  // Test School Name with digits
  const s2 = schoolNameSchema.safeParse("Lycée Moderne 2");
  console.log("School name 'Lycée Moderne 2':", s2.success ? "SUCCESS" : `FAIL (${s2.error?.issues[0]?.message})`);
  if (!s2.success) throw new Error("School name with digits should be valid");

  // Test First & Last Name
  const fn = personNameSchema.safeParse("John");
  const ln = personNameSchema.safeParse("KORY");
  console.log("First name 'John':", fn.success ? "SUCCESS" : "FAIL");
  console.log("Last name 'KORY':", ln.success ? "SUCCESS" : "FAIL");
  if (!fn.success || !ln.success) throw new Error("Names should be valid");

  // Verify edu.suptest user and school in DB
  const user = await prisma.user.findFirst({
    where: { email: "edu.suptest@gmail.com" },
    include: { school: { include: { classes: true, documentRequirements: true } } }
  });

  console.log("=== DB STATUS ===");
  console.log("User emailVerified:", user?.emailVerified);
  console.log("School onboardingCompleted:", user?.school?.onboardingCompleted);
  console.log("School classes count:", user?.school?.classes?.length);
  console.log("School doc requirements count:", user?.school?.documentRequirements?.length);

  if (!user?.emailVerified) throw new Error("User emailVerified must be true");
  if (!user?.school?.onboardingCompleted) throw new Error("School onboardingCompleted must be true");

  console.log("\nALL VERIFICATIONS PASSED!");
}

main()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
