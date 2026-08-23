import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/prisma";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const email = "koryobjectifs@gmail.com";
  
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching auth users:", error);
    return;
  }
  
  const authUser = users.find(u => u.email === email);
  if (!authUser) {
    console.log(`User ${email} not found in Supabase Auth.`);
    return;
  }
  
  console.log(`Supabase Auth ID for ${email}: ${authUser.id}`);
  
  const dbUserByAuthId = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (dbUserByAuthId) {
    console.log("Prisma user with this Auth ID already exists and has school:", dbUserByAuthId.schoolId);
    if (!dbUserByAuthId.schoolId) {
      // Find a school and attach
      const school = await prisma.school.findFirst();
      if (school) {
        await prisma.user.update({
          where: { id: authUser.id },
          data: { schoolId: school.id }
        });
        console.log(`Attached school ${school.id} to user ${authUser.id}`);
      }
    }
    return;
  }
  
  const dbUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (!dbUserByEmail) {
    console.log("No Prisma user found with this email at all.");
    return;
  }
  
  console.log(`Prisma user found with DIFFERENT ID: ${dbUserByEmail.id}`);
  
  try {
    await prisma.$executeRaw`UPDATE "public"."User" SET "id" = ${authUser.id} WHERE "email" = ${email}`;
    console.log(`Successfully updated Prisma User ID to match Supabase Auth ID.`);
  } catch (e) {
    console.error("Error updating ID. Will try duplicating the user.", e);
    await prisma.user.create({
      data: {
        id: authUser.id,
        email: dbUserByEmail.email,
        password: dbUserByEmail.password,
        firstName: dbUserByEmail.firstName,
        lastName: dbUserByEmail.lastName,
        phone: dbUserByEmail.phone,
        role: dbUserByEmail.role,
        schoolId: dbUserByEmail.schoolId,
      }
    });
    console.log("Created a new Prisma user with the correct Auth ID.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
