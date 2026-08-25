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
  const targetEmail = "senghor.journalist@gmail.com";
  
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) {
    console.error("Auth Admin Error:", error.message);
    return;
  }
  
  const targetUsers = data.users.filter(u => u.email === targetEmail);
  
  if (targetUsers.length === 0) {
    console.log(`No ${targetEmail} found in Auth.`);
  }

  for (const user of targetUsers) {
    console.log(`Deleting from Auth: ${user.id}`);
    await adminClient.auth.admin.deleteUser(user.id);
  }

  // Find the user in prisma to check if there is an associated school
  try {
    const dbUser = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (dbUser) {
      if (dbUser.schoolId) {
        // Find if this is the only user in the school, maybe delete the school too?
        // Let's just delete the user for now to allow recreating it. The school might be left orphaned but that's fine for testing OAuth creation again.
      }
      await prisma.user.delete({ where: { email: targetEmail } });
      console.log("Deleted from Prisma DB.");
    } else {
      console.log("Not found in Prisma DB.");
    }
  } catch(e) {
    console.log("Error deleting from Prisma DB:", e);
  }
  
  console.log("Cleanup complete!");
}

run();
