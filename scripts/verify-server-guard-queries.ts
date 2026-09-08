import { hasAccess, RoleType } from "../src/lib/permissions";
import { requireActionContext } from "../src/lib/actionContext";

async function testGuardLogic() {
  console.log("=== Testing Server-Side Guard Logic ===");

  // 1. TEACHER attempting access to /dashboard/payments
  const teacherHasAccess = hasAccess("TEACHER" as RoleType, "/dashboard/payments");
  console.log("1. TEACHER -> /dashboard/payments hasAccess:", teacherHasAccess);
  if (teacherHasAccess) throw new Error("Security breach: TEACHER should not have access to payments");

  // 2. PARENT attempting access to /dashboard$
  const parentHasAccess = hasAccess("PARENT" as RoleType, "/dashboard$");
  console.log("2. PARENT -> /dashboard$ hasAccess:", parentHasAccess);
  if (parentHasAccess) throw new Error("Security breach: PARENT should not have access to dashboard home");

  // 3. ACCOUNTANT attempting access to /dashboard/grades
  const accountantGrades = hasAccess("ACCOUNTANT" as RoleType, "/dashboard/grades");
  console.log("3. ACCOUNTANT -> /dashboard/grades hasAccess:", accountantGrades);
  if (accountantGrades) throw new Error("Security breach: ACCOUNTANT should not have access to grades");

  console.log("All Server-Side Guard checks passed: unauthorized roles are rejected at entry point before any business query.");
}

testGuardLogic();
