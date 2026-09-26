import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./_env";

const TARGET_EMAIL = "koryphilgs1402@gmail.com";
const APPLY = process.env.APPLY === "1";

async function main() {
  console.log(APPLY ? "=== MODE RÉEL (APPLY=1) ===" : "=== ESSAI À BLANC (aucun changement écrit) ===");
  console.log(`Cible : ${TARGET_EMAIL}\n`);

  // 1. Recherche dans Supabase Auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Identifiants Supabase manquants.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let page = 1;
  let authUsers: any[] = [];
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
    if (error || !data || data.users.length === 0) break;
    const matches = data.users.filter((u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());
    authUsers.push(...matches);
    if (data.users.length < 100) break;
    page++;
  }

  console.log(`Supabase Auth : ${authUsers.length} utilisateur(s) trouvé(s) pour ${TARGET_EMAIL}.`);
  for (const u of authUsers) {
    console.log(`  - Auth ID : ${u.id} (${u.email})`);
  }

  // 2. Recherche dans Prisma
  const dbUsers = await prisma.user.findMany({
    where: { email: { equals: TARGET_EMAIL, mode: "insensitive" } },
    include: { school: true },
  });

  console.log(`\nPrisma DB : ${dbUsers.length} utilisateur(s) trouvé(s) pour ${TARGET_EMAIL}.`);
  const schoolIds = new Set<string>();

  for (const u of dbUsers) {
    console.log(`  - User ID : ${u.id}, Rôle : ${u.role}, École : ${u.school?.name ?? "Aucune"} (${u.schoolId ?? "null"})`);
    if (u.schoolId) {
      schoolIds.add(u.schoolId);
    }
  }

  const schoolsToDelete: any[] = [];
  for (const schoolId of schoolIds) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            classes: true,
            invoices: true,
            payments: true,
            subjects: true,
            terms: true,
            lessons: true,
            subscriptionPayments: true,
          },
        },
      },
    });
    if (school) {
      schoolsToDelete.push(school);
      console.log(`\nÉtablissement lié : ${school.name} (ID: ${school.id})`);
      console.log(`  Compteurs rattachés :`, school._count);
    }
  }

  if (authUsers.length === 0 && dbUsers.length === 0 && schoolsToDelete.length === 0) {
    console.log("\nAucun enregistrement trouvé pour cet email. Rien à supprimer.");
    return;
  }

  // 3. Sauvegarde de sécurité
  const backupDir = join(process.cwd(), "scripts", "backups");
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = join(backupDir, `backup-cleanup-${TARGET_EMAIL.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.json`);
  const backupPayload = {
    date: new Date().toISOString(),
    targetEmail: TARGET_EMAIL,
    authUsers,
    dbUsers,
    schools: schoolsToDelete,
  };
  writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), "utf8");
  console.log(`\n✓ Sauvegarde créée : ${backupPath}`);

  if (!APPLY) {
    console.log("\n=======================================================");
    console.log("→ ESSAI À BLANC TERMINÉ. Aucune donnée n'a été modifiée.");
    console.log("→ Pour exécuter la suppression réelle, relancez avec :");
    console.log(`  APPLY=1 npm run script -- scripts/delete-user-and-school.ts`);
    console.log("=======================================================");
    return;
  }

  // 4. Suppression réelle
  console.log("\n→ EXÉCUTION DE LA SUPPRESSION...");

  // A. Supprimer de Supabase Auth
  for (const u of authUsers) {
    console.log(`  Suppression Auth : ${u.id}...`);
    const { error } = await adminClient.auth.admin.deleteUser(u.id);
    if (error) {
      console.error(`  ✗ Erreur suppression Auth (${u.id}):`, error.message);
    } else {
      console.log(`  ✓ Auth ${u.id} supprimé.`);
    }
  }

  // B. Supprimer les écoles associées (cascade sur étudiants, classes, notes, factures, etc.)
  for (const s of schoolsToDelete) {
    console.log(`  Suppression Établissement Prisma : ${s.name} (${s.id})...`);
    // Supprimer d'abord les users rattachés à cette école
    await prisma.user.deleteMany({ where: { schoolId: s.id } });
    await prisma.school.delete({ where: { id: s.id } });
    console.log(`  ✓ Établissement ${s.name} supprimé avec toutes ses données.`);
  }

  // C. Supprimer l'utilisateur de Prisma s'il n'avait pas d'école ou s'il reste
  const remaining = await prisma.user.deleteMany({
    where: { email: { equals: TARGET_EMAIL, mode: "insensitive" } },
  });
  if (remaining.count > 0) {
    console.log(`  ✓ ${remaining.count} utilisateur(s) Prisma orphelin(s) supprimé(s).`);
  }

  console.log("\n✓ SUPPRESSION COMPLÈTE TERMINÉE.");
  console.log(`L'adresse ${TARGET_EMAIL} peut maintenant se réinscrire depuis zéro sur /register.`);
}

main().catch(console.error).finally(() => process.exit(0));
