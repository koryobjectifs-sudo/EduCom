import { createClient } from '@supabase/supabase-js';
import { prisma } from '../src/lib/prisma';
import { buildReport } from '../src/lib/reports';
import { resolvePeriod } from '../src/lib/finance';

async function run() {
  const user = await prisma.user.findFirst({
    where: { email: "koryobjectifs@gmail.com" }
  });

  if (!user) {
    console.error("User not found");
    return;
  }

  const ctx = { userId: user.id, schoolId: user.schoolId, role: user.role as any };
  
  try {
    const { period } = await resolvePeriod(ctx, {});
    await buildReport(ctx, period);
    console.log("Success building report!");
  } catch (e: any) {
    console.error("Error building report:", e);
    console.error(e.stack);
  }
}

run();
