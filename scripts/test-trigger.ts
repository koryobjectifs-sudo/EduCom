import { createClient } from '@supabase/supabase-js';
import { prisma } from '../src/lib/prisma';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing URL or Key in environment");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const email = "trigger.test@ecole.fr";
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: "educom2026",
    email_confirm: true,
    user_metadata: {
      firstName: "Trigger",
      lastName: "Test",
      role: "TEACHER",
      schoolId: "269ceb7e-a061-475f-8b85-20b1c8fe7946", // Use a valid school ID from previous findMany
      managerId: null
    }
  });

  if (authError) {
    console.error("Auth Error:", authError.message);
    return;
  }
  
  console.log("Auth user created:", authData.user?.id);
  
  // Wait a second for trigger
  await new Promise(r => setTimeout(r, 1000));
  
  const pUser = await prisma.user.findUnique({ where: { email } });
  if (pUser) {
    console.log("Trigger SUCCESS: Found in Prisma DB:", pUser);
  } else {
    console.log("Trigger FAILED: Not in Prisma DB.");
  }
  
  await adminClient.auth.admin.deleteUser(authData.user!.id);
  console.log("Cleaned up.");
}

run();
