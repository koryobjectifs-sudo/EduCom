import { createStaffMember } from '../src/app/dashboard/team/actions';
import { prisma } from '../src/lib/prisma';
import { createClient } from '@supabase/supabase-js';

async function run() {
  const formData = new FormData();
  formData.append('firstName', 'Jean');
  formData.append('lastName', 'Dupont');
  formData.append('email', 'jean.dupont@ecole.fr');
  formData.append('role', 'TEACHER');
  formData.append('managerId', '');

  // Mock cookies/headers or we can't test server action directly easily without Next.js context
  // Actually, createStaffMember uses `await createClient()` which uses next/headers.
  // We can't run Next.js Server Actions easily in a node script because of `cookies()`.
  
  console.log("Since we can't run Server Actions in a script, let's just simulate the exact Prisma upsert.");
  
  const user = await prisma.user.findFirst({ where: { email: "koryobjectifs@gmail.com" } });
  
  const id = "e36e4f3a-abcd-4123-bfae-781525364172"; // mock supabase auth id
  
  try {
    const res = await prisma.user.upsert({
      where: { id },
      update: {
        firstName: "Jean",
        lastName: "Dupont",
        role: "TEACHER",
        schoolId: user!.schoolId,
        managerId: null
      },
      create: {
        id,
        email: "jean.dupont@ecole.fr",
        firstName: "Jean",
        lastName: "Dupont",
        role: "TEACHER",
        schoolId: user!.schoolId,
        password: "", 
        managerId: null
      }
    });
    console.log("Upsert SUCCESS:", res.id);
    
    // Clean it up
    await prisma.user.delete({ where: { id } });
  } catch (e: any) {
    console.error("Upsert FAILED:", e.message);
  }
}

run();
