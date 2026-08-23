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
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: "jean.dupont@ecole.fr",
    password: "educom2026",
    email_confirm: true,
    user_metadata: {
      firstName: "Jean",
      lastName: "Dupont",
      role: "TEACHER",
      schoolId: "cl_abc123", // Fake ID
      managerId: null
    }
  });

  if (authError) {
    console.error("Auth Admin Error on createUser:", authError.message);
  } else {
    console.log("Successfully created user via Admin API:", authData.user?.id);
    
    // Delete it right away so the user can do it
    await adminClient.auth.admin.deleteUser(authData.user!.id);
    console.log("Deleted it right away.");
  }
}

run();
