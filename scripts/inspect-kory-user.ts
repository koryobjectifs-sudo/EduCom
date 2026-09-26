import { createClient } from "@supabase/supabase-js";
import { prisma } from "./_env";

async function main() {
  const email = "koryphilgs1402@gmail.com";
  console.log("=== INSPECT USER:", email, "===");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let page = 1;
    let foundAuthUser: any = null;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error || !data || data.users.length === 0) break;
      const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (match) {
        foundAuthUser = match;
        break;
      }
      if (data.users.length < 100) break;
      page++;
    }
    console.log("Supabase Auth search result:", foundAuthUser ? { id: foundAuthUser.id, email: foundAuthUser.email } : "Not found in Auth");
  }

  const dbUsers = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { school: true },
  });

  console.log("Prisma User match count:", dbUsers.length);
  for (const u of dbUsers) {
    console.log("DB User:", {
      id: u.id,
      email: u.email,
      role: u.role,
      schoolId: u.schoolId,
      schoolName: u.school?.name,
    });

    if (u.schoolId) {
      const usersInSchool = await prisma.user.findMany({ where: { schoolId: u.schoolId } });
      const students = await prisma.student.count({ where: { schoolId: u.schoolId } });
      const classes = await prisma.class.count({ where: { schoolId: u.schoolId } });
      const invoices = await prisma.invoice.count({ where: { schoolId: u.schoolId } });
      const payments = await prisma.payment.count({ where: { schoolId: u.schoolId } });
      console.log("Associated School Stats:", {
        schoolId: u.schoolId,
        schoolName: u.school?.name,
        usersInSchool: usersInSchool.map(x => ({ id: x.id, email: x.email, role: x.role })),
        students,
        classes,
        invoices,
        payments,
      });
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
