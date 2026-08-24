import { prisma } from "../src/lib/prisma";
import { createAdminClient } from "../src/lib/supabase/admin";

async function cleanDemoData() {
  const adminAuth = createAdminClient();

  const emails = ["direction@demo.local", "enseignant@demo.local", "secretariat@demo.local", "onboarding@demo.local"];
  
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Delete from Supabase Auth
      await adminAuth.auth.admin.deleteUser(user.id);
      console.log(`Deleted auth user ${email}`);
    } else {
      // Also check if they exist in Supabase auth even if not in Prisma
      const { data: users } = await adminAuth.auth.admin.listUsers();
      const authUser = users?.users.find(u => u.email === email);
      if (authUser) {
         await adminAuth.auth.admin.deleteUser(authUser.id);
         console.log(`Deleted orphaned auth user ${email}`);
      }
    }
  }

  const demoSchool = await prisma.school.findFirst({
    where: { name: "École de Démo EduCom" }
  });

  if (demoSchool) {
    await prisma.school.delete({
      where: { id: demoSchool.id }
    });
    console.log(`Deleted school: École de Démo EduCom (cascaded to users, classes, etc.)`);
  } else {
    console.log(`Demo school not found.`);
  }
}

cleanDemoData()
  .then(() => {
    console.log("Cleanup complete.");
    process.exit(0);
  })
  .catch(console.error);
