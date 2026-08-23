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
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) {
    console.error("Auth Admin Error:", error.message);
    return;
  }
  
  // Find jean.dupont
  const jeanUsers = data.users.filter(u => u.email === "jean.dupont@ecole.fr");
  
  if (jeanUsers.length === 0) {
    console.log("No jean.dupont@ecole.fr found in Auth.");
  }

  for (const jean of jeanUsers) {
    console.log("Deleting from Auth:", jean.id);
    await adminClient.auth.admin.deleteUser(jean.id);
  }

  // Also clean from prisma just in case
  try {
    await prisma.user.deleteMany({ where: { email: "jean.dupont@ecole.fr" } });
    console.log("Deleted from Prisma DB.");
  } catch(e) {
    console.log("Error deleting from Prisma DB:", e);
  }
  
  console.log("Cleanup complete!");
}

run();
