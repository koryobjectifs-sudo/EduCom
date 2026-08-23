import { createClient } from '@supabase/supabase-js';

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
  } else {
    console.log(`Success! Found ${data.users.length} users.`);
    // Try to find if jean.dupont@ecole.fr exists
    const jean = data.users.find(u => u.email === "jean.dupont@ecole.fr");
    if (jean) {
      console.log("jean.dupont@ecole.fr ALREADY EXISTS in Auth with ID:", jean.id);
      
      const { data: authData, error: authError } = await adminClient.auth.admin.deleteUser(jean.id);
      if (authError) {
        console.error("Auth Admin Error on deleteUser:", authError.message);
      } else {
        console.log("Successfully deleted user via Admin API:", jean.id);
      }

      // Also delete from prisma if it exists
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      try {
        await prisma.user.delete({ where: { id: jean.id } });
        console.log("Deleted from Prisma DB.");
      } catch(e) {
        console.log("Not in Prisma DB.");
      }
    }
  }
}

run();
