import { createClient } from "@supabase/supabase-js";
import { urlSupabase } from "./config";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("La clé secrète SUPABASE_SERVICE_ROLE_KEY est manquante dans le fichier .env.");
  }

  // ⚠️ `urlSupabase()` lève de lui-même si l'adresse manque, et retire un
  // chemin de service recopié par erreur (voir `config.ts`).
  return createClient(urlSupabase(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
