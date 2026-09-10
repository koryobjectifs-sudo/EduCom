import { prisma } from "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { urlSupabase, cleAnonSupabase } from "../src/lib/supabase/config";

async function testConfirmedUserResend() {
  console.log("=== TEST RESEND SUR UTILISATEUR DÉJÀ CONFIRMÉ ===");
  const admin = createAdminClient();
  const client = createClient(urlSupabase(), cleAnonSupabase());
  const testEmail = `confirmed-user-${Date.now()}@educom.sn`;

  // 1. Créer un utilisateur confirmé dans Supabase Auth
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: "Password-Audit-2026!",
    email_confirm: true, // Déjà confirmé dans Supabase
  });

  if (createErr || !created.user) {
    throw new Error(`Admin createUser failed: ${createErr?.message}`);
  }

  console.log("✓ Utilisateur créé dans Supabase Auth avec email_confirmed_at =", created.user.email_confirmed_at);

  // 2. Tenter un auth.resend({ type: 'signup' })
  const resendRes = await client.auth.resend({
    type: "signup",
    email: testEmail,
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback?next=/dashboard",
    },
  });

  console.log("Résultat de resend() sur un compte déjà confirmé :", {
    error: resendRes.error,
    data: resendRes.data,
  });

  // 3. Nettoyer
  await admin.auth.admin.deleteUser(created.user.id);
  console.log("✓ Utilisateur nettoyé.");
}

testConfirmedUserResend()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ ERREUR :", e);
    process.exit(1);
  });
