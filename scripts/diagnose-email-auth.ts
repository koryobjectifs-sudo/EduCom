import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { urlSupabase, cleAnonSupabase } from "../src/lib/supabase/config";

async function diagnose() {
  console.log("=== DIAGNOSTIC SUPABASE AUTH & ENVOI D'E-MAILS ===");

  const supabaseUrl = urlSupabase();
  const anonKey = cleAnonSupabase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  console.log("1. CONFIGURATION & URLS :");
  console.log("   - NEXT_PUBLIC_SUPABASE_URL :", supabaseUrl);
  console.log("   - NEXT_PUBLIC_SITE_URL     :", siteUrl || "(non défini)");
  console.log("   - ANON KEY présente        :", Boolean(anonKey));
  console.log("   - SERVICE ROLE KEY présente:", Boolean(serviceKey));

  const client = createClient(supabaseUrl, anonKey);
  const admin = createAdminClient();

  const testEmail = `audit-test-${Date.now()}@educom.sn`;
  console.log(`\n2. TEST D'INSCRIPTION signUp() vers ${testEmail}...`);

  const signUpRes = await client.auth.signUp({
    email: testEmail,
    password: "Password-Audit-2026!",
    options: {
      emailRedirectTo: `${siteUrl || "http://localhost:3000"}/auth/callback?next=/welcome`,
    },
  });

  console.log("   - signUp() error:", signUpRes.error);
  console.log("   - signUp() user ID:", signUpRes.data.user?.id);
  console.log("   - signUp() user confirmed_at:", signUpRes.data.user?.email_confirmed_at);
  console.log("   - signUp() identities:", signUpRes.data.user?.identities?.length);

  console.log(`\n3. TEST DE RENVOI auth.resend({ type: 'signup', email }) vers ${testEmail}...`);
  const resendRes = await client.auth.resend({
    type: "signup",
    email: testEmail,
    options: {
      emailRedirectTo: `${siteUrl || "http://localhost:3000"}/auth/callback?next=/dashboard`,
    },
  });

  console.log("   - resend() error:", resendRes.error);
  console.log("   - resend() data:", resendRes.data);

  // Nettoyage de l'utilisateur de test
  if (signUpRes.data.user?.id) {
    console.log("\n4. NETTOYAGE :");
    await admin.auth.admin.deleteUser(signUpRes.data.user.id);
    console.log("   ✓ Utilisateur de test supprimé de Supabase Auth.");
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERREUR DIAGNOSTIC :", err);
    process.exit(1);
  });
